(()=>{
const $=(s,e=document)=>e.querySelector(s);
const fmt=(n,d=0)=>Number.isFinite(Number(n))?Number(n).toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>Number.isFinite(Number(n))?((Number(n)>0?'+':'')+Number(n).toFixed(2)+'%'):'—';
const state={watch:null,holdings:null,quotes:null,detail:null,code:null,stockMap:new Map()};
const paths={
  watch:'../../stock-dashboard/data/watchlist.json',
  holdings:'../../stock-dashboard/data/holdings.json',
  quotes:'../../stock-dashboard/data/live-quotes.json'
};
async function json(path){const r=await fetch(path+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status+' '+path);return r.json()}
function status(t){$('#statusBar').textContent=t}
function stockName(code){return state.stockMap.get(code)?.name||code}
function mergeUniverse(){
  const map=new Map();
  const held=(state.holdings?.positions||[]);
  held.forEach(x=>{
    const code=String(x.code);
    map.set(code,{code,name:x.name,holding:true,position:x,source:'holding'});
  });
  let added=0;
  for(const x of (state.watch?.candidates||[])){
    const code=String(x.code);
    if(map.has(code)){
      map.set(code,{...map.get(code),...x,code,name:x.name||map.get(code).name,holding:true,position:map.get(code).position,source:'holding+watchlist'});
      continue;
    }
    if(added>=10) break;
    map.set(code,{...x,code,source:'watchlist-top10'});
    added++;
  }
  state.stockMap=map;
  const sel=$('#stockSelect');
  const items=[...map.values()].sort((a,b)=>{
    if(a.holding!==b.holding) return a.holding?-1:1;
    if(a.holding&&b.holding) return String(a.code).localeCompare(String(b.code));
    return (a.rank??999)-(b.rank??999);
  });
  sel.innerHTML=items.map(x=>'<option value="'+escapeHtml(x.code)+'">'+escapeHtml((x.holding?'★ ':'')+x.code+' '+x.name)+'</option>').join('');
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function loadDetail(code){try{return await json('./data/'+encodeURIComponent(code)+'.json')}catch(e){return null}}
function numberOrNull(v){return Number.isFinite(Number(v))?Number(v):null}
function quoteFor(code){return state.quotes?.quotes?.[code]||null}
function setText(id,v){$(id).textContent=v==null||v===''?'—':v}
function setChange(elId,val){const el=$(elId);el.classList.remove('pos','neg');if(Number.isFinite(Number(val)))el.classList.add(Number(val)>=0?'pos':'neg')}
function renderHeader(code,meta,detail){
  setText('#stockName',detail?.name||meta?.name||code);setText('#stockCode',code);
  const wb=$('#watchBadge'); if(meta?.rank){wb.textContent='#'+meta.rank+' '+(meta.category||'WATCH');wb.classList.remove('hidden')}else wb.classList.add('hidden');
  $('#holdingBadge').classList.toggle('hidden',!meta?.holding);
}
function renderQuote(code,detail){
  const q=quoteFor(code), price=numberOrNull(q?.price??detail?.price?.value);
  setText('#price',price==null?'未取得':fmt(price)+(detail?.price?.unit||'円'));
  setText('#currentPriceLabel',price==null?'—':fmt(price)+'円');
  setText('#change',q?pct(q.changePct):'—');setChange('#change',q?.changePct);
  const vol=numberOrNull(q?.volume??detail?.price?.volume);setText('#volume',vol==null?'—':fmt(vol)+'株');
  setText('#quoteAsOf',q?.observedAt?'株価 '+q.observedAt:(detail?.price?.asOf||'株価未取得'));
  const div=numberOrNull(detail?.fundamentals?.dividendPerShare),dy=numberOrNull(detail?.fundamentals?.dividendYield);
  setText('#dividend',div==null?'—':fmt(div,detail?.fundamentals?.dividendDecimals||0)+'円');
  setText('#divYield',dy==null?'—':dy.toFixed(2)+'%');
  const per=detail?.fundamentals?.perRange||{},pbr=detail?.fundamentals?.pbrRange||{};
  setText('#perMin',per.min??'—');setText('#perNow',per.current??'—');setText('#perMax',per.max??'—');
  setText('#pbrMin',pbr.min??'—');setText('#pbrNow',pbr.current??'—');setText('#pbrMax',pbr.max??'—');
}
function balanceText(v){return Number.isFinite(Number(v))?fmt(v,1)+'万株':'—'}
function renderCredit(detail){
  const c=detail?.credit||{};
  setText('#creditRatio',c.ratio!=null&&Number.isFinite(Number(c.ratio))?Number(c.ratio).toFixed(2):'—');
  setText('#creditAsOf',c.asOf?c.asOf+' 時点':'未取得');
  setText('#buyBalance',balanceText(c.buyBalance10k));setText('#sellBalance',balanceText(c.sellBalance10k));
  setText('#buyChange',c.buyChange13wPct==null?'13週比 未取得':'13週比 '+pct(c.buyChange13wPct));
  setText('#sellChange',c.sellChange13wPct==null?'13週比 未取得':'13週比 '+pct(c.sellChange13wPct));
  const rr=c.ratioRange||c.ratioRange2y||{};
  setText('#ratioRangeText',(rr.min!=null&&rr.max!=null)?Number(rr.min).toFixed(2)+' ～ '+Number(rr.max).toFixed(2)+'倍':'—');
  setText('#ratioMin',rr.min!=null?'最低 '+Number(rr.min).toFixed(2)+'倍':'最低 —');
  setText('#ratioMax',rr.max!=null?'最高 '+Number(rr.max).toFixed(2)+'倍':'最高 —');
  const pos=(rr.min!=null&&rr.max!=null&&c.ratio!=null&&rr.max>rr.min)?Math.max(0,Math.min(100,(c.ratio-rr.min)/(rr.max-rr.min)*100)):50;
  $('#ratioMarker').style.left=pos+'%';
  renderChart(c.history||[],c.historyScope||'');
  renderDaily(c.daily||[]);
}
function renderDaily(rows){
  const body=$('#dailyRows'); const data=rows.slice(0,5);
  body.innerHTML=data.length?data.map(r=>'<tr><td>'+escapeHtml(r.date||'—')+'</td><td>'+balanceText(r.sellBalance10k)+'</td><td>'+balanceText(r.buyBalance10k)+'</td><td>'+(r.ratio==null?'—':Number(r.ratio).toFixed(2))+'</td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;color:#8491a2;padding:18px 0">信用データ未取得</td></tr>';
  setText('#dailyStatus',data.length?data.length+'公表日':'未接続');
}
function renderChart(rows,scope){
  const svg=$('#creditChart'),empty=$('#chartEmpty');
  if(!Array.isArray(rows)||rows.length<2){svg.innerHTML='';empty.classList.remove('hidden');setText('#creditScope','時系列未接続');return}
  empty.classList.add('hidden');setText('#creditScope',scope||rows.length+'公表日');
  const W=780,H=250,pL=48,pR=48,pT=20,pB=30;
  const buys=rows.map(x=>Number(x.buyBalance10k)||0),sells=rows.map(x=>Number(x.sellBalance10k)||0),rats=rows.map(x=>x.ratio==null?null:Number(x.ratio));
  const finiteRats=rats.filter(Number.isFinite);const maxBal=Math.max(1,...buys,...sells)*1.12,maxRat=Math.max(1,...finiteRats)*1.15;
  const x=i=>pL+i*(W-pL-pR)/(rows.length-1), yBal=v=>H-pB-(v/maxBal)*(H-pT-pB), yRat=v=>H-pB-(v/maxRat)*(H-pT-pB);
  const path=(arr,fn)=>arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+fn(v).toFixed(1)).join(' ');const nullablePath=(arr,fn)=>{let d='',open=false;arr.forEach((v,i)=>{if(!Number.isFinite(v)){open=false;return}d+=(open?'L':'M')+x(i).toFixed(1)+' '+fn(v).toFixed(1)+' ';open=true});return d.trim()};
  let g='';
  for(let i=0;i<5;i++){const yy=pT+i*(H-pT-pB)/4;g+='<line x1="'+pL+'" y1="'+yy+'" x2="'+(W-pR)+'" y2="'+yy+'" stroke="#e5eaf1" stroke-width="1"/><text x="4" y="'+(yy+4)+'" font-size="9" fill="#7b8796">'+fmt(maxBal*(1-i/4),0)+'</text><text x="'+(W-42)+'" y="'+(yy+4)+'" font-size="9" fill="#8057c9">'+(maxRat*(1-i/4)).toFixed(1)+'</text>'}
  const labels=rows.map((r,i)=>{if(rows.length>8&&i%2&&i!==rows.length-1)return'';return '<text x="'+x(i)+'" y="'+(H-7)+'" text-anchor="middle" font-size="9" fill="#7b8796">'+escapeHtml(String(r.date||'').slice(5))+'</text>'}).join('');
  const rp=nullablePath(rats,yRat);svg.innerHTML=g+'<path d="'+path(buys,yBal)+'" fill="none" stroke="#2f69c7" stroke-width="3"/><path d="'+path(sells,yBal)+'" fill="none" stroke="#df5f69" stroke-width="2.5"/>'+(rp?'<path d="'+rp+'" fill="none" stroke="#8057c9" stroke-width="2.5" stroke-dasharray="7 5"/>':'')+labels;
}
function renderValuation(detail){
  const rows=detail?.valuation||[];const wrap=$('#valuationRows'),empty=$('#valuationEmpty');
  if(!rows.length){wrap.innerHTML='';empty.classList.remove('hidden');return}empty.classList.add('hidden');
  const vals=rows.flatMap(r=>[numberOrNull(r.low),numberOrNull(r.high)]).filter(v=>v!=null);const min=Math.min(...vals),max=Math.max(...vals);const span=Math.max(1,max-min);
  wrap.innerHTML=rows.map(r=>{const low=numberOrNull(r.low),high=numberOrNull(r.high),center=numberOrNull(r.center);if(low==null||high==null||center==null)return'';
    const l=(low-min)/span*100,h=(high-min)/span*100,c=(center-min)/span*100;
    return '<div class="sdValRow"><div class="sdValName">'+escapeHtml(r.label||'')+'</div><div class="sdValTrack"><div class="band" style="left:'+l+'%;width:'+Math.max(2,h-l)+'%"></div><div class="centerLabel" style="left:'+c+'%">'+fmt(center)+'</div><div class="center" style="left:'+c+'%"></div><div class="low" style="left:'+l+'%">'+fmt(low)+'</div><div class="high" style="left:'+h+'%">'+fmt(high)+'</div></div></div>'}).join('');
}
function renderAi(code,meta){
  setText('#aiRank',meta?.rank?'#'+meta.rank:'ランキング外');
  setText('#aiCategory',meta?.category||meta?.source||'—');
  setText('#aiHolding',meta?.holding?'保有 '+fmt(meta.position?.quantity)+'株':'なし');
}
async function select(code){
  state.code=String(code);const meta=state.stockMap.get(state.code)||{code:state.code,name:state.code};$('#stockSelect').value=state.code;
  status(state.code+' 詳細データ読込中…');const detail=await loadDetail(state.code);state.detail=detail;
  renderHeader(state.code,meta,detail);renderQuote(state.code,detail);renderCredit(detail);renderValuation(detail);renderAi(state.code,meta);
  const u=new URL(location.href);u.searchParams.set('code',state.code);history.replaceState(null,'',u);
  const heldCount=(state.holdings?.positions||[]).length;
  const extraCount=Math.max(0,state.stockMap.size-heldCount);
  const parts=['対象 '+state.stockMap.size+'銘柄（保有'+heldCount+'＋市場情報部上位'+extraCount+'）',state.watch?.asOf&&'候補 '+state.watch.asOf,state.quotes?.asOf&&'株価 '+state.quotes.asOf,detail?.source?.label&&'詳細 '+detail.source.label].filter(Boolean);
  status(parts.join(' / ')||'データソース未取得');
}
async function load(){
  status('GitHubデータ読込中…');
  const r=await Promise.allSettled([json(paths.watch),json(paths.holdings),json(paths.quotes)]);
  state.watch=r[0].status==='fulfilled'?r[0].value:null;state.holdings=r[1].status==='fulfilled'?r[1].value:null;state.quotes=r[2].status==='fulfilled'?r[2].value:null;
  mergeUniverse();
  const q=new URLSearchParams(location.search).get('code');
  const firstHolding=(state.holdings?.positions||[])[0]?.code;
  const defaultCode=firstHolding?String(firstHolding):([...(state.stockMap.keys())][0]||'285A');
  const code=state.stockMap.has(q)?q:(q||defaultCode);
  if(!state.stockMap.has(code)){state.stockMap.set(code,{code,name:code});const o=document.createElement('option');o.value=code;o.textContent=code;$('#stockSelect').appendChild(o)}
  await select(code);
}
$('#stockSelect').addEventListener('change',e=>select(e.target.value));
$('#refreshBtn').addEventListener('click',()=>load());
load().catch(e=>{console.error(e);status('読込エラー: '+e.message)});
})();