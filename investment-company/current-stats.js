(()=>{
const s=(q,e=document)=>e.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[m]));
function collectCompanies(t){return (t.chains||[]).flatMap(c=>c.companies||[]);}
function uniqueCompanies(t){
  const m=new Map();
  collectCompanies(t).forEach(c=>m.set(c.code,c));
  return [...m.values()];
}
function candidateText(t){
  const a=uniqueCompanies(t).slice(0,4).map(c=>`${c.code} ${c.name}`);
  return a.length?a.join(' / '):'継続検証';
}
function fmtAsOf(v=''){return String(v).replace('T',' ').replace('+09:00',' JST').slice(0,20)+(String(v).includes('+09:00')?' JST':'');}
async function load(){
 try{
  const r=await fetch('./theme-research/current-promoted-themes.json?v='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error(r.status);
  const d=await r.json();
  const all=d.themes.flatMap(collectCompanies);
  const uniq=new Map(all.map(x=>[x.code,x]));
  const date=String(d.asOf||'').slice(0,10)||'—';
  if(s('#dataDate'))s('#dataDate').textContent=`Research ${date}`;
  if(s('#themeCount'))s('#themeCount').textContent=d.themes.length;
  if(s('#candidateCount'))s('#candidateCount').textContent=uniq.size;
  if(s('#rejectedCount'))s('#rejectedCount').textContent=(d.screenedOut||[]).length;
  if(s('#freshPromotedCount'))s('#freshPromotedCount').textContent=d.themes.length;
  if(s('#updatedAt'))s('#updatedAt').textContent=fmtAsOf(d.asOf||'—');
  if(s('#summaryDate'))s('#summaryDate').textContent=date;
  if(s('#summaryThemes'))s('#summaryThemes').innerHTML=[...d.themes].sort((a,b)=>a.rank-b.rank).map(t=>`<article class="summaryTheme"><div class="rank">#${t.rank} · ${esc(t.status)}</div><h3>${esc(t.title)}</h3><div class="summaryRows"><div class="summaryRow"><span>起点ニュース</span><b>${esc(t.trigger?.date||'—')}</b></div><div class="summaryRow"><span>主要候補</span><b>${esc(candidateText(t))}</b></div><div class="summaryRow"><span>構造変化</span><b>${esc(t.change?.title||'—')}</b></div><div class="summaryRow"><span>更新</span><b>${esc(fmtAsOf(d.asOf||'—'))}</b></div></div></article>`).join('');
 }catch(e){console.error('current stats',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
