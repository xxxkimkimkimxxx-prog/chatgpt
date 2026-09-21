#!/usr/bin/env python3
"""Build complete Noto JP TTF files from Fontsource's WOFF subsets."""
from pathlib import Path
from tempfile import TemporaryDirectory

from fontTools.merge import Merger
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"


def merge_family(package: str, prefix: str, weight: int, target: str) -> None:
    source = ROOT / "node_modules" / "@fontsource" / package / "files"
    inputs = sorted(source.glob(f"{prefix}-*-{weight}-normal.woff"))
    if not inputs:
        raise SystemExit(f"Fontsource files are missing for {package} {weight}")

    destination = OUT / target
    with TemporaryDirectory() as temp:
        converted = []
        for index, item in enumerate(inputs):
            font = TTFont(item)
            font.flavor = None
            path = Path(temp) / f"{index:03d}.ttf"
            font.save(path)
            converted.append(str(path))
        merged = Merger().merge(converted)
        merged.save(destination)
    print(f"Built {destination.relative_to(ROOT)} from {len(inputs)} subsets")


OUT.mkdir(parents=True, exist_ok=True)
merge_family("noto-sans-jp", "noto-sans-jp", 400, "NotoSansJP-Regular.ttf")
merge_family("noto-sans-jp", "noto-sans-jp", 700, "NotoSansJP-Bold.ttf")
merge_family("noto-serif-jp", "noto-serif-jp", 400, "NotoSerifJP-Regular.ttf")
merge_family("noto-serif-jp", "noto-serif-jp", 700, "NotoSerifJP-Bold.ttf")
