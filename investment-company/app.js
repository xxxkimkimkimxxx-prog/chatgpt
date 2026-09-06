const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

const state = { latest:null, index:null, themes:[], view:'tree', horizon:'day', filter:'all', selected:null };

const chainMap = {
  'ai-datacenter-power-flexibility': {
    'オンサイト発電':['6501'], '送配電/変電':['6501'], 'データセンター統合運用':['6501'],
    'PPA/電力取引':['350A'], '蓄電池アグリゲーション':['350A'], '電力先物/ヘッジ':[]
  },
  'defense-ai-unmanned': {
    '防衛装備/プラットフォーム':['7011'], '無人アセット':['7011'], 'C2/指揮統制':['6701'],
    'クラウド/ネットワーク':['6701'], 'AI/データ主権':['6701'], 'セキュア通信':['6701']
  },
  'critical-infrastructure-cyber': {
    '統合セキュリティプラットフォーム':['4704'], 'SOC/MDR':['4704'],
    '脆弱性診断/ペネトレーション':['3692'], '国産セキュリティ/政府案件':['3692'],
    'OT/重要インフラ向けセキュリティ':['4704','3692']
  },
  'ai-optical-connectivity': {
    '超多心光ファイバ':['5801','5803'], 'DCIケーブル':['5801','5803'],
    '高密度コネクタ/フェルール':['5801','5803'], '融着接続':['5801','5803'],
    '光部品/レーザ':['5801','5803'], 'ネットワーク運用':['5801','5803']
  },
  'physical-ai-autonomous-sdv': {
    '自動運転OS/AI開発基盤':['593A'], '高精度3D地図':['336A','4667'], 'カメラ/センシングAI':['3653'],
    '車両制御/Tier1':['3653','593A'], '運行・物流オペレーション':['336A','4667'], '実装支援/検証':['4667','336A']
  }
};

const label = {
  day:'デイトレ', swing:'スイング', medium:'中期',
  directness:'直接度', earningsExposure:'収益感応度', evidenceQuality:'証拠品質', pricedIn:'織り込み度', timeHorizon:'業績寄与'
};

