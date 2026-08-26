(() => {
  'use strict';

  const PAGE_SIZE = 300;
  const manualVisible = { bank: PAGE_SIZE, company: PAGE_SIZE };

  function loadPerformanceCss(){
    if(document.querySelector('link[data-performance-css]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./performance.css';
    link.dataset.performanceCss='1';
    document.head.appendChild(link);
  }

  function toast(message){
    let el=document.getElementById('fastToast');
    if(!el){
      el=document.createElement('div');
      el.id='fastToast';
      el.className='fast-toast';
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.classList.remove('show');
    requestAnimationFrame(()=>{
      el.classList.add('show');
      setTimeout(()=>el.classList.remove('show'),1100);
    });
  }

  function activeTab(){
    return document.querySelector('.tab.active')?.dataset.tab || 'summary';
  }

  function renderActiveTab(){
    const tab=activeTab();
    if(tab==='candidates') renderCandidates();
    else if(tab==='conflicts') renderConflicts();
    else if(tab==='manual') renderManual();
    else if(tab==='matched') renderMatches();
    else if(tab==='daily') renderDaily();
    else if(tab==='masters') renderMasters();
  }

  // 全画面を毎回描き直さず、「全体 + 今見ている画面」だけを更新する。
  renderAll = function(){
    renderSummary();
    renderActiveTab();
    renderLog();
    updateReady();
  };

  function pruneCandidatesByIds(ids){
    const used=ids instanceof Set ? ids : new Set(ids);
    state.candidates = state.candidates.filter(c => ![...c.bankIds,...c.companyIds].some(id=>used.has(id)));
    recalcCandidateConflicts();
  }

  function refreshLight(){
    renderSummary();
    renderActiveTab();
    updateReady();
  }

  // 候補確定時：候補の全再探索をやめ、今回使った明細に関係する候補だけ除外する。
  acceptCandidates = function(ids){
    const cs=state.candidates.filter(c=>ids.includes(c.id));
    if(!cs.length) return;

    const used=new Set();
    for(const c of cs){
      for(const id of [...c.bankIds,...c.companyIds]){
        if(used.has(id)){
          alert('選択した候補間で同じ明細が重複しています。照合を中止しました。');
          return;
        }
        const row=[...state.bank.rows,...state.company.rows].find(r=>r.id===id);
        if(row?.matchId){
          alert('既に照合済みの明細を含みます。画面を更新して再度お試しください。');
          return;
        }
        used.add(id);
      }
    }

    for(const c of cs) createMatch(c.bankIds,c.companyIds,c.type,false,'候補組から確定');
    pruneCandidatesByIds(used);
    refreshLight();
    toast(`${cs.length}件を照合しました`);
    log(`${cs.length}候補を照合確定しました。`);
    scheduleSave();
  };

  // 候補除外も全再探索しない。残った候補だけで競合状態を再計算する。
  excludeCandidate = function(id){
    const c=state.candidates.find(x=>x.id===id);
    if(!c) return;
    const reason=prompt('除外理由（任意）','誤候補');
    state.exclusions.push({id:`EX-${Date.now()}`,key:c.key,type:c.type,reason:reason||'',createdAt:nowIso()});
    state.candidates=state.candidates.filter(x=>x.id!==id);
    recalcCandidateConflicts();
    refreshLight();
    toast('候補から除外しました');
    log(`候補 ${id} を除外履歴へ登録しました。`);
  };

  function selectedIdsInTable(side){
    return new Set([...document.querySelectorAll(`#${side==='bank'?'bankUnmatchedTable':'companyUnmatchedTable'} .manual-check[data-side="${side}"]:checked`)].map(x=>x.dataset.id));
  }

  // 手動表は最初の300行だけ描画。大量明細でもDOMを膨らませない。
  renderUnmatchedTable = function(side,id){
    const table=document.getElementById(id);
    if(!table) return;
    const selected=selectedIdsInTable(side);
    const rows=tableRows(side);
    const limit=Math.min(manualVisible[side],rows.length);
    const shown=rows.slice(0,limit);
    const more=rows.length-limit;

    table.innerHTML=`<thead><tr><th>選択</th><th>状態</th><th>日付</th><th>区分</th><th>金額</th><th>摘要/相手先</th><th>6桁キー</th></tr></thead><tbody>${shown.map(r=>`<tr data-row-id="${esc(r.id)}"><td><input type="checkbox" class="manual-check" data-side="${side}" data-id="${esc(r.id)}" ${selected.has(r.id)?'checked':''}></td><td><span class="row-status ${r.status.includes('複数')?'st-conflict':r.status==='要確認'?'st-review':''}">${esc(r.status)}</span></td><td>${esc(r.date)}</td><td>${esc(r.direction)}</td><td class="money">${yen(r.amount)}</td><td>${esc(r.desc)}</td><td>${esc(r.strongKey)}</td></tr>`).join('')}${more>0?`<tr class="manual-more-row"><td colspan="7"><div><span>${limit.toLocaleString()} / ${rows.length.toLocaleString()}件を表示中</span><button type="button" class="manual-more-btn" data-side="${side}">さらに${Math.min(PAGE_SIZE,more).toLocaleString()}件表示</button></div></td></tr>`:''}</tbody>`;

    table.querySelectorAll('.manual-check').forEach(x=>x.addEventListener('change',renderManualSums));
    const btn=table.querySelector('.manual-more-btn');
    if(btn) btn.addEventListener('click',()=>{
      manualVisible[side]+=PAGE_SIZE;
      renderUnmatchedTable(side,id);
      renderManualSums();
    });
  };

  function fastManualMatch(){
    const bids=manualSelected('bank'),cids=manualSelected('company');
    const bs=rowsByIds('bank',bids),cs=rowsByIds('company',cids);
    if(!bids.length||!cids.length){ alert('銀行と当社の両方を選択してください。'); return; }
    const b=bs.reduce((a,r)=>a+r.amount,0),c=cs.reduce((a,r)=>a+r.amount,0);
    if(b!==c){ alert(`合計が一致しません。差額 ${yen(b-c)}`); return; }
    const dirs=new Set([...bs,...cs].map(r=>r.direction));
    if(dirs.size!==1&&!confirm('入金・出金が混在しています。それでも照合しますか？')) return;

    createMatch(bids,cids,'手動照合',false,'手動選択');
    pruneCandidatesByIds(new Set([...bids,...cids]));
    renderSummary();
    renderManual();
    updateReady();
    toast('手動照合しました');
    log(`手動照合：銀行${bids.length}件 / 当社${cids.length}件 / ${yen(b)}`);
    scheduleSave();
  }

  // app.js 初期化後に、手動照合ボタンだけ高速版へ差し替える。
  const manualBtn=document.getElementById('manualMatchBtn');
  if(manualBtn) manualBtn.onclick=fastManualMatch;

  // 非表示タブは開いた瞬間だけ最新状態を描画する。
  document.addEventListener('click',e=>{
    const tab=e.target.closest('.tab[data-tab]');
    if(!tab) return;
    requestAnimationFrame(()=>{
      if(tab.dataset.tab==='summary') renderSummary();
      else if(tab.dataset.tab==='candidates') renderCandidates();
      else if(tab.dataset.tab==='conflicts') renderConflicts();
      else if(tab.dataset.tab==='manual') renderManual();
      else if(tab.dataset.tab==='matched') renderMatches();
      else if(tab.dataset.tab==='daily') renderDaily();
      else if(tab.dataset.tab==='masters') renderMasters();
    });
  });

  // 検索時は表示件数を300件へ戻し、絞り込み結果を軽く描画する。
  const search=document.getElementById('globalSearch');
  if(search) search.addEventListener('input',()=>{manualVisible.bank=PAGE_SIZE;manualVisible.company=PAGE_SIZE;});

  loadPerformanceCss();
})();
