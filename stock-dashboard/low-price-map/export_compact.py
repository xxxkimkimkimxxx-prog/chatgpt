#!/usr/bin/env python3
import csv
import json
from pathlib import Path

ROOT = Path(__file__).parent
src = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
fields = [
    "symbol","code","company","price","high_52w","low_52w","range_position",
    "sector","industry","market","volume","relative_volume","market_cap","per","pbr",
    "dividend_yield","eps_ttm","perf_1y","flags"
]
with (ROOT / "compact.tsv").open("w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n")
    w.writerow(fields)
    for r in src["stocks"]:
        row=[]
        for k in fields:
            v=r.get(k)
            if k=="flags": v="|".join(v or [])
            row.append("" if v is None else v)
        w.writerow(row)
print("compact rows:", len(src["stocks"]))
