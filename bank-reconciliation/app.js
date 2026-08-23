const $ = (id) => document.getElementById(id);
const yen = (n) => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(Number(n)||0);
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[¥￥,\s]/g,'').replace(/[()]/g,'');
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
};

const state = {
  bank:{file:null,headers:[],rawRows:[],rows:[],mapping:{}},
  company:{file:null,headers:[],rawRows:[],rows:[],mapping:{}},
  matches:[], candidates:[], logs:[], runSeq:0
};

function log(msg){
  const t = new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  state.logs.unshift(`[${t}] ${msg}`);
  state.logs = state.logs.slice(0,80);
  renderLog();
}
function renderLog(){ $('logBox').innerHTML = state.logs.map(x=>`<div>${escapeHtml(x)}</div>`).join('') || '<div>まだ処理はありません。</div>'; }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function parseDate(v){
  if (v == null || v === '') return '';
  if (typeof v === 'number' && window.XLSX?.SSF){
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  let s = String(v).trim();
  const jp = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (jp) return `${jp[1]}-${String(jp[2]).padStart(2,'0')}-${String(jp[3]).padStart(2,'0')}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return '';
}
function dayDiff(a,b){
  if (!a || !b) return Infinity;
  const x = new Date(`${a}T00:00:00`), y = new Date(`${b}T00:00:00`);
  return Math.abs(Math.round((x-y)/86400000));
}
function sameDirection(a,b){ return (a>=0 && b>=0) || (a<0 && b<0); }

async function readFile(side,file){
  if (!window.XLSX){ alert('Excel読込ライブラリを読み込めませんでした。ネットワーク接続を確認してください。'); return; }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf,{type:'array',cellDates:false});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
  const headerIndex = findHeaderRow(matrix);
  const headers = (matrix[headerIndex]||[]).map((v,i)=>String(v||`列${i+1}`).trim());
  const rawRows = matrix.slice(headerIndex+1).filter(r=>r.some(v=>String(v??'').trim()!==''))
    .map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  state[side].file=file; state[side].headers=headers; state[side].rawRows=rawRows;
  buildMapping(side);
  setStatus(side,`${rawRows.length.toLocaleString()}件`,true);
  log(`${side==='bank'?'銀行':'当社'}RAWを読み込み：${file.name} / ${rawRows.length.toLocaleString()}件`);
  updateReady();
}
function findHeaderRow(matrix){
  const limit=Math.min(matrix.length,20);
  for(let i=0;i<limit;i++){
    const vals=(matrix[i]||[]).map(v=>String(v??'').trim()).filter(Boolean);
    if(vals.length>=3 && new Set(vals).size>=Math.min(3,vals.length)) return i;
  }
  return 0;
}
function setStatus(side,text,ok=false){ const el=$(side+'Status'); el.textContent=text; el.classList.toggle('ok',ok); }
function findHeader(headers,regexes,exclude=[]){
  return headers.find(h=>regexes.some(r=>r.test(h)) && !exclude.some(r=>r.test(h))) || '';
}
function optionList(headers,selected,allowBlank=true){
  return `${allowBlank?'<option value="">未使用</option>':''}`+headers.map(h=>`<option value="${escapeHtml(h)}" ${h===selected?'selected':''}>${escapeHtml(h)}</option>`).join('');
}
function buildMapping(side){
  const s=state[side], h=s.headers;
  const auto={
    date:findHeader(h,[/取引日/i,/入出金日/i,/伝票日/i,/起票日/i,/日付/i,/date/i]),
    amount:findHeader(h,[/^金額$/i,/取引金額/i,/入出金額/i,/amount/i],[/入金/i,/出金/i]),
    inflow:findHeader(h,[/入金/i,/預入/i,/受取/i,/deposit/i,/inflow/i]),
    outflow:findHeader(h,[/出金/i,/引出/i,/支払/i,/withdraw/i,/outflow/i]),
    desc:findHeader(h,[/摘要/i,/内容/i,/取引内容/i,/相手/i,/名義/i,/備考/i,/テキスト/i,/description/i,/memo/i])
  };
  s.mapping={...auto,invert:false};
  const el=$(side+'Mapping'); el.classList.remove('hidden');
  el.innerHTML=`<div class="mapping-title">列の対応を確認してください</div>
  <div class="mapping-grid">
    <label>日付<select data-map="date">${optionList(h,auto.date,false)}</select></label>
    <label>金額（単一列）<select data-map="amount">${optionList(h,auto.amount,true)}</select></label>
    <label>摘要・相手先<select data-map="desc">${optionList(h,auto.desc,true)}</select></label>
    <label>入金列（任意）<select data-map="inflow">${optionList(h,auto.inflow,true)}</select></label>
    <label>出金列（任意）<select data-map="outflow">${optionList(h,auto.outflow,true)}</select></label>
  </div>
  <div class="mapping-options"><label><input type="checkbox" data-map="invert"> 金額の＋/－を反転</label></div>
  <div class="file-meta">${escapeHtml(s.file.name)} / ${s.rawRows.length.toLocaleString()}件 / ${h.length}列</div>`;
  el.querySelectorAll('[data-map]').forEach(ctrl=>ctrl.addEventListener('change',()=>{
    const k=ctrl.dataset.map; s.mapping[k]=k==='invert'?ctrl.checked:ctrl.value; normalizeSide(side); updateReady();
  }));
  normalizeSide(side);
}
function normalizeSide(side){
  const s=state[side], m=s.mapping, prefix=side==='bank'?'B':'C';
  s.rows=s.rawRows.map((raw,i)=>{
    let amount=0;
    if(m.amount) amount=num(raw[m.amount]);
    else amount=num(raw[m.inflow])-Math.abs(num(raw[m.outflow]));
    if(m.invert) amount*=-1;
    return {id:`${prefix}${i+1}`,side,index:i+1,date:parseDate(raw[m.date]),amount,desc:m.desc?String(raw[m.desc]??'').trim():'',raw,status:'unmatched',matchId:null};
  }).filter(r=>Number.isFinite(r.amount) && r.amount!==0);
}
function updateReady(){
  const ready=state.bank.rows.length>0 && state.company.rows.length>0 && state.bank.mapping.date && state.company.mapping.date;
  $('runBtn').disabled=!ready;
  $('runNote').textContent=ready?`銀行 ${state.bank.rows.length.toLocaleString()}件 / 当社 ${state.company.rows.length.toLocaleString()}件。照合を実行できます。`:'銀行RAWと当社RAWを読み込み、日付列を確認してください。';
}

function resetStatuses(){
  [...state.bank.rows,...state.company.rows].forEach(r=>{r.status='unmatched';r.matchId=null;});
  state.matches=[];state.candidates=[];
}
function settings(){return {dateTol:Number($('dateTolerance').value),amountTol:Number($('amountTolerance').value),maxItems:Number($('maxComboItems').value),candidateLimit:Number($('candidateLimit').value)};}
function amountsClose(a,b,t){return Math.abs(a-b)<=t;}
function rowMatches(a,b,cfg){return dayDiff(a.date,b.date)<=cfg.dateTol && amountsClose(a.amount,b.amount,cfg.amountTol);}
function createMatch(bankIds,companyIds,type='manual',auto=false){
  const id=`M${String(state.matches.length+1).padStart(4,'0')}-${Date.now().toString().slice(-5)}`;
  const bank=state.bank.rows.filter(r=>bankIds.includes(r.id)); const company=state.company.rows.filter(r=>companyIds.includes(r.id));
  if(!bank.length||!company.length) return null;
  [...bank,...company].forEach(r=>{r.status='matched';r.matchId=id;});
  const group={id,type,auto,bankIds:[...bankIds],companyIds:[...companyIds],bankSum:bank.reduce((s,r)=>s+r.amount,0),companySum:company.reduce((s,r)=>s+r.amount,0),createdAt:new Date().toISOString()};
  state.matches.push(group); return group;
}
function autoMatchOneToOne(cfg){
  let count=0;
  const banks=state.bank.rows.filter(r=>r.status==='unmatched'); const comps=state.company.rows.filter(r=>r.status==='unmatched');
  for(const b of banks){
    if(b.status!=='unmatched'||!b.date) continue;
    const cs=comps.filter(c=>c.status==='unmatched'&&rowMatches(b,c,cfg));
    if(cs.length!==1) continue;
    const c=cs[0];
    const bs=banks.filter(x=>x.status==='unmatched'&&rowMatches(x,c,cfg));
    if(bs.length===1){createMatch([b.id],[c.id],'1対1',true);count++;}
  }
  return count;
}
function subsetFind(rows,target,cfg,minSize=2){
  if(!rows.length||!target) return null;
  const sign=target>=0?1:-1, t=Math.abs(target), deadline=performance.now()+25;
  const pool=rows.filter(r=>sameDirection(r.amount,target)&&Math.abs(r.amount)<=t+cfg.amountTol)
    .sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount)).slice(0,Math.max(cfg.maxItems,30));
  const vals=pool.map(r=>Math.abs(r.amount)); let found=null;
  function dfs(start,sum,pick){
    if(found||performance.now()>deadline) return;
    if(pick.length>=minSize&&Math.abs(sum-t)<=cfg.amountTol){found=pick.map(i=>pool[i]);return;}
    if(pick.length>=cfg.maxItems||sum>t+cfg.amountTol) return;
    for(let i=start;i<pool.length;i++){
      if(sum+vals[i]>t+cfg.amountTol) continue;
      pick.push(i);dfs(i+1,sum+vals[i],pick);pick.pop();if(found)return;
    }
  }
  dfs(0,0,[]); return found;
}
function generateCandidates(cfg){
  state.candidates=[]; const seen=new Set();
  const banks=state.bank.rows.filter(r=>r.status==='unmatched'&&r.date); const comps=state.company.rows.filter(r=>r.status==='unmatched'&&r.date);
  const add=(type,bids,cids)=>{
    const key=[...bids].sort().join(',')+'|'+[...cids].sort().join(','); if(seen.has(key)||state.candidates.length>=cfg.candidateLimit)return;
    seen.add(key); const bs=state.bank.rows.filter(r=>bids.includes(r.id)),cs=state.company.rows.filter(r=>cids.includes(r.id));
    state.candidates.push({id:`C${state.candidates.length+1}`,type,bankIds:bids,companyIds:cids,bankSum:bs.reduce((s,r)=>s+r.amount,0),companySum:cs.reduce((s,r)=>s+r.amount,0)});
  };
  for(const b of banks){
    if(state.candidates.length>=cfg.candidateLimit)break;
    const same=comps.filter(c=>dayDiff(b.date,c.date)<=cfg.dateTol&&sameDirection(b.amount,c.amount));
    const subset=subsetFind(same,b.amount,cfg,2); if(subset) add('1対多',[b.id],subset.map(x=>x.id));
  }
  for(const c of comps){
    if(state.candidates.length>=cfg.candidateLimit)break;
    const same=banks.filter(b=>dayDiff(b.date,c.date)<=cfg.dateTol&&sameDirection(b.amount,c.amount));
    const subset=subsetFind(same,c.amount,cfg,2); if(subset) add('多対1',subset.map(x=>x.id),[c.id]);
  }
}
async function runReconciliation(){
  resetStatuses(); state.runSeq++; $('progressWrap').classList.remove('hidden'); $('progressBar').style.width='15%'; $('progressText').textContent='1対1照合を実行中...';
  await new Promise(r=>setTimeout(r,30)); const cfg=settings(); const exact=autoMatchOneToOne(cfg);
  $('progressBar').style.width='60%'; $('progressText').textContent='合算候補を探索中...'; await new Promise(r=>setTimeout(r,30)); generateCandidates(cfg);
  $('progressBar').style.width='100%'; $('progressText').textContent='完了';
  log(`自動照合完了：1対1 ${exact}組 / 合算候補 ${state.candidates.length}組`);
  $('workspace').classList.remove('hidden'); renderAll(); setTimeout(()=>$('progressWrap').classList.add('hidden'),900);
}

function rowsByIds(side,ids){return state[side].rows.filter(r=>ids.includes(r.id));}
function chip(r){return `<div class="row-chip"><b>${escapeHtml(r.date||'日付なし')}</b>　${yen(r.amount)}<br><span>${escapeHtml(r.desc||'（摘要なし）')}</span></div>`;}
function renderCandidates(){
  const q=$('globalSearch').value.trim().toLowerCase();
  const list=state.candidates.filter(c=>[...rowsByIds('bank',c.bankIds),...rowsByIds('company',c.companyIds)].some(r=>`${r.date} ${r.amount} ${r.desc}`.toLowerCase().includes(q))||!q);
  $('candidateList').innerHTML=list.length?list.map(c=>{
    const bs=rowsByIds('bank',c.bankIds),cs=rowsByIds('company',c.companyIds),diff=c.bankSum-c.companySum;
    return `<article class="candidate-card"><div class="candidate-head"><div><span class="candidate-type">${c.type}</span> <b>${c.id}</b></div><button class="primary-btn small accept-candidate" data-id="${c.id}">この候補を照合</button></div><div class="candidate-sums">銀行 ${yen(c.bankSum)} ／ 当社 ${yen(c.companySum)} ／ 差額 ${yen(diff)}</div><div class="candidate-rows"><div class="side-box"><strong>銀行 ${bs.length}件</strong>${bs.map(chip).join('')}</div><div class="side-box"><strong>当社 ${cs.length}件</strong>${cs.map(chip).join('')}</div></div></article>`;
  }).join(''):'<div class="empty">現在、合算候補はありません。</div>';
  document.querySelectorAll('.accept-candidate').forEach(b=>b.addEventListener('click',()=>acceptCandidate(b.dataset.id)));
}
function acceptCandidate(id){
  const c=state.candidates.find(x=>x.id===id); if(!c)return;
  const all=[...rowsByIds('bank',c.bankIds),...rowsByIds('company',c.companyIds)]; if(all.some(r=>r.status!=='unmatched')){alert('この候補には既に照合済みの明細が含まれています。');return;}
  createMatch(c.bankIds,c.companyIds,c.type,false); state.candidates=state.candidates.filter(x=>x.id!==id); log(`${c.type}候補 ${id} を採用`); generateCandidates(settings()); renderAll();
}
function tableHtml(rows,side){
  const q=$('globalSearch').value.trim().toLowerCase(); rows=rows.filter(r=>!q||`${r.date} ${r.amount} ${r.desc} ${r.id}`.toLowerCase().includes(q));
  return `<thead><tr><th>選択</th><th>ID</th><th>日付</th><th>摘要</th><th class="money">金額</th></tr></thead><tbody>${rows.map(r=>`<tr><td><input type="checkbox" class="manual-check" data-side="${side}" data-id="${r.id}"></td><td>${r.id}</td><td>${escapeHtml(r.date||'')}</td><td>${escapeHtml(r.desc||'')}</td><td class="money">${yen(r.amount)}</td></tr>`).join('')}</tbody>`;
}
function renderManual(){
  $('bankUnmatchedTable').innerHTML=tableHtml(state.bank.rows.filter(r=>r.status==='unmatched'),'bank');
  $('companyUnmatchedTable').innerHTML=tableHtml(state.company.rows.filter(r=>r.status==='unmatched'),'company');
  document.querySelectorAll('.manual-check').forEach(x=>x.addEventListener('change',renderManualSums)); renderManualSums();
}
function selectedManual(){
  const bank=[],company=[]; document.querySelectorAll('.manual-check:checked').forEach(x=>(x.dataset.side==='bank'?bank:company).push(x.dataset.id)); return {bank,company};
}
function renderManualSums(){
  const s=selectedManual(),bs=rowsByIds('bank',s.bank),cs=rowsByIds('company',s.company),b=bs.reduce((x,r)=>x+r.amount,0),c=cs.reduce((x,r)=>x+r.amount,0),d=b-c,ok=s.bank.length&&s.company.length&&Math.abs(d)<=settings().amountTol;
  $('manualSums').innerHTML=`<span class="sum-pill">銀行 ${s.bank.length}件：${yen(b)}</span><span class="sum-pill">当社 ${s.company.length}件：${yen(c)}</span><span class="sum-pill ${ok?'ok':'bad'}">差額：${yen(d)}</span>`;
}
function doManualMatch(){
  const s=selectedManual(); if(!s.bank.length||!s.company.length){alert('銀行側と当社側の両方から明細を選択してください。');return;}
  const b=rowsByIds('bank',s.bank).reduce((x,r)=>x+r.amount,0),c=rowsByIds('company',s.company).reduce((x,r)=>x+r.amount,0);
  if(!amountsClose(b,c,settings().amountTol)){alert(`合計金額が一致していません。\n銀行：${yen(b)}\n当社：${yen(c)}\n差額：${yen(b-c)}`);return;}
  createMatch(s.bank,s.company,'手動',false); log(`手動照合：銀行${s.bank.length}件 × 当社${s.company.length}件`); generateCandidates(settings()); renderAll();
}
function renderMatched(){
  const q=$('globalSearch').value.trim().toLowerCase();
  const list=[...state.matches].reverse().filter(m=>{const rs=[...rowsByIds('bank',m.bankIds),...rowsByIds('company',m.companyIds)];return !q||rs.some(r=>`${r.date} ${r.amount} ${r.desc} ${m.id}`.toLowerCase().includes(q));});
  $('matchedList').innerHTML=list.length?list.map(m=>{const bs=rowsByIds('bank',m.bankIds),cs=rowsByIds('company',m.companyIds);return `<article class="match-card"><div class="match-head"><div><b>${m.id}</b>　<span class="candidate-type">${escapeHtml(m.type)}</span>${m.auto?'　<small>自動</small>':''}</div><button class="ghost-btn undo-match" data-id="${m.id}">照合を戻す</button></div><div class="candidate-sums">銀行 ${yen(m.bankSum)} ／ 当社 ${yen(m.companySum)} ／ 差額 ${yen(m.bankSum-m.companySum)}</div><div class="match-rows"><div class="side-box"><strong>銀行 ${bs.length}件</strong>${bs.map(chip).join('')}</div><div class="side-box"><strong>当社 ${cs.length}件</strong>${cs.map(chip).join('')}</div></div></article>`;}).join(''):'<div class="empty">照合済み明細はまだありません。</div>';
  document.querySelectorAll('.undo-match').forEach(b=>b.addEventListener('click',()=>undoMatch(b.dataset.id)));
}
function undoMatch(id){
  const m=state.matches.find(x=>x.id===id); if(!m)return; [...rowsByIds('bank',m.bankIds),...rowsByIds('company',m.companyIds)].forEach(r=>{r.status='unmatched';r.matchId=null;}); state.matches=state.matches.filter(x=>x.id!==id); log(`照合を戻しました：${id}`); generateCandidates(settings()); renderAll();
}
function dailyData(){
  const map=new Map(); const ensure=d=>{if(!map.has(d))map.set(d,{date:d,bankIn:0,bankOut:0,companyIn:0,companyOut:0});return map.get(d)};
  state.bank.rows.forEach(r=>{const x=ensure(r.date||'日付なし');r.amount>=0?x.bankIn+=r.amount:x.bankOut+=Math.abs(r.amount);});
  state.company.rows.forEach(r=>{const x=ensure(r.date||'日付なし');r.amount>=0?x.companyIn+=r.amount:x.companyOut+=Math.abs(r.amount);});
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function renderDaily(){
  const rows=dailyData(); $('dailyTable').innerHTML=`<thead><tr><th>日付</th><th class="money">銀行 入金</th><th class="money">銀行 出金</th><th class="money">当社 入金</th><th class="money">当社 出金</th><th class="money">入金差額</th><th class="money">出金差額</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHtml(x.date)}</td><td class="money">${yen(x.bankIn)}</td><td class="money">${yen(x.bankOut)}</td><td class="money">${yen(x.companyIn)}</td><td class="money">${yen(x.companyOut)}</td><td class="money">${yen(x.bankIn-x.companyIn)}</td><td class="money">${yen(x.bankOut-x.companyOut)}</td></tr>`).join('')}</tbody>`;
}
function renderSummary(){
  const total=state.bank.rows.length+state.company.rows.length,matchedRows=state.bank.rows.filter(r=>r.status==='matched').length+state.company.rows.filter(r=>r.status==='matched').length,rate=total?matchedRows/total*100:0;
  $('matchProgress').style.width=`${rate}%`;
  $('summaryStats').innerHTML=`<div class="mini-stat"><span>照合グループ</span><b>${state.matches.length}</b></div><div class="mini-stat"><span>自動1対1</span><b>${state.matches.filter(m=>m.auto).length}</b></div><div class="mini-stat"><span>手動/候補採用</span><b>${state.matches.filter(m=>!m.auto).length}</b></div><div class="mini-stat"><span>全明細照合率</span><b>${rate.toFixed(1)}%</b></div>`;
  const bu=state.bank.rows.filter(r=>r.status==='unmatched'),cu=state.company.rows.filter(r=>r.status==='unmatched');
  $('unmatchedSummary').innerHTML=`<div class="unmatched-line"><span>銀行 未照合</span><b>${bu.length.toLocaleString()}件</b></div><div class="unmatched-line"><span>当社 未照合</span><b>${cu.length.toLocaleString()}件</b></div><div class="unmatched-line"><span>銀行 未照合金額</span><b>${yen(bu.reduce((s,r)=>s+r.amount,0))}</b></div><div class="unmatched-line"><span>当社 未照合金額</span><b>${yen(cu.reduce((s,r)=>s+r.amount,0))}</b></div>`;
}
function renderKpis(){
  const b=state.bank.rows,c=state.company.rows,total=b.length+c.length,matched=b.filter(r=>r.status==='matched').length+c.filter(r=>r.status==='matched').length;
  $('kpiBank').textContent=b.length.toLocaleString();$('kpiCompany').textContent=c.length.toLocaleString();$('kpiRate').textContent=(total?matched/total*100:0).toFixed(1)+'%';$('kpiCandidates').textContent=state.candidates.length.toLocaleString();$('kpiUnmatched').textContent=(total-matched).toLocaleString();
}
function renderAll(){renderKpis();renderSummary();renderCandidates();renderManual();renderMatched();renderDaily();renderLog();}

