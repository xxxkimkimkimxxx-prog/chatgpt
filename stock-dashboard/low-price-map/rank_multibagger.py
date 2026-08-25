#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).parent
src = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
rows = src["stocks"]

def num(v, default=0):
    return v if isinstance(v, (int,float)) else default

def score(r):
    s = 0
    reasons = []
    cap = num(r.get("market_cap"), 10**15)
    five_cap = cap * 5
    eps = r.get("eps_ttm")
    per = r.get("per")
    pbr = r.get("pbr")
    roe = r.get("roe")
    de = r.get("debt_to_equity")
    vol = num(r.get("volume"), 0)
    rvol = num(r.get("relative_volume"), 1)
    pos = r.get("range_position")
    perf = r.get("perf_1y")

    # Small current market cap / realistic 5x destination.
    if cap <= 2e9: s += 20; reasons.append("時価総額20億円以下")
    elif cap <= 5e9: s += 17; reasons.append("時価総額50億円以下")
    elif cap <= 1e10: s += 14; reasons.append("時価総額100億円以下")
    elif cap <= 3e10: s += 9
    elif cap <= 1e11: s += 4

    if five_cap <= 1e10: s += 14; reasons.append("5倍後でも100億円以下")
    elif five_cap <= 3e10: s += 11; reasons.append("5倍後でも300億円以下")
    elif five_cap <= 5e10: s += 8
    elif five_cap <= 1e11: s += 5
    elif five_cap <= 3e11: s += 2

    # Earnings / valuation quality.
    if isinstance(eps,(int,float)) and eps > 0:
        s += 14; reasons.append("TTM黒字")
    elif isinstance(eps,(int,float)) and eps < 0:
        s -= 8
    if isinstance(per,(int,float)) and 0 < per <= 20:
        s += 7; reasons.append("PER20倍以下")
    elif isinstance(per,(int,float)) and per > 80:
        s -= 3
    if isinstance(pbr,(int,float)) and 0 < pbr < 1:
        s += 6; reasons.append("PBR1倍割れ")
    elif isinstance(pbr,(int,float)) and pbr > 8:
        s -= 3
    if isinstance(roe,(int,float)) and roe > 8:
        s += 5; reasons.append("ROE8%超")
    elif isinstance(roe,(int,float)) and roe < -20:
        s -= 4
    if isinstance(de,(int,float)) and de <= 1:
        s += 3
    elif isinstance(de,(int,float)) and de > 3:
        s -= 3

    # Entry-zone / liquidity. Avoid illiquid lottery-like names.
    if isinstance(pos,(int,float)):
        if 10 <= pos <= 45: s += 7; reasons.append("52週レンジ下位")
        elif pos < 10: s += 3
        elif pos >= 90: s -= 4
    if vol >= 1_000_000: s += 7; reasons.append("高流動性")
    elif vol >= 300_000: s += 5
    elif vol >= 100_000: s += 2
    else: s -= 8
    if rvol >= 10: s -= 5
    elif rvol >= 3: s -= 2
    if isinstance(perf,(int,float)):
        if -40 <= perf <= 20: s += 4
        elif perf <= -70: s -= 4
        elif perf >= 150: s -= 3

    # Penny-stock risk penalty.
    price = num(r.get("price"),0)
    if price < 30: s -= 6
    elif price < 50: s -= 3

    return round(s,1), reasons[:6]

ranked=[]
for r in rows:
    sc, reasons = score(r)
    x = {k:r.get(k) for k in ["symbol","code","company","price","market_cap","high_52w","low_52w","range_position","sector","industry","volume","relative_volume","per","pbr","dividend_yield","eps_ttm","roe","debt_to_equity","perf_1y","flags"]}
    x["score_quant"] = sc
    x["market_cap_5x"] = round(num(r.get("market_cap"))*5,0) if r.get("market_cap") is not None else None
    x["capital_1000_shares"] = round(num(r.get("price"))*1000,0)
    x["profit_if_5x_1000"] = round(num(r.get("price"))*4000,0)
    x["quant_reasons"] = reasons
    ranked.append(x)
ranked.sort(key=lambda x:(-x["score_quant"], num(x.get("market_cap"),10**15)))
out={
  "meta":{
    "generated_at_jst":src["meta"].get("generated_at_jst"),
    "universe_count":len(rows),
    "note":"定量一次選抜。最終順位はIR・TDnet・希薄化・事業カタリストを加味して別途更新する。"
  },
  "top20_quant":ranked[:20],
  "top50_quant":ranked[:50]
}
(ROOT / "multibagger_rank.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ranked",len(rows),"top",ranked[0]["code"],ranked[0]["score_quant"])
