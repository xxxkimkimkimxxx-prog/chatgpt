(()=>{
let currentData=null;
const q=(s,e=document)=>e.querySelector(s), qa=(s,e=document)=>[...e.querySelectorAll(s)];
const safe=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
const kindLabel={news:'NEWS',related:'RELATED FRESH',context:'CONTEXT',change:'STRUCTURAL CHANGE',theme:'THEME',chain:'VALUE CHAIN',screen:'BENEFICIARY SCREEN',company:'COMPANY',logic:'WHY THIS COMPANY',evidence:'EVIDENCE',stock:'STOCK DECISION'};
function enc(o){return encodeURIComponent(JSON.stringify(o));}
function node(kind,title,meta='',children='',payload={},open=false){return `<div class="treeNode ${open?'open':''} ${kind==='news'?'root':''}"><div class="nodeRow currentRow" data-current="${enc({kind,...payload})}"><button class="toggle ${children?'':'placeholder'}" type="button">${open?'−':'＋'}</button><div class="nodeMain"><div class="nodeTitle"><span class="kind kind-${kind==='related'?'evidence':kind==='context'?'evidence':kind}">${kindLabel[kind]||kind}</span>${safe(title)}</div>${meta?`<div class="nodeMeta">${safe(meta)}</div>`:''}</div></div>${children?`<div class="nodeChildren">${children}</div>`:''}</div>`;}
function evidenceNodes(theme,chain,company,path){
  const ev=(company.evidence||[]).map((e,i)=>node('evidence',e.title,e.date,'',{themeId:theme.id,chain:chain.title,code:company.code,evidence:e,path:[...path,'EVIDENCE',e.title]})).join('');
  const decisions=company.decision||{};
  const stock=node('stock',`${company.code} ${company.name}`,`Day ${decisions.day||'—'} · Swing ${decisions.swing||'—'} · 中期 ${decisions.medium||'—'}`,'',{themeId:theme.id,chain:chain.title,code:company.code,company,path:[...path,'STOCK DECISION']});
  return node('evidence','企業固有の一次情報で裏取り',`確認 ${(company.evidence||[]).length}件`,ev+stock,{themeId:theme.id,chain:chain.title,code:company.code,path:[...path,'EVIDENCE']});
}
function companyNode(theme,chain,c,path){
  const cp=[...path,`${c.code} ${c.name}`];
  const logic=node('logic',c.fit,'テーマとの接続理由',evidenceNodes(theme,chain,c,[...cp,'WHY THIS COMPANY']),{themeId:theme.id,chain:chain.title,code:c.code,company:c,path:[...cp,'WHY THIS COMPANY']});
  return node('company',`${c.code} ${c.name}`,'条件を満たした候補企業',logic,{themeId:theme.id,chain:chain.title,code:c.code,company:c,path:cp});
}
function chainNode(theme,chain,path){
  const cp=[...path,chain.title];
  const companies=(chain.companies||[]).map(c=>companyNode(theme,chain,c,[...cp,'BENEFICIARY SCREEN'])).join('');
  const screen=node('screen',chain.question,`条件 ${(chain.conditions||[]).length}項目 · 候補 ${(chain.companies||[]).length}社`,companies,{themeId:theme.id,chain:chain.title,question:chain.question,conditions:chain.conditions||[],path:[...cp,'BENEFICIARY SCREEN']});
  return node('chain',chain.title,'利益が落ちる工程・業界',screen,{themeId:theme.id,chain:chain.title,path:cp});
}
function themeTree(t,index){
  const root=[t.trigger.title];
  const chains=(t.chains||[]).map(c=>chainNode(t,c,[...root,t.change.title,t.title])).join('');
  const theme=node('theme',t.title,t.status,chains,{themeId:t.id,path:[...root,t.change.title,t.title]});
  const change=node('change',t.change.title,'ニュースから導いた構造変化',theme,{themeId:t.id,change:t.change,path:[...root,t.change.title]});
  const related=(t.relatedFresh||[]).length?node('related','同じテーマの追加・継続ニュース',`${t.relatedFresh.length}件`,t.relatedFresh.map((x,i)=>node('related',x.title,x.date,'',{themeId:t.id,item:x,path:[...root,'RELATED FRESH',x.title]})).join(''),{themeId:t.id,path:[...root,'RELATED FRESH']}):'';
  const context=(t.context||[]).length?node('context','古いが因果を補強する背景',`${t.context.length}件 · トップニュース扱いしない`,t.context.map(x=>node('context',x.title,x.date,'',{themeId:t.id,item:x,path:[...root,'CONTEXT',x.title]})).join(''),{themeId:t.id,path:[...root,'CONTEXT']}):'';
  return `<div class="themeGroup traceV2 currentTheme">${node('news',t.trigger.title,`${t.trigger.date} · ${t.trigger.source||''} · テーマ昇格ニュース`,related+change+context,{themeId:t.id,item:t.trigger,path:root},index===0)}</div>`;
}
function details(p){
  if(!currentData)return;
  const t=currentData.themes.find(x=>x.id===p.themeId); if(!t)return;
  const path=p.path||[];
  const crumbs=path.length?`<div class="tracePath"><div class="tracePathLabel">HOW WE GOT HERE</div><div class="tracePathItems">${path.map((x,i)=>`<span>${safe(x)}</span>${i<path.length-1?'<b>›</b>':''}`).join('')}</div></div>`:'';
  let body='';
  if(p.kind==='news'||p.kind==='related'||p.kind==='context'){
    const x=p.item||t.trigger;body=`<div class="detailTop"><div><div class="detailType">${kindLabel[p.kind]}</div><h3>${safe(x.title)}</h3><div class="detailLead">${safe(x.date||'')}</div></div></div><div class="detailSection"><h4>このニュースの扱い</h4><div class="detailLead">${p.kind==='context'?'古いニュースは起点にせず、現在のテーマ仮説を補強する背景としてのみ使用します。':p.kind==='related'?'主テーマを継続・補強する追加ニュースです。':'この最新材料を起点に、構造変化→受益工程→企業条件へ展開します。'}</div></div>${x.url?`<div class="detailSection"><a class="sourceLink" target="_blank" rel="noopener" href="${safe(x.url)}">元情報を開く ↗</a></div>`:''}`;
  } else if(p.kind==='change') body=`<div class="detailTop"><div><div class="detailType">STRUCTURAL CHANGE</div><h3>${safe(t.change.title)}</h3></div></div><div class="detailSection"><h4>なぜそう考えるか</h4><div class="detailLead">${safe(t.change.why)}</div></div>`;
  else if(p.kind==='theme') body=`<div class="detailTop"><div><div class="detailType">THEME</div><h3>${safe(t.title)}</h3><div class="detailLead">${safe(t.status)}</div></div></div><div class="detailSection"><h4>次に見るもの</h4><div class="detailLead">このテーマで利益が発生するVALUE CHAINを分け、各工程で受益企業の条件を置いて絞ります。</div></div>`;
  else if(p.kind==='chain') body=`<div class="detailTop"><div><div class="detailType">VALUE CHAIN</div><h3>${safe(p.chain)}</h3></div></div><div class="detailSection"><h4>ここでの問い</h4><div class="detailLead">${safe((t.chains.find(x=>x.title===p.chain)||{}).question||'')}</div></div>`;
  else if(p.kind==='screen') body=`<div class="detailTop"><div><div class="detailType">BENEFICIARY SCREEN</div><h3>${safe(p.question)}</h3></div></div><div class="detailSection"><h4>残す条件</h4><ul class="detailList">${(p.conditions||[]).map(x=>`<li>${safe(x)}</li>`).join('')}</ul></div><div class="detailSection"><h4>目的</h4><div class="detailLead">業界にいるだけの連想株を除外し、実際に利益へ届く条件を満たす企業だけ次へ進めます。</div></div>`;
  else if(p.kind==='company'||p.kind==='logic') body=`<div class="detailTop"><div><div class="detailType">${kindLabel[p.kind]}</div><h3>${safe(p.company.code)} ${safe(p.company.name)}</h3></div></div><div class="detailSection"><h4>なぜこの会社なのか</h4><div class="detailLead">${safe(p.company.fit)}</div></div><div class="detailSection"><h4>最大の弱点</h4><div class="detailLead" style="color:#e8a2aa">${safe(p.company.risk||'継続検証')}</div></div>`;
  else if(p.kind==='evidence') {const e=p.evidence||{};body=`<div class="detailTop"><div><div class="detailType">EVIDENCE</div><h3>${safe(e.title||'企業固有の一次情報')}</h3><div class="detailLead">${safe(e.date||'')}</div></div></div><div class="detailSection"><h4>証拠ゲート</h4><div class="detailLead">テーマとの接続を会社固有の受注・製品・顧客・決算・提携等で確認します。</div></div>${e.url?`<div class="detailSection"><a class="sourceLink" target="_blank" rel="noopener" href="${safe(e.url)}">一次情報を開く ↗</a></div>`:''}`;}
  else if(p.kind==='stock') {const c=p.company,d=c.decision||{};body=`<div class="detailTop"><div><div class="detailType">STOCK DECISION</div><h3>${safe(c.code)} ${safe(c.name)}</h3><div class="detailLead">テーマが正しくても、時間軸ごとに採否を分けます。</div></div></div><div class="horizonBadges"><div class="hzBadge"><span>DAY</span><b>${safe(d.day||'—')}</b></div><div class="hzBadge"><span>SWING</span><b>${safe(d.swing||'—')}</b></div><div class="hzBadge"><span>MEDIUM</span><b>${safe(d.medium||'—')}</b></div></div><div class="detailSection"><h4>最大の弱点</h4><div class="detailLead" style="color:#e8a2aa">${safe(c.risk||'—')}</div></div>`;}
  q('#detailPanel').innerHTML=`<div class="detailContent">${crumbs}${body}</div>`;
  if(window.innerWidth<1080)q('#detailPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function wire(){
  qa('.currentRow',q('#treeRoot')).forEach(row=>{
    const tg=q('.toggle',row);tg?.addEventListener('click',e=>{e.stopPropagation();if(tg.classList.contains('placeholder'))return;const n=row.closest('.treeNode');const open=n.classList.toggle('open');tg.textContent=open?'−':'＋';});
    row.addEventListener('click',()=>{qa('.nodeRow.selected').forEach(x=>x.classList.remove('selected'));row.classList.add('selected');details(JSON.parse(decodeURIComponent(row.dataset.current)));});
  });
}
renderTree=function(search=''){
  const root=q('#treeRoot');if(!root)return;
  if(!currentData){root.innerHTML='<div class="emptyGrid">最新のテーマ昇格ツリーを読み込み中…</div>';return;}
  const s=String(search||'').trim().toLowerCase();
  const items=currentData.themes.filter(t=>!s||JSON.stringify(t).toLowerCase().includes(s));
  root.innerHTML=items.length?items.sort((a,b)=>a.rank-b.rank).map((t,i)=>themeTree(t,i)).join(''):'<div class="emptyGrid">該当する最新テーマはありません。</div>';
  wire();
};
async function loadCurrent(){
  try{const r=await fetch('./theme-research/current-promoted-themes.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);currentData=await r.json();renderTree(q('#treeSearch')?.value||'');const el=q('#promotedAsOf');if(el)el.textContent=currentData.asOf.replace('T',' ').slice(0,16);}catch(e){console.error(e);q('#treeRoot').innerHTML='<div class="emptyGrid">最新テーマツリーを読み込めませんでした。</div>';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCurrent);else loadCurrent();
})();