function exportExcel(){
  if(!window.XLSX){alert('Excel出力ライブラリを読み込めません。');return;}
  const wb=XLSX.utils.book_new();
  const matchedRows=[]; state.matches.forEach(m=>{rowsByIds('bank',m.bankIds).forEach(r=>matchedRows.push({照合ID:m.id,種別:m.type,側:'銀行',明細ID:r.id,日付:r.date,金額:r.amount,摘要:r.desc}));rowsByIds('company',m.companyIds).forEach(r=>matchedRows.push({照合ID:m.id,種別:m.type,側:'当社',明細ID:r.id,日付:r.date,金額:r.amount,摘要:r.desc}));});
  const unmatched=(side)=>state[side].rows.filter(r=>r.status==='unmatched').map(r=>({明細ID:r.id,日付:r.date,金額:r.amount,摘要:r.desc}));
  const cand=[];state.candidates.forEach(c=>{rowsByIds('bank',c.bankIds).forEach(r=>cand.push({候補ID:c.id,種別:c.type,側:'銀行',明細ID:r.id,日付:r.date,金額:r.amount,摘要:r.desc}));rowsByIds('company',c.companyIds).forEach(r=>cand.push({候補ID:c.id,種別:c.type,側:'当社',明細ID:r.id,日付:r.date,金額:r.amount,摘要:r.desc}));});
  const daily=dailyData().map(x=>({日付:x.date,銀行入金:x.bankIn,銀行出金:x.bankOut,当社入金:x.companyIn,当社出金:x.companyOut,入金差額:x.bankIn-x.companyIn,出金差額:x.bankOut-x.companyOut}));
  [['照合済',matchedRows],['銀行未照合',unmatched('bank')],['当社未照合',unmatched('company')],['候補組',cand],['日別集計',daily]].forEach(([name,data])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data.length?data:[{データ:'なし'}]),name));
  XLSX.writeFile(wb,`銀行入出金照合結果_${new Date().toISOString().slice(0,10)}.xlsx`); log('Excel出力を実行');
}
function resetAll(){
  if((state.bank.file||state.company.file)&&!confirm('読み込んだデータと照合結果をすべて初期化しますか？'))return;
  state.bank={file:null,headers:[],rawRows:[],rows:[],mapping:{}};state.company={file:null,headers:[],rawRows:[],rows:[],mapping:{}};state.matches=[];state.candidates=[];state.logs=[];
  ['bank','company'].forEach(s=>{setStatus(s,'未読込',false);$(s+'Mapping').classList.add('hidden');$(s+'Mapping').innerHTML='';$(s+'File').value='';});$('workspace').classList.add('hidden');updateReady();renderLog();
}

$('bankFile').addEventListener('change',e=>e.target.files[0]&&readFile('bank',e.target.files[0]).catch(err=>{console.error(err);alert('銀行ファイルの読み込みに失敗しました。');}));
$('companyFile').addEventListener('change',e=>e.target.files[0]&&readFile('company',e.target.files[0]).catch(err=>{console.error(err);alert('当社ファイルの読み込みに失敗しました。');}));
$('runBtn').addEventListener('click',()=>runReconciliation().catch(err=>{console.error(err);alert('照合処理でエラーが発生しました。');}));
$('resetBtn').addEventListener('click',resetAll);$('manualMatchBtn').addEventListener('click',doManualMatch);$('exportBtn').addEventListener('click',exportExcel);$('globalSearch').addEventListener('input',()=>{renderCandidates();renderManual();renderMatched();});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===`tab-${b.dataset.tab}`));});
renderLog();updateReady();