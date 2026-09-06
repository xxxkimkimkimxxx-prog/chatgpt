(()=>{
const qs=(s,e=document)=>e.querySelector(s), qsa=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const state={data:null,filter:'fresh'};

const genreRules=[
  {key:'geo-energy',label:'地政学・エネルギー・海運',icon:'🌐',match:c=>/Geopolitics|Energy|Shipping|Oil|Commodity/i.test(c)},
  {key:'macro-rates',label:'マクロ・金利・為替・金融',icon:'📈',match:c=>/Macro|Rates|FX|Financial|China|Global Flows/i.test(c)},
  {key:'corp',label:'決算・業績修正・M&A・資本政策',icon:'🏢',match:c=>/Earnings|Revision|M&A|Corporate|Buyback|Dividend|Construction/i.test(c)},
  {key:'tech',label:'AI・半導体・自動運転・サイバー',icon:'🤖',match:c=>/AI|Autonomous|Cyber|Technology|Semiconductor|Advertising/i.test(c)},
  {key:'policy',label:'日本政策・規制・インフラ',icon:'🏛',match:c=>/Japan Policy|Policy|Regulation|Infrastructure/i.test(c)},
  {key:'consumer',label:'消費・ヘルス・ゲーム・その他',icon:'🧩',match:c=>/Health|Games|Consumer|Media|IPO/i.test(c)}
];

function genreFor(category=''){
  return genreRules.find(g=>g.match(category))||genreRules[genreRules.length-1];
}
function bucketLabel(b){return b==='24h'?'24H':b==='48h'?'48H':b==='72h'?'72H':'CONTEXT';}
function statusLabel(s){return ({promote:'テーマ化済',screening:'精査中',logged:'ニュース記録',context:'関連背景'})[s]||s;}
function importanceClass(i){const x=String(i||'').toLowerCase();return x.startsWith('a')?'a':x.startsWith('b')?'b':'c';}
function importanceScore(i){const x=String(i||'');return x==='A+'?4:x==='A'?3:x==='B'?2:1;}
function visibleItems(){
  let items=[...(state.data?.items||[])];
  if(state.filter==='24h') items=items.filter(x=>x.bucket==='24h');
  else if(state.filter==='48h') items=items.filter(x=>x.bucket==='24h'||x.bucket==='48h');
  else if(state.filter==='72h'||state.filter==='fresh') items=items.filter(x=>x.bucket!=='context');
  else if(state.filter==='context') items=items.filter(x=>x.bucket==='context');
  return items.sort((a,b)=>new Date(b.published)-new Date(a.published));
}
function newsCard(x){
  const stocks=(x.relatedStocks||[]).map(s=>`<span class="stockPill">${esc(s)}</span>`).join('');
  return `<article class="newsCard" data-id="${esc(x.id)}">
    <div class="newsTop"><div class="newsBadges"><span class="newsBadge ${importanceClass(x.importance)}">${esc(x.importance)}</span><span class="newsBadge ${x.bucket==='context'?'context':'fresh'}">${bucketLabel(x.bucket)}</span><span class="newsBadge">${esc(x.category)}</span></div><span class="newsTime">${esc((x.published||'').slice(0,16).replace('T',' '))}</span></div>
    <div class="newsTitle">${esc(x.title)}</div><div class="newsSummary">${esc(x.summary)}</div>
    <div class="newsMetaRow"><span class="newsStatus">${esc(statusLabel(x.status))}</span><span class="newsSource">${esc(x.source)}</span></div>
    <div class="newsDetail">${stocks?`<div class="relatedStocks">${stocks}</div>`:''}<div class="newsStatus">テーマ: ${esc(x.mappedTheme||'未設定')}</div><a class="newsLink" href="${esc(x.url)}" target="_blank" rel="noopener">元情報を開く ↗</a></div>
  </article>`;
}
function genreBlock(g,items){
  const aCount=items.filter(x=>importanceScore(x.importance)>=3).length;
  const pCount=items.filter(x=>x.status==='promote').length;
  return `<section class="newsGenre" data-genre="${g.key}">
    <button class="newsGenreHead" type="button" aria-expanded="false">
      <span class="genreToggle">＋</span><span class="genreIcon">${g.icon}</span>
      <span class="genreMain"><b>${esc(g.label)}</b><small>重要A以上 ${aCount}件 · テーマ昇格 ${pCount}件</small></span>
      <span class="genreCount">${items.length}件</span>
    </button>
    <div class="newsGenreBody"><div class="freshGrid">${items.map(newsCard).join('')}</div></div>
  </section>`;
}
function render(){
  const root=qs('#freshNewsGrid'); if(!root||!state.data)return;
  const items=visibleItems();
  if(!items.length){root.innerHTML='<div class="freshEmpty">該当ニュースはありません。</div>';return;}
  const groups=new Map(genreRules.map(g=>[g.key,[]]));
  items.forEach(x=>groups.get(genreFor(x.category).key).push(x));
  const ordered=genreRules.map(g=>({g,items:groups.get(g.key)})).filter(x=>x.items.length)
    .sort((a,b)=>Math.max(...b.items.map(x=>importanceScore(x.importance)))-Math.max(...a.items.map(x=>importanceScore(x.importance))) || new Date(b.items[0].published)-new Date(a.items[0].published));
  root.innerHTML=ordered.map(x=>genreBlock(x.g,x.items)).join('');
  qsa('.newsGenreHead',root).forEach(h=>h.addEventListener('click',()=>{
    const box=h.closest('.newsGenre');const open=box.classList.toggle('open');h.setAttribute('aria-expanded',String(open));qs('.genreToggle',h).textContent=open?'−':'＋';
  }));
  qsa('.newsCard',root).forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('a,button'))return;c.classList.toggle('open');}));
}
async function load(){
  try{
    const r=await fetch('./news-feed/fresh-news-latest.json?v='+Date.now(),{cache:'no-store'}); if(!r.ok)throw new Error(r.status);
    state.data=await r.json();
    const fresh=state.data.items.filter(x=>x.bucket!=='context');
    qs('#freshCount').textContent=fresh.length;
    qs('#fresh24Count').textContent=state.data.items.filter(x=>x.bucket==='24h').length;
    qs('#freshPromotedCount').textContent=state.data.items.filter(x=>x.status==='promote'&&x.bucket!=='context').length;
    qs('#freshAsOf').textContent=state.data.asOf.replace('T',' ').slice(0,16);
    qsa('.freshFilter[data-filter]').forEach(b=>b.addEventListener('click',()=>{qsa('.freshFilter[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;render();}));
    render();
  }catch(e){const root=qs('#freshNewsGrid');if(root)root.innerHTML='<div class="freshEmpty">ニュースフィードを読み込めませんでした。</div>';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
