#!/usr/bin/env python3
import json
import math
import os
import sys
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ENDPOINT = "https://scanner.tradingview.com/japan/scan"
OUT = Path(__file__).with_name("data.json")

COLUMNS = [
    "name",
    "description",
    "close",
    "change",
    "volume",
    "relative_volume_10d_calc",
    "market_cap_basic",
    "price_52_week_high",
    "price_52_week_low",
    "price_earnings_ttm",
    "price_book_fq",
    "dividends_yield_current",
    "earnings_per_share_diluted_ttm",
    "sector",
    "sector.tr",
    "industry",
    "industry.tr",
    "market",
    "exchange",
    "Perf.Y",
    "return_on_equity_fq",
    "debt_to_equity_fq",
]


def _expr(left, operation, right):
    return {"expression": {"left": left, "operation": operation, "right": right}}


def build_query():
    # Common/preferred stocks and DRs only; exclude ETFs/funds/pre-IPO securities.
    return {
        "markets": ["japan"],
        "symbols": {},
        "options": {"lang": "ja"},
        "columns": COLUMNS,
        "filter": [
            {"left": "is_primary", "operation": "equal", "right": True},
            {"left": "close", "operation": "greater", "right": 0},
            {"left": "close", "operation": "less", "right": 300.0001},
        ],
        "filter2": {
            "operator": "and",
            "operands": [
                {
                    "operation": {
                        "operator": "or",
                        "operands": [
                            {
                                "operation": {
                                    "operator": "and",
                                    "operands": [
                                        _expr("type", "equal", "stock"),
                                        _expr("typespecs", "has", ["common"]),
                                    ],
                                }
                            },
                            {
                                "operation": {
                                    "operator": "and",
                                    "operands": [
                                        _expr("type", "equal", "stock"),
                                        _expr("typespecs", "has", ["preferred"]),
                                    ],
                                }
                            },
                            {
                                "operation": {
                                    "operator": "and",
                                    "operands": [_expr("type", "equal", "dr")],
                                }
                            },
                        ],
                    }
                },
                _expr("typespecs", "has_none_of", ["pre-ipo"]),
            ],
        },
        "sort": {"sortBy": "close", "sortOrder": "asc"},
        "range": [0, 5000],
        "ignore_unknown_fields": True,
    }


