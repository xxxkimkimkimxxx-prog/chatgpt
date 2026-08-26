(() => {
  'use strict';

  const PAGE_SIZE_CLARITY = 300;
  const visibleRows = {bank: PAGE_SIZE_CLARITY, company: PAGE_SIZE_CLARITY};

  function loadClarityCss(){
    if(document.querySelector('link[data-clarity-css]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./clarity.css';
    link.dataset.clarityCss='1';
    document.head.appendChild(link);
  }

  function signedYen(row){
    if(!row) return yen(0);
    return row.direction==='出金' ? `−${yen(row.amount)}` : `+${yen(row.amount)}`;
  }
  function signedClass(row){return row?.direction==='出金'?'out':'in';}
  function directionBadge(row){return `<span class="direction-badge ${signedClass(row)}">${esc(row.direction)}</span>`;}
  function diffYen(n){return n===0?yen(0):(n>0?`+${yen(n)}`:`−${yen(Math.abs(n))}`);}

  function rowCompare(r,kind){
    const cls=kind==='common'?'common-row':'difference-row';
    const tag=kind==='common'?'<span class="row-compare-label common">全候補で共通</span>':'<span class="row-compare-label diff">この候補だけ</span>';
    return `<div class="row-chip ${cls}"><b>${esc(r.date)}</b> ${directionBadge(r)} ${tag}<br><span class="signed-money ${signedClass(r)}">${signedYen(r)}</span>　<span>${esc(r.desc||'（摘要なし）')}</span>${r.strongKey?`<small>6桁キー: ${esc(r.strongKey)}</small>`:''}</div>`;
  }

  function intersectIds(candidates,key){
    if(!candidates.length) return new Set();
    let out=new Set(candidates[0][key]);
    for(const c of candidates.slice(1)) out=new Set([...out].filter(id=>c[key].includes(id)));
    return out;
  }

  function groupConflicts(candidates){
    const left=[...candidates],groups=[];
    while(left.length){
      const group=[left.shift()];
      const ids=new Set([...group[0].bankIds,...group[0].companyIds]);
      let changed=true;
      while(changed){
        changed=false;
        for(let i=left.length-1;i>=0;i--){
          const c=left[i];
          if([...c.bankIds,...c.companyIds].some(id=>ids.has(id))){
            group.push(c);
            [...c.bankIds,...c.companyIds].forEach(id=>ids.add(id));
            left.splice(i,1);
            changed=true;
          }
        }
      }
      groups.push(group);
    }
    return groups;
  }

  // 「確認が必要」画面は現行構造を維持しつつ、金額ラベルだけ統一。
  candidateCard = function(c,conflict=false){
    const bs=rowsByIds('bank',c.bankIds),cs=rowsByIds('company',c.companyIds);
    const bSum=bs.reduce((a,r)=>a+r.amount,0),cSum=cs.reduce((a,r)=>a+r.amount,0);
    return `<details class="candidate-card ${conflict?'conflict-card':''}"><summary><label class="summary-check"><input type="checkbox" class="candidate-select" data-id="${c.id}"> <span class="candidate-type">${esc(c.type)}</span> <b>${esc(c.id)}</b></label><span><b>銀行金額</b> ${yen(bSum)}　/　<b>当社金額</b> ${yen(cSum)}</span></summary><div class="candidate-sums">${esc(c.reason)} ／ 差額 ${diffYen(bSum-cSum)}</div><div class="candidate-rows"><div class="side-box"><strong>銀行明細 ${bs.length}件</strong>${bs.map(rowChip).join('')}</div><div class="side-box"><strong>当社明細 ${cs.length}件</strong>${cs.map(rowChip).join('')}</div></div><div class="card-actions"><button class="primary-btn small accept-candidate" data-id="${c.id}">この候補を照合</button><button class="ghost-btn small exclude-candidate" data-id="${c.id}">候補から除外</button></div></details>`;
  };

  // 複数候補は「全候補で共通」と「候補ごとの差分」に分解して表示。
  renderConflicts = function(){
    const q=$('globalSearch').value.trim().toLowerCase();
    const all=state.candidates.filter(c=>c.status==='複数候補有');
    const groups=groupConflicts(all).filter(g=>!q||g.some(c=>candidateSearch(c,q)));
    const el=$('conflictList');
    if(!groups.length){el.innerHTML='<div class="empty">候補が複数ある明細はありません。</div>';return;}

    el.innerHTML=groups.map((group,gi)=>{
      const commonBank=intersectIds(group,'bankIds');
      const commonCompany=intersectIds(group,'companyIds');
      const commonBankRows=rowsByIds('bank',[...commonBank]);
      const commonCompanyRows=rowsByIds('company',[...commonCompany]);
      const hasCommon=commonBankRows.length||commonCompanyRows.length;
      const commonHtml=hasCommon?`<div class="conflict-common"><div class="conflict-common-title"><span class="common-badge">共通</span><b>ここは全候補で同じ明細です</b></div><div class="conflict-common-grid"><div class="conflict-side"><strong>銀行明細</strong>${commonBankRows.length?commonBankRows.map(r=>rowCompare(r,'common')).join(''):'<div class="no-common">共通明細なし</div>'}</div><div class="conflict-side"><strong>当社明細</strong>${commonCompanyRows.length?commonCompanyRows.map(r=>rowCompare(r,'common')).join(''):'<div class="no-common">共通明細なし</div>'}</div></div></div>`:`<div class="conflict-common"><div class="no-common">全候補に共通する明細はありません。下の「この候補だけ」の違いを比較してください。</div></div>`;

      const options=group.map((c,ci)=>{
        const bs=rowsByIds('bank',c.bankIds),cs=rowsByIds('company',c.companyIds);
        const bSum=bs.reduce((a,r)=>a+r.amount,0),cSum=cs.reduce((a,r)=>a+r.amount,0);
        const bDiff=bs.filter(r=>!commonBank.has(r.id));
        const cDiff=cs.filter(r=>!commonCompany.has(r.id));
        return `<article class="conflict-option"><div class="conflict-option-head"><label class="conflict-choice"><input type="radio" class="candidate-select" name="conflict-group-${gi}" data-id="${esc(c.id)}"><span>候補 ${ci+1}</span><b>${esc(c.id)}</b><span class="candidate-type">${esc(c.type)}</span></label></div><div class="conflict-option-money"><b>銀行金額 ${yen(bSum)}</b><span>＝</span><b>当社金額 ${yen(cSum)}</b><span class="zero-diff">差額 ${diffYen(bSum-cSum)}</span></div><div class="diff-title">この候補だけに含まれる明細</div><div class="conflict-diff-grid"><div class="conflict-side"><strong>銀行明細</strong>${bDiff.length?bDiff.map(r=>rowCompare(r,'diff')).join(''):'<div class="no-common">追加・相違なし</div>'}</div><div class="conflict-side"><strong>当社明細</strong>${cDiff.length?cDiff.map(r=>rowCompare(r,'diff')).join(''):'<div class="no-common">追加・相違なし</div>'}</div></div><div class="card-actions"><button class="ghost-btn small exclude-candidate" data-id="${esc(c.id)}">この候補を除外</button><button class="primary-btn small accept-candidate" data-id="${esc(c.id)}">この候補を照合</button></div></article>`;
      }).join('');
      return `<section class="conflict-group-card"><div class="conflict-group-head"><div><small>比較グループ ${gi+1}</small><h4>同じ明細を使う候補が複数あります</h4><p>緑が「共通」、オレンジが「候補ごとに違う部分」です。</p></div><span class="conflict-count">${group.length}候補</span></div>${commonHtml}<div class="conflict-option-list">${options}</div></section>`;
    }).join('');
    wireCandidateButtons();
  };

  function currentSelected(side,id){
    return new Set([...document.querySelectorAll(`#${id} .manual-check[data-side="${side}"]:checked`)].map(x=>x.dataset.id));
  }

  // 手動照合：入金=緑＋、出金=赤−。大量明細向け300件単位描画も維持。
  renderUnmatchedTable = function(side,id){
    const table=$(id); if(!table) return;
    const selected=currentSelected(side,id);
    const rows=tableRows(side);
    const limit=Math.min(visibleRows[side],rows.length),shown=rows.slice(0,limit),more=rows.length-limit;
    table.innerHTML=`<thead><tr><th>選択</th><th>状態</th><th>日付</th><th>入出金</th><th>${side==='bank'?'銀行金額':'当社金額'}</th><th>摘要/相手先</th><th>6桁キー</th></tr></thead><tbody>${shown.map(r=>`<tr class="direction-row-${signedClass(r)}"><td><input type="checkbox" class="manual-check" data-side="${side}" data-id="${esc(r.id)}" ${selected.has(r.id)?'checked':''}></td><td><span class="row-status ${r.status.includes('複数')?'st-conflict':r.status==='要確認'?'st-review':''}">${esc(r.status)}</span></td><td>${esc(r.date)}</td><td>${directionBadge(r)}</td><td class="money"><span class="signed-money ${signedClass(r)}">${signedYen(r)}</span></td><td>${esc(r.desc)}</td><td>${esc(r.strongKey)}</td></tr>`).join('')}${more>0?`<tr class="manual-more-row"><td colspan="7"><div><span>${limit.toLocaleString()} / ${rows.length.toLocaleString()}件を表示中</span><button type="button" class="manual-more-btn" data-side="${side}">さらに${Math.min(PAGE_SIZE_CLARITY,more).toLocaleString()}件表示</button></div></td></tr>`:''}</tbody>`;
    table.querySelectorAll('.manual-check').forEach(x=>x.addEventListener('change',renderManualSums));
    const moreBtn=table.querySelector('.manual-more-btn');
    if(moreBtn) moreBtn.addEventListener('click',()=>{visibleRows[side]+=PAGE_SIZE_CLARITY;renderUnmatchedTable(side,id);renderManualSums();});
  };

  function selectionDirection(rows){
    const dirs=[...new Set(rows.map(r=>r.direction))];
    return dirs.length===1?dirs[0]:(dirs.length?'混在':'');
  }
  function totalDisplay(rows,total){
    const dir=selectionDirection(rows);
    if(dir==='出金') return `<b class="signed-money out">−${yen(total)}</b>`;
    if(dir==='入金') return `<b class="signed-money in">+${yen(total)}</b>`;
    if(dir==='混在') return `<b class="manual-mixed">${yen(total)}（混在）</b>`;
    return `<b>${yen(total)}</b>`;
  }

  renderManualSums = function(){
    const bs=rowsByIds('bank',manualSelected('bank')),cs=rowsByIds('company',manualSelected('company'));
    const b=bs.reduce((a,r)=>a+r.amount,0),c=cs.reduce((a,r)=>a+r.amount,0);
    const all=[...bs,...cs],dirs=new Set(all.map(r=>r.direction));
    const ok=bs.length&&cs.length&&b===c&&dirs.size===1;
    $('manualSums').innerHTML=`<span class="sum-pill amount-summary"><small>銀行金額</small>${totalDisplay(bs,b)}<small>${bs.length}件</small></span><span class="sum-pill amount-summary"><small>当社金額</small>${totalDisplay(cs,c)}<small>${cs.length}件</small></span><span class="sum-pill ${ok?'ok':'bad'}">差額 ${diffYen(b-c)}${ok?' · 照合可能':dirs.size>1?' · 入出金が混在':''}</span>`;
  };

  // 日別画面も「RAW合計」ではなく「銀行金額 / 当社金額」に統一。
  renderDaily = function(){
    const dates=[...new Set([...state.bank.rows,...state.company.rows].map(r=>r.date))].sort();
    const lines=[];
    for(const d of dates) for(const dir of ['入金','出金']){
      const b=state.bank.rows.filter(r=>r.date===d&&r.direction===dir).reduce((a,r)=>a+r.amount,0);
      const c=state.company.rows.filter(r=>r.date===d&&r.direction===dir).reduce((a,r)=>a+r.amount,0);
      lines.push({d,dir,b,c,diff:b-c});
    }
    const month=(dir,side)=>state[side].rows.filter(r=>r.direction===dir).reduce((a,r)=>a+r.amount,0);
    const amount=(v,dir)=>`<span class="signed-money ${dir==='出金'?'out':'in'}">${dir==='出金'?'−':'+'}${yen(v)}</span>`;
    const diff=(v)=>`<span class="${v===0?'daily-diff-zero':'daily-diff-alert'}">${diffYen(v)}</span>`;
    $('dailyTable').innerHTML=`<thead><tr><th>日付</th><th>入出金</th><th>銀行金額</th><th>当社金額</th><th>差額</th><th>確認</th></tr></thead><tbody>${lines.map(x=>`<tr class="daily-direction-${x.dir==='出金'?'out':'in'}"><td>${esc(x.d)}</td><td>${directionBadge(x)}</td><td class="money">${amount(x.b,x.dir)}</td><td class="money">${amount(x.c,x.dir)}</td><td class="money">${diff(x.diff)}</td><td>${x.diff===0?'一致':'要確認'}</td></tr>`).join('')}<tr class="total-row"><td>月合計</td><td>${directionBadge({direction:'入金'})}</td><td>${amount(month('入金','bank'),'入金')}</td><td>${amount(month('入金','company'),'入金')}</td><td>${diff(month('入金','bank')-month('入金','company'))}</td><td></td></tr><tr class="total-row"><td></td><td>${directionBadge({direction:'出金'})}</td><td>${amount(month('出金','bank'),'出金')}</td><td>${amount(month('出金','company'),'出金')}</td><td>${diff(month('出金','bank')-month('出金','company'))}</td><td></td></tr></tbody>`;
  };

  function replaceRawLabels(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    for(const n of nodes){
      n.nodeValue=n.nodeValue.replace(/銀行RAW/g,'銀行データ').replace(/当社RAW/g,'当社データ').replace(/RAW取込/g,'データ取込');
    }
  }

  const search=$('globalSearch');
  if(search) search.addEventListener('input',()=>{visibleRows.bank=PAGE_SIZE_CLARITY;visibleRows.company=PAGE_SIZE_CLARITY;});
  loadClarityCss();
  replaceRawLabels();

  // 既に表示済みの画面があれば、新しい表現へ即時更新。
  if(!$('workspace')?.classList.contains('hidden')){
    renderCandidates();renderConflicts();renderManual();renderDaily();renderSummary();
  }
})();
