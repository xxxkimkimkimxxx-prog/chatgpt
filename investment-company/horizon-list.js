(()=>{
let horizonData=null;
let lastLoadedAt=null;
let refreshTimer=null;
const hq=(s,e=document)=>e.querySelector(s), hqa=(s,e=document)=>[...e.querySelectorAll(s)];
const hesc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const hInfo={
  day:['DAY TRADE','デイトレ候補','候補を一覧で比較し、＋を押した銘柄だけ詳細を表示。寄り前順位は9:00〜9:10の価格構造で再審査します。'],
  swing:['SWING','スイング候補','数日〜6週間。材料の持続性・織り込み・相対強度・イベント期限を個別に確認します。'],
  medium:['MEDIUM TERM','中期候補','1〜12か月。テーマ純度だけでなく実需、利益、CF、バリュエーション、仮説破綻条件まで確認します。']
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
function itemsFor(h){return committeeFor(h)?.items||horizonData?.[h]||[];}
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
async function fetchDashboard(){
  const paths=['./committee/dashboard-latest.json','./committee/horizon-latest.json'];
  let lastErr=null;
  for(const path of paths){
    try{
      const r=await fetch(path+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(`${r.status} ${path}`);return await r.json();
    }catch(e){lastErr=e;}
  }
  throw lastErr||new Error('committee data unavailable');
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
