(()=>{
const qs=(s,e=document)=>e.querySelector(s), qsa=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[m]));
const state={data:null,filter:'fresh',bound:false};
let refreshTimer=null;

const genreRules=[
  {key:'geo-energy',label:'地政学・エネルギー・海運',icon:'🌐',match:c=>/Geopolitics|Energy|Shipping|Oil|Commodity/i.test(c)},
  {key:'macro-rates',label:'マクロ・金利・為替・金融',icon:'📈',match:c=>/Macro|Rates|FX|Financial|China|Global Flows|BOJ/i.test(c)},
  {key:'corp',label:'決算・業績修正・M&A・資本政策',icon:'🏢',match:c=>/Earnings|Revision|M&A|Corporate|Buyback|Dividend|Construction|Capital Policy/i.test(c)},
  {key:'tech',label:'AI・半導体・自動運転・サイバー',icon:'🤖',match:c=>/AI|Autonomous|Cyber|Technology|Semiconductor|Advertising|Physical AI/i.test(c)},
  {key:'policy',label:'日本政策・規制・インフラ',icon:'🏛',match:c=>/Japan Policy|Policy|Regulation|Infrastructure|Macro Calendar/i.test(c)},
  {key:'consumer',label:'消費・ヘルス・ゲーム・その他',icon:'🧩',match:c=>/Health|Games|Consumer|Media|IPO|PTS|Market Event|Japan Market/i.test(c)}
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
  return items.sort((a,b)=>new Date(b.published||state.data?.asOf||0)-new Date(a.published||state.data?.asOf||0));
}
function newsCard(x){
  const stocks=(x.relatedStocks||[]).map(s=>`<span class="stockPill">${esc(s)}</span>`).join('');
  const time=x.published?x.published.slice(0,16).replace('T',' '):'';
  return `<article class="newsCard" data-id="${esc(x.id||x.title)}">
    <div class="newsTop"><div class="newsBadges"><span class="newsBadge ${importanceClass(x.importance)}">${esc(x.importance)}</span><span class="newsBadge ${x.bucket==='context'?'context':'fresh'}">${bucketLabel(x.bucket)}</span><span class="newsBadge">${esc(x.category)}</span></div><span class="newsTime">${esc(time)}</span></div>
    <div class="newsTitle">${esc(x.title)}</div><div class="newsSummary">${esc(x.summary)}</div>
    <div class="newsMetaRow"><span class="newsStatus">${esc(statusLabel(x.status))}</span><span class="newsSource">${esc(x.source)}</span></div>
    <div class="newsDetail">${stocks?`<div class="relatedStocks">${stocks}</div>`:''}<div class="newsStatus">テーマ: ${esc(x.mappedTheme||'未設定')}</div>${x.url?`<a class="newsLink" href="${esc(x.url)}" target="_blank" rel="noopener">元情報を開く ↗</a>`:''}</div>
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
    .sort((a,b)=>Math.max(...b.items.map(x=>importanceScore(x.importance)))-Math.max(...a.items.map(x=>importanceScore(x.importance))) || new Date(b.items[0].published||state.data.asOf)-new Date(a.items[0].published||state.data.asOf));
  root.innerHTML=ordered.map(x=>genreBlock(x.g,x.items)).join('');
  qsa('.newsGenreHead',root).forEach(h=>h.addEventListener('click',()=>{
    const box=h.closest('.newsGenre');const open=box.classList.toggle('open');h.setAttribute('aria-expanded',String(open));qs('.genreToggle',h).textContent=open?'−':'＋';
  }));
  qsa('.newsCard',root).forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('a,button'))return;c.classList.toggle('open');}));
}
async function getJSON(path){
  const sep=path.includes('?')?'&':'?';
  const r=await fetch(path+sep+'v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(`${r.status} ${path}`);
  return r.json();
}
function resolveFullFeedPath(fullFeedPath=''){
  if(!fullFeedPath)return null;
  const marker='investment-company/';
  const idx=fullFeedPath.indexOf(marker);
  const rel=idx>=0?fullFeedPath.slice(idx+marker.length):fullFeedPath.replace(/^\.\//,'');
  return './'+rel;
}
async function fetchLatestFeed(){
  const pointer=await getJSON('./news-feed/fresh-news-latest.json');
  if(Array.isArray(pointer.items))return pointer;
  if(pointer.fullFeedPath){
    const path=resolveFullFeedPath(pointer.fullFeedPath);
    const full=await getJSON(path);
    return {...full,policy:pointer.policy||full.policy,topItems:pointer.topItems||full.topItems,fullFeedPath:pointer.fullFeedPath};
  }
  throw new Error('fresh-news-latest.json に items または fullFeedPath がありません');
}
function updateStats(){
  const items=state.data?.items||[];
  const fresh=items.filter(x=>x.bucket!=='context');
  const count=qs('#freshCount'), count24=qs('#fresh24Count'), promoted=qs('#freshPromotedCount'), asOf=qs('#freshAsOf');
  if(count)count.textContent=fresh.length;
  if(count24)count24.textContent=items.filter(x=>x.bucket==='24h').length;
  if(promoted)promoted.textContent=items.filter(x=>x.status==='promote'&&x.bucket!=='context').length;
  if(asOf)asOf.textContent=String(state.data.asOf||'—').replace('T',' ').slice(0,16);
}
function bindFilters(){
  if(state.bound)return;state.bound=true;
  qsa('.freshFilter[data-filter]').forEach(b=>b.addEventListener('click',()=>{
    qsa('.freshFilter[data-filter]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');state.filter=b.dataset.filter;render();
  }));
}
async function load(){
  try{
    state.data=await fetchLatestFeed();
    updateStats();bindFilters();render();
  }catch(e){
    console.error('news feed',e);
    const root=qs('#freshNewsGrid');if(root)root.innerHTML=`<div class="freshEmpty">ニュースフィードを読み込めませんでした。<br><small>${esc(e.message)}</small></div>`;
  }
}
function startAutoRefresh(){
  if(refreshTimer)clearInterval(refreshTimer);
  refreshTimer=setInterval(load,5*60*1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{load();startAutoRefresh();});else{load();startAutoRefresh();}
})();
