"""Crawl a folder of personal source data → a Ouija source manifest (sources.json).

Run this **where your data lives** (e.g. your own machine, pointed at your Box
`…/Ouija/data` folder). It itemizes every file — modality, format, raw/derived,
which converter turns it into BIDS, and the app-facing artifact it can produce —
without moving any bytes. The emitted `sources.json` is what the frontend Source
Panel reads to itemize + visualize your archive.

    python -m converters.build_manifest --data ~/…/Ouija/data --out frontend/public/sources.json

Nothing here uploads your data or requires a network. Convert the files
themselves with the per-modality converters (see docs/using-your-data.md); this
tool only *indexes* them so the app knows what you have and what's still needed.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import date as _date
from pathlib import Path

from converters.common.source_index import index_file

# Modality → human label for anonymized, plainly-named sources.
_MODALITY_LABEL = {
    "eeg": "EEG session", "cardiac": "Autonomic", "imaging": "Imaging",
    "body": "Body scan", "gut": "Gut intelligence", "unknown": "Source",
}

# Files we never index (dotfiles, OS cruft, the manifest itself).
_SKIP_NAMES = {".DS_Store", "Thumbs.db", "sources.json"}
_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".ipynb_checkpoints"}


def build_manifest(data_dir: Path) -> dict:
    """Walk ``data_dir`` and return the manifest dict."""
    data_dir = Path(data_dir)
    if not data_dir.is_dir():
        raise NotADirectoryError(f"{data_dir} is not a directory")

    entries = []
    for path in sorted(data_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.name in _SKIP_NAMES or path.name.startswith("."):
            continue
        # `.app.json` sidecars carry a source's inlined values — they are metadata
        # inlined into their parent entry, not sources in their own right.
        if path.name.endswith(".app.json"):
            continue
        if any(part in _SKIP_DIRS for part in path.parts):
            continue
        entries.append(asdict(index_file(data_dir, path)))

    # Modality rollup: how resolved each modality is, for the panel's readiness.
    modalities: dict[str, dict] = {}
    for e in entries:
        m = modalities.setdefault(e["modality"], {"count": 0, "app_ready": 0, "convertible": 0})
        m["count"] += 1
        if e["status"] == "app-ready":
            m["app_ready"] += 1
        elif e["status"] == "convertible":
            m["convertible"] += 1

    return {
        "manifestVersion": 2,
        "root": data_dir.name,
        "counts": {"files": len(entries)},
        "modalities": modalities,
        "sources": entries,
    }


def anonymize_manifest(manifest: dict) -> dict:
    """De-identify a manifest for public hosting (medical-research best practice).

    Removes direct + indirect identifiers so only de-identified derived values
    remain (the app-facing region-values / gut-scores / phenotype are numbers, not
    signals or PII). Specifically, per BIDS/HIPAA-Safe-Harbor practice:

      • **Date-shift to relative offsets.** Absolute capture dates are replaced by
        ``day_offset`` (days from the earliest capture); intervals — and therefore
        the self-tracking cadence — are preserved, but no true date is exposed.
      • **Generic labels / ids / paths.** Filenames and folder structure (which
        can carry names, MRNs, locations) are replaced with plain modality +
        index labels; ``rel_path`` becomes ``<modality>/<id>`` and no longer
        points at a real file.
      • **No subject/site/name fields** are ever emitted.

    Returns a new manifest dict with ``anonymized: true``. Raw recordings stay
    local; only this de-identified index is meant to be committed / hosted.
    """
    sources = [dict(s) for s in manifest.get("sources", [])]

    # Earliest capture anchors the relative day offsets.
    dates = [_parse_iso(s.get("date")) for s in sources]
    earliest = min((d for d in dates if d is not None), default=None)

    per_modality: dict[str, int] = {}
    for s, d in zip(sources, dates):
        mod = s.get("modality", "unknown")
        idx = per_modality[mod] = per_modality.get(mod, 0) + 1
        offset = (d - earliest).days if (d is not None and earliest is not None) else None

        new_id = f"{mod}-{idx:02d}"
        s["id"] = new_id
        s["rel_path"] = f"{mod}/{new_id}"
        day_str = f" · day {offset}" if offset is not None else ""
        s["label"] = f"{_MODALITY_LABEL.get(mod, 'Source')} {idx:02d}{day_str}"
        s["day_offset"] = offset
        s["date"] = None            # absolute date removed
        s.pop("provenance", None)   # parent-file ids could re-identify

    out = dict(manifest)
    out["anonymized"] = True
    out["root"] = "archive"         # folder name could identify
    out["sources"] = sources
    return out


def _parse_iso(s: str | None) -> _date | None:
    if not s:
        return None
    try:
        y, m, d = (int(x) for x in s.split("-"))
        return _date(y, m, d)
    except (ValueError, TypeError):
        return None


def _cli() -> None:
    p = argparse.ArgumentParser(description="Index a personal data folder into a Ouija source manifest.")
    p.add_argument("--data", type=Path, required=True, help="folder of your source data")
    p.add_argument("--out", type=Path, default=Path("sources.json"), help="manifest output path")
    p.add_argument("--anonymize", action="store_true", help="de-identify for public hosting (recommended for real data)")
    args = p.parse_args()

    manifest = build_manifest(args.data)
    if args.anonymize:
        manifest = anonymize_manifest(manifest)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(manifest, indent=2) + "\n")

    n = manifest["counts"]["files"]
    review = sum(1 for s in manifest["sources"] if s["status"] == "review")
    print(f"Indexed {n} file(s) → {args.out}")
    for mod, roll in sorted(manifest["modalities"].items()):
        print(f"  {mod:8} {roll['count']:>3} files · {roll['app_ready']} app-ready · {roll['convertible']} convertible")
    if review:
        print(f"  ⚠ {review} file(s) need manual modality assignment (status=review)")


if __name__ == "__main__":
    _cli()
