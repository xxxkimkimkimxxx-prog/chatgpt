(()=>{
let horizonData=null;
const hq=(s,e=document)=>e.querySelector(s), hqa=(s,e=document)=>[...e.querySelectorAll(s)];
const hesc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const hInfo={
  day:['DAY TRADE','デイトレ候補','候補を一覧で比較し、＋を押した銘柄だけ詳細を表示。寄り前順位は9:00〜9:10の価格構造で再審査します。'],
  swing:['SWING','スイング候補','数日〜6週間。材料の持続性・織り込み・相対強度・イベント期限を個別に確認します。'],
  medium:['MEDIUM TERM','中期候補','1〜12か月。テーマ純度だけでなく実需、利益、CF、バリュエーション、仮説破綻条件まで確認します。']
};
function categoryList(items){return ['all',...new Set(items.map(x=>x.category).filter(Boolean))];}
function detailRow(k,v){if(!v)return'';return `<div class="hzDetailRow"><span>${hesc(k)}</span><div>${hesc(v)}</div></div>`;}
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
      ${detailRow('見送り条件',x.skip)}
      ${detailRow('最大リスク',x.risk)}
      ${x.source?`<a class="hzSource" href="${hesc(x.source)}" target="_blank" rel="noopener">根拠情報を開く ↗</a>`:''}
    </div>
  </article>`;
}
function wireRows(){
  hqa('.hzStockHead',hq('#horizonGrid')).forEach(b=>b.addEventListener('click',()=>{
    const row=b.closest('.hzStockRow');const open=row.classList.toggle('open');b.setAttribute('aria-expanded',String(open));hq('.hzToggle',b).textContent=open?'−':'＋';
  }));
}
function renderList(h){
  if(!horizonData)return;
  state.horizon=h;state.view=h;
  const info=hInfo[h];
  hq('#horizonKicker').textContent=info[0];hq('#horizonTitle').textContent=info[1];hq('#horizonDesc').textContent=info[2];
  let items=[...(horizonData[h]||[])];
  const cats=categoryList(items);
  const current=(state.filter&&cats.includes(state.filter))?state.filter:'all';state.filter=current;
  hq('#themeFilters').innerHTML=cats.map(c=>`<button class="filterPill ${current===c?'active':''}" data-filter="${hesc(c)}">${hesc(c==='all'?'全候補':c)}</button>`).join('');
  hqa('.filterPill',hq('#themeFilters')).forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;renderList(h)});
  if(current!=='all')items=items.filter(x=>x.category===current);
  hq('#horizonGrid').className='horizonList';
  hq('#horizonGrid').innerHTML=items.length?items.map(stockRow).join(''):'<div class="emptyGrid">該当候補なし</div>';
  wireRows();
}
async function loadHorizons(){
  try{
    const r=await fetch('./committee/horizon-latest.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);horizonData=await r.json();
    renderHorizon=renderList;
    if(['day','swing','medium'].includes(state.view))renderList(state.view);
  }catch(e){console.error('horizon list',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadHorizons);else loadHorizons();
})();