function esc(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function fmt(v){return v==null||v===''?'—':String(v).replaceAll('_',' ');}
function heatClass(v=''){ const x=String(v).toLowerCase(); return x.includes('extreme')||x.includes('high')?'hot':x.includes('low')?'cool':''; }
function gradeScore(v=''){ const m=String(v).toUpperCase().match(/([ABC])([+-]?)/); if(!m)return 0; const base={A:30,B:20,C:10}[m[1]]; return base+(m[2]==='+'?2:m[2]==='-'?-2:0); }
function shortGrade(v=''){ const m=String(v).match(/[ABC][+-]?/i); return m?m[0].toUpperCase():fmt(v); }

async function getJSON(path){
  const sep=path.includes('?')?'&':'?';
  const r=await fetch(path+sep+'v='+Date.now(),{cache:'no-store'});
  if(!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function load(){
  try{
    state.latest=await getJSON('./theme-research/latest.json');
    state.index=await getJSON('./theme-research/'+state.latest.index);
    const base='./theme-research/'+state.latest.base;
    state.themes=await Promise.all(state.index.themes.map(async meta=>{
      const data=await getJSON(base+meta.slug+'.json');
      return {...data, meta, slug:meta.slug};
    }));
    hydrateHeader(); renderTree(); renderSummary(); renderHorizon('day'); bind();
  }catch(e){
    console.error(e);
    $('#treeRoot').innerHTML=`<div class="emptyGrid">データを読み込めませんでした。<br><small>${esc(e.message)}</small></div>`;
  }
}

function hydrateHeader(){
  $('#dataDate').textContent=`Research ${state.index.date}`;
  $('#summaryDate').textContent=state.index.date;
  $('#themeCount').textContent=state.themes.length;
  const candidates=state.themes.reduce((n,t)=>n+(t.candidates?.length||0),0);
  const rejected=state.themes.reduce((n,t)=>n+(t.rejectedOrDeferred?.length||0),0)+(state.index.screenedButNotPromoted?.length||0);
  $('#candidateCount').textContent=candidates;
  $('#rejectedCount').textContent=rejected;
  $('#updatedAt').textContent=(state.latest.updatedAt||state.index.date).replace('T',' ').slice(0,16);
}

function nodeHTML({kind,title,meta='',children='',open=false,key='',data={}}){
  const has=Boolean(children);
  const payload=encodeURIComponent(JSON.stringify({kind,key,data}));
  return `<div class="treeNode ${open?'open':''} ${kind==='news'?'root':''}" data-key="${esc(key)}">
    <div class="nodeRow" data-payload="${payload}">
      <button class="toggle ${has?'':'placeholder'}" type="button" aria-label="展開">${open?'−':'＋'}</button>
      <div class="nodeMain"><div class="nodeTitle"><span class="kind kind-${kind}">${kindName(kind)}</span>${esc(title)}</div>${meta?`<div class="nodeMeta">${esc(meta)}</div>`:''}</div>
    </div>${has?`<div class="nodeChildren">${children}</div>`:''}
  </div>`;
}
function kindName(k){return ({news:'NEWS',theme:'THEME',chain:'VALUE CHAIN',stock:'STOCK',evidence:'EVIDENCE'})[k]||k.toUpperCase();}

function renderTree(query=''){
  const q=query.trim().toLowerCase();
  const themes=state.themes.filter(t=>!q||JSON.stringify(t).toLowerCase().includes(q));
  if(!themes.length){$('#treeRoot').innerHTML='<div class="emptyGrid">該当するテーマ・ニュース・銘柄がありません。</div>';return;}
  $('#treeRoot').innerHTML=themes.map((t,i)=>buildThemeTree(t,i,q)).join('');
  wireTreeRows();
}

function buildThemeTree(t,idx,q){
  const events=t.sourceEvents||[];
  const primary=events[0]||{date:t.date,event:t.theme,url:''};
  const others=events.slice(1);
  const candidateByCode=Object.fromEntries((t.candidates||[]).map(c=>[c.code,c]));
  const map=chainMap[t.slug]||{};

  const chainChildren=(t.valueChain||[]).map((chain,ci)=>{
    let codes=map[chain];
    if(!codes) codes=(t.candidates||[]).map(c=>c.code);
    const stocks=codes.map(code=>candidateByCode[code]).filter(Boolean);
    const stockHTML=stocks.length?stocks.map(c=>nodeHTML({
      kind:'stock', title:`${c.code} ${c.name}`, meta:`Day ${shortGrade(c.daytrade)} · Swing ${shortGrade(c.swing)} · 中期 ${shortGrade(c.medium)}`,
      key:`${t.slug}:stock:${c.code}`, data:{slug:t.slug,code:c.code}
    })).join(''):`<div class="treeNode"><div class="nodeRow"><div class="toggle placeholder"></div><div class="nodeMain"><div class="nodeMeta">本命昇格なし／直接利益感応度を未確認</div></div></div></div>`;
    return nodeHTML({kind:'chain',title:chain,meta:`検証済み候補 ${stocks.length}社`,children:stockHTML,key:`${t.slug}:chain:${ci}`,data:{slug:t.slug,chain}});
  }).join('');

  const evidenceHTML=others.length?nodeHTML({kind:'evidence',title:'追加の一次情報・関連ニュース',meta:`${others.length}件`,children:others.map((e,j)=>nodeHTML({kind:'news',title:e.event,meta:e.date,key:`${t.slug}:evidence:${j}`,data:{slug:t.slug,eventIndex:j+1}})).join(''),key:`${t.slug}:evidence`,data:{slug:t.slug}}):'';
  const themeHTML=nodeHTML({kind:'theme',title:t.theme,meta:`Trend ${t.meta.trendQuality} · Heat ${t.meta.priceHeat}`,children:evidenceHTML+chainChildren,key:`${t.slug}:theme`,data:{slug:t.slug},open:Boolean(q)});
  return `<div class="themeGroup">${nodeHTML({kind:'news',title:primary.event,meta:`${primary.date} · 起点ニュース`,children:themeHTML,key:`${t.slug}:news:0`,data:{slug:t.slug,eventIndex:0},open:Boolean(q)||idx===0})}</div>`;
}

function wireTreeRows(){
  $$('.nodeRow').forEach(row=>{
    const toggle=$('.toggle',row);
    toggle?.addEventListener('click',e=>{e.stopPropagation();const n=row.closest('.treeNode');if(toggle.classList.contains('placeholder'))return;n.classList.toggle('open');toggle.textContent=n.classList.contains('open')?'−':'＋';});
    row.addEventListener('click',()=>{
      $$('.nodeRow.selected').forEach(x=>x.classList.remove('selected')); row.classList.add('selected');
      const p=JSON.parse(decodeURIComponent(row.dataset.payload)); showDetail(p);
    });
  });
}

function findTheme(slug){return state.themes.find(t=>t.slug===slug);}
function findCandidate(t,code){return (t.candidates||[]).find(c=>c.code===code);}

function showDetail(p){
  const t=findTheme(p.data.slug); if(!t)return;
  let html='';
  if(p.kind==='news'){
    const e=(t.sourceEvents||[])[p.data.eventIndex]||{};
    html=`${detailHead('起点ニュース',e.event||t.theme,`${e.date||t.date}`)}
      <div class="detailSection"><h4>なぜ見るのか</h4><div class="detailLead">このニュースを単発材料で終わらせず、業界構造と収益ドライバーへ展開します。</div></div>
      ${e.url?`<div class="detailSection"><h4>一次情報</h4><a class="sourceLink" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a></div>`:''}`;
  } else if(p.kind==='theme'){
    html=`${detailHead('投資テーマ',t.theme,`Status: ${fmt(t.status)}`)}
      <div class="detailSection"><h4>テーマ仮説</h4><div class="detailLead">${esc(t.thesis)}</div></div>
      ${horizonBlock(t.horizonConclusion)}
      ${listSection('レッドチーム',t.redTeam||[])}`;
  } else if(p.kind==='chain'){
    const codes=(chainMap[t.slug]?.[p.data.chain]||[]);
    const names=codes.map(c=>findCandidate(t,c)).filter(Boolean).map(c=>`${c.code} ${c.name}`);
    html=`${detailHead('関連業界・価値連鎖',p.data.chain,t.theme)}
      <div class="detailSection"><h4>検証済み銘柄</h4>${names.length?`<ul class="detailList">${names.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<div class="detailLead">本命昇格なし。関連性だけでは採用しません。</div>'}</div>
      <div class="detailSection"><h4>判定ルール</h4><div class="detailLead">一次情報で売上・受注・顧客・技術・設備投資との接続を確認できる企業だけを次段階へ進めます。</div></div>`;
  } else if(p.kind==='stock'){
    const c=findCandidate(t,p.data.code); if(!c)return;
    html=`${detailHead('検証済み銘柄',`${c.code} ${c.name}`,t.theme)}
      <div class="metricGrid">
        ${metric('直接度',c.directness)}${metric('収益感応度',c.earningsExposure)}${metric('証拠品質',c.evidenceQuality)}${metric('織り込み度',c.pricedIn||'—')}
      </div>
      ${c.fundamentalEvidence?`<div class="detailSection"><h4>決算・業績の根拠</h4><div class="detailLead">${esc(c.fundamentalEvidence)}</div></div>`:''}
      ${c.priceState?`<div class="detailSection"><h4>価格・需給</h4><div class="detailLead">${esc(c.priceState)}</div></div>`:''}
      <div class="detailSection"><h4>時間軸判定</h4>${stockHorizon(c)}</div>
      ${c.risk?`<div class="detailSection"><h4>最大の弱点</h4><div class="detailLead" style="color:#e8a2aa">${esc(c.risk)}</div></div>`:''}
      ${listSection('テーマ全体の反対意見',t.redTeam||[])}`;
  } else {
    html=detailHead('一次情報',t.theme,'');
  }
  $('#detailPanel').innerHTML=`<div class="detailContent">${html}</div>`;
  if(window.innerWidth<1080) $('#detailPanel').scrollIntoView({behavior:'smooth',block:'start'});
}

function detailHead(type,title,sub){return `<div class="detailTop"><div><div class="detailType">${esc(type)}</div><h3>${esc(title)}</h3><div class="detailLead">${esc(sub)}</div></div></div>`;}
function metric(k,v){return `<div class="miniMetric"><span>${esc(k)}</span><b>${esc(fmt(v))}</b></div>`;}
function listSection(title,arr){if(!arr.length)return'';return `<div class="detailSection"><h4>${esc(title)}</h4><ul class="detailList">${arr.map(x=>`<li>${esc(typeof x==='string'?x:(x.reason||x.event||JSON.stringify(x)))}</li>`).join('')}</ul></div>`;}
function horizonBlock(h){if(!h)return'';return `<div class="detailSection"><h4>時間軸別の結論</h4><div class="horizonBadges"><div class="hzBadge"><span>DAY</span><b>${esc(h.daytrade||'—')}</b></div><div class="hzBadge"><span>SWING</span><b>${esc(h.swing||'—')}</b></div><div class="hzBadge"><span>MEDIUM</span><b>${esc(h.medium||'—')}</b></div></div></div>`;}
function stockHorizon(c){return `<div class="horizonBadges"><div class="hzBadge"><span>DAY</span><b>${esc(fmt(c.daytrade))}</b></div><div class="hzBadge"><span>SWING</span><b>${esc(fmt(c.swing))}</b></div><div class="hzBadge"><span>MEDIUM</span><b>${esc(fmt(c.medium))}</b></div></div>`;}

function allStocks(){
  return state.themes.flatMap(t=>(t.candidates||[]).map(c=>({...c,theme:t.theme,slug:t.slug,trend:t.meta.trendQuality,heat:t.meta.priceHeat,themeRisk:t.redTeam?.[0]||''})));
}
function renderHorizon(h){
  state.horizon=h; state.view=h;
  const info={day:['DAY TRADE','デイトレ候補','値幅・材料鮮度・流動性を優先。寄り前の順位は9:00〜9:10の価格構造で再審査。'],swing:['SWING','スイング候補','数日〜6週間。材料の持続性、織り込み、決算・イベント期限、日足の相対強度を重視。'],medium:['MEDIUM TERM','中期候補','1〜12か月。実需、利益成長、競争優位、CF、バリュエーション、テーマ持続性で選別。']}[h];
  $('#horizonKicker').textContent=info[0]; $('#horizonTitle').textContent=info[1]; $('#horizonDesc').textContent=info[2];
  const filters=[{slug:'all',name:'全テーマ'},...state.themes.map(t=>({slug:t.slug,name:t.meta.name}))];
  $('#themeFilters').innerHTML=filters.map(f=>`<button class="filterPill ${state.filter===f.slug?'active':''}" data-filter="${esc(f.slug)}">${esc(f.name)}</button>`).join('');
  $$('.filterPill').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;renderHorizon(h)});
  let stocks=allStocks().filter(c=>state.filter==='all'||c.slug===state.filter);
  stocks=stocks.filter(c=>gradeScore(c[h==='day'?'daytrade':h])>0).sort((a,b)=>gradeScore(b[h==='day'?'daytrade':h])-gradeScore(a[h==='day'?'daytrade':h]));
  $('#horizonGrid').innerHTML=stocks.length?stocks.map((c,i)=>stockCard(c,i,h)).join(''):'<div class="emptyGrid">該当候補なし</div>';
}
function stockCard(c,i,h){
  const field=h==='day'?'daytrade':h;
  const thesis=c.fundamentalEvidence||c.priceState||`直接度 ${fmt(c.directness)} / 収益感応度 ${fmt(c.earningsExposure)}`;
  return `<article class="stockCard"><div class="stockRank">#${i+1} · ${esc(shortGrade(c[field]))}</div><div class="stockName">${esc(c.name)}</div><div class="stockCode">${esc(c.code)}</div><div class="stockTheme">${esc(c.theme)}</div><div class="stockThesis">${esc(thesis)}</div><div class="stockMetrics"><div><span>直接度</span><b>${esc(fmt(c.directness))}</b></div><div><span>収益感応度</span><b>${esc(fmt(c.earningsExposure))}</b></div><div><span>織り込み</span><b>${esc(fmt(c.pricedIn||'—'))}</b></div><div><span>テーマ熱</span><b>${esc(fmt(c.heat))}</b></div></div>${c.risk?`<div class="riskLine">Risk: ${esc(c.risk)}</div>`:''}</article>`;
}

function renderSummary(){
  $('#summaryThemes').innerHTML=state.index.themes.map(t=>`<article class="summaryTheme"><div class="rank">#${t.rank} · TREND ${esc(t.trendQuality)}</div><h3>${esc(t.name)}</h3><div class="summaryRows"><div class="summaryRow"><span>デイトレ</span><b>${esc(t.bestDay)}</b></div><div class="summaryRow"><span>スイング</span><b>${esc(t.bestSwing)}</b></div><div class="summaryRow"><span>中期</span><b>${esc(t.bestMedium)}</b></div><div class="summaryRow"><span>価格熱</span><b>${esc(t.priceHeat)}</b></div></div></article>`).join('');
}

function bind(){
  $$('.tab').forEach(tab=>tab.onclick=()=>switchView(tab.dataset.view));
  $('#treeSearch').addEventListener('input',e=>renderTree(e.target.value));
  $('#expandAll').onclick=()=>{$$('.treeNode').forEach(n=>{if($('.toggle',n)?.classList.contains('placeholder'))return;n.classList.add('open');const b=$('.toggle',n);if(b)b.textContent='−';});};
  $('#collapseAll').onclick=()=>{$$('.treeNode').forEach(n=>{n.classList.remove('open');const b=$('.toggle',n);if(b&&!b.classList.contains('placeholder'))b.textContent='＋';});};
}
function switchView(v){
  state.view=v; $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===v)); $$('.view').forEach(x=>x.classList.remove('active'));
  if(v==='tree') $('#treeView').classList.add('active');
  else if(v==='summary') $('#summaryView').classList.add('active');
  else {$('#horizonView').classList.add('active');state.filter='all';renderHorizon(v);}
  window.scrollTo({top:0,behavior:'smooth'});
}

load();
