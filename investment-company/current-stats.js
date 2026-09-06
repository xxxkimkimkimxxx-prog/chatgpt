(()=>{
const s=(q,e=document)=>e.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
function collectCompanies(t){return (t.chains||[]).flatMap(c=>c.companies||[]);}
function best(t,k){
  const arr=collectCompanies(t).map(c=>({c,v:c.decision?.[k]||''})).filter(x=>/[ABC]/.test(x.v));
  const score=v=>{const m=v.match(/([ABC])([+-]?)/);if(!m)return 0;return {A:30,B:20,C:10}[m[1]]+(m[2]==='+'?2:m[2]==='-'?-2:0)};
  arr.sort((a,b)=>score(b.v)-score(a.v));return arr[0]?`${arr[0].c.code} ${arr[0].c.name} (${arr[0].v})`:'—';
}
async function load(){
 try{
  const r=await fetch('./theme-research/current-promoted-themes.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);const d=await r.json();
  const all=d.themes.flatMap(collectCompanies);const uniq=new Map(all.map(x=>[x.code,x]));
  if(s('#themeCount'))s('#themeCount').textContent=d.themes.length;
  if(s('#candidateCount'))s('#candidateCount').textContent=uniq.size;
  if(s('#freshPromotedCount'))s('#freshPromotedCount').textContent=d.themes.length;
  if(s('#updatedAt'))s('#updatedAt').textContent=(d.asOf||'').replace('T',' ').slice(0,16);
  if(s('#summaryDate'))s('#summaryDate').textContent=(d.asOf||'').slice(0,10);
  if(s('#summaryThemes'))s('#summaryThemes').innerHTML=d.themes.sort((a,b)=>a.rank-b.rank).map(t=>`<article class="summaryTheme"><div class="rank">#${t.rank} · ${esc(t.status)}</div><h3>${esc(t.title)}</h3><div class="summaryRows"><div class="summaryRow"><span>デイトレ</span><b>${esc(best(t,'day'))}</b></div><div class="summaryRow"><span>スイング</span><b>${esc(best(t,'swing'))}</b></div><div class="summaryRow"><span>中期</span><b>${esc(best(t,'medium'))}</b></div><div class="summaryRow"><span>起点</span><b>${esc(t.trigger?.date||'—')}</b></div></div></article>`).join('');
 }catch(e){console.error('current stats',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
