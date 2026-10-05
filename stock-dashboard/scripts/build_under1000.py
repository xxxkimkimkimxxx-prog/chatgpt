#!/usr/bin/env python3
from __future__ import annotations
import io, json, math, time as tm
from datetime import datetime, timedelta, time
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
import requests
import yfinance as yf

JPX_INDEX = "https://www.jpx.co.jp/markets/statistics-equities/misc/01.html"
OUT = Path("stock-dashboard/data/under1000.json")
JST = ZoneInfo("Asia/Tokyo")

def read_universe():
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin
    headers={"User-Agent":"Mozilla/5.0"}
    idx=requests.get(JPX_INDEX,timeout=60,headers=headers)
    idx.raise_for_status()
    soup=BeautifulSoup(idx.text,"html.parser")
    candidates=[]
    for a in soup.select("a[href]"):
        href=a.get("href","")
        txt=a.get_text(" ",strip=True)
        if ("data_j" in href and (".xls" in href or ".xlsx" in href)) or ("東証上場銘柄一覧" in txt and (".xls" in href or ".xlsx" in href)):
            candidates.append(urljoin(JPX_INDEX,href))
    if not candidates:
        raise RuntimeError("JPX listed-issues Excel link was not found")
    excel_url=candidates[0]
    print("JPX universe:",excel_url)
    r=requests.get(excel_url,timeout=60,headers=headers)
    r.raise_for_status()
    engine="xlrd" if excel_url.lower().split("?")[0].endswith(".xls") else None
    df=pd.read_excel(io.BytesIO(r.content),dtype=str,engine=engine)
    df.columns = [str(c).strip() for c in df.columns]
    def col(part):
        hits=[c for c in df.columns if part in c]
        if not hits: raise KeyError(f"missing JPX column: {part}; columns={list(df.columns)}")
        return hits[0]
    code_col, name_col = col("コード"), col("銘柄名")
    market_col, sector_col = col("市場・商品区分"), col("33業種区分")
    date_col = next((c for c in df.columns if "日付" in c), None)
    m = df[market_col].fillna("")
    df = df[m.str.contains("内国株式", regex=False) & m.str.contains("プライム|スタンダード|グロース", regex=True)].copy()
    df["code"] = df[code_col].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    df["name"] = df[name_col].astype(str).str.strip()
    df["sector"] = df[sector_col].fillna("—").astype(str).str.strip()
    df["market"] = df[market_col].map(lambda x: "プライム" if "プライム" in x else ("スタンダード" if "スタンダード" in x else "グロース"))
    df = df[df["code"].str.len().between(4,5)].drop_duplicates("code")
    universe_asof = None
    if date_col:
        vals=df[date_col].dropna().astype(str)
        if len(vals): universe_asof=vals.iloc[0]
    return df[["code","name","market","sector"]].reset_index(drop=True), universe_asof

def window():
    now=datetime.now(JST)
    end = now.date() if now.time() < time(16, 0) else now.date()+timedelta(days=1)
    start = end - timedelta(days=370)
    return start.isoformat(), end.isoformat()

def get_frames(tickers, start, end):
    d=yf.download(tickers=tickers,start=start,end=end,interval="1d",auto_adjust=False,actions=False,
                  progress=False,threads=True,group_by="column",timeout=45)
    if d is None or d.empty:
        return {},{}
    closes, adjs = {}, {}
    if isinstance(d.columns, pd.MultiIndex):
        lv0=set(d.columns.get_level_values(0))
        cdf=d["Close"] if "Close" in lv0 else None
        adf=d["Adj Close"] if "Adj Close" in lv0 else cdf
        if cdf is not None:
            for t in tickers:
                if t in cdf.columns: closes[t]=cdf[t]
                if adf is not None and t in adf.columns: adjs[t]=adf[t]
    else:
        t=tickers[0]
        if "Close" in d.columns: closes[t]=d["Close"]
        adjs[t]=d["Adj Close"] if "Adj Close" in d.columns else d.get("Close")
    return closes,adjs

