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
from pathlib import Path

from converters.common.source_index import index_file

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


def _cli() -> None:
    p = argparse.ArgumentParser(description="Index a personal data folder into a Ouija source manifest.")
    p.add_argument("--data", type=Path, required=True, help="folder of your source data")
    p.add_argument("--out", type=Path, default=Path("sources.json"), help="manifest output path")
    args = p.parse_args()

    manifest = build_manifest(args.data)
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
