(function(){
"use strict";
const base=[...(window.FASS_ASSETS||[]),...(window.FASS_CLOSING||[]),...(window.FASS_TAX||[]),...(window.FASS_TREASURY||[])];
const S=[...(window.FASS_LEARN_ASSETS||[]),...(window.FASS_LEARN_CLOSING||[]),...(window.FASS_LEARN_TAX||[]),...(window.FASS_LEARN_TREASURY||[]),...(window.FASS_EXAM_SUPPLEMENT||[])];
if(base.length!==26||![78,96].includes(S.length)){document.getElementById("app").innerHTML='<main class="home"><h1>教材を読み込めませんでした</h1><p>ページを再読み込みしてください。</p><a href="offline.html">旧版オフライン教材を開く</a></main>';return}
const $=x=>document.getElementById(x), e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const domains=["基礎","資産","決算","税務","資金"];
const meta={"基礎":{color:"#48687b",icon:"🧭",sub:"会社のお金の流れと財務3表"},"資産":{color:"#267b70",icon:"📦",sub:"売掛金・仕入・在庫・設備"},"決算":{color:"#376d9b",icon:"📊",sub:"利益・決算書・連結・開示"},"税務":{color:"#99622f",icon:"🧾",sub:"消費税・法人税・申告・保存"},"資金":{color:"#74528c",icon:"🏦",sub:"預金・借入・債券・金利・為替"}};
const rangeTerms=s=>s.terms.split(",").flatMap(r=>{const[a,b]=r.split("-").map(Number);return Number.isFinite(a)?Array.from({length:(b||a)-a+1},(_,i)=>a+i):[]});
S.forEach((s,i)=>{s.id=i+1;s.domain=s.ch===0?"基礎":base[s.ch-1].domain;s.chapter=s.ch===0?"はじめての経理・財務":base[s.ch-1].title;s.details=s.ch===0?[]:rangeTerms(s).map(n=>base[s.ch-1].entries[n-1]);s.search=[s.title,s.chapter,s.key,s.body,s.rule,s.q,s.answer,...s.details.flatMap(t=>[t.title,t.body,t.tip])].join(" ").toLowerCase()});
const totalTerms=base.reduce((n,c)=>n+c.entries.length,0);
function load(){try{const x=JSON.parse(localStorage.getItem("fass-study-v3")||"{}");return {marks:typeof x.marks==="object"&&x.marks?x.marks:{},last:Number.isInteger(x.last)&&x.last>=1&&x.last<=S.length?x.last:0,mode:x.mode==="summary"?"summary":"learn"}}catch(_){return {marks:{},last:0,mode:"learn"}}}
let st=load(),current=0,domain="全て",query="",filter="all",answerOpen=false,openTerms=false;
function save(){try{localStorage.setItem("fass-study-v3",JSON.stringify(st))}catch(_){}}
const learned=()=>S.filter(s=>st.marks[s.id]==="learned").length;
const reviewCount=()=>S.filter(s=>st.marks[s.id]==="review").length;
const pad=n=>String(n).padStart(2,"0");
const color=s=>meta[s.domain].color;
const button=(txt,action,cls="outline",attrs="")=>'<button type="button" class="'+cls+'" data-action="'+action+'" '+attrs+'>'+txt+'</button>';
const sheetLink=(s,inner,cls="lessonitem")=>'<button type="button" class="'+cls+'" style="--c:'+color(s)+'" data-sheet="'+s.id+'">'+inner+'</button>';
const progress=(n,t)=>'<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="'+t+'" aria-valuenow="'+n+'"><i style="width:'+(100*n/t).toFixed(1)+'%"></i></div>';
const chapterList=()=>Array.from(new Set(S.map(s=>s.ch))).sort((a,b)=>a-b);
function home(){
current=0;
const next=st.last||S.find(s=>st.marks[s.id]!=="learned")?.id||1;
$("app").innerHTML='<main class="home"><section class="hero"><div class="eyebrow">FASS STUDY ATLAS · 2026年度版</div><h1>経理・財務が<br>図でつながる教科書</h1><p>はじめての人も、実務を経験した人も。1テーマずつ「なぜ？」「どう動く？」「何が違う？」を理解して、FASSの正確な知識を身につける。</p><div class="hero-actions">'+button(st.last?"▶ 続きから学ぶ":"▶ 基礎から始める","start","solid",'data-next="'+next+'"')+button("☰ シート一覧","toc","outline")+'</div><div class="notice">全'+S.length+'シート · 公式26業務＋基礎編 · 詳細311項目 · 非公式の独自教材</div></section><div class="progress-panel"><span class="statline">理解済 '+learned()+' / '+S.length+'</span>'+progress(learned(),S.length)+'<span class="small">復習 '+reviewCount()+'</span></div><div class="sectionhead"><h2>学ぶ順番・分野</h2><span class="small">まず全体像から</span></div><div class="learning-map">'+domains.map(d=>'<button class="domaincard" style="--c:'+meta[d].color+'" data-domain="'+d+'"><span class="ico" aria-hidden="true">'+meta[d].icon+'</span><span class="dname">'+d+'</span><span class="dsub">'+meta[d].sub+'</span><span class="dcount">'+S.filter(s=>s.domain===d&&st.marks[s.id]==="learned").length+'/'+S.filter(s=>s.domain===d).length+' シート</span></button>').join("")+'</div><div class="sectionhead"><h2>混同しやすい論点</h2><span class="small">よく迷う概念の比較</span></div><div class="focus-grid">'+["ソフトウェアはいつ資産になる？","会計上の4種類の変更","法人税の申告調整と別表","借入契約の条項：何を守らせる？","オプション：買う権利と売る権利","キャップ・フロア・カラーを図で覚える"].map(t=>S.find(s=>s.title===t)).filter(Boolean).map(s=>sheetLink(s,'<small>'+s.domain+' / SHEET '+pad(s.id)+'</small><strong>'+e(s.title)+'</strong><span>'+e(s.key)+'</span>',"focus-card")).join("")+'</div><div class="sectionhead"><h2>公式問題対策｜試験レベルの追加シート</h2><span class="small">公式公開問題を基準に検証</span></div><p class="small">基礎を読んだ後、判定基準・業務手続・数値・例外を確認する18テーマ。<a href="coverage-v4.html">公式問題との照合結果・根拠資料を見る</a></p><div class="focus-grid">' + S.slice(78).map(s=>sheetLink(s,'<small>試験対策 / SHEET '+pad(s.id)+'</small><strong>'+e(s.title)+'</strong><span>'+e(s.key)+'</span>',"focus-card")).join("") + '</div><div class="sectionhead" id="toc"><h2>全シートの目次・用語検索</h2><span class="small" id="resultsCount"></span></div><div class="searchbox"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="例：クロスデフォルト、貸倒引当金、PER" value="'+e(query)+'" aria-label="教科書の用語を検索"><button data-action="clearSearch" aria-label="検索語を消去">×</button></div><div class="chips" id="domainchips">'+["全て",...domains].map(d=>'<button data-domain="'+d+'" class="chip '+(d===domain?"active":"")+'">'+d+'</button>').join("")+'</div><div class="chips" id="filterchips">'+[["all","すべて"],["unread","未学習"],["review","復習リスト"],["learned","理解済"]].map(([k,t])=>'<button data-filter="'+k+'" class="chip '+(filter===k?"active":"")+'">'+t+'</button>').join("")+'</div><div id="toclist"></div><section class="footnote"><p><strong>この教材について</strong>：日本CFO協会のFASS本体4分野26業務に対応する独自教材。中小企業診断士の「一発合格 まとめシート」の公開見本から、論点単位の図解→説明→復習という学習設計を参考にしています。原本の画像・文章・キャラクターは転載していません。頻出度の実測値はないため、重要度ランキングは表示していません。</p><p>2026年度試験の基準日と税制の適用時期には違いがある場合があります。税務の例外や改正は<a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/index2.htm" target="_blank" rel="noopener">国税庁</a>、<a href="https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/index.htm" target="_blank" rel="noopener">2026年度インボイス改正</a>、<a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5408.htm" target="_blank" rel="noopener">少額資産特例</a>、<a href="https://www.asb-j.jp/jp/accounting_standards_system/" target="_blank" rel="noopener">企業会計基準委員会</a>等で確認してください。</p><p><a href="https://www.cfo.jp/fass/fass_exam/" target="_blank" rel="noopener">公式出題範囲</a> · <a href="https://www.cfo.jp/fass/fass_exam/sample/" target="_blank" rel="noopener">公式サンプル</a> · <a href="https://www.matome-sheet.com/publishing/" target="_blank" rel="noopener">参考にした教材の紹介ページ</a> · <a href="offline.html">旧版用語集</a></p><p>学習状態はこの端末のブラウザ内に保存。公式問題集の全設問との照合・全問正解の保証はしていません。個人情報・解答履歴は収録していません。</p></section></main>';
$("search").addEventListener("input",ev=>{query=ev.target.value;updateList()});
updateList()
}
function updateList(){
if(!$("toclist"))return;
const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
const filtered=S.filter(s=>(domain==="全て"||s.domain===domain)&&words.every(w=>s.search.includes(w))&&(filter==="all"||filter==="unread"&&!st.marks[s.id]||st.marks[s.id]===filter));
$("resultsCount").textContent=filtered.length+" / "+S.length+" シート";
document.querySelectorAll("#domainchips [data-domain]").forEach(b=>b.classList.toggle("active",b.dataset.domain===domain));
document.querySelectorAll("#filterchips [data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
if(!filtered.length){$("toclist").innerHTML='<div class="empty">該当するシートがありません。<br>検索語や分野を変更してください。</div>';return}
$("toclist").innerHTML=chapterList().map(ch=>{
const a=filtered.filter(s=>s.ch===ch);if(!a.length)return "";
const all=S.filter(s=>s.ch===ch);
const opened=words.length>0||domain!=="全て"||filter!=="all"||ch===0;
return '<details class="tocgroup" style="--c:'+color(a[0])+'" '+(opened?"open":"")+'><summary><span>'+e(a[0].domain)+'　'+(ch?"第"+ch+"章 ":"")+e(a[0].chapter)+'</span><span class="count">'+all.filter(s=>st.marks[s.id]==="learned").length+'/'+all.length+'</span></summary>'+a.map(s=>{
const matched=words.length?s.details.filter(t=>words.every(w=>(t.title+" "+t.body+" "+t.tip).toLowerCase().includes(w))).slice(0,3).map(t=>t.title.replace("★","")):[];
return sheetLink(s,'<span class="n">'+pad(s.id)+'</span><span class="name"><strong>'+e(s.title)+'</strong><small>'+e(matched.length?"用語："+matched.join("・"):s.key)+'</small></span>'+(st.marks[s.id]==="learned"?'<span class="done" title="理解済">✓</span>':st.marks[s.id]==="review"?'<span class="review" title="要復習">↻</span>':'<span aria-hidden="true">›</span>'))
}).join("")+'</details>'
}).join("");
}
const blocklabel=(n,t)=>'<div class="blocklabel"><span class="circle">'+n+'</span>'+t+'</div>';
function table(rows){return '<table class="compare '+(rows[0].length===2?"two":"")+'"><thead><tr>'+rows[0].map(x=>'<th scope="col">'+e(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(x=>'<td>'+e(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table>'}
const flow=rows=>'<div class="flow">'+rows.map(r=>'<div class="step"><strong>'+e(r[0])+'</strong><span>'+e(r.slice(1).join("　"))+'</span></div>').join('<span class="arr" aria-hidden="true">→</span>')+'</div>';
const note=t=>'<p class="fig-note">'+e(t)+'</p>';
const range=(id,label,min,max,v,step=1)=>'<label for="'+id+'">'+e(label)+' <output id="'+id+'O"></output></label><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" value="'+v+'" step="'+step+'">';
const res=(a,three=false)=>'<div class="lab-result '+(three?"three":"")+'">'+a.map(([id,l])=>'<div><small>'+e(l)+'</small><b id="'+id+'"></b></div>').join("")+'</div>';
const actor=(icon,name,sub="",cls="")=>'<div class="actor '+cls+'"><span class="icon" aria-hidden="true">'+icon+'</span><strong>'+e(name)+'</strong>'+(sub?'<small>'+e(sub)+'</small>':"")+'</div>';
const legend=xs=>'<div class="legend">'+xs.map(([c,t])=>'<span><i style="background:'+c+'"></i>'+e(t)+'</span>').join("")+'</div>';
function svgText(x,y,t,opts=""){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="12" fill="#324858" '+opts+'>'+e(t)+'</text>'}
function svgBox(x,y,w,h,t,sub,fill="#edf4f6",stroke="#b4cbd2"){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="9" fill="'+fill+'" stroke="'+stroke+'"/>'+svgText(x+w/2,y+21,t,'font-weight="700"')+svgText(x+w/2,y+40,sub,'font-size="11"')}
const arrowDefs='<defs><marker id="arrEnd" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#527a7b"/></marker><marker id="warnEnd" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#a95040"/></marker></defs>';
const arrow=(d,warn=false)=>'<path d="'+d+'" fill="none" stroke="'+(warn?"#a95040":"#527a7b")+'" stroke-width="2" marker-end="url(#'+(warn?"warnEnd":"arrEnd")+')" '+(warn?'stroke-dasharray="5 3"':"")+'/>';
function chartSvg(id,label){return '<svg id="'+id+'" viewBox="0 0 340 215" role="img" aria-label="'+e(label)+'"></svg>'}
function chart(id, cfg){
const root=$(id);if(!root)return;
const L=45,R=326,T=14,B=179;const X=x=>L+(x-cfg.xmin)/(cfg.xmax-cfg.xmin)*(R-L),Y=y=>B-(y-cfg.ymin)/(cfg.ymax-cfg.ymin)*(B-T);
let g='<g font-size="10" fill="#617483">';
for(const y of cfg.yticks){g+='<line x1="'+L+'" x2="'+R+'" y1="'+Y(y)+'" y2="'+Y(y)+'" stroke="'+(y===0?"#7d929e":"#e1e8e8")+'" stroke-width="'+(y===0?1.3:1)+'"/><text x="'+(L-7)+'" y="'+(Y(y)+3)+'" text-anchor="end">'+e(cfg.yfmt?cfg.yfmt(y):y)+'</text>'}
for(const x of cfg.xticks){g+='<text x="'+X(x)+'" y="194" text-anchor="middle">'+e(cfg.xfmt?cfg.xfmt(x):x)+'</text>'}
g+='<text x="'+((L+R)/2)+'" y="210" text-anchor="middle">'+e(cfg.xlabel)+'</text></g><path d="M'+L+' '+T+' V'+B+' H'+R+'" fill="none" stroke="#8da1ac"/>';
for(const l of cfg.lines){const pts=l.points||Array.from({length:81},(_,i)=>{const x=cfg.xmin+(cfg.xmax-cfg.xmin)*i/80;return [x,l.fn(x)]});g+='<path d="'+pts.map(([x,y],i)=>(i?"L":"M")+X(x).toFixed(2)+" "+Y(y).toFixed(2)).join(" ")+'" fill="none" stroke="'+l.color+'" stroke-width="'+(l.width||3)+'" '+(l.dash?'stroke-dasharray="5 4"':"")+' stroke-linejoin="round" stroke-linecap="round"/>'}
if(cfg.marker!=null){const x=cfg.marker;g+='<line x1="'+X(x)+'" x2="'+X(x)+'" y1="'+T+'" y2="'+B+'" stroke="#82969b" stroke-dasharray="3 4"/>';for(const l of cfg.lines.filter(l=>l.fn)){g+='<circle cx="'+X(x)+'" cy="'+Y(l.fn(x))+'" r="4.5" fill="'+l.color+'" stroke="white" stroke-width="1.4"/>'}}
if(cfg.points)for(const [x,y,label] of cfg.points){g+='<circle cx="'+X(x)+'" cy="'+Y(y)+'" r="4" fill="#2c7774"/><text x="'+X(x)+'" y="'+(Y(y)+(y>=0?-9:14))+'" text-anchor="middle" font-size="11" fill="#305364" font-weight="700">'+e(label)+'</text>'}
root.innerHTML=g;
}
function diagram(s){
const r=s.rows;
switch(s.type){
case "flow":return flow(r);
case "compare":case "matrix":return table(r);
case "timeline":return '<div class="timeline">'+r.map(x=>'<div class="timeitem"><strong>'+e(x[0])+'</strong><span>'+e(x[1])+'</span></div>').join("")+'</div>';
case "bars":{const m=Math.max(...r.map(x=>Math.abs(Number(x[1]))),1);return '<div class="bars">'+r.map(x=>'<div class="barrow"><span class="barlabel">'+e(x[0])+'</span><div class="barbg"><i style="width:'+Math.max(0,100*Number(x[1])/m).toFixed(1)+'%"></i></div><b>'+e(x[1])+'</b></div>').join("")+'</div>'+note("棒の長さは金額の大小を表します。単位は具体例に対応。")}
case "waterfall":return '<div class="waterfall">'+r.map((x,i)=>'<div class="wrow"><span class="wi">'+(i===0?"●":i===r.length-1?"＝":x[0].includes("＋")?"+":x[0].includes("−")?"−":"↓")+'</span><strong>'+e(x[0])+'</strong><small>'+e(x[1])+'</small></div>').join("")+'</div>';
case "split":return '<div class="split">'+r.map(x=>'<div class="splitrow"><strong>'+e(x[0])+'</strong><div class="splitcells">'+x.slice(1).map(y=>'<span>'+e(y)+'</span>').join("")+'</div></div>').join("")+'</div>';
case "bs":return '<div class="bs"><div class="bscol"><h3>資産：何を持つ？</h3>'+r[0].slice(0,4).map((t,i)=>'<div class="bsbox" style="height:'+([68,36,45,45][i])+'px">'+e(t)+'</div>').join("")+'</div><div class="bscol"><h3>負債・純資産：どう調達？</h3>'+r[0].slice(4).map((t,i)=>'<div class="bsbox '+(i===2?"equity":"debt")+'" style="height:'+([68,36,94][i])+'px">'+e(t)+'</div>').join("")+'</div></div><div class="bs-total"><span>資産合計 200</span><span>負債＋純資産 200</span></div>'+note("PL＝期間の利益。CF＝期間の現金増減。BSは決算日時点の残高。");
case "bond":return '<h3>額面100・年利息2・残存5年の債券</h3>'+chartSvg("bondChart","要求利回りと債券価格の逆方向の関係")+'<div class="lab-controls">'+range("yield","要求利回り（年率）",0,6,2,.1)+res([["bondPrice","既発債価格"],["bondDirection","額面100との差"]])+'</div>'+note("市場要求利回りが上がるほど、将来受け取る現金の現在価値は下がります。年1回利払、満期償還の単純モデル。");
case "guarantee":return '<svg viewBox="0 0 340 192" role="img" aria-label="銀行が子会社に融資し親会社が保証する三者関係">'+arrowDefs+svgBox(8,9,133,55,"銀行","貸し手")+svgBox(198,9,133,55,"子会社","借り手")+arrow("M142 36H196")+svgText(170,25,"融資",'font-size="10"')+svgBox(103,123,134,55,"親会社","保証人","#e9f4ed","#b7d7c6")+arrow("M117 122L74 67",true)+svgText(83,111,"保証",'font-size="11"')+arrow("M266 66L222 122")+svgText(276,101,"返済困難",'font-size="11"')+'</svg>'+note("子会社が返せない場合、契約に従って親会社に保証履行の請求が行われ得ます。");
case "cross":return '<svg viewBox="0 0 340 206" role="img" aria-label="A銀行の債務不履行がB銀行の契約へ波及するクロスデフォルト">'+arrowDefs+svgBox(103,7,134,54,"借入企業","両行から借入","#edf4f6")+arrow("M139 62L83 94")+arrow("M201 62L257 94")+svgBox(6,98,154,60,"A銀行の契約","返済不履行","#fbe8e3","#d99b8d")+svgBox(180,98,154,60,"B銀行の契約","不履行事由に該当","#fff0d5","#d6b779")+arrow("M83 159V180H257V160",true)+svgText(170,201,"他の債務の不履行が波及",'font-size="11" font-weight="700"')+'</svg>'+table([["条項","何を制限・監視する？"],...r])+note("図はクロスデフォルトの単純例。実際の期限の利益喪失・通知等は契約条件によります。");
case "option":return '<div class="chips" style="margin:0 0 8px"><button class="chip active" id="callChoice" data-option="call">コール（買う権利）</button><button class="chip" id="putChoice" data-option="put">プット（売る権利）</button></div>'+chartSvg("optionChart","オプション購入の損益")+'<div class="lab-controls">'+range("underlying","満期の市場価格",60,140,130,5)+res([["optionAction","権利行使／放棄"],["optionProfit","最終損益（代金5含む）"]])+'</div>'+note("権利行使価格100、プレミアム5。買い手は行使を選択でき、最大損失は支払ったプレミアム。満期の単純モデル。");
case "swap":return '<svg viewBox="0 0 340 240" role="img" aria-label="銀行へ変動金利を支払いスワップ相手へ固定金利を支払い変動金利を受け取る">'+arrowDefs+svgBox(105,12,130,56,"企業","変動借入あり","#e9f4ed","#b7d7c6")+svgBox(7,151,140,58,"銀行","借入先")+svgBox(193,151,140,58,"スワップ相手","金利交換契約")+arrow("M129 69L78 146")+svgText(70,104,"変動支払",'font-size="11"')+arrow("M198 69L248 146")+svgText(258,95,"固定支払",'font-size="11"')+arrow("M217 146L180 70")+svgText(230,126,"変動受取",'font-size="11"')+svgText(170,232,"変動支払と変動受取が相殺される",'font-size="11" font-weight="700"')+'</svg><div class="actor-note"><strong>企業の負担 = 変動 − 変動 ＋ 固定 = 固定金利</strong><br><small>同一参照金利・元本・期間を仮定。借入スプレッド等は別。</small></div>';
case "cap":return legend([["#8a9da7","ヘッジなし"],["#ba7b31","固定スワップ"],["#27836f","キャップ"]])+chartSvg("capChart","市場金利と実質負担金利")+ '<div class="lab-controls">'+range("rate","市場金利（年率）",0,4,2.5,.1)+res([["noHedge","なし"],["swapRate","スワップ"],["capRate","キャップ"]],true)+'</div>'+note("固定金利・キャップ上限は1.5%と仮定。プレミアム・スプレッドを除く。フロアは下限未満の受取。");
case "fx":return '<div class="split"><div class="splitrow"><strong>1ドルの円価格が変わる</strong><div class="splitcells"><span>当初 140円</span><span id="fxLabel">決算 150円</span></div></div></div><div class="lab-controls">'+range("fx","決算レート（円／ドル）",120,180,150)+res([["fxExport","輸出：売掛金"],["fxImport","輸入：買掛金"]])+'</div>'+note("10万米ドル、当初1ドル140円、予約なし。他の条件は一定。円安は外貨建債権にプラス、外貨建債務にマイナス。");
case "cash":return chartSvg("cashChart","入出金後の現金残高と資金不足")+ '<div class="actor-note"><strong>最低残高 −200 → 少なくとも200の追加資金が必要</strong><br><small>最低必要残高0、他の入出金なしと仮定。</small></div>';
case "ccc":return '<div class="cccaxis"><span>仕入</span><span>販売</span><span>入金</span></div><div class="cccbar" id="cccBar"><span id="cccInv">在庫 40日</span><span id="cccAr">回収 50日</span></div><div class="cccpay" id="cccPay"><span id="cccAp">支払猶予35日</span><span id="cccLock">資金拘束55日</span></div><div class="lab-controls">'+range("daysInv","在庫回転日数",0,100,40)+range("daysAr","債権回転日数",0,100,50)+range("daysAp","債務回転日数",0,100,35)+res([["cccDays","CCC"],["cccTotal","仕入→回収"]])+'</div>'+note("上段の回収までの日数から、下段の仕入債務の支払猶予期間を引く。支払猶予が長い場合CCCはマイナスにもなる。");
case "pool":return '<svg viewBox="0 0 340 190" role="img" aria-label="余剰資金を親会社の集中口座から不足会社へ融通">'+arrowDefs+svgBox(7,13,132,58,"A子会社","余剰100","#e8f4ed","#b5d9c8")+svgBox(201,13,132,58,"B子会社","不足50","#fff0dc","#dfc497")+svgBox(97,124,146,58,"集中口座","グループ内資金管理","#e8f1f4","#b4cbd2")+arrow("M73 72V98H140V121")+svgText(75,91,"集約100",'font-size="11"')+arrow("M200 122V98H267V73")+svgText(272,91,"補填50",'font-size="11"')+'</svg>'+note("実資金を動かす方式の例。集中後は50の余剰が残る。グループ間債権債務や利率・契約等の管理も必要。");
default:return flow(r)
}}
function mountLabs(s){
const on=(id,f)=>{const el=$(id);if(el)el.addEventListener("input",f)};
const out=(id,v)=>{if($(id))$(id).textContent=v};
const v=id=>Number($(id).value);
const n=x=>Number(x.toFixed(2)).toString(),signed=x=>x===0?"0":(x>0?"+":"−")+n(Math.abs(x));
if(s.type==="bond"){
const f=y=>{let z=100/(1+y/100)**5;for(let i=1;i<=5;i++)z+=2/(1+y/100)**i;return z};
const calc=()=>{const y=v("yield"),p=f(y);out("yieldO",y.toFixed(1)+"%");out("bondPrice",p.toFixed(2));out("bondDirection",signed(p-100));chart("bondChart",{xmin:0,xmax:6,ymin:80,ymax:112,xticks:[0,2,4,6],yticks:[80,90,100,110],xfmt:x=>x+"%",xlabel:"要求利回り",lines:[{fn:f,color:"#267b70"}],marker:y})};
on("yield",calc);calc()
}
if(s.type==="option"){
let kind="call";const payoff=x=>(kind==="call"?Math.max(0,x-100):Math.max(0,100-x))-5;
const calc=()=>{const x=v("underlying"),intrinsic=kind==="call"?x-100:100-x;out("underlyingO",x);out("optionAction",intrinsic>0?"行使":"放棄");out("optionProfit",signed(payoff(x)));chart("optionChart",{xmin:60,xmax:140,ymin:-10,ymax:40,xticks:[60,80,100,120,140],yticks:[-10,0,10,20,30,40],xlabel:"満期の市場価格",lines:[{fn:payoff,color:"#267b70"}],marker:x});$("callChoice").classList.toggle("active",kind==="call");$("putChoice").classList.toggle("active",kind==="put")};
on("underlying",calc);for(const b of document.querySelectorAll("[data-option]"))b.addEventListener("click",()=>{kind=b.dataset.option;calc()});calc()
}
if(s.type==="cap"){const calc=()=>{const r=v("rate");out("rateO",r.toFixed(1)+"%");out("noHedge",r.toFixed(2)+"%");out("swapRate","1.50%");out("capRate",Math.min(r,1.5).toFixed(2)+"%");chart("capChart",{xmin:0,xmax:4,ymin:0,ymax:4,xticks:[0,1,2,3,4],yticks:[0,1,2,3,4],xfmt:x=>x+"%",yfmt:y=>y+"%",xlabel:"市場金利",lines:[{fn:x=>x,color:"#8a9da7",dash:true},{fn:()=>1.5,color:"#ba7b31"},{fn:x=>Math.min(x,1.5),color:"#27836f",width:4}],marker:r})};on("rate",calc);calc()}
if(s.type==="fx"){const calc=()=>{let x=v("fx"),d=(x-140)*10;out("fxO",x+"円");out("fxLabel","決算 "+x+"円（"+(x===140?"同じ":x>140?"円安":"円高")+"）");out("fxExport",d===0?"差損益0":(d>0?"差益 ":"差損 ")+Math.abs(d)+"万円");out("fxImport",d===0?"差損益0":(d<0?"差益 ":"差損 ")+Math.abs(d)+"万円")};on("fx",calc);calc()}
if(s.type==="cash"){const pts=[[0,200],[1,-150],[2,-50],[3,-200]];chart("cashChart",{xmin:0,xmax:3,ymin:-250,ymax:250,xticks:[0,1,2,3],yticks:[-200,-100,0,100,200],xfmt:x=>["期首","5日","10日","15日"][x],xlabel:"入出金のタイミング",lines:[{points:pts,color:"#267b70"}],points:pts.map(([x,y])=>[x,y,signed(y)])})}
if(s.type==="ccc"){const calc=()=>{let i=v("daysInv"),a=v("daysAr"),p=v("daysAp"),t=i+a,z=t-p;out("daysInvO",i+"日");out("daysArO",a+"日");out("daysApO",p+"日");out("cccInv","在庫 "+i+"日");out("cccAr","回収 "+a+"日");out("cccAp","猶予 "+p+"日");out("cccLock",z>=0?"資金拘束 "+z+"日":"支払猶予が超過 "+(-z)+"日");$("cccBar").style.gridTemplateColumns="minmax(68px,"+Math.max(i,1)+"fr) minmax(68px,"+Math.max(a,1)+"fr)";$("cccPay").style.gridTemplateColumns="minmax(68px,"+Math.max(p,1)+"fr) minmax(95px,"+Math.max(Math.abs(z),1)+"fr)";out("cccDays",z+"日");out("cccTotal",t+"日")};for(const id of ["daysInv","daysAr","daysAp"])on(id,calc);calc()}
}
function reader(id,keep=false){
const s=S[id-1];if(!s){home();return}
if(!keep){answerOpen=false;openTerms=!!query.trim();current=id;st.last=id;save()}
const done=st.marks[id], summary=st.mode==="summary";
const termHtml=s.details.length?'<details class="terms" id="details" '+(openTerms?"open":"")+' style="--c:'+color(s)+'"><summary>📖 関連用語を詳しく学ぶ <span class="small">全'+s.details.length+'項目</span></summary>'+s.details.map(t=>'<div class="termbody"><h3>'+e(t.title.replace("★",""))+'</h3><p>'+e(t.body)+'</p><div class="tip"><strong>実務・試験：</strong>'+e(t.tip)+'</div></div>').join("")+'</details>':"";
$("app").innerHTML='<main class="reader" style="--c:'+color(s)+';--accent:'+color(s)+'"><nav class="breadcrumb">'+button("目次","toc","plain")+'<span>›</span><span>'+e(s.domain)+'</span><span>›</span><span>'+e(s.chapter)+'</span></nav><div class="lesson-progress"><span>SHEET '+pad(id)+' / '+S.length+'</span>'+progress(id,S.length)+(done?'<span class="statuspill '+(done==="review"?"review":"")+'">'+(done==="learned"?"理解済":"要復習")+'</span>':"")+'</div><article class="sheet"><div class="sheet-title"><div class="sheet-num">SHEET<b>'+pad(id)+'</b></div><div><div class="cat">'+e(s.domain)+(s.ch?" ／ 第"+s.ch+"章 "+e(s.chapter):" ／ 入門")+'</div><h1>'+e(s.title)+'</h1></div></div><div class="sheet-main"><div class="takeaway"><span class="smallcap">このシートの結論</span>'+e(s.key)+'</div><div class="diagram-side">'+blocklabel("1","図で仕組みをつかむ")+'<div class="diagram">'+diagram(s)+'</div></div>'+(summary?"":'<section class="explain">'+blocklabel("2","なぜ？ 具体例で理解")+'<p>'+e(s.body)+'</p></section>')+'<section class="exam">'+blocklabel(summary?"2":"3","試験で見分けるポイント")+'<p>'+e(s.rule)+'</p></section></div><div class="sheet-bottom"><div class="recall"><h2>思い出してみよう</h2><p class="small">選択肢なしで答えを思い出すと、知識が定着しやすくなります。</p><p class="question">'+e(s.q)+'</p>'+button(answerOpen?"答えを隠す":"答えを見る","answer","outline")+'<div class="answer" id="recallAnswer" '+(answerOpen?"":"hidden")+'><b>答え・理由</b>'+e(s.answer)+'</div><div class="recallbuttons" id="recallbuttons" '+(answerOpen?"":"hidden")+'>'+button("↻ もう一度復習","markReview",done==="review"?"solid":"outline")+button("✓ 理解できた","markLearned",done==="learned"?"solid":"soft")+'</div><p class="studyhint" id="markHint">'+(done==="learned"?"理解済みに登録されています。":done==="review"?"復習リストに登録されています。":"答えを確認して学習状態を記録できます。")+'</p></div></div></article>'+(summary?"":termHtml)+'<div class="nextbar">'+button("‹ 前へ","prev","outline",id===1?"disabled":"")+button("☰ 目次","toc","outline")+button(id===S.length?"目次へ戻る":"次のシート ›","next","solid")+'</div><div class="footnote"><p>画面上部の「要点だけ」で、試験直前に図と識別ポイントだけ確認できます。<br>本シートは独自教材。個別会計・税務の適用は条件や改正時期を確認してください。</p></div></main>';
$("mode").textContent=summary?"解説も読む":"要点だけ";
mountLabs(s);
if($("details"))$("details").addEventListener("toggle",ev=>{openTerms=ev.target.open});
}
function navigate(id,historyUpdate=true){current=id;if(historyUpdate)history.pushState(null,"","#sheet-"+id);reader(id);window.scrollTo({top:0,behavior:"auto"})}
function gotoHome(toc=false){history.pushState(null,"",toc?"#toc":"#home");home();if(toc)requestAnimationFrame(()=> $("toc").scrollIntoView({block:"start",behavior:"smooth"}));else window.scrollTo({top:0,behavior:"auto"})}
function route(){const m=location.hash.match(/^#sheet-(\d+)$/);if(m&&S[Number(m[1])-1])navigate(Number(m[1]),false);else{home();if(location.hash==="#toc")requestAnimationFrame(()=>$("toc").scrollIntoView({block:"start"}))}}
document.addEventListener("click",ev=>{
const b=ev.target.closest("button");if(!b||b.disabled)return;
if(b.dataset.sheet){navigate(Number(b.dataset.sheet));return}
if(b.dataset.domain){domain=b.dataset.domain;query="";if($("search"))$("search").value="";filter="all";if(current)gotoHome(true);else{updateList();$("toc").scrollIntoView({block:"start",behavior:"smooth"})}return}
if(b.dataset.filter){filter=b.dataset.filter;updateList();return}
const a=b.dataset.action;
if(a==="home"){gotoHome();return}
if(a==="toc"){gotoHome(true);return}
if(a==="start"){navigate(Number(b.dataset.next));return}
if(a==="prev"&&current>1){navigate(current-1);return}
if(a==="next"){current<S.length?navigate(current+1):gotoHome(true);return}
if(a==="clearSearch"){query="";if($("search"))$("search").value="";updateList();return}
if(a==="mode"){st.mode=st.mode==="learn"?"summary":"learn";save();if(current)reader(current,true);else{$("mode").textContent=st.mode==="summary"?"解説も読む":"要点だけ";$("mode").setAttribute("aria-pressed",String(st.mode==="summary"))}return}
if(a==="answer"&&current){answerOpen=!answerOpen;$("recallAnswer").hidden=!answerOpen;$("recallbuttons").hidden=!answerOpen;b.textContent=answerOpen?"答えを隠す":"答えを見る";return}
if((a==="markReview"||a==="markLearned")&&current&&answerOpen){st.marks[current]=a==="markLearned"?"learned":"review";save();reader(current,true);return}
if(a==="search"){if(current){gotoHome(true)}requestAnimationFrame(()=>{$("search")?.focus();$("toc")?.scrollIntoView({block:"start"})});return}
if(a==="print"&&current){window.print();return}
});
window.addEventListener("popstate",route);window.addEventListener("hashchange",route);
$("mode").textContent=st.mode==="summary"?"解説も読む":"要点だけ";
route();
})();