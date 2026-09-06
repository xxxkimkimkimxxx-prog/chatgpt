(()=>{
const qs=(s,e=document)=>e.querySelector(s), qsa=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const state={data:null,filter:'fresh'};
const themeKeyword={
  'physical-ai-autonomous-sdv':'自動運転',
  'ai-datacenter-power-flexibility':'電力',
  'defense-ai-unmanned':'防衛',
  'critical-infrastructure-cyber':'サイバー',
  'ai-optical-connectivity':'光接続'
};
function bucketLabel(b){return b==='24h'?'24H':b==='48h'?'48H':b==='72h'?'72H':'CONTEXT';}
function statusLabel(s){return ({promote:'テーマ化済',screening:'精査中',logged:'ニュース記録',context:'関連背景'})[s]||s;}
function importanceClass(i){const x=String(i||'').toLowerCase();return x.startsWith('a')?'a':x.startsWith('b')?'b':'c';}
function card(x){
  const stocks=(x.relatedStocks||[]).map(s=>`<span class="stockPill">${esc(s)}</span>`).join('');
  return `<article class="newsCard" data-id="${esc(x.id)}"><div class="newsTop"><div class="newsBadges"><span class="newsBadge ${importanceClass(x.importance)}">${esc(x.importance)}</span><span class="newsBadge ${x.bucket==='context'?'context':'fresh'}">${bucketLabel(x.bucket)}</span><span class="newsBadge">${esc(x.category)}</span></div><span class="newsTime">${esc(x.published.slice(0,16).replace('T',' '))}</span></div><div class="newsTitle">${esc(x.title)}</div><div class="newsSummary">${esc(x.summary)}</div><div class="newsMetaRow"><span class="newsStatus">${esc(statusLabel(x.status))}</span><span class="newsSource">${esc(x.source)}</span></div><div class="newsDetail">${stocks?`<div class="relatedStocks">${stocks}</div>`:''}<div class="newsStatus">テーマ: ${esc(x.mappedTheme||'未設定')}</div><a class="newsLink" href="${esc(x.url)}" target="_blank" rel="noopener">元情報を開く ↗</a>${themeKeyword[x.mappedTheme]?` <button class="freshFilter traceBtn" type="button" data-trace="${esc(themeKeyword[x.mappedTheme])}">思考ツリーで追う</button>`:''}</div></article>`;
}
function render(){
  const root=qs('#freshNewsGrid'); if(!root||!state.data)return;
  let items=state.data.items||[];
  if(state.filter==='24h') items=items.filter(x=>x.bucket==='24h');
  else if(state.filter==='48h') items=items.filter(x=>x.bucket==='24h'||x.bucket==='48h');
  else if(state.filter==='72h'||state.filter==='fresh') items=items.filter(x=>x.bucket!=='context');
  else if(state.filter==='context') items=items.filter(x=>x.bucket==='context');
  root.innerHTML=items.length?items.map(card).join(''):'<div class="freshEmpty">該当ニュースはありません。</div>';
  qsa('.newsCard',root).forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('a,button'))return;c.classList.toggle('open');}));
  qsa('.traceBtn',root).forEach(b=>b.addEventListener('click',()=>{
    const input=qs('#treeSearch'); if(input){input.value=b.dataset.trace;input.dispatchEvent(new Event('input',{bubbles:true}));}
    qs('.treePanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}
async function load(){
  try{
    const r=await fetch('./news-feed/fresh-news-latest.json?v='+Date.now(),{cache:'no-store'}); if(!r.ok)throw new Error(r.status);
    state.data=await r.json();
    const fresh=state.data.items.filter(x=>x.bucket!=='context');
    qs('#freshCount').textContent=fresh.length;
    qs('#fresh24Count').textContent=state.data.items.filter(x=>x.bucket==='24h').length;
    qs('#freshPromotedCount').textContent=state.data.items.filter(x=>x.status==='promote').length;
    qs('#freshAsOf').textContent=state.data.asOf.replace('T',' ').slice(0,16);
    qsa('.freshFilter[data-filter]').forEach(b=>b.addEventListener('click',()=>{qsa('.freshFilter[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;render();}));
    render();
  }catch(e){const root=qs('#freshNewsGrid');if(root)root.innerHTML='<div class="freshEmpty">ニュースフィードを読み込めませんでした。</div>';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
