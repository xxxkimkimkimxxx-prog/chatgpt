#!/usr/bin/env python3
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent
src = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
stocks = src["stocks"]

fields = [
    "symbol","code","company","price","high_52w","low_52w","range_position",
    "sector","industry","market","volume","relative_volume","market_cap","per","pbr",
    "dividend_yield","eps_ttm","perf_1y","flags"
]
with (ROOT / "compact.tsv").open("w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n")
    w.writerow(fields)
    for r in stocks:
        row=[]
        for k in fields:
            v=r.get(k)
            if k=="flags":
                v="|".join(v or [])
            row.append("" if v is None else v)
        w.writerow(row)


def oknum(v):
    return isinstance(v, (int, float))


def slim(r):
    keys = [
        "symbol","code","company","price","high_52w","low_52w","range_position",
        "sector","industry","market","volume","relative_volume","market_cap","per","pbr",
        "dividend_yield","eps_ttm","perf_1y","flags"
    ]
    return {k:r.get(k) for k in keys}

sector_counts = Counter(r.get("sector") or "未分類" for r in stocks)
exchange_counts = Counter(r.get("market") or "未分類" for r in stocks)

insights = {
    "meta": src["meta"],
    "counts": {
        "total": len(stocks),
        "under_50": sum(1 for r in stocks if oknum(r.get("price")) and r["price"] < 50),
        "under_100": sum(1 for r in stocks if oknum(r.get("price")) and r["price"] < 100),
        "loss_making_ttm": sum(1 for r in stocks if oknum(r.get("eps_ttm")) and r["eps_ttm"] < 0),
        "low_52w_zone": sum(1 for r in stocks if oknum(r.get("range_position")) and r["range_position"] <= 15),
        "high_52w_zone": sum(1 for r in stocks if oknum(r.get("range_position")) and r["range_position"] >= 85),
        "low_liquidity": sum(1 for r in stocks if oknum(r.get("volume")) and r["volume"] < 100000),
        "rvol_hot": sum(1 for r in stocks if oknum(r.get("relative_volume")) and r["relative_volume"] >= 3),
    },
    "sector_counts": dict(sector_counts.most_common()),
    "exchange_counts": dict(exchange_counts.most_common()),
    "top_relative_volume": [slim(r) for r in sorted(
        [r for r in stocks if oknum(r.get("relative_volume"))],
        key=lambda r:r["relative_volume"], reverse=True)[:10]],
    "near_low_profitable_liquid": [slim(r) for r in sorted(
        [r for r in stocks if oknum(r.get("range_position")) and r["range_position"] <= 20
         and oknum(r.get("eps_ttm")) and r["eps_ttm"] > 0
         and oknum(r.get("volume")) and r["volume"] >= 100000],
        key=lambda r:(r["range_position"], -(r.get("market_cap") or 0)))[:15]],
    "top_dividend_yield": [slim(r) for r in sorted(
        [r for r in stocks if oknum(r.get("dividend_yield")) and r["dividend_yield"] > 0],
        key=lambda r:r["dividend_yield"], reverse=True)[:10]],
    "strongest_1y": [slim(r) for r in sorted(
        [r for r in stocks if oknum(r.get("perf_1y"))],
        key=lambda r:r["perf_1y"], reverse=True)[:10]],
    "weakest_1y": [slim(r) for r in sorted(
        [r for r in stocks if oknum(r.get("perf_1y"))],
        key=lambda r:r["perf_1y"])[:10]],
}
(ROOT / "insights.json").write_text(json.dumps(insights, ensure_ascii=False, indent=2), encoding="utf-8")
print("compact rows:", len(stocks))
print("insights:", insights["counts"])
