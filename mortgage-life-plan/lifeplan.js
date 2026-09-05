(() => {
  "use strict";

  const STORAGE_KEY = "mortgage-family-life-plan-v1";
  const BASE_YEAR = new Date().getFullYear();
  const yen = new Intl.NumberFormat("ja-JP", { style:"currency", currency:"JPY", maximumFractionDigits:0 });
  const integer = new Intl.NumberFormat("ja-JP", { maximumFractionDigits:0 });

  const defaults = {
    "lp-h-age":35, "lp-w-age":33, "lp-child-count":1,
    "lp-h-income":550, "lp-w-income":400, "lp-net-rate":78, "lp-income-growth":1,
    "lp-h-retire":65, "lp-w-retire":65, "lp-h-pension":15, "lp-w-pension":8.7,
    "lp-pension-age":65, "lp-retirement-pay":1500, "lp-savings":1200, "lp-living":28,
    "lp-home-cost":36, "lp-return-rate":2, "lp-inflation":1.5, "lp-end-age":95,
    children:[{ age:1, path:"public-private", support:5 }]
  };

  const educationCosts = {
    kindergarten:{ public:184646, private:347338 },
    elementary:{ public:366599, private:1741516 },
    junior:{ public:542450, private:1560359 },
    high:{ public:596954, private:1179261 },
    university:{ nationalFirst:818520, nationalLater:536520, privateFirst:1507647, privateLater:1267282 }
  };

  const pathLabels = {
    "public-national":"高校まで公立・国公立大",
    "public-private":"高校まで公立・私立大",
    "private-high":"高校から私立・私立大",
    "private-junior":"中学から私立・私立大",
    "all-private":"幼稚園から私立・私立大"
  };

  const state = { rows:[], settings:null };
  const $ = (id) => document.getElementById(id);
  const clamp = (value,min,max,fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max,Math.max(min,number)) : fallback;
  };
  const man = (value) => `${integer.format(Math.round(value / 10000))}万円`;
  const signedMan = (value) => `${value < 0 ? "−" : "+"}${integer.format(Math.round(Math.abs(value) / 10000))}万円`;

  function monthlyPayment(principal, annualRate, months) {
    if (months <= 0) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate,months);
    return principal * monthlyRate * factor / (factor - 1);
  }

  function renderChildren(children) {
    const count = Math.round(clamp($("lp-child-count").value,0,6,0));
    $("children-list").innerHTML = Array.from({ length:count },(_,index) => {
      const child = children?.[index] || { age:Math.max(0,3-index*2), path:"public-private", support:5 };
      const options = Object.entries(pathLabels).map(([value,label]) => `<option value="${value}" ${child.path === value ? "selected" : ""}>${label}</option>`).join("");
      return `<div class="child-row" data-child="${index}">
        <strong>子${index+1}</strong>
        <label><span>現在年齢</span><input class="child-age" type="number" min="0" max="30" step="1" value="${clamp(child.age,0,30,0)}" aria-label="子${index+1}の現在年齢"></label>
        <label><span>進学コース</span><select class="child-path" aria-label="子${index+1}の進学コース">${options}</select></label>
        <label><span>大学時の生活支援 / 月</span><input class="child-support" type="number" min="0" max="100" step="1" value="${clamp(child.support,0,100,0)}" aria-label="子${index+1}の大学時の生活支援月額"></label>
      </div>`;
    }).join("");
  }

  function collectChildren() {
    return [...document.querySelectorAll(".child-row")].map((row) => ({
      age:clamp(row.querySelector(".child-age").value,0,30,0),
      path:row.querySelector(".child-path").value,
      support:clamp(row.querySelector(".child-support").value,0,100,0)
    }));
  }

  function getSettings() {
    return {
      husbandAge:clamp($("lp-h-age").value,18,80,35),
      wifeAge:clamp($("lp-w-age").value,18,80,33),
      husbandIncome:clamp($("lp-h-income").value,0,100000,0)*10000,
      wifeIncome:clamp($("lp-w-income").value,0,100000,0)*10000,
      netRate:clamp($("lp-net-rate").value,40,100,78)/100,
      incomeGrowth:clamp($("lp-income-growth").value,-10,10,0)/100,
      husbandRetire:clamp($("lp-h-retire").value,45,80,65),
      wifeRetire:clamp($("lp-w-retire").value,45,80,65),
      husbandPension:clamp($("lp-h-pension").value,0,100,0)*10000*12,
      wifePension:clamp($("lp-w-pension").value,0,100,0)*10000*12,
      pensionAge:clamp($("lp-pension-age").value,60,75,65),
      retirementPay:clamp($("lp-retirement-pay").value,0,100000,0)*10000,
      savings:clamp($("lp-savings").value,-10000,100000,0)*10000,
      living:clamp($("lp-living").value,0,1000,0)*10000*12,
      homeCost:clamp($("lp-home-cost").value,0,1000,0)*10000,
      returnRate:clamp($("lp-return-rate").value,-20,20,0)/100,
      inflation:clamp($("lp-inflation").value,-5,20,0)/100,
      endAge:clamp($("lp-end-age").value,70,110,95),
      children:collectChildren(),
      loanAmount:clamp($("loan-amount").value,0,30000,0)*10000,
      loanYears:clamp($("loan-years").value,1,50,35),
      loanRate:clamp($("interest-rate").value,0,15,0)
    };
  }

  function educationForAge(child,age) {
    const privateFromKindergarten = child.path === "all-private";
    const privateFromJunior = privateFromKindergarten || child.path === "private-junior";
    const privateFromHigh = privateFromJunior || child.path === "private-high";
    if (age >= 3 && age <= 5) return educationCosts.kindergarten[privateFromKindergarten ? "private" : "public"];
    if (age >= 6 && age <= 11) return educationCosts.elementary[privateFromKindergarten ? "private" : "public"];
    if (age >= 12 && age <= 14) return educationCosts.junior[privateFromJunior ? "private" : "public"];
    if (age >= 15 && age <= 17) return educationCosts.high[privateFromHigh ? "private" : "public"];
    if (age >= 18 && age <= 21) {
      const national = child.path === "public-national";
      const tuition = national
        ? (age === 18 ? educationCosts.university.nationalFirst : educationCosts.university.nationalLater)
        : (age === 18 ? educationCosts.university.privateFirst : educationCosts.university.privateLater);
      return tuition + child.support*10000*12;
    }
    return 0;
  }

  function eventsForYear(settings,yearIndex) {
    const events = [];
    const hAge = settings.husbandAge + yearIndex;
    const wAge = settings.wifeAge + yearIndex;
    if (hAge === settings.husbandRetire) events.push("夫退職");
    if (wAge === settings.wifeRetire) events.push("妻退職");
    if (yearIndex === settings.loanYears) events.push("住宅ローン完済");
    settings.children.forEach((child,index) => {
      const age = child.age + yearIndex;
      const school = { 3:"幼稚園", 6:"小学校", 12:"中学校", 15:"高校", 18:"大学", 22:"大学卒業" }[age];
      if (school) events.push(`子${index+1} ${school}`);
    });
    return events;
  }

  function project(settings) {
    const horizon = Math.max(0,Math.round(settings.endAge - Math.min(settings.husbandAge,settings.wifeAge)));
    const mortgageAnnual = monthlyPayment(settings.loanAmount,settings.loanRate,Math.round(settings.loanYears*12))*12;
    const retirementHalf = settings.retirementPay/2;
    const rows = [];
    let assets = settings.savings;

    for (let yearIndex=0; yearIndex<=horizon; yearIndex+=1) {
      const hAge = settings.husbandAge + yearIndex;
      const wAge = settings.wifeAge + yearIndex;
      const inflationFactor = Math.pow(1+settings.inflation,yearIndex);
      const incomeFactor = Math.pow(1+settings.incomeGrowth,yearIndex);
      const salary = (hAge < settings.husbandRetire ? settings.husbandIncome*incomeFactor : 0)
        + (wAge < settings.wifeRetire ? settings.wifeIncome*incomeFactor : 0);
      const pension = (hAge >= settings.pensionAge ? settings.husbandPension : 0)
        + (wAge >= settings.pensionAge ? settings.wifePension : 0);
      const retirementIncome = (hAge === settings.husbandRetire ? retirementHalf : 0)
        + (wAge === settings.wifeRetire ? retirementHalf : 0);
      const income = salary*settings.netRate + pension + retirementIncome;
      const living = settings.living*inflationFactor;
      const home = settings.homeCost*inflationFactor;
      const mortgage = yearIndex < settings.loanYears ? mortgageAnnual : 0;
      const education = settings.children.reduce((sum,child) => sum + educationForAge(child,child.age+yearIndex)*inflationFactor,0);
      const cashflow = income-living-home-mortgage-education;
      const investment = assets > 0 ? assets*settings.returnRate : 0;
      const openingAssets = assets;
      assets += cashflow+investment;
      rows.push({
        yearIndex, year:BASE_YEAR+yearIndex, hAge, wAge, income, living, home, mortgage,
        education, cashflow, investment, openingAssets, assets, events:eventsForYear(settings,yearIndex)
      });
    }
    return rows;
  }

  function save(settings) {
    const serializable = {};
    Object.keys(defaults).filter((key) => key !== "children").forEach((id) => { serializable[id] = $(id).value; });
    serializable.children = settings.children;
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(serializable)); } catch (_) { /* storage may be disabled */ }
  }

  function formatYear(row) {
    return `${row.year}年（${row.hAge} / ${row.wAge}歳）`;
  }

  function updateSummary(settings,rows) {
    const bothRetiredIndex = Math.max(settings.husbandRetire-settings.husbandAge,settings.wifeRetire-settings.wifeAge,0);
    const retirementRow = rows.find((row) => row.yearIndex >= bothRetiredIndex) || rows.at(-1);
    const finalRow = rows.at(-1);
    const firstRed = rows.find((row) => row.cashflow < 0);
    const firstShortage = rows.find((row) => row.assets < 0);
    const minimum = rows.reduce((lowest,row) => row.assets < lowest.assets ? row : lowest,rows[0]);
    const retirementDraw = rows.filter((row) => row.yearIndex >= bothRetiredIndex && row.cashflow < 0).reduce((sum,row) => sum-row.cashflow,0);

    $("lp-retirement-assets").textContent = man(retirementRow.assets);
    $("lp-retirement-year").textContent = formatYear(retirementRow);
    $("lp-final-label").textContent = `若い方が${settings.endAge}歳時点の資産`;
    $("lp-final-assets").textContent = man(finalRow.assets);
    $("lp-final-status").textContent = formatYear(finalRow);
    $("lp-first-red").textContent = firstRed ? `${firstRed.year}年` : "期間内なし";
    $("lp-first-red").parentElement.classList.toggle("is-risk",Boolean(firstRed));
    $("lp-first-shortage").textContent = firstShortage ? `${firstShortage.year}年` : "期間内なし";
    $("lp-first-shortage").parentElement.classList.toggle("is-risk",Boolean(firstShortage));
    $("lp-final-assets").parentElement.classList.toggle("is-risk",finalRow.assets < 0);
    $("lp-retirement-draw").textContent = man(retirementDraw);
    $("lp-min-assets").textContent = man(minimum.assets);
    $("lp-min-year").textContent = `${minimum.year}年（夫${minimum.hAge}歳・妻${minimum.wAge}歳）`;
    $("lp-loan-summary").textContent = `${integer.format(settings.loanAmount/10000)}万円・${settings.loanYears}年・年${settings.loanRate.toFixed(3)}%`;

    const redRows = rows.filter((row) => row.cashflow < 0);
    $("lp-red-count").textContent = `赤字年 ${redRows.length}回`;
    $("lp-red-summary").textContent = redRows.length ? `${redRows.length}年分を確認` : "期間内なし";
    $("lp-red-years").innerHTML = redRows.length ? redRows.map((row) => `<div class="red-year-chip"><span>${row.year}年・${row.hAge}/${row.wAge}歳</span><strong>${signedMan(row.cashflow)}</strong></div>`).join("") : `<p class="red-year-empty">入力条件では、年間収支が赤字になる年はありません。</p>`;

    const milestoneIndices = new Set([0,rows.length-1]);
    rows.forEach((row) => {
      if (row.yearIndex%10 === 0 || row.events.length || row === firstRed || row === firstShortage) milestoneIndices.add(row.yearIndex);
    });
    $("lp-milestones").innerHTML = [...milestoneIndices].sort((a,b) => a-b).map((index) => {
      const row = rows[index];
      const event = row.events.length ? row.events.join("・") : (index === 0 ? "現在" : "10年ごとの確認");
      return `<tr class="${row.cashflow < 0 ? "negative-cash" : ""} ${row.assets < 0 ? "negative-assets" : ""}">
        <td>${row.year}年</td><td>${row.hAge} / ${row.wAge}歳</td><td>${event}</td><td>${signedMan(row.cashflow)}</td><td>${man(row.assets)}</td>
      </tr>`;
    }).join("");
  }

  function shortAxis(value) {
    const absolute = Math.abs(value);
    if (absolute >= 100000000) return `${(value/100000000).toFixed(1)}億`;
    return `${Math.round(value/10000)}万`;
  }

  function drawChart(rows) {
    const canvas = $("asset-curve");
    const frame = canvas.parentElement;
    const width = Math.max(320,frame.clientWidth);
    const height = Math.max(260,frame.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1,2);
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);

    const margin = { left:64, right:18, top:28, bottom:38 };
    const plotWidth = width-margin.left-margin.right;
    const plotHeight = height-margin.top-margin.bottom;
    const values = rows.map((row) => row.assets).concat(0);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const padding = Math.max((max-min)*.12,1000000);
    min -= padding;
    max += padding;
    if (min > 0) min = 0;
    const x = (index) => margin.left + (rows.length === 1 ? 0 : index/(rows.length-1)*plotWidth);
    const y = (value) => margin.top + (max-value)/(max-min)*plotHeight;
    const zeroY = y(0);

    if (min < 0) {
      ctx.fillStyle = "rgba(209,73,91,.11)";
      ctx.fillRect(margin.left,zeroY,plotWidth,margin.top+plotHeight-zeroY);
    }
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let tick=0;tick<=4;tick+=1) {
      const value = max-(max-min)*(tick/4);
      const tickY = y(value);
      ctx.strokeStyle = "rgba(255,255,255,.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(margin.left,tickY); ctx.lineTo(width-margin.right,tickY); ctx.stroke();
      ctx.fillStyle = "#829aa9";
      ctx.fillText(shortAxis(value),margin.left-8,tickY);
    }
    ctx.strokeStyle = min < 0 ? "rgba(255,125,139,.7)" : "rgba(255,255,255,.22)";
    ctx.beginPath(); ctx.moveTo(margin.left,zeroY); ctx.lineTo(width-margin.right,zeroY); ctx.stroke();

    const gradient = ctx.createLinearGradient(0,margin.top,0,margin.top+plotHeight);
    gradient.addColorStop(0,"rgba(77,226,190,.24)");
    gradient.addColorStop(1,"rgba(77,226,190,0)");
    ctx.beginPath();
    rows.forEach((row,index) => index ? ctx.lineTo(x(index),y(row.assets)) : ctx.moveTo(x(index),y(row.assets)));
    ctx.lineTo(x(rows.length-1),margin.top+plotHeight);
    ctx.lineTo(x(0),margin.top+plotHeight);
    ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();

    ctx.beginPath();
    rows.forEach((row,index) => index ? ctx.lineTo(x(index),y(row.assets)) : ctx.moveTo(x(index),y(row.assets)));
    ctx.strokeStyle = "#4de2be"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.stroke();

    rows.forEach((row,index) => {
      if (row.cashflow >= 0) return;
      ctx.beginPath(); ctx.arc(x(index),y(row.assets),3.3,0,Math.PI*2);
      ctx.fillStyle = "#ff7d8b"; ctx.fill();
    });

    const labelEvery = rows.length > 55 ? 15 : 10;
    ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#829aa9";
    rows.forEach((row,index) => {
      if (index%labelEvery === 0 || index === rows.length-1) ctx.fillText(`${row.year}`,x(index),margin.top+plotHeight+11);
    });
    canvas.setAttribute("aria-label",`${rows[0].year}年から${rows.at(-1).year}年までの資産曲線。最終資産は${man(rows.at(-1).assets)}。`);
    $("lp-chart-range").innerHTML = `<span>${rows[0].year}年・現在</span><span>${rows.at(-1).year}年・夫${rows.at(-1).hAge}歳 / 妻${rows.at(-1).wAge}歳</span>`;
  }

  function calculate({ persist=true }={}) {
    const settings = getSettings();
    const rows = project(settings);
    state.settings = settings;
    state.rows = rows;
    updateSummary(settings,rows);
    drawChart(rows);
    if (persist) save(settings);
  }

  function restore() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { stored = null; }
    const source = stored || defaults;
    Object.keys(defaults).filter((key) => key !== "children").forEach((id) => {
      if (source[id] !== undefined) $(id).value = source[id];
    });
    renderChildren(source.children || defaults.children);
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage may be disabled */ }
    Object.keys(defaults).filter((key) => key !== "children").forEach((id) => { $(id).value = defaults[id]; });
    renderChildren(defaults.children);
    calculate();
  }

  function bind() {
    $("life-form").addEventListener("input",(event) => {
      if (event.target.id === "lp-child-count") {
        const existing = collectChildren();
        renderChildren(existing);
      }
      calculate();
    });
    $("life-form").addEventListener("change",calculate);
    $("life-reset").addEventListener("click",reset);
    window.addEventListener("mortgagechange",() => calculate());
    let resizeTimer;
    window.addEventListener("resize",() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => state.rows.length && drawChart(state.rows),120);
    });
  }

  function init() {
    restore();
    bind();
    calculate({ persist:false });
  }

  init();
})();
