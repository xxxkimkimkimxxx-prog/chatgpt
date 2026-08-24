(() => {
  const raw=`星のや東京~星のや~関東~東京都 大手町~5~温泉,街歩き,グルメ,文化・アート,都市~営業中~1
星のや富士~星のや~北陸・甲信越~山梨県 富士河口湖~5~自然・絶景,自然,グランピング~営業中~0
星のや軽井沢~星のや~北陸・甲信越~長野県 軽井沢~5~温泉,自然・絶景,グルメ,癒し・滞在,自然~営業中~1
星のや京都~星のや~近畿~京都府 嵐山~5~自然・絶景,グルメ,文化・アート,癒し・滞在,文化,食~営業中~1
星のや奈良監獄~星のや~近畿~奈良県 奈良~5~文化・アート,歴史,建築~営業中~0
星のや沖縄~星のや~沖縄~沖縄県 読谷村~5~海・水辺,自然・絶景,癒し・滞在,海,絶景~営業中~0
星のや竹富島~星のや~沖縄~沖縄県 竹富島~5~海・水辺,文化・アート,癒し・滞在,離島,文化~営業中~0
星のやグーグァン~星のや~海外~台湾 谷關~5~温泉,自然・絶景,文化・アート,自然~営業中~0
星のやバリ~星のや~海外~インドネシア ウブド~5~自然・絶景,癒し・滞在,自然,海外~営業中~0
界 ポロト~界~北海道~北海道 白老温泉~4~温泉,自然・絶景,文化・アート,文化~営業中~0
界 津軽~界~東北~青森県 大鰐温泉~4~温泉,グルメ,文化・アート,文化~営業中~1
界 秋保~界~東北~宮城県 秋保温泉~4~温泉,自然・絶景,グルメ,渓流~営業中~0
界 蔵王~界~東北~山形県 蔵王温泉~4~温泉,自然・絶景,雪・スキー,雪~2026年10月開業予定~0
界 鬼怒川~界~関東~栃木県 鬼怒川温泉~4~温泉,自然・絶景,文化・アート,自然~営業中~0
界 草津~界~関東~群馬県 草津温泉~4~温泉,街歩き,文化・アート,文化~営業中~0
界 箱根~界~関東~神奈川県 箱根湯本温泉~4~温泉,自然・絶景,グルメ,自然~営業中~1
界 仙石原~界~関東~神奈川県 仙石原温泉~4~温泉,自然・絶景,文化・アート,アート~営業中~0
界 アンジン~界~東海~静岡県 伊東温泉~4~温泉,海・水辺,文化・アート,海~営業中~0
界 伊東~界~東海~静岡県 伊東温泉~4~温泉,自然・絶景,グルメ,庭園~営業中~0
界 遠州~界~東海~静岡県 舘山寺温泉~4~温泉,海・水辺,グルメ,茶~営業中~0
界 アルプス~界~北陸・甲信越~長野県 大町温泉~4~温泉,雪・スキー,雪~営業中~0
界 松本~界~北陸・甲信越~長野県 浅間温泉~4~温泉,グルメ,文化・アート,音楽~営業中~0
界 奥飛騨~界~東海~岐阜県 奥飛騨温泉郷~4~温泉,自然・絶景,山~営業中~0
界 加賀~界~北陸・甲信越~石川県 山代温泉~4~温泉,グルメ,文化・アート,工芸~営業中~0
界 玉造~界~中国・四国~島根県 玉造温泉~4~温泉,文化・アート,文化~営業中~0
界 出雲~界~中国・四国~島根県 出雲ひのみさき温泉~4~温泉,海・水辺,文化・アート,海~営業中~0
界 宮島~界~中国・四国~広島県 宮島口温泉~4~温泉,自然・絶景,文化・アート,絶景~営業中~0
界 長門~界~中国・四国~山口県 長門湯本温泉~4~温泉,文化・アート,川~営業中~0
界 別府~界~九州~大分県 別府温泉~4~温泉,街歩き,グルメ~営業中~0
界 由布院~界~九州~大分県 由布院温泉~4~温泉,自然・絶景,文化・アート,自然~営業中~1
界 阿蘇~界~九州~大分県 瀬の本温泉~4~温泉,自然・絶景,自然~営業中~0
界 雲仙~界~九州~長崎県 雲仙温泉~4~温泉,自然・絶景,文化・アート,自然~営業中~0
界 霧島~界~九州~鹿児島県 霧島温泉~4~温泉,自然・絶景,文化・アート,絶景~営業中~0
リゾナーレトマム~リゾナーレ~北海道~北海道 トマム~3~自然・絶景,雪・スキー,アクティブ,自然,雪~営業中~1
リゾナーレ那須~リゾナーレ~関東~栃木県 那須~3~自然・絶景,グルメ,アクティブ,自然,農体験~営業中~1
リゾナーレ八ヶ岳~リゾナーレ~北陸・甲信越~山梨県 北杜~3~自然・絶景,グルメ,アクティブ,ワイン,自然~営業中~0
リゾナーレ熱海~リゾナーレ~東海~静岡県 熱海~3~海・水辺,自然・絶景,アクティブ,海,絶景~営業中~0
リゾナーレ大阪~リゾナーレ~近畿~大阪府 大阪~3~街歩き,文化・アート,都市,アート~営業中~1
リゾナーレ下関~リゾナーレ~中国・四国~山口県 下関~3~海・水辺,グルメ,アクティブ,海,食~営業中~0
リゾナーレ小浜島~リゾナーレ~沖縄~沖縄県 小浜島~3~海・水辺,自然・絶景,アクティブ,離島,海~営業中~0
リゾナーレグアム~リゾナーレ~海外~米国・グアム タムニング~3~海・水辺,アクティブ,海外,海~営業中~0
OMO7旭川~OMO~北海道~北海道 旭川~3~街歩き,グルメ,食~営業中~1
OMO5小樽~OMO~北海道~北海道 小樽~2~街歩き,グルメ,文化・アート,食~営業中~1
OMO5函館~OMO~北海道~北海道 函館~2~街歩き,グルメ,食~営業中~1
OMO5東京大塚~OMO~関東~東京都 豊島区~2~街歩き,グルメ,食~営業中~1
OMO5東京五反田~OMO~関東~東京都 品川区~2~街歩き,グルメ,食~営業中~1
OMO3浅草~OMO~関東~東京都 台東区~2~街歩き,文化・アート,文化~営業中~1
OMO3東京赤坂~OMO~関東~東京都 港区~2~街歩き,グルメ,食~営業中~1
OMO7横浜~OMO~関東~神奈川県 横浜~3~街歩き,グルメ,食~営業中~1
OMO5横浜馬車道~OMO~関東~神奈川県 横浜~2~街歩き,文化・アート,歴史~営業中~1
OMO5金沢片町~OMO~北陸・甲信越~石川県 金沢~2~街歩き,グルメ,文化・アート,食~営業中~1
OMO5京都祇園~OMO~近畿~京都府 京都~2~街歩き,グルメ,文化・アート,文化~営業中~1
OMO5京都三条~OMO~近畿~京都府 京都~2~街歩き,文化・アート,文化~営業中~1
OMO3京都東寺~OMO~近畿~京都府 京都~2~街歩き,文化・アート,文化~営業中~1
OMO7大阪~OMO~近畿~大阪府 大阪~3~街歩き,グルメ,アクティブ,食~営業中~1
OMO関西空港~OMO~近畿~大阪府 泉佐野~2~温泉,街歩き,空港~営業中~1
OMO7高知~OMO~中国・四国~高知県 高知~3~街歩き,グルメ,文化・アート,食~営業中~1
OMO5熊本~OMO~九州~熊本県 熊本~2~街歩き,グルメ,文化・アート,食~営業中~1
OMO5沖縄那覇~OMO~沖縄~沖縄県 那覇~2~街歩き,グルメ,文化・アート,食~営業中~1
BEB5土浦~BEB~関東~茨城県 土浦~1~アクティブ,自転車,グループ~営業中~1
BEB5軽井沢~BEB~北陸・甲信越~長野県 軽井沢~1~自然・絶景,グループ,カジュアル~営業中~1
BEB5門司港~BEB~九州~福岡県 北九州~1~街歩き,グループ~営業中~0
BEB5沖縄瀬良垣~BEB~沖縄~沖縄県 恩納村~1~海・水辺,癒し・滞在,グループ,海~営業中~0
LUCY尾瀬鳩待~LUCY~関東~群馬県 尾瀬~2~自然・絶景,アクティブ,山,ハイキング~営業中~0
トマム ザ・タワー~個性的な宿~北海道~北海道 トマム~2~自然・絶景,雪・スキー,アクティブ,自然,雪~営業中~0
青森屋~個性的な宿~東北~青森県 三沢~2~温泉,文化・アート,祭り~営業中~0
奥入瀬渓流ホテル~個性的な宿~東北~青森県 十和田~3~温泉,自然・絶景,癒し・滞在,渓流,自然~営業中~0
磐梯山温泉ホテル~個性的な宿~東北~福島県 磐梯~2~温泉,自然・絶景,雪・スキー,雪~営業中~0
ホテルブレストンコート~個性的な宿~北陸・甲信越~長野県 軽井沢~3~自然・絶景,グルメ,食,ウェディング~営業中~1
1955 東京ベイ~個性的な宿~関東~千葉県 浦安~1~アクティブ,テーマパーク,ファミリー~営業中~1
西表島ホテル~個性的な宿~沖縄~沖縄県 西表島~3~海・水辺,自然・絶景,アクティブ,離島,自然~営業中~0
嘉助天台~個性的な宿~海外~中国 天台山~3~自然・絶景,文化・アート,癒し・滞在,海外,自然~営業中~0
サーフジャック ハワイ~個性的な宿~海外~米国・ハワイ ワイキキ~2~海・水辺,街歩き,海外,海~営業中~0`;
  const data=raw.trim().split('\n').map(r=>{const [name,brand,region,place,tier,tags,status,carless]=r.split('~');return{name,brand,region,place,tier:+tier,tags:tags.split(','),status,carless:carless==='1'}});
  const byName=Object.fromEntries(data.map(x=>[x.name,x]));
  const defaults={'星のや':[32000,60000],'界':[22000,38000],'リゾナーレ':[14000,28000],'OMO':[7000,15000],'BEB':[5500,11000],'LUCY':[11000,20000],'個性的な宿':[11000,26000]};
  const special={'星のや東京':[44345,70000],'星のや富士':[35000,65000],'星のや軽井沢':[35000,65000],'星のや京都':[45000,80000],'星のや奈良監獄':[40000,75000],'星のや沖縄':[30000,60000],'星のや竹富島':[30000,58000],'星のやグーグァン':[30000,55000],'星のやバリ':[28000,52000],'界 ポロト':[19000,33000],'界 箱根':[37550,55000],'界 仙石原':[30000,50000],'界 伊東':[21000,35000],'界 遠州':[22000,36000],'界 秋保':[25000,43000],'界 宮島':[26000,45000],'界 由布院':[26000,45000],'界 阿蘇':[30000,50000],'界 霧島':[25000,45000],'リゾナーレトマム':[18000,35000],'リゾナーレ八ヶ岳':[17000,32000],'リゾナーレ熱海':[18000,33000],'リゾナーレ小浜島':[19000,35000],'リゾナーレグアム':[20000,36000],'OMO5東京五反田':[11000,20000],'OMO7横浜':[11000,21000],'OMO7大阪':[10000,19000],'OMO7旭川':[9000,17000],'トマム ザ・タワー':[12000,22000],'青森屋':[15000,28000],'奥入瀬渓流ホテル':[18000,32000],'磐梯山温泉ホテル':[12000,22000],'ホテルブレストンコート':[18000,35000],'1955 東京ベイ':[8000,16000],'西表島ホテル':[18000,32000],'嘉助天台':[20000,35000],'サーフジャック ハワイ':[16000,30000]};
  const brandIntro={'星のや':'その土地の文化や自然を深く味わう、星野リゾート最高峰の滞在型ブランド','界':'温泉と地域文化を主役にした、食事付きの温泉旅館ブランド','リゾナーレ':'家族で遊べる体験やアクティビティが充実したリゾートブランド','OMO':'ホテルを拠点に街を遊び尽くす、都市観光向けブランド','BEB':'仲間と気軽に過ごせる、自由度の高いカジュアルホテル','LUCY':'自然の中へ踏み込む旅を快適にする、アウトドア拠点型ブランド','個性的な宿':'土地ごとに異なるテーマを前面に出した個性派ホテル'};
  const fitBase={'星のや':['カップル','ひとり旅'],'界':['カップル','大人旅'],'リゾナーレ':['子連れ','家族'],'OMO':['ひとり旅','カップル'],'BEB':['友人','グループ'],'LUCY':['ひとり旅','アクティブ派'],'個性的な宿':['家族','カップル']};
  const fmt=n=>'¥'+n.toLocaleString('ja-JP');
  const priceOf=h=>{const [low,high]=special[h.name]||defaults[h.brand];return{low,high,avg:Math.round((low+high)/2/500)*500}};
  function three(h){
    const tags=h.tags.filter(x=>!['自然','海','食','文化','雪'].includes(x)).slice(0,3);
    const focus=(tags.length?tags:h.tags.slice(0,2)).join('・');
    let fits=[...(fitBase[h.brand]||[])];
    if(h.tags.includes('ファミリー')||h.tags.includes('テーマパーク'))fits=['子連れ','家族'];
    if(h.tags.includes('街歩き')&&!fits.includes('ひとり旅'))fits.unshift('ひとり旅');
    const access=h.carless?'車なしでも組み立てやすいのが魅力です':'周辺観光や移動手段まで含めて旅程を組むと満足度が上がります';
    return `${h.place}にある「${h.name}」は、${brandIntro[h.brand]}です。特に${focus}を重視する旅と相性がよく、施設そのものを楽しむ目的でも選びやすい宿です。${fits.slice(0,2).join('・')}に向き、${access}。`;
  }
  let links={};
  const style=document.createElement('style');
  style.textContent=`#hrnav .enhPrice{display:grid;grid-template-columns:1.35fr .85fr;gap:7px;margin:11px 0}
  #hrnav .enhPrice>div{background:light-dark(#f2eee6,#202a27);border-radius:12px;padding:10px}
  #hrnav .enhPrice span{display:block;font-size:10px;color:light-dark(#6f7874,#a7b2ad)}
  #hrnav .enhPrice b{display:block;font-size:16px;margin-top:2px}
  #hrnav .enhPrice small{font-size:9px;color:light-dark(#777f7b,#9da8a3)}
  #hrnav .officialDirect{display:flex;align-items:center;justify-content:center;min-height:42px;border-radius:11px;background:light-dark(#244b3d,#d8eadf);color:light-dark(#fff,#122019);font-weight:850;font-size:12px;text-decoration:none;padding:8px 10px;margin-top:10px}
  #hrnav .enhSource{font-size:9px;color:light-dark(#777f7b,#9da8a3);margin-top:6px}
  #hrnav .desc{font-size:13px;line-height:1.72}
  #hrnav .compareScroll a{font-weight:850;color:light-dark(#285442,#b9d2c1)}
  @media(max-width:420px){#hrnav .enhPrice{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  function enhanceCard(card){
    const name=card.querySelector('.name')?.textContent?.trim(); const h=byName[name]; if(!h)return;
    const p=priceOf(h);
    let box=card.querySelector('.enhPrice');
    if(!box){
      box=document.createElement('div');box.className='enhPrice';
      box.innerHTML=`<div><span>参考価格帯 / 1泊1名</span><b>${fmt(p.low)}〜${fmt(p.high)}</b><small>日程・食事・客室で変動</small></div><div><span>参考平均</span><b>約${fmt(p.avg)}</b><small>レンジ中間値</small></div>`;
      const desc=card.querySelector('.desc');(desc||card.querySelector('.tags'))?.before(box);
    }
    const d=card.querySelector('.desc'); if(d)d.textContent=three(h);
    let a=card.querySelector('.officialDirect');
    if(!a){a=document.createElement('a');a.className='officialDirect';a.target='_blank';a.rel='noopener noreferrer';a.textContent='公式サイトへ ↗';const detail=card.querySelector('.detailBtn');if(detail)detail.before(a);else card.appendChild(a);}
    a.href=links[name]||'https://hoshinoresorts.com/jp/discoveries/facilities/';
    if(!card.querySelector('.enhSource')){const s=document.createElement('div');s.className='enhSource';s.textContent='※価格は比較用目安。実額は公式サイトで確認してください。';a.after(s);}
  }
  function enhanceCards(){document.querySelectorAll('#hrnav .card').forEach(enhanceCard)}
  function enhanceFilters(){
    const budget=document.getElementById('budget'); if(budget&&budget.dataset.enhanced!=='1'){budget.dataset.enhanced='1';const lab=document.querySelector('label[for="budget"]');if(lab)lab.textContent='参考価格帯';const labels=['指定なし','約¥5,500〜¥11,000中心','約¥7,000〜¥20,000中心','約¥14,000〜¥36,000中心','約¥19,000〜¥55,000中心','約¥28,000〜¥80,000中心'];[...budget.options].forEach((o,i)=>o.textContent=labels[i]||o.textContent);}
    const sort=document.getElementById('sort');if(sort){[...sort.options].forEach(o=>{if(o.value==='price')o.textContent='参考価格が安い順';if(o.value==='priceAsc')o.textContent='参考価格が安い順'})}
  }
  function enhanceCompare(){
    const table=document.getElementById('compareTable');if(!table||!table.rows.length)return;
    [...table.rows].forEach(r=>{if(r.cells[0]?.textContent==='参考価格'||r.cells[0]?.textContent==='特徴（3文）'||r.cells[0]?.textContent==='公式サイト')r.remove()});
    const first=table.rows[0];if(!first)return;const names=[...first.cells].slice(1).map(td=>td.textContent.trim().split('\n')[0].trim());
    const add=(label,fn)=>{const tr=document.createElement('tr');tr.innerHTML='<th>'+label+'</th>'+names.map(n=>`<td>${fn(byName[n],n)}</td>`).join('');table.appendChild(tr)};
    add('参考価格',(h)=>{if(!h)return '—';const p=priceOf(h);return `${fmt(p.low)}〜${fmt(p.high)}<br>参考平均 約${fmt(p.avg)}`});
    add('特徴（3文）',(h)=>h?three(h):'—');
    add('公式サイト',(h,n)=>`<a href="${links[n]||'https://hoshinoresorts.com/jp/discoveries/facilities/'}" target="_blank" rel="noopener noreferrer">公式サイトへ ↗</a>`);
  }
  let scheduled=false;
  function run(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhanceFilters();enhanceCards();enhanceCompare()})}
  const cards=document.getElementById('cards');if(cards)new MutationObserver(run).observe(cards,{childList:true,subtree:true});
  fetch('./official-links.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{links=j;run()}).catch(run);
  run();
})();