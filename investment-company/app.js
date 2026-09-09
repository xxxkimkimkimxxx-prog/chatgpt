const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

// Shared UI state only. Data is loaded by the dedicated current modules:
// current-promoted-tree.js / current-stats.js / news-feed.js / horizon-list.js.
const state = { view:'tree', horizon:'day', filter:'all' };

function renderTree(){
  const root=$('#treeRoot');
  if(root && !root.children.length) root.innerHTML='<div class="emptyGrid">最新のテーマ昇格ツリーを読み込み中…</div>';
}

function renderHorizon(h){
  state.horizon=h;
  const root=$('#horizonGrid');
  if(root) root.innerHTML='<div class="emptyGrid">最新の委員会データを読み込み中…</div>';
}

function switchView(v){
  state.view=v;
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===v));
  $$('.view').forEach(x=>x.classList.remove('active'));
  if(v==='tree') $('#treeView')?.classList.add('active');
  else if(v==='summary') $('#summaryView')?.classList.add('active');
  else {
    $('#horizonView')?.classList.add('active');
    state.filter='all';
    renderHorizon(v);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function bindBaseUI(){
  $$('.tab').forEach(tab=>tab.onclick=()=>switchView(tab.dataset.view));
  const search=$('#treeSearch');
  if(search) search.addEventListener('input',e=>renderTree(e.target.value));

  const expand=$('#expandAll');
  if(expand) expand.onclick=()=>{
    $$('.treeNode').forEach(n=>{
      const b=$('.toggle',n);
      if(!b || b.classList.contains('placeholder')) return;
      n.classList.add('open');
      b.textContent='−';
    });
  };

  const collapse=$('#collapseAll');
  if(collapse) collapse.onclick=()=>{
    $$('.treeNode').forEach(n=>{
      n.classList.remove('open');
      const b=$('.toggle',n);
      if(b && !b.classList.contains('placeholder')) b.textContent='＋';
    });
  };
}

bindBaseUI();
renderTree();
