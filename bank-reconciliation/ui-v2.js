(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function buildApprovedLayouts(){
    const summary = $('tab-summary');
    if(summary){
      summary.innerHTML = `
        <div class="overview-v2">
          <div class="overview-monthline">
            <div><small>対象月</small><b id="overviewMonth">未設定</b></div>
            <div class="overview-save-state" id="overviewSaveState">自動保存</div>
          </div>

          <article class="overview-progress-card">
            <div class="overview-progress-left">
              <span>照合の進み具合</span>
              <strong class="overview-rate"><b id="overviewRate">0</b><span>%</span></strong>
              <p id="overviewProgressText">銀行明細の処理状況を表示します。</p>
            </div>
            <div>
              <div class="overview-bar"><i id="overviewProgressFill"></i></div>
              <div class="overview-bar-label"><b id="overviewCompletedText">0件 完了</b><span id="overviewRemainingText">あと0件</span></div>
            </div>
          </article>

          <article class="overview-next-card">
            <div class="overview-next-inner">
              <div><small>NEXT ACTION</small><h3 id="overviewNextTitle">照合結果を確認してください</h3><p id="overviewNextText">次に行う作業をここに表示します。</p></div>
              <button type="button" class="overview-next-btn" id="overviewNextBtn">確認する →</button>
            </div>
          </article>

          <div class="overview-status-grid">
            <article class="overview-status-card ok"><div class="overview-status-icon">✓</div><div><span>自動で完了</span><strong id="overviewMatched">0</strong><p>作業不要</p></div></article>
            <article class="overview-status-card warn"><div class="overview-status-icon">!</div><div><span>確認が必要</span><strong id="overviewReview">0</strong><p>候補を確認</p></div></article>
            <article class="overview-status-card orange"><div class="overview-status-icon">?</div><div><span>候補が複数</span><strong id="overviewConflicts">0</strong><p>正しい候補を選択</p></div></article>
            <article class="overview-status-card red"><div class="overview-status-icon">…</div><div><span>まだ候補なし</span><strong id="overviewUnmatched">0</strong><p>手動照合へ</p></div></article>
          </div>

          <div class="overview-bottom-grid">
            <article class="summary-card">
              <div class="summary-title">月次確定まで</div>
              <div id="closeChecklist"></div>
              <button class="primary-btn full-btn" id="closeMonthBtn" type="button">月次照合を確定する</button>
            </article>
            <article class="summary-card">
              <div class="summary-title">最後に確認すること</div>
              <p class="overview-helper">未照合を解消したら、銀行と当社の入出金合計に差額が残っていないか確認します。</p>
              <button type="button" class="overview-link-btn" data-tab-jump="daily">日別の差額を見る</button>
            </article>
          </div>

          <details class="overview-log"><summary>処理履歴を見る</summary><div class="log-box" id="logBox"></div></details>
          <div class="summary-stats hidden" id="summaryStats"></div>
          <div class="big-progress hidden"><div id="matchProgress"></div></div>
        </div>`;
    }

    const manual = $('tab-manual');
    if(manual){
      manual.innerHTML = `
        <div class="manual-v2-head"><div><h3>手動で照合</h3><p>銀行側と当社側を見比べながら、金額が一致する明細を選択します。</p></div></div>
        <div class="manual-v2-sticky"><div class="manual-sums" id="manualSums"></div><button class="primary-btn small" id="manualMatchBtn" type="button">この組み合わせで照合</button></div>
        <div class="manual-v2-help">左右の表はそれぞれ別々にスクロールできます。画面上部の選択金額と差額は常に確認できます。</div>
        <div class="split-grid manual-split-v2">
          <section class="manual-side-v2"><div class="manual-side-head"><div><small>BANK</small><h4>銀行の未照合</h4></div><span>左側から選択</span></div><div class="table-wrap manual-scroll-v2"><table id="bankUnmatchedTable"></table></div></section>
          <section class="manual-side-v2"><div class="manual-side-head"><div><small>COMPANY</small><h4>当社の未処理</h4></div><span>右側から選択</span></div><div class="table-wrap manual-scroll-v2"><table id="companyUnmatchedTable"></table></div></section>
        </div>`;
    }
  }

  function numberFrom(id){
    const text = ($(id)?.textContent || '0').replace(/,/g,'').replace('%','').trim();
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  function monthLabel(value){
    if(!value || !/^\d{4}-\d{2}$/.test(value)) return '未設定';
    const [y,m] = value.split('-');
    return `${y}年${Number(m)}月`;
  }
  function setText(id,text){const el=$(id); if(el) el.textContent=text;}

  let nextTab = 'daily';
  function refreshOverview(){
    if(!$('overviewRate')) return;
    const total = numberFrom('kpiBank');
    const rate = numberFrom('kpiRate');
    const review = numberFrom('kpiCandidates');
    const conflicts = numberFrom('kpiConflicts');
    const unmatched = numberFrom('kpiUnmatched');
    const completed = total ? Math.min(total, Math.round(total * rate / 100)) : 0;
    const remaining = Math.max(0,total-completed);
    setText('overviewMonth',monthLabel($('targetMonth')?.value || ''));
    const saveText = $('saveStateLabel')?.textContent || '自動保存';
    setText('overviewSaveState',saveText.replace('ローカルDB：',''));
    setText('overviewRate',String(rate));
    setText('overviewProgressText',total ? `銀行明細 ${total.toLocaleString()}件のうち ${completed.toLocaleString()}件が処理済みです` : '照合を実行すると進捗が表示されます。');
    setText('overviewCompletedText',`${completed.toLocaleString()}件 完了`);
    setText('overviewRemainingText',`あと${remaining.toLocaleString()}件`);
    if($('overviewProgressFill')) $('overviewProgressFill').style.width = `${Math.max(0,Math.min(100,rate))}%`;
    setText('overviewMatched',completed.toLocaleString());
    setText('overviewReview',review.toLocaleString());
    setText('overviewConflicts',conflicts.toLocaleString());
    setText('overviewUnmatched',unmatched.toLocaleString());

    let title='最後に日別の差額を確認してください', text='照合が終わったら、入出金合計に差額がないか確認します。', label='日別確認を見る →';
    nextTab='daily';
    if(review>0){title='次は「確認が必要」を見てください';text=`自動で候補が ${review}件 見つかっています。内容を確認して照合してください。`;label=`${review}件を確認する →`;nextTab='candidates';}
    else if(conflicts>0){title='次は「候補が複数」を確認してください';text=`正しい組み合わせを人が選ぶ必要がある候補が ${conflicts}件 あります。`;label=`${conflicts}件を確認する →`;nextTab='conflicts';}
    else if(unmatched>0){title='次は「手動で照合」を行ってください';text=`自動候補が見つからなかった銀行明細が ${unmatched}件 残っています。`;label=`${unmatched}件を手動で確認 →`;nextTab='manual';}
    setText('overviewNextTitle',title);setText('overviewNextText',text);setText('overviewNextBtn',label);
  }

  function jumpToTab(name){
    const btn=document.querySelector(`.tab[data-tab="${name}"]`);
    if(btn) btn.click();
    $('workspace')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  buildApprovedLayouts();
  document.addEventListener('click',e=>{
    const jump=e.target.closest('[data-tab-jump]'); if(jump) jumpToTab(jump.dataset.tabJump);
    if(e.target.closest('#overviewNextBtn')) jumpToTab(nextTab);
  });
  $('targetMonth')?.addEventListener('change',refreshOverview);

  const observer = new MutationObserver(refreshOverview);
  ['kpiBank','kpiRate','kpiCandidates','kpiConflicts','kpiUnmatched','saveStateLabel'].forEach(id=>{const el=$(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true});});
  setTimeout(refreshOverview,0);
})();