def fetch(query):
    body = json.dumps(query, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (compatible; LowPriceJapanStocks/1.0)",
            "Origin": "https://www.tradingview.com",
            "Referer": "https://www.tradingview.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def finite(v):
    return isinstance(v, (int, float)) and math.isfinite(v)


def round_or_none(v, digits=2):
    return round(v, digits) if finite(v) else None


def make_flags(row):
    flags = []
    price = row.get("price")
    cap = row.get("market_cap")
    vol = row.get("volume")
    rvol = row.get("relative_volume")
    eps = row.get("eps_ttm")
    pos = row.get("range_position")
    perf = row.get("perf_1y")

    if finite(price) and price < 50:
        flags.append("超低位")
    elif finite(price) and price < 100:
        flags.append("低位")
    if finite(cap) and cap < 2_000_000_000:
        flags.append("極小時価総額")
    elif finite(cap) and cap < 10_000_000_000:
        flags.append("小型")
    if finite(vol) and vol < 100_000:
        flags.append("低流動性")
    if finite(rvol) and rvol >= 3:
        flags.append("出来高過熱")
    if finite(eps) and eps < 0:
        flags.append("赤字TTM")
    if finite(pos) and pos <= 15:
        flags.append("52週安値圏")
    if finite(pos) and pos >= 85:
        flags.append("52週高値圏")
    if finite(perf) and abs(perf) >= 100:
        flags.append("1年変動大")
    return flags


def normalize(payload):
    rows = []
    for item in payload.get("data", []):
        symbol = item.get("s") or ""
        d = item.get("d") or []
        values = {col: (d[i] if i < len(d) else None) for i, col in enumerate(COLUMNS)}
        ticker = str(values.get("name") or symbol.split(":")[-1]).strip()
        company = str(values.get("description") or ticker).strip()
        price = values.get("close")
        if not finite(price) or not (0 < price <= 300.0001):
            continue
        high52 = values.get("price_52_week_high")
        low52 = values.get("price_52_week_low")
        pos = None
        dist_high = None
        dist_low = None
        if finite(high52) and finite(low52) and high52 > low52:
            pos = (price - low52) / (high52 - low52) * 100
        if finite(high52) and high52 > 0:
            dist_high = (high52 - price) / high52 * 100
        if finite(low52) and low52 > 0:
            dist_low = (price - low52) / low52 * 100

        row = {
            "symbol": symbol,
            "code": ticker,
            "company": company,
            "price": round_or_none(price, 3),
            "change": round_or_none(values.get("change"), 2),
            "volume": int(values["volume"]) if finite(values.get("volume")) else None,
            "relative_volume": round_or_none(values.get("relative_volume_10d_calc"), 2),
            "market_cap": round_or_none(values.get("market_cap_basic"), 0),
            "high_52w": round_or_none(high52, 3),
            "low_52w": round_or_none(low52, 3),
            "range_position": round_or_none(pos, 1),
            "distance_from_high": round_or_none(dist_high, 1),
            "distance_from_low": round_or_none(dist_low, 1),
            "per": round_or_none(values.get("price_earnings_ttm"), 2),
            "pbr": round_or_none(values.get("price_book_fq"), 2),
            "dividend_yield": round_or_none(values.get("dividends_yield_current"), 2),
            "eps_ttm": round_or_none(values.get("earnings_per_share_diluted_ttm"), 2),
            "roe": round_or_none(values.get("return_on_equity_fq"), 2),
            "debt_to_equity": round_or_none(values.get("debt_to_equity_fq"), 2),
            "sector": values.get("sector.tr") or values.get("sector") or "未分類",
            "sector_raw": values.get("sector"),
            "industry": values.get("industry.tr") or values.get("industry") or "未分類",
            "industry_raw": values.get("industry"),
            "market": values.get("market") or values.get("exchange") or symbol.split(":")[0],
            "perf_1y": round_or_none(values.get("Perf.Y"), 2),
        }
        row["flags"] = make_flags(row)
        rows.append(row)

    # Deduplicate by primary symbol/code, keeping the row with the greatest volume.
    dedup = {}
    for r in rows:
        k = r["symbol"] or r["code"]
        prev = dedup.get(k)
        if prev is None or (r.get("volume") or 0) > (prev.get("volume") or 0):
            dedup[k] = r
    rows = sorted(dedup.values(), key=lambda x: (x.get("price") or 10**9, str(x.get("code"))))
    return rows


def build_output(rows, payload):
    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    prices = sorted(r["price"] for r in rows if finite(r.get("price")))
    median = None
    if prices:
        n = len(prices)
        median = prices[n // 2] if n % 2 else (prices[n // 2 - 1] + prices[n // 2]) / 2
    sectors = Counter(r.get("sector") or "未分類" for r in rows)
    return {
        "meta": {
            "generated_at": now.isoformat(timespec="seconds"),
            "generated_at_jst": now.strftime("%Y-%m-%d %H:%M:%S JST"),
            "threshold": 300,
            "count": len(rows),
            "median_price": round_or_none(median, 2),
            "source": "TradingView Stock Screener / ICE Data Services・FactSet reference data",
            "source_endpoint": ENDPOINT,
            "total_count_returned": payload.get("totalCount"),
            "definition": "日本市場の一次上場かつ株価0円超300円以下の普通株・優先株・DR。ETF/投信/Pre-IPOは除外。",
        },
        "sector_counts": dict(sectors.most_common()),
        "stocks": rows,
    }


def main():
    try:
        payload = fetch(build_query())
        rows = normalize(payload)
        if not rows:
            raise RuntimeError("Scanner returned zero matching rows")
        output = build_output(rows, payload)
        OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {len(rows)} stocks to {OUT}")
        print(output["meta"])
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
