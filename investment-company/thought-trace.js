(() => {
  const legacyBuildThemeTree = buildThemeTree;
  const legacyShowDetail = showDetail;
  const legacyKindName = kindName;

  const TRACE_KIND = {
    news:'NEWS', change:'STRUCTURAL CHANGE', theme:'THEME', chain:'VALUE CHAIN',
    screen:'BENEFICIARY SCREEN', company:'COMPANY', logic:'WHY THIS COMPANY',
    evidence:'EVIDENCE', stock:'STOCK DECISION', reject:'REJECT'
  };

  kindName = function(k){ return TRACE_KIND[k] || legacyKindName(k); };

  function traceTheme(slug){ return state.trace?.themes?.[slug] || null; }
  function cleanPath(items=[]){ return items.filter(Boolean).map(x=>String(x)); }
  function withPath(data, path){ return {...data, tracePath:cleanPath(path)}; }
  function breadcrumb(path=[]){
    if(!path.length) return '';
    return `<div class="tracePath"><div class="tracePathLabel">HOW WE GOT HERE</div><div class="tracePathItems">${path.map((x,i)=>`<span>${esc(x)}</span>${i<path.length-1?'<b>›</b>':''}`).join('')}</div></div>`;
  }
  function conditionsHTML(arr=[]){
    if(!arr.length) return '';
    return `<div class="detailSection"><h4>この段階で残す条件</h4><ul class="detailList">${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }
  function evidenceGroup(t, chain, comp, basePath){
    const items=comp.evidence||[];
    const stock=findCandidate(t, comp.code);
    const stockNode=stock?nodeHTML({
      kind:'stock', title:`${stock.code} ${stock.name}`,
      meta:`Day ${shortGrade(stock.daytrade)} · Swing ${shortGrade(stock.swing)} · 中期 ${shortGrade(stock.medium)}`,
      key:`${t.slug}:decision:${stock.code}:${chain}`,
      data:withPath({slug:t.slug,code:stock.code,chain}, [...basePath,'一次情報で裏取り','投資対象として時間軸別審査'])
    }):'';
    const sourceNodes=items.map((e,j)=>nodeHTML({
      kind:'evidence', title:e.title, meta:e.date||'一次情報',
      key:`${t.slug}:trace-evidence:${chain}:${comp.code}:${j}`,
      data:withPath({slug:t.slug,chain,code:comp.code,evidence:e}, [...basePath,'一次情報で裏取り',e.title])
    })).join('');
    const emptyEvidence=!items.length?nodeHTML({
      kind:'evidence', title:'一次情報の追加確認が必要',
      meta:'関連性は確認済みだが、収益接続の証拠を継続検証',
      key:`${t.slug}:trace-evidence-pending:${chain}:${comp.code}`,
      data:withPath({slug:t.slug,chain,code:comp.code,pending:true}, [...basePath,'一次情報の確認継続'])
    }):'';
    return nodeHTML({
      kind:'evidence', title:'企業固有の一次情報で裏取り',
      meta:`確認 ${items.length}件${items.length?'':' · 追加検証中'}`,
      children:sourceNodes+emptyEvidence+stockNode,
      key:`${t.slug}:evidence-group:${chain}:${comp.code}`,
      data:withPath({slug:t.slug,chain,code:comp.code,evidenceGroup:true}, [...basePath,'一次情報で裏取り'])
    });
  }

  function companyNode(t, chain, comp, basePath){
    const companyPath=[...basePath,`${comp.code} ${comp.name}`];
    const logic=nodeHTML({
      kind:'logic', title:comp.fit,
      meta:'テーマとの接続理由',
      children:evidenceGroup(t,chain,comp,[...companyPath,'なぜこの企業か']),
      key:`${t.slug}:logic:${chain}:${comp.code}`,
      data:withPath({slug:t.slug,chain,code:comp.code,fit:comp.fit}, [...companyPath,'なぜこの企業か'])
    });
    return nodeHTML({
      kind:'company', title:`${comp.code} ${comp.name}`,
      meta:'スクリーニング条件を満たした候補企業', children:logic,
      key:`${t.slug}:company:${chain}:${comp.code}`,
      data:withPath({slug:t.slug,chain,code:comp.code,fit:comp.fit}, companyPath)
    });
  }

  function screenNode(t, chain, tracePath, basePath){
    if(!tracePath) return '';
    const companies=(tracePath.companies||[]).map(c=>companyNode(t,chain,c,[...basePath,'受益企業の条件でスクリーニング'])).join('');
    const rejects=(tracePath.rejected||[]).map((r,i)=>nodeHTML({
      kind:'reject', title:r.code?`${r.code} ${r.name}`:(r.name||'候補外'), meta:r.reason,
      key:`${t.slug}:reject:${chain}:${i}`,
      data:withPath({slug:t.slug,chain,reject:r}, [...basePath,'受益企業の条件でスクリーニング','候補外',r.code?`${r.code} ${r.name}`:r.name])
    })).join('');
    const none=(!companies&&!rejects)?nodeHTML({
      kind:'reject', title:'現時点で本命企業なし',meta:'テーマとの関連だけでは昇格させない',
      key:`${t.slug}:reject-none:${chain}`,data:withPath({slug:t.slug,chain},[...basePath,'受益企業の条件でスクリーニング','本命なし'])
    }):'';
    return nodeHTML({
      kind:'screen', title:tracePath.question,
      meta:`条件 ${tracePath.beneficiaryConditions?.length||0}項目 · 候補 ${(tracePath.companies||[]).length}社`,
      children:companies+rejects+none,
      key:`${t.slug}:screen:${chain}`,
      data:withPath({slug:t.slug,chain,question:tracePath.question,conditions:tracePath.beneficiaryConditions||[]}, [...basePath,'受益企業の条件でスクリーニング'])
    });
  }

  function traceChainNode(t, chain, basePath){
    const tt=traceTheme(t.slug);
    const p=tt?.paths?.[chain];
    const chainPath=[...basePath,chain];
    const child=p?screenNode(t,chain,p,chainPath):nodeHTML({
      kind:'reject',title:'この価値連鎖は詳細マッピング未完',meta:'企業へ飛ばさず追加調査に戻す',
      key:`${t.slug}:unmapped:${chain}`,data:withPath({slug:t.slug,chain},[...chainPath,'追加調査'])
    });
    return nodeHTML({kind:'chain',title:chain,meta:p?'企業選定ロジックあり':'追加マッピング必要',children:child,key:`${t.slug}:chain-trace:${chain}`,data:withPath({slug:t.slug,chain},chainPath)});
  }

  function changeNode(t,change,idx,rootPath){
    const changePath=[...rootPath,change.title];
    const chainHTML=(change.chains||[]).map(chain=>traceChainNode(t,chain,[...changePath,t.theme])).join('');
    const themeNode=nodeHTML({
      kind:'theme',title:t.theme,meta:`Trend ${t.meta.trendQuality} · Heat ${t.meta.priceHeat}`,
      children:chainHTML,key:`${t.slug}:trace-theme:${idx}`,
      data:withPath({slug:t.slug},[...changePath,t.theme])
    });
    return nodeHTML({
      kind:'change',title:change.title,meta:'ニュースが企業利益へ波及する因果仮説',children:themeNode,
      key:`${t.slug}:change:${change.id||idx}`,
      data:withPath({slug:t.slug,change},changePath)
    });
  }

  buildThemeTree = function(t,idx,q){
    const trace=traceTheme(t.slug);
    if(!trace) return legacyBuildThemeTree(t,idx,q);
    const events=t.sourceEvents||[];
    const primary=events[0]||{date:t.date,event:t.theme,url:''};
    const rootPath=[primary.event];
    const changes=(trace.structuralChanges||[]).map((c,i)=>changeNode(t,c,i,rootPath)).join('');
    const supporting=events.slice(1);
    const supportNode=supporting.length?nodeHTML({
      kind:'evidence', title:'この仮説を補強した追加イベント',meta:`${supporting.length}件`,
      children:supporting.map((e,j)=>nodeHTML({kind:'evidence',title:e.event,meta:e.date,key:`${t.slug}:support:${j}`,data:withPath({slug:t.slug,evidence:e},[...rootPath,'追加イベント',e.event])})).join(''),
      key:`${t.slug}:supporting`,data:withPath({slug:t.slug,supporting:true},[...rootPath,'追加イベント'])
    }):'';
    const child=changes+supportNode;
    return `<div class="themeGroup traceV2">${nodeHTML({kind:'news',title:primary.event,meta:`${primary.date} · 起点ニュース`,children:child,key:`${t.slug}:trace-news`,data:withPath({slug:t.slug,eventIndex:0},rootPath),open:Boolean(q)||idx===0})}</div>`;
  };

  showDetail = function(p){
    const t=findTheme(p.data.slug);
    if(!t) return;
    const path=p.data.tracePath||[];
    if(p.kind==='stock'){
      legacyShowDetail(p);
      const content=$('.detailContent',$('#detailPanel'));
      if(content && path.length) content.insertAdjacentHTML('afterbegin',breadcrumb(path));
      return;
    }
    let html='';
    if(p.kind==='change'){
      const c=p.data.change||{};
      html=`${breadcrumb(path)}${detailHead('構造変化 / 因果仮説',c.title||'',t.theme)}<div class="detailSection"><h4>なぜこの変化が起きると考えたか</h4><div class="detailLead">${esc(c.why||'')}</div></div><div class="detailSection"><h4>ここから調べる価値連鎖</h4><ul class="detailList">${(c.chains||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    } else if(p.kind==='screen'){
      html=`${breadcrumb(path)}${detailHead('受益企業スクリーニング',p.data.question||'',p.data.chain||'')}<div class="detailSection"><h4>問い</h4><div class="detailLead">${esc(p.data.question||'')}</div></div>${conditionsHTML(p.data.conditions||[])}<div class="detailSection"><h4>ここで何をしているか</h4><div class="detailLead">VALUE CHAINに属する会社を全部テーマ株扱いせず、実際に利益へ届く条件を置いて候補企業を絞っています。</div></div>`;
    } else if(p.kind==='company'){
      html=`${breadcrumb(path)}${detailHead('候補企業',`${p.data.code} ${findCandidate(t,p.data.code)?.name||''}`,p.data.chain||'')}<div class="detailSection"><h4>なぜ候補リストに残ったか</h4><div class="detailLead">${esc(p.data.fit||'')}</div></div><div class="detailSection"><h4>次のゲート</h4><div class="detailLead">企業固有のIR・決算・受注・製品発表で本当に接続しているかを確認し、その後に株価・需給・時間軸を評価します。</div></div>`;
    } else if(p.kind==='logic'){
      html=`${breadcrumb(path)}${detailHead('企業への接続ロジック','なぜこの会社なのか',p.data.chain||'')}<div class="detailSection"><h4>接続理由</h4><div class="detailLead">${esc(p.data.fit||'')}</div></div><div class="detailSection"><h4>注意</h4><div class="detailLead">業界にいるだけでは不十分です。次段階のEVIDENCEで会社固有の一次情報を確認できて初めて投資対象の審査へ進めます。</div></div>`;
    } else if(p.kind==='evidence'){
      const e=p.data.evidence;
      if(e){
        html=`${breadcrumb(path)}${detailHead('企業固有の一次情報',e.title||'一次情報',e.date||'')}<div class="detailSection"><h4>この証拠の役割</h4><div class="detailLead">テーマと会社の事業を接続するための証拠です。ニュースの連想ではなく、製品・受注・提携・決算等の企業固有情報を確認します。</div></div>${e.url?`<div class="detailSection"><h4>一次情報</h4><a class="sourceLink" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a></div>`:''}`;
      } else if(p.data.evidenceGroup){
        html=`${breadcrumb(path)}${detailHead('証拠ゲート','企業固有の一次情報で裏取り',p.data.chain||'')}<div class="detailSection"><h4>通過条件</h4><div class="detailLead">会社IR・決算・受注・製品・顧客情報などで、テーマとの接続を会社単位で確認します。通過後に初めてSTOCK DECISIONへ進みます。</div></div>`;
      } else {
        html=`${breadcrumb(path)}${detailHead('追加検証','一次情報の確認継続',p.data.chain||'')}<div class="detailSection"><div class="detailLead">テーマ純度はあるものの、今回の調査では収益感応度を十分に裏付ける会社固有の証拠が不足しています。自動的に本命化しません。</div></div>`;
      }
    } else if(p.kind==='reject'){
      const r=p.data.reject||{};
      html=`${breadcrumb(path)}${detailHead('候補外 / 保留',r.code?`${r.code} ${r.name}`:(r.name||'本命なし'),p.data.chain||'')}<div class="detailSection"><h4>落とした理由</h4><div class="detailLead">${esc(r.reason||'一次情報で利益への直接接続を確認できないため、本命へ昇格させません。')}</div></div>`;
    } else {
      legacyShowDetail(p);
      const content=$('.detailContent',$('#detailPanel'));
      if(content && path.length) content.insertAdjacentHTML('afterbegin',breadcrumb(path));
      return;
    }
    $('#detailPanel').innerHTML=`<div class="detailContent">${html}</div>`;
    if(window.innerWidth<1080) $('#detailPanel').scrollIntoView({behavior:'smooth',block:'start'});
  };

  async function loadTrace(){
    try{
      const pointer=await getJSON('./theme-research/thought-trace-latest.json');
      const rel=String(pointer.path||'').replace(/^\.\//,'');
      state.trace=await getJSON('./theme-research/'+rel);
      const input=$('#treeSearch');
      renderTree(input?.value||'');
    }catch(e){ console.warn('thought trace unavailable',e); }
  }

  const boot=()=>loadTrace();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