def fetch_market(codes):
    start,end=window()
    close_map,adj_map={},{}
    tickers=[f"{c}.T" for c in codes]
    chunks=[tickers[i:i+60] for i in range(0,len(tickers),60)]
    for i,ch in enumerate(chunks,1):
        try:
            c,a=get_frames(ch,start,end);close_map.update(c);adj_map.update(a)
            print(f"chunk {i}/{len(chunks)}: {len(c)} prices")
        except Exception as e:
            print(f"chunk {i} failed: {e}")
        tm.sleep(0.8)
    missing=[t for t in tickers if t not in close_map or close_map[t].dropna().empty]
    if missing:
        print(f"retrying {len(missing)} missing tickers")
        for i in range(0,len(missing),20):
            ch=missing[i:i+20]
            try:
                c,a=get_frames(ch,start,end);close_map.update(c);adj_map.update(a)
            except Exception as e:
                print("retry failed:",e)
            tm.sleep(1.2)
    prices,vols,days,dates={},{},{},{}
    for c in codes:
        t=f"{c}.T"
        cs=close_map.get(t)
        ads=adj_map.get(t)
        if cs is None: continue
        cs=pd.to_numeric(cs,errors="coerce").dropna()
        if cs.empty: continue
        prices[c]=float(cs.iloc[-1]);dates[c]=pd.Timestamp(cs.index[-1]).date().isoformat()
        if ads is None: ads=cs
        ads=pd.to_numeric(ads,errors="coerce").replace([np.inf,-np.inf],np.nan).dropna()
        days[c]=int(len(ads))
        ret=ads.pct_change(fill_method=None).replace([np.inf,-np.inf],np.nan).dropna()
        if len(ret)>=20:
            vols[c]=float(ret.std(ddof=1)*math.sqrt(252)*100)
    return prices,vols,days,dates

def main():
    universe, universe_asof=read_universe()
    prices,vols,days,dates=fetch_market(universe["code"].tolist())
    valid=pd.Series(vols,dtype="float64")
    ranks=valid.rank(method="average",pct=True)
    scores=(np.ceil(ranks*10).clip(1,10)).astype("Int64")
    rows=[]
    for r in universe.itertuples(index=False):
        p=prices.get(r.code)
        if p is None or not (0 < p <= 1000): continue
        v=vols.get(r.code)
        rows.append({
            "code":r.code,"name":r.name,"price":round(p,2),"market":r.market,"sector":r.sector,
            "volPct":round(v,2) if v is not None else None,
            "volScore":int(scores.loc[r.code]) if r.code in scores.index and pd.notna(scores.loc[r.code]) else None,
            "historyDays":days.get(r.code,0),
            "priceDate":dates.get(r.code)
        })
    rows.sort(key=lambda x:(-(x["volScore"] or 0),-x["price"],x["code"]))
    date_values=pd.Series([x["priceDate"] for x in rows if x["priceDate"]])
    price_date=date_values.mode().iloc[0] if len(date_values) else None
    payload={
        "generatedAt":datetime.now(JST).isoformat(timespec="seconds"),
        "priceDate":price_date,
        "universeAsOf":universe_asof,
        "universeCount":int(len(universe)),
        "pricedUniverseCount":int(len(prices)),
        "rowsCount":len(rows),
        "methodology":{
            "price":"latest completed daily close available at update time",
            "volatility":"std of daily adjusted-close returns × sqrt(252), annualized percent",
            "score":"decile score 1-10 versus all TSE Prime/Standard/Growth domestic common stocks with calculable volatility",
            "partialHistory":"stocks with fewer than ~220 observations are displayed as reference"
        },
        "rows":rows
    }
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(f"wrote {OUT}: {len(rows)} rows; price date={price_date}; universe={len(universe)}")

if __name__=="__main__":
    main()
