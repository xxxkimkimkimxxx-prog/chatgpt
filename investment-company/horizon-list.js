(()=>{
let horizonData=null;
let lastLoadedAt=null;
let refreshTimer=null;
const hq=(s,e=document)=>e.querySelector(s), hqa=(s,e=document)=>[...e.querySelectorAll(s)];
const hesc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const hInfo={
  day:['DAY TRADE','デイトレ候補','候補を一覧で比較し、＋を押した銘柄だけ詳細を表示。寄り前順位は9:00〜9:10の価格構造で再審査します。'],
  swing:['SWING','スイング候補','数日〜6週間。材料の持続性・織り込み・相対強度・イベント期限を個別に確認します。'],
  medium:['MEDIUM TERM','中期候補','1〜12か月。全上場銘柄を保有状況と切り離して比較し、主力・準主力に値する候補だけ表示します。保有銘柄の監視は上段の「保有レビュー」に分離します。']
};
function categoryList(items){return ['all',...new Set(items.map(x=>x.category).filter(Boolean))];}
function detailRow(k,v){if(!v)return'';return `<div class="hzDetailRow"><span>${hesc(k)}</span><div>${hesc(v)}</div></div>`;}
function fmtAsOf(v){if(!v)return'—';return String(v).replace('T',' ').replace('+09:00',' JST').slice(0,20)+(String(v).includes('+09:00')?' JST':'');}
function stockRow(x){
  return `<article class="hzStockRow" data-hz-code="${hesc(x.code)}">
    <button class="hzStockHead" type="button" aria-expanded="false">
      <span class="hzToggle">＋</span>
      <span class="hzRank">#${hesc(x.rank)}</span>
      <span class="hzIdentity"><b>${hesc(x.name)}</b><small>${hesc(x.code)} · ${hesc(x.category||'')}</small></span>
      <span class="hzTheme">${hesc(x.theme||'')}</span>
      <span class="hzGrade">${hesc(x.grade||'—')}</span>
    </button>
    <div class="hzStockBody">
      <div class="hzSummary">${hesc(x.summary||'')}</div>
      ${detailRow('WHY NOW',x.whyNow)}
      ${detailRow('採用条件',x.condition)}
      ${detailRow('見送り・破綻',x.skip)}
      ${detailRow('最大リスク',x.risk)}
      ${x.source?`<a class="hzSource" href="${hesc(x.source)}" target="_blank" rel="noopener">根拠情報を開く ↗</a>`:''}
    </div>
  </article>`;
}
function wireRows(){
  const grid=hq('#horizonGrid');if(!grid)return;
  hqa('.hzStockHead',grid).forEach(b=>b.addEventListener('click',()=>{
    const row=b.closest('.hzStockRow');const open=row.classList.toggle('open');b.setAttribute('aria-expanded',String(open));hq('.hzToggle',b).textContent=open?'−':'＋';
  }));
}
function committeeFor(h){return horizonData?.committees?.[h]||null;}
function isMarketCandidate(h,x){
  if(h!=='medium')return true;
  const grade=String(x?.grade||'');
  return !/(監視|投機|整理|保有レビュー)/.test(grade);
}
function itemsFor(h){
  const raw=committeeFor(h)?.items||horizonData?.[h]||[];
  return raw.filter(x=>isMarketCandidate(h,x));
}
function renderBrief(h){
  const box=hq('#committeeBrief');if(!box)return;
  const c=committeeFor(h);
  if(!c){box.innerHTML='';return;}
  const market=horizonData?.marketSnapshot;
  const gates=(c.gates||[]).map(x=>`<li>${hesc(x)}</li>`).join('');
  const marketPoints=(market?.points||[]).slice(0,4).map(x=>`<li>${hesc(x)}</li>`).join('');
  box.innerHTML=`
    <div class="committeeBriefTop">
      <div><span class="committeeTag">${hesc(c.kicker||'COMMITTEE')}</span><h3>${hesc(c.title||'投資委員会')}</h3></div>
      <div class="committeeAsOf">委員会 ${hesc(fmtAsOf(c.asOf))}<br><small>画面取得 ${hesc(lastLoadedAt||'—')}</small></div>
    </div>
    <div class="committeeConclusion"><b>結論</b><span>${hesc(c.conclusion||'')}</span></div>
    <div class="committeeBriefGrid">
      <section><h4>市場前提</h4><div class="committeeLead">${hesc(market?.headline||'')}</div>${marketPoints?`<ul>${marketPoints}</ul>`:''}</section>
      <section><h4>再審査ゲート</h4>${gates?`<ul>${gates}</ul>`:'<div class="committeeLead">—</div>'}</section>
      <section><h4>執行・資金配分</h4><div class="committeeLead">${hesc(c.execution||'—')}</div></section>
      <section><h4>保有レビュー</h4><div class="committeeLead">${hesc(c.holdings||'—')}</div></section>
    </div>`;
}
function renderList(h){
  if(!horizonData)return;
  state.horizon=h;state.view=h;
  const c=committeeFor(h);
  const info=hInfo[h];
  hq('#horizonKicker').textContent=c?.kicker||info[0];
  hq('#horizonTitle').textContent=c?.title||info[1];
  hq('#horizonDesc').textContent=info[2];
  renderBrief(h);
  let items=[...itemsFor(h)];
  const cats=categoryList(items);
  const current=(state.filter&&cats.includes(state.filter))?state.filter:'all';state.filter=current;
  hq('#themeFilters').innerHTML=cats.map(ca=>`<button class="filterPill ${current===ca?'active':''}" data-filter="${hesc(ca)}">${hesc(ca==='all'?'全候補':ca)}</button>`).join('');
  hqa('.filterPill',hq('#themeFilters')).forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;renderList(h)});
  if(current!=='all')items=items.filter(x=>x.category===current);
  hq('#horizonGrid').className='horizonList';
  hq('#horizonGrid').innerHTML=items.length?items.map(stockRow).join(''):'<div class="emptyGrid">該当候補なし</div>';
  wireRows();
}
function syncText(text,busy=false){
  const el=hq('#syncState');if(!el)return;el.textContent=text;el.classList.toggle('syncBusy',busy);
}
async function fetchJson(path){
  const r=await fetch(path+'?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(`${r.status} ${path}`);
  return await r.json();
}
function dayItems(d){
  return (d?.ranking||[]).map(x=>({
    rank:x.rank,code:x.code,name:x.name,
    grade:`${x.probabilityPct??x.probability??'—'}% / ${x.confidence||'—'}`,
    category:x.type||'Day trade',
    theme:x.material||x.catalyst||'',
    summary:x.material||x.catalyst||'',
    whyNow:[x.directness&&`直接度 ${x.directness}`,x.earningsSensitivity&&`収益感応度 ${x.earningsSensitivity}`,x.expectationGap&&`期待差 ${x.expectationGap}`,x.pricedIn&&`織り込み ${x.pricedIn}`].filter(Boolean).join(' / '),
    condition:x.entry||x.entryCondition||'',
    skip:[x.skip||x.skipCondition,x.invalidation&&`破綻: ${x.invalidation}`].filter(Boolean).join(' / '),
    risk:[x.riskPct&&`リスク ${x.riskPct}`,x.expectedPct&&`期待 ${x.expectedPct}`,x.rr&&`RR ${x.rr}`].filter(Boolean).join(' / ')
  }));
}
function swingItems(s){
  return (s?.swingCandidates||[]).map(x=>({
    rank:x.rank,code:x.code,name:x.name,
    grade:`${x.probability??'—'}% / ${x.confidence||'—'}`,
    category:x.sector||'Swing',
    theme:x.catalyst||'',
    summary:x.catalyst||'',
    whyNow:x.catalyst||'',
    condition:x.entryCondition||'',
    skip:[x.skipCondition,x.invalidCondition&&`破綻: ${x.invalidCondition}`].filter(Boolean).join(' / '),
    risk:[x.risks,x.holdingPeriod&&`保有 ${x.holdingPeriod}`,x.targetGuide&&`目標 ${x.targetGuide}`].filter(Boolean).join(' / ')
  }));
}
function mediumItems(m){
  return (m?.mainCandidates||[]).map(x=>({
    rank:x.rank,code:x.code,name:x.name,
    grade:x.rank<=4?'主力':'準主力',
    category:'中期候補',
    theme:'1〜12か月',
    summary:x.reason||'',
    whyNow:x.reason||'',
    condition:'構造テーマ・利益成長・価格水準を継続確認。',
    skip:'構造仮説の悪化、利益成長鈍化、または価格過熱で期待収益率が低下した場合。',
    risk:(m?.nearTermRisks||[]).join(' / ')
  }));
}
function mergeCanonical(base,day,strategy,longterm){
  const out=base&&typeof base==='object'?base:{autoRefreshMinutes:5,marketSnapshot:{headline:'',points:[]},committees:{}};
  out.committees=out.committees||{};
  if(day?.ranking?.length){
    out.asOf=day.asOf||out.asOf;
    out.marketSnapshot=out.marketSnapshot||{};
    out.marketSnapshot.headline=day.marketStance||out.marketSnapshot.headline||'';
    out.committees.day={
      kicker:'DAY TRADE COMMITTEE',title:`デイトレ投資委員会（${day.targetSession||'最新'} 正式候補）`,asOf:day.asOf,
      conclusion:'正式ランキングを表示。寄り後は初動高安・VWAP・出来高/売買代金・同業相対強度で再審査。',
      gates:day.required0900Checks||[],execution:day.executionPriority||'価格構造確認後に執行。',
      holdings:(day.holdingsRelevant||[]).map(x=>`${x.code} ${x.name}: ${x.role}`).join(' / '),items:dayItems(day)
    };
  }
  if(strategy?.swingCandidates?.length){
    out.committees.swing={
      kicker:'SWING COMMITTEE',title:`スイング候補（${strategy.targetSession||strategy.date||'最新'}）`,asOf:strategy.generatedAt||strategy.date,
      conclusion:'数日〜6週間の候補。材料の持続性・イベント期限・日足相対強度で採否を更新。',
      gates:['材料の持続性','日足支持・相対強度','GU後の全戻し有無','イベント/ヘッドラインリスク'],
      execution:strategy.riskPlan?.priority||'価格形成後に段階評価。',holdings:strategy.riskPlan?.portfolio||'保有理由で順位へ加点しない。',items:swingItems(strategy)
    };
  }
  if(longterm?.mainCandidates?.length){
    out.committees.medium={
      kicker:'MEDIUM TERM COMMITTEE',title:'中期候補（1〜12か月）',asOf:longterm.asOf,
      conclusion:longterm.macroOverlay||'構造テーマと企業利益を優先。',
      gates:['構造的な実需・利益感応度','ROIC/FCF/利益率','金利・円・原油耐性','価格過熱を追わない'],
      execution:'主力・準主力を分け、決算・押し目・イベントで再審査。',
      holdings:'保有状況は市場全体ランキングの加点要因にしない。',items:mediumItems(longterm)
    };
  }
  return out;
}
async function fetchDashboard(){
  let base=null,lastErr=null;
  for(const path of ['./committee/dashboard-latest.json','./committee/horizon-latest.json']){
    try{base=await fetchJson(path);break;}catch(e){lastErr=e;}
  }
  const results=await Promise.allSettled([
    fetchJson('../stock-dashboard/data/daytrade-latest.json'),
    fetchJson('../stock-dashboard/data/latest-strategy.json'),
    fetchJson('../stock-dashboard/data/longterm-latest.json')
  ]);
  const day=results[0].status==='fulfilled'?results[0].value:null;
  const strategy=results[1].status==='fulfilled'?results[1].value:null;
  const longterm=results[2].status==='fulfilled'?results[2].value:null;
  if(!base&&!day&&!strategy&&!longterm)throw lastErr||new Error('committee data unavailable');
  return mergeCanonical(base,day,strategy,longterm);
}
async function loadHorizons(silent=false){
  try{
    if(!silent)syncText('更新中…',true);
    const next=await fetchDashboard();
    horizonData=next;
    lastLoadedAt=new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
    renderHorizon=renderList;
    if(['day','swing','medium'].includes(state.view))renderList(state.view);
    const mins=Number(horizonData.autoRefreshMinutes||5);
    syncText(`自動更新 ${mins}分 · ${lastLoadedAt}`);
    scheduleRefresh(mins);
  }catch(e){
    console.error('horizon list',e);
    syncText('更新失敗 · クリックで再読込');
  }
}
function scheduleRefresh(minutes){
  if(refreshTimer)clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>loadHorizons(true),Math.max(1,minutes)*60*1000);
}
function bindRefresh(){
  const btn=hq('#refreshData');
  if(btn)btn.addEventListener('click',()=>{
    btn.disabled=true;btn.textContent='↻ 更新中…';syncText('全データ更新中…',true);
    const u=new URL(window.location.href);u.searchParams.set('refresh',Date.now());window.location.replace(u.toString());
  });
  const sync=hq('#syncState');
  if(sync){sync.title='委員会データは5分ごとに自動再取得。ボタンはニュース・思考ツリーを含む全画面を再読込します。';sync.addEventListener('click',()=>loadHorizons(false));}
}
window.refreshCommitteeData=()=>loadHorizons(false);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindRefresh();loadHorizons();});else{bindRefresh();loadHorizons();}
})();
