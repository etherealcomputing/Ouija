"""Withings Body Scan data path: simulate a self-tracking series, or load the
real ``getmeas`` API JSON, into a flat list of per-session measurement rows.

The Withings API returns measures as ``{type, value, unit}`` where the real
value is ``value * 10**unit``. This module decodes that into named columns
(:data:`converters.common.config.WITHINGS_MEASURES`) so the BIDS phenotype
writer never touches the raw wire format.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from converters.common.config import WITHINGS_MEASURES, WITHINGS_SIM_CENTRES

# Deterministic base date for synthetic series (no wall-clock → reproducible).
_SIM_BASE = date(2026, 1, 1)


def simulate_withings(n_sessions: int = 7, seed: int = 0) -> list[dict]:
    """Return ``n_sessions`` synthetic Body Scan rows, one per day from a base date.

    Each row is ``{"acq_time": "YYYY-MM-DD", <column>: float, ...}`` covering
    every measure in :data:`WITHINGS_MEASURES`. Deterministic for a given seed.
    """
    import numpy as np

    rng = np.random.default_rng(seed)
    rows: list[dict] = []
    # Per-measure running value, seeded at its centre, doing a small random walk.
    current = {code: centre for code, (centre, _sd) in WITHINGS_SIM_CENTRES.items()}
    for i in range(n_sessions):
        row: dict = {"acq_time": (_SIM_BASE + timedelta(days=i)).isoformat()}
        for code, meas in WITHINGS_MEASURES.items():
            _centre, sd = WITHINGS_SIM_CENTRES[code]
            current[code] = current[code] + float(rng.normal(0.0, sd))
            row[meas.column] = round(current[code], 3)
        rows.append(row)
    return rows


def load_withings_json(path: Path) -> list[dict]:
    """Parse a Withings ``getmeas`` response into per-session measurement rows.

    Accepts the full envelope ``{"status":0,"body":{"measuregrps":[...]}}`` or a
    bare ``{"measuregrps":[...]}``. Each group's epoch ``date`` becomes an
    ISO ``acq_time``; each ``measures`` entry is decoded via ``value*10**unit``
    and mapped to its column (unknown measure types are ignored).
    """
    p = Path(path)
    try:
        payload = json.loads(p.read_text())
    except json.JSONDecodeError as exc:
        raise ValueError(f"{p}: not valid JSON ({exc.msg} at line {exc.lineno})") from None
    if not isinstance(payload, dict):
        raise ValueError(f"{p}: expected a getmeas object, got {type(payload).__name__}")

    body = payload.get("body", payload)
    groups = body.get("measuregrps", []) if isinstance(body, dict) else []
    if not isinstance(groups, list):
        raise ValueError(f"{p}: 'measuregrps' must be a list, got {type(groups).__name__}")

    rows: list[dict] = []
    for gi, grp in enumerate(groups):
        ts = grp.get("date")
        try:
            acq = datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat() if ts is not None else None
        except (ValueError, TypeError, OSError):
            raise ValueError(f"{p}: measuregrps[{gi}].date is not a valid epoch: {ts!r}") from None

        row: dict = {"acq_time": acq}
        for mi, m in enumerate(grp.get("measures", [])):
            # type and value are required per measure; unit defaults to 0.
            if "type" not in m or "value" not in m:
                raise ValueError(f"{p}: measuregrps[{gi}].measures[{mi}] missing 'type' or 'value': {m!r}")
            try:
                mtype = int(m["type"])
                meas = WITHINGS_MEASURES.get(mtype)
                if meas is None:
                    continue  # measure type we don't track — skip, not an error
                row[meas.column] = round(float(m["value"]) * (10 ** int(m.get("unit", 0))), 3)
            except (ValueError, TypeError):
                raise ValueError(
                    f"{p}: measuregrps[{gi}].measures[{mi}] has non-numeric fields: {m!r}"
                ) from None
        rows.append(row)
    # Oldest-first for a stable, chronological phenotype table.
    rows.sort(key=lambda r: r.get("acq_time") or "")
    return rows
