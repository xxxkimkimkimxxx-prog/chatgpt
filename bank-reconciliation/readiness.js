(() => {
  'use strict';

  let targetMonthTouched = false;
  let autoDetectedMonth = '';
  const prep = {bank:'empty', company:'empty'};

  function loadCss(){
    if(document.querySelector('link[data-readiness-css]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./readiness.css';
    link.dataset.readinessCss='1';
    document.head.appendChild(link);
  }

  function frame(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
  function sideLabel(side){return side==='bank'?'銀行データ':'当社データ';}

  function ensurePanel(){
    if(document.getElementById('prepReadiness')) return;
    const runNote=document.getElementById('runNote');
    if(!runNote) return;
    const panel=document.createElement('div');
    panel.id='prepReadiness';
    panel.className='prep-readiness';
    panel.innerHTML=`
      <div class="prep-title"><b>照合の準備状況</b><span id="prepMessage">2つのファイルを読み込んでください</span></div>
      <div class="prep-steps">
        <div class="prep-chip" id="prepBank"><span>1</span><div><b>銀行データ</b><small>未読込</small></div></div>
        <i>→</i>
        <div class="prep-chip" id="prepCompany"><span>2</span><div><b>当社データ</b><small>未読込</small></div></div>
        <i>→</i>
        <div class="prep-chip" id="prepReady"><span>3</span><div><b>照合</b><small>待機中</small></div></div>
      </div>`;
    runNote.parentElement.appendChild(panel);
  }

  function chip(side,status,detail){
    prep[side]=status;
    const el=document.getElementById(side==='bank'?'prepBank':'prepCompany');
    if(!el) return;
    el.classList.remove('loading','ready','error','warning');
    if(status!=='empty') el.classList.add(status);
    const small=el.querySelector('small');
    if(small) small.textContent=detail || (status==='ready'?'準備完了':status==='loading'?'読込中':'未読込');
  }

  function refreshReadyMessage(){
    ensurePanel();
    const msg=document.getElementById('prepMessage');
    const readyChip=document.getElementById('prepReady');
    if(!msg||!readyChip) return;
    readyChip.classList.remove('loading','ready','error','warning');
    const runBtn=document.getElementById('runBtn');
    const ready=runBtn && !runBtn.disabled && state.bank.rows.length>0 && state.company.rows.length>0;
    if(ready){
      readyChip.classList.add('ready');
      readyChip.querySelector('small').textContent='今すぐ開始できます';
      msg.innerHTML='<strong>準備完了</strong> — 「照合を開始」を押せます';
      runBtn.classList.add('run-ready-pulse');
      setTimeout(()=>runBtn.classList.remove('run-ready-pulse'),1800);
      return;
    }
    if(prep.bank==='loading'||prep.company==='loading'){
      readyChip.classList.add('loading');
      readyChip.querySelector('small').textContent='準備中';
      msg.textContent='ファイルを処理しています…';
      return;
    }
    readyChip.querySelector('small').textContent='待機中';
    if(state.bank.file && state.company.file && (!state.bank.rows.length || !state.company.rows.length)){
      readyChip.classList.add('warning');
      msg.textContent='対象月または列対応を確認してください';
    }else if(state.bank.file || state.company.file){
      msg.textContent='もう一方のファイルを読み込んでください';
    }else{
      msg.textContent='2つのファイルを読み込んでください';
    }
  }

  function dominantMonth(side){
    const s=state[side], key=s.mapping.date;
    if(!key || !s.rawRows.length) return '';
    const counts=new Map(); let valid=0;
    for(const raw of s.rawRows){
      const d=parseDate(raw[key]);
      if(!d) continue;
      valid++;
      const m=monthOf(d);
      counts.set(m,(counts.get(m)||0)+1);
    }
    if(!valid) return '';
    const best=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];
    return best && best[1]/valid>=0.7 ? best[0] : '';
  }

  function maybeAutoSetTargetMonth(side){
    const detected=dominantMonth(side);
    if(!detected || targetMonthTouched) return;
    if(autoDetectedMonth && autoDetectedMonth!==detected){
      const msg=document.getElementById('prepMessage');
      if(msg) msg.textContent=`銀行・当社データの対象月が一致していません（${autoDetectedMonth} / ${detected}）`;
      return;
    }
    autoDetectedMonth=detected;
    const input=document.getElementById('targetMonth');
    if(input && input.value!==detected){
      input.value=detected;
      state.targetMonth=detected;
      const badge=document.getElementById('monthBadge');
      if(badge) badge.textContent=`対象月 ${detected}（データから自動設定）`;
    }
  }

  // 列対応は実ファイルの標準列を初期値として自動選択する。
  buildMapping = function(side){
    const s=state[side],h=s.headers; let auto;
    if(side==='bank'){
      auto={
        date:findHeader(h,[/^日付$/,/取引日/,/入出金日/]),
        outflow:findHeader(h,[/^出金$/,/^出金額$/,/引出/]),
        inflow:findHeader(h,[/^入金$/,/^入金額$/,/預入/]),
        // 銀行側は「概要」ではなく、実ファイル上の意味に合わせて 種別 / 明細 として扱う。
        desc:findHeader(h,[/^種別$/,/^概要$/,/摘要/,/取引内容/]),
        name:findHeader(h,[/^明細$/,/^振込人名$/,/依頼人/,/名義/]),
        balance:findHeader(h,[/残高/])
      };
    }else{
      auto={
        date:findHeader(h,[/^転記日付$/,/転記日/]),
        amount:findHeader(h,[/^国内通貨額$/,/^国内通貨額/,/^金額$/,/国内通貨/]),
        direction:findHeader(h,[/^貸借区分$/,/入出金区分/]),
        gl:findHeader(h,[/^G\/L勘定$/,/GL勘定/]),
        doc:findHeader(h,[/^伝票番号$/]),
        partner:findHeader(h,[/^取引先企業名$/,/取引先名/,/仕入先.*名称/,/得意先.*名称/]),
        headerText:findHeader(h,[/^ヘッダテキスト$/,/ヘッダテキスト/]),
        lineText:findHeader(h,[/^明細テキスト$/,/明細テキスト/]),
        flag:findHeader(h,[/国内外フラグ/]),
        docType:findHeader(h,[/伝票タイプ/])
      };
    }
    s.mapping=auto;
    maybeAutoSetTargetMonth(side);
    const el=document.getElementById(side+'Mapping');
    el.classList.remove('hidden');
    const fields=side==='bank'
      ? [['date','日付',false],['outflow','出金',true],['inflow','入金',true],['desc','種別',true],['name','明細',true]]
      : [['date','転記日付',false],['amount','国内通貨額',false],['direction','貸借区分',true],['gl','G/L勘定',true],['doc','伝票番号',true],['partner','取引先',true],['headerText','ヘッダテキスト',true],['lineText','明細テキスト',true]];
    el.innerHTML=`<div class="mapping-title">列対応を確認 <span class="mapping-auto-badge">自動設定済み</span></div><div class="mapping-grid">${fields.map(([k,l,b])=>`<label>${l}<select data-map="${k}">${optionList(h,auto[k],b)}</select></label>`).join('')}</div><div class="file-meta">${esc(s.file.name)} / 見出し ${h.length}列</div>`;
    el.querySelectorAll('[data-map]').forEach(c=>c.addEventListener('change',()=>{
      s.mapping[c.dataset.map]=c.value;
      normalizeSide(side);
      updateReady();
      refreshReadyMessage();
    }));
    normalizeSide(side);
  };

  readFile = async function(side,file){
    if(state.locked){alert('対象月は確定済みです。新しい月を開始するか確定を解除してください。');return;}
    if(!window.XLSX){alert('Excel読込ライブラリを読み込めません。');return;}
    ensurePanel();
    chip(side,'loading','ファイル解析中…');
    setStatus(side,'読込中…');
    refreshReadyMessage();
    await frame();
    try{
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(buffer,{type:'array',cellDates:false});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
      const hi=findHeaderRow(matrix,side);
      const headers=(matrix[hi]||[]).map((v,i)=>String(v||`列${i+1}`).trim());
      const rawRows=matrix.slice(hi+1).filter(r=>r.some(v=>String(v??'').trim()!=='')).map((r,idx)=>({__rawRow:hi+2+idx,...Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))}));
      state[side].file=file;
      state[side].headers=headers;
      state[side].rawRows=rawRows;
      const sec=Math.max(1,Math.min(5,Math.ceil(rawRows.length/5000)));
      chip(side,'loading',`列対応を自動設定中・目安あと${sec}秒`);
      setStatus(side,`${rawRows.length.toLocaleString()}行 解析中…`);
      refreshReadyMessage();
      await frame();
      buildMapping(side);
      setStatus(side,`${state[side].rows.length.toLocaleString()}件 準備完了`,true);
      chip(side,'ready',`${state[side].rows.length.toLocaleString()}件 準備完了`);
      log(`${sideLabel(side)}読込：${file.name} / ${rawRows.length.toLocaleString()}行`);
      updateReady();
      refreshReadyMessage();
    }catch(e){
      console.error(e);
      chip(side,'error','読込エラー');
      setStatus(side,'読込エラー');
      refreshReadyMessage();
      alert(`${sideLabel(side)}の読み込みに失敗しました。ファイル形式と見出しを確認してください。`);
    }
  };

  const monthInput=document.getElementById('targetMonth');
  if(monthInput) monthInput.addEventListener('change',e=>{if(e.isTrusted) targetMonthTouched=true;refreshReadyMessage();});

  loadCss();
  ensurePanel();
  refreshReadyMessage();
})();
