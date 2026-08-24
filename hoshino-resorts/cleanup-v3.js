(() => {
  const style=document.createElement('style');
  style.textContent='#hrnav .metrics{grid-template-columns:1fr!important}';
  document.head.appendChild(style);
  let scheduled=false;
  function clean(){
    scheduled=false;
    document.querySelectorAll('#hrnav .card .metrics .metric:first-child').forEach(x=>x.style.display='none');
    document.querySelectorAll('#hrnav #compareTable tr').forEach(r=>{if(r.cells[0]?.textContent?.trim()==='予算感')r.style.display='none'});
    const lead=document.querySelector('#hrnav .lead');if(lead)lead.textContent=lead.textContent.replace('予算感','具体的な参考価格');
    const foot=document.querySelector('#hrnav .footer');if(foot)foot.innerHTML=foot.innerHTML.replace('「予算感」はブランド特性と施設タイプを比較しやすくするための相対指標で、実際の販売価格ではありません。','表示する参考価格帯と参考平均は比較用の目安で、実際の販売実績平均ではありません。');
  }
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(clean)}
  const cards=document.getElementById('cards');if(cards)new MutationObserver(queue).observe(cards,{childList:true,subtree:true});
  const table=document.getElementById('compareTable');if(table)new MutationObserver(queue).observe(table,{childList:true,subtree:true});
  queue();
})();