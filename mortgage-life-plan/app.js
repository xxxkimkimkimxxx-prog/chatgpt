"use strict";

const COMPARISON_SOURCE = "https://diamond-fudosan.jp/articles/-/126846";

const banks = [
  { id:"mufg", name:"三菱UFJ銀行", category:"メガ・都市銀行", prefecture:"全国", region:"全国", rate:1.195, source:"https://www.bk.mufg.jp/kariru/jutaku/yuuguu/index.html", note:"ずーっと一律優遇コースの掲載値" },
  { id:"smbc", name:"三井住友銀行", category:"メガ・都市銀行", prefecture:"全国", region:"全国", rate:1.525, source:"https://www.smbc.co.jp/kojin/jutaku_loan/kinri/", note:"WEB申込専用・変動金利型の掲載値" },
  { id:"mizuho", name:"みずほ銀行", category:"メガ・都市銀行", prefecture:"全国", region:"全国", rate:1.025, source:"https://www.mizuhobank.co.jp/loan_housing/housingloancost/index.html", note:"新規借入の掲載最小値" },
  { id:"resona", name:"りそな銀行", category:"メガ・都市銀行", prefecture:"全国", region:"全国", rate:0.950, source:"https://www.resonabank.co.jp/kojin/jutaku/kinri/", note:"新規借入の掲載値" },
  { id:"saitama-resona", name:"埼玉りそな銀行", category:"メガ・都市銀行", prefecture:"埼玉県", region:"関東", rate:0.950, source:COMPARISON_SOURCE },

  { id:"docomo-smtb", name:"ドコモSMTBネット銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.750, source:COMPARISON_SOURCE },
  { id:"rakuten", name:"楽天銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.557, source:COMPARISON_SOURCE },
  { id:"aeon", name:"イオン銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.040, source:COMPARISON_SOURCE },
  { id:"sony", name:"ソニー銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.347, source:COMPARISON_SOURCE },
  { id:"jibun", name:"auじぶん銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.134, source:COMPARISON_SOURCE },
  { id:"paypay", name:"PayPay銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.330, source:COMPARISON_SOURCE },
  { id:"sbi-shinsei", name:"SBI新生銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:1.080, source:COMPARISON_SOURCE },
  { id:"ui", name:"UI銀行", category:"ネット銀行", prefecture:"全国", region:"全国", rate:0.845, source:COMPARISON_SOURCE },

  { id:"hokkaido", name:"北海道銀行", category:"地方銀行", prefecture:"北海道", region:"北海道", rate:1.825, source:COMPARISON_SOURCE },
  { id:"aomori-michinoku", name:"青森みちのく銀行", category:"地方銀行", prefecture:"青森県", region:"東北", rate:1.700, source:COMPARISON_SOURCE },
  { id:"akita", name:"秋田銀行", category:"地方銀行", prefecture:"秋田県", region:"東北", rate:1.050, source:COMPARISON_SOURCE },
  { id:"hokuto", name:"北都銀行", category:"地方銀行", prefecture:"秋田県", region:"東北", rate:3.375, source:COMPARISON_SOURCE },
  { id:"iwate", name:"岩手銀行", category:"地方銀行", prefecture:"岩手県", region:"東北", rate:1.500, source:COMPARISON_SOURCE },
  { id:"tohoku", name:"東北銀行", category:"地方銀行", prefecture:"岩手県", region:"東北", rate:1.400, source:COMPARISON_SOURCE },
  { id:"77", name:"七十七銀行", category:"地方銀行", prefecture:"宮城県", region:"東北", rate:0.810, source:COMPARISON_SOURCE },
  { id:"toho", name:"東邦銀行", category:"地方銀行", prefecture:"福島県", region:"東北", rate:1.600, source:COMPARISON_SOURCE },
  { id:"gunma", name:"群馬銀行", category:"地方銀行", prefecture:"群馬県", region:"関東", rate:1.395, source:COMPARISON_SOURCE },
  { id:"ashikaga", name:"足利銀行", category:"地方銀行", prefecture:"栃木県", region:"関東", rate:1.275, source:COMPARISON_SOURCE },
  { id:"tsukuba", name:"筑波銀行", category:"地方銀行", prefecture:"茨城県", region:"関東", rate:1.250, source:COMPARISON_SOURCE },
  { id:"musashino", name:"武蔵野銀行", category:"地方銀行", prefecture:"埼玉県", region:"関東", rate:0.980, source:COMPARISON_SOURCE },
  { id:"chiba", name:"千葉銀行", category:"地方銀行", prefecture:"千葉県", region:"関東", rate:1.225, source:COMPARISON_SOURCE },
  { id:"yokohama", name:"横浜銀行", category:"地方銀行", prefecture:"神奈川県", region:"関東", rate:0.975, source:COMPARISON_SOURCE },
  { id:"chiba-kogyo", name:"千葉興業銀行", category:"地方銀行", prefecture:"千葉県", region:"関東", rate:1.425, source:COMPARISON_SOURCE },
  { id:"kiraboshi", name:"きらぼし銀行", category:"地方銀行", prefecture:"東京都", region:"関東", rate:1.120, source:COMPARISON_SOURCE },
  { id:"daishi-hokuetsu", name:"第四北越銀行", category:"地方銀行", prefecture:"新潟県", region:"甲信越", rate:0.900, source:COMPARISON_SOURCE },
  { id:"yamanashi-chuo", name:"山梨中央銀行", category:"地方銀行", prefecture:"山梨県", region:"甲信越", rate:1.275, source:COMPARISON_SOURCE },
  { id:"82-nagano", name:"八十二長野銀行", category:"地方銀行", prefecture:"長野県", region:"甲信越", rate:1.250, source:COMPARISON_SOURCE },
  { id:"hokuriku", name:"北陸銀行", category:"地方銀行", prefecture:"富山県", region:"北陸", rate:1.625, source:COMPARISON_SOURCE },
  { id:"toyama", name:"富山銀行", category:"地方銀行", prefecture:"富山県", region:"北陸", rate:1.875, source:COMPARISON_SOURCE },
  { id:"hokkoku", name:"北國銀行", category:"地方銀行", prefecture:"石川県", region:"北陸", rate:2.225, source:COMPARISON_SOURCE },
  { id:"fukui", name:"福井銀行", category:"地方銀行", prefecture:"福井県", region:"北陸", rate:1.875, source:COMPARISON_SOURCE },
  { id:"shizuoka", name:"静岡銀行", category:"地方銀行", prefecture:"静岡県", region:"東海", rate:1.150, source:COMPARISON_SOURCE },
  { id:"suruga", name:"スルガ銀行", category:"地方銀行", prefecture:"静岡県", region:"東海", rate:1.325, source:COMPARISON_SOURCE },
  { id:"ogaki", name:"大垣共立銀行", category:"地方銀行", prefecture:"岐阜県", region:"東海", rate:1.275, source:COMPARISON_SOURCE },
  { id:"juroku", name:"十六銀行", category:"地方銀行", prefecture:"岐阜県", region:"東海", rate:1.475, source:COMPARISON_SOURCE },
  { id:"sanjusan", name:"三十三銀行", category:"地方銀行", prefecture:"三重県", region:"東海", rate:1.250, source:COMPARISON_SOURCE },
  { id:"hyakugo", name:"百五銀行", category:"地方銀行", prefecture:"三重県", region:"東海", rate:1.450, source:COMPARISON_SOURCE },
  { id:"shiga", name:"滋賀銀行", category:"地方銀行", prefecture:"滋賀県", region:"近畿", rate:1.000, source:COMPARISON_SOURCE },
  { id:"kyoto", name:"京都銀行", category:"地方銀行", prefecture:"京都府", region:"近畿", rate:1.425, source:COMPARISON_SOURCE },
  { id:"kansai-mirai", name:"関西みらい銀行", category:"地方銀行", prefecture:"大阪府", region:"近畿", rate:0.845, source:COMPARISON_SOURCE },
  { id:"ikeda-senshu", name:"池田泉州銀行", category:"地方銀行", prefecture:"大阪府", region:"近畿", rate:0.890, source:COMPARISON_SOURCE },
  { id:"nanto", name:"南都銀行", category:"地方銀行", prefecture:"奈良県", region:"近畿", rate:0.875, source:COMPARISON_SOURCE },
  { id:"kiyo", name:"紀陽銀行", category:"地方銀行", prefecture:"和歌山県", region:"近畿", rate:0.840, source:COMPARISON_SOURCE },
  { id:"tajima", name:"但馬銀行", category:"地方銀行", prefecture:"兵庫県", region:"近畿", rate:1.125, source:COMPARISON_SOURCE },
  { id:"tottori", name:"鳥取銀行", category:"地方銀行", prefecture:"鳥取県", region:"中国", rate:1.200, source:COMPARISON_SOURCE },
  { id:"sanin-godo", name:"山陰合同銀行", category:"地方銀行", prefecture:"島根県", region:"中国", rate:0.900, source:COMPARISON_SOURCE },
  { id:"chugoku", name:"中国銀行", category:"地方銀行", prefecture:"岡山県", region:"中国", rate:1.100, source:COMPARISON_SOURCE },
  { id:"hiroshima", name:"広島銀行", category:"地方銀行", prefecture:"広島県", region:"中国", rate:0.950, source:COMPARISON_SOURCE },
  { id:"yamaguchi", name:"山口銀行", category:"地方銀行", prefecture:"山口県", region:"中国", rate:1.125, source:COMPARISON_SOURCE },
  { id:"awa", name:"阿波銀行", category:"地方銀行", prefecture:"徳島県", region:"四国", rate:1.075, source:COMPARISON_SOURCE },
  { id:"hyakujushi", name:"百十四銀行", category:"地方銀行", prefecture:"香川県", region:"四国", rate:1.075, source:COMPARISON_SOURCE },
  { id:"iyo", name:"伊予銀行", category:"地方銀行", prefecture:"愛媛県", region:"四国", rate:0.950, source:"https://www.iyobank.co.jp/kinri-gaikokukawasesoba-market/monthly/kojinloankinri.html", note:"新変動金利型の掲載最小値" },
  { id:"shikoku", name:"四国銀行", category:"地方銀行", prefecture:"高知県", region:"四国", rate:1.075, source:COMPARISON_SOURCE },
  { id:"fukuoka", name:"福岡銀行", category:"地方銀行", prefecture:"福岡県", region:"九州", rate:1.275, source:COMPARISON_SOURCE },
  { id:"saga", name:"佐賀銀行", category:"地方銀行", prefecture:"佐賀県", region:"九州", rate:1.150, source:COMPARISON_SOURCE },
  { id:"18-shinwa", name:"十八親和銀行", category:"地方銀行", prefecture:"長崎県", region:"九州", rate:1.275, source:COMPARISON_SOURCE },
  { id:"higo", name:"肥後銀行", category:"地方銀行", prefecture:"熊本県", region:"九州", rate:1.125, source:COMPARISON_SOURCE },
  { id:"oita", name:"大分銀行", category:"地方銀行", prefecture:"大分県", region:"九州", rate:1.145, source:COMPARISON_SOURCE },
  { id:"miyazaki", name:"宮崎銀行", category:"地方銀行", prefecture:"宮崎県", region:"九州", rate:0.975, source:COMPARISON_SOURCE },
  { id:"kagoshima", name:"鹿児島銀行", category:"地方銀行", prefecture:"鹿児島県", region:"九州", rate:1.600, source:COMPARISON_SOURCE },
  { id:"ryukyu", name:"琉球銀行", category:"地方銀行", prefecture:"沖縄県", region:"沖縄", rate:3.575, source:COMPARISON_SOURCE },
  { id:"okinawa", name:"沖縄銀行", category:"地方銀行", prefecture:"沖縄県", region:"沖縄", rate:3.575, source:COMPARISON_SOURCE },
  { id:"nishi-nippon-city", name:"西日本シティ銀行", category:"地方銀行", prefecture:"福岡県", region:"九州", rate:1.125, source:COMPARISON_SOURCE },
  { id:"kitakyushu", name:"北九州銀行", category:"地方銀行", prefecture:"福岡県", region:"九州", rate:1.150, source:COMPARISON_SOURCE },

  { id:"hokuyo", name:"北洋銀行", category:"第二地方銀行", prefecture:"北海道", region:"北海道", rate:3.575, source:COMPARISON_SOURCE },
  { id:"kirayaka", name:"きらやか銀行", category:"第二地方銀行", prefecture:"山形県", region:"東北", rate:3.575, source:COMPARISON_SOURCE },
  { id:"kita-nihon", name:"北日本銀行", category:"第二地方銀行", prefecture:"岩手県", region:"東北", rate:1.500, source:COMPARISON_SOURCE },
  { id:"sendai", name:"仙台銀行", category:"第二地方銀行", prefecture:"宮城県", region:"東北", rate:1.500, source:COMPARISON_SOURCE },
  { id:"fukushima", name:"福島銀行", category:"第二地方銀行", prefecture:"福島県", region:"東北", rate:0.940, source:COMPARISON_SOURCE },
  { id:"daito", name:"大東銀行", category:"第二地方銀行", prefecture:"福島県", region:"東北", rate:1.100, source:COMPARISON_SOURCE },
  { id:"towa", name:"東和銀行", category:"第二地方銀行", prefecture:"群馬県", region:"関東", rate:1.125, source:COMPARISON_SOURCE },
  { id:"tochigi", name:"栃木銀行", category:"第二地方銀行", prefecture:"栃木県", region:"関東", rate:0.780, source:COMPARISON_SOURCE },
  { id:"keiyo", name:"京葉銀行", category:"第二地方銀行", prefecture:"千葉県", region:"関東", rate:1.475, source:COMPARISON_SOURCE },
  { id:"higashi-nihon", name:"東日本銀行", category:"第二地方銀行", prefecture:"東京都", region:"関東", rate:3.125, source:COMPARISON_SOURCE },
  { id:"tokyo-star", name:"東京スター銀行", category:"第二地方銀行", prefecture:"東京都", region:"関東", rate:2.150, source:COMPARISON_SOURCE },
  { id:"kanagawa", name:"神奈川銀行", category:"第二地方銀行", prefecture:"神奈川県", region:"関東", rate:1.325, source:COMPARISON_SOURCE },
  { id:"daiko", name:"大光銀行", category:"第二地方銀行", prefecture:"新潟県", region:"甲信越", rate:0.700, source:COMPARISON_SOURCE },
  { id:"toyama-daiichi", name:"富山第一銀行", category:"第二地方銀行", prefecture:"富山県", region:"北陸", rate:1.850, source:COMPARISON_SOURCE },
  { id:"shizuoka-chuo", name:"静岡中央銀行", category:"第二地方銀行", prefecture:"静岡県", region:"東海", rate:1.675, source:COMPARISON_SOURCE },
  { id:"aichi", name:"あいち銀行", category:"第二地方銀行", prefecture:"愛知県", region:"東海", rate:1.325, source:COMPARISON_SOURCE },
  { id:"nagoya", name:"名古屋銀行", category:"第二地方銀行", prefecture:"愛知県", region:"東海", rate:1.375, source:COMPARISON_SOURCE },
  { id:"minato", name:"みなと銀行", category:"第二地方銀行", prefecture:"兵庫県", region:"近畿", rate:0.845, source:COMPARISON_SOURCE },
  { id:"shimane", name:"島根銀行", category:"第二地方銀行", prefecture:"島根県", region:"中国", rate:3.375, source:COMPARISON_SOURCE },
  { id:"tomato", name:"トマト銀行", category:"第二地方銀行", prefecture:"岡山県", region:"中国", rate:1.050, source:COMPARISON_SOURCE },
  { id:"momiji", name:"もみじ銀行", category:"第二地方銀行", prefecture:"広島県", region:"中国", rate:0.980, source:COMPARISON_SOURCE },
  { id:"saikyo", name:"西京銀行", category:"第二地方銀行", prefecture:"山口県", region:"中国", rate:0.950, source:COMPARISON_SOURCE },
  { id:"tokushima-taisho", name:"徳島大正銀行", category:"第二地方銀行", prefecture:"徳島県", region:"四国", rate:0.895, source:COMPARISON_SOURCE },
  { id:"kagawa", name:"香川銀行", category:"第二地方銀行", prefecture:"香川県", region:"四国", rate:3.525, source:COMPARISON_SOURCE },
  { id:"ehime", name:"愛媛銀行", category:"第二地方銀行", prefecture:"愛媛県", region:"四国", rate:0.900, source:COMPARISON_SOURCE },
  { id:"kochi", name:"高知銀行", category:"第二地方銀行", prefecture:"高知県", region:"四国", rate:2.925, source:COMPARISON_SOURCE },
  { id:"fukuoka-chuo", name:"福岡中央銀行", category:"第二地方銀行", prefecture:"福岡県", region:"九州", rate:0.775, source:COMPARISON_SOURCE },
  { id:"nagasaki", name:"長崎銀行", category:"第二地方銀行", prefecture:"長崎県", region:"九州", rate:1.125, source:COMPARISON_SOURCE },
  { id:"kumamoto", name:"熊本銀行", category:"第二地方銀行", prefecture:"熊本県", region:"九州", rate:1.275, source:COMPARISON_SOURCE },
  { id:"howa", name:"豊和銀行", category:"第二地方銀行", prefecture:"大分県", region:"九州", rate:1.200, source:COMPARISON_SOURCE },
  { id:"miyazaki-taiyo", name:"宮崎太陽銀行", category:"第二地方銀行", prefecture:"宮崎県", region:"九州", rate:1.075, source:COMPARISON_SOURCE },
  { id:"minami-nippon", name:"南日本銀行", category:"第二地方銀行", prefecture:"鹿児島県", region:"九州", rate:1.300, source:COMPARISON_SOURCE },
  { id:"okinawa-kaiho", name:"沖縄海邦銀行", category:"第二地方銀行", prefecture:"沖縄県", region:"沖縄", rate:3.575, source:COMPARISON_SOURCE },

  { id:"chuo-rokin", name:"中央労働金庫", category:"労働金庫・その他", prefecture:"関東", region:"関東", rate:1.025, source:COMPARISON_SOURCE },
  { id:"hokkaido-rokin", name:"北海道労働金庫", category:"労働金庫・その他", prefecture:"北海道", region:"北海道", rate:3.575, source:COMPARISON_SOURCE },
  { id:"tohoku-rokin", name:"東北労働金庫", category:"労働金庫・その他", prefecture:"東北", region:"東北", rate:1.150, source:COMPARISON_SOURCE },
  { id:"niigata-rokin", name:"新潟県労働金庫", category:"労働金庫・その他", prefecture:"新潟県", region:"甲信越", rate:1.750, source:COMPARISON_SOURCE },
  { id:"nagano-rokin", name:"長野県労働金庫", category:"労働金庫・その他", prefecture:"長野県", region:"甲信越", rate:1.475, source:COMPARISON_SOURCE },
  { id:"shizuoka-rokin", name:"静岡県労働金庫", category:"労働金庫・その他", prefecture:"静岡県", region:"東海", rate:1.175, source:COMPARISON_SOURCE },
  { id:"hokuriku-rokin", name:"北陸労働金庫", category:"労働金庫・その他", prefecture:"北陸", region:"北陸", rate:2.925, source:COMPARISON_SOURCE },
  { id:"tokai-rokin", name:"東海労働金庫", category:"労働金庫・その他", prefecture:"東海", region:"東海", rate:1.490, source:COMPARISON_SOURCE },
  { id:"kinki-rokin", name:"近畿労働金庫", category:"労働金庫・その他", prefecture:"近畿", region:"近畿", rate:1.235, source:COMPARISON_SOURCE },
  { id:"kyushu-rokin", name:"九州労働金庫", category:"労働金庫・その他", prefecture:"九州", region:"九州", rate:1.050, source:COMPARISON_SOURCE },
  { id:"okinawa-rokin", name:"沖縄県労働金庫", category:"労働金庫・その他", prefecture:"沖縄県", region:"沖縄", rate:1.000, source:COMPARISON_SOURCE },
  { id:"ja-saitama", name:"JAバンク埼玉", category:"労働金庫・その他", prefecture:"埼玉県", region:"関東", rate:0.980, source:COMPARISON_SOURCE }
];

const $ = (id) => document.getElementById(id);
const state = { selectedBankId: "chugoku", visibleRows: 15 };

const yen = new Intl.NumberFormat("ja-JP", { style:"currency", currency:"JPY", maximumFractionDigits:0 });
const integer = new Intl.NumberFormat("ja-JP", { maximumFractionDigits:0 });

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function monthlyPayment(principal, annualRate, months) {
  if (months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * factor / (factor - 1);
}

function buildSchedule(principal, annualRate, months) {
  const payment = monthlyPayment(principal, annualRate, months);
  const monthlyRate = annualRate / 100 / 12;
  const rows = [];
  let balance = principal;
  for (let month = 1; month <= months; month += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principalPart = month === months ? balance : Math.min(balance, payment - interest);
    const actualPayment = principalPart + interest;
    balance = Math.max(0, balance - principalPart);
    rows.push({ month, payment:actualPayment, principal:principalPart, interest, balance });
  }
  return rows;
}

function getInputs() {
  return {
    principal: clampNumber($("loan-amount").value, 100, 30000, 4000) * 10000,
    years: clampNumber($("loan-years").value, 1, 50, 35),
    rate: clampNumber($("interest-rate").value, 0, 15, 1.1),
    income: clampNumber($("annual-income").value, 0, 100000, 0) * 10000
  };
}

function formatManYen(value) {
  return `${integer.format(Math.ceil(value / 10000))}万円`;
}

function selectedBank() {
  return banks.find((bank) => bank.id === state.selectedBankId) || banks[0];
}

function populateBankSelect() {
  const categories = ["メガ・都市銀行", "ネット銀行", "地方銀行", "第二地方銀行", "労働金庫・その他"];
  const select = $("bank-select");
  select.innerHTML = "";
  categories.forEach((category) => {
    const group = document.createElement("optgroup");
    group.label = category;
    banks.filter((bank) => bank.category === category).sort((a,b) => a.name.localeCompare(b.name,"ja")).forEach((bank) => {
      const option = document.createElement("option");
      option.value = bank.id;
      option.textContent = `${bank.name}（年${bank.rate.toFixed(3)}%）`;
      group.appendChild(option);
    });
    select.appendChild(group);
  });
  select.value = state.selectedBankId;
}

function applyBank(bankId, scroll = false) {
  const bank = banks.find((item) => item.id === bankId);
  if (!bank) return;
  state.selectedBankId = bank.id;
  $("bank-select").value = bank.id;
  $("interest-rate").value = bank.rate.toFixed(3);
  updateAll();
  if (scroll) window.scrollTo({ top:0, behavior:"smooth" });
}

function updateBankMeta() {
  const bank = selectedBank();
  const official = bank.source !== COMPARISON_SOURCE;
  $("selected-bank-meta").innerHTML = `
    <span class="tag">${bank.category}</span>
    <span>主なエリア：${bank.prefecture}</span>
    <a href="${bank.source}" target="_blank" rel="noopener">${official ? "公式金利ページ" : "比較データ出典"} ↗</a>
  `;
}

function updateResult() {
  const input = getInputs();
  const months = Math.round(input.years * 12);
  const schedule = buildSchedule(input.principal, input.rate, months);
  const first = schedule[0];
  const monthly = first.payment;
  const total = schedule.reduce((sum,row) => sum + row.payment, 0);
  const totalInterest = schedule.reduce((sum,row) => sum + row.interest, 0);
  const annualPayment = monthly * 12;
  const burden = input.income > 0 ? annualPayment / input.income * 100 : 0;
  const principalRatio = monthly > 0 ? first.principal / monthly * 100 : 0;
  const interestRatio = 100 - principalRatio;
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + months);

  $("monthly-payment").textContent = yen.format(monthly);
  $("monthly-change").textContent = `${selectedBank().name}・年${input.rate.toFixed(3)}%で試算`;
  $("first-principal").textContent = `${yen.format(first.principal)} (${principalRatio.toFixed(1)}%)`;
  $("first-interest").textContent = `${yen.format(first.interest)} (${interestRatio.toFixed(1)}%)`;
  $("principal-meter").style.width = `${principalRatio}%`;
  $("interest-meter").style.width = `${interestRatio}%`;
  $("total-payment").textContent = formatManYen(total);
  $("total-interest").textContent = formatManYen(totalInterest);
  $("burden-ratio").textContent = input.income > 0 ? `${burden.toFixed(1)}%` : "年収未入力";
  $("payoff-date").textContent = `${payoff.getFullYear()}年${payoff.getMonth()+1}月`;

  const recommended = annualPayment / 0.25;
  $("recommended-income").textContent = formatManYen(recommended);
  $("income-20").textContent = `年収 ${formatManYen(annualPayment / 0.20)}〜`;
  $("income-25").textContent = `年収 ${formatManYen(annualPayment / 0.25)}〜`;
  $("income-35").textContent = `年収 ${formatManYen(annualPayment / 0.35)}〜`;

  const status = $("income-status");
  status.className = "income-status";
  if (input.income <= 0) status.textContent = "年収を入力";
  else if (burden <= 20) status.textContent = "ゆとりあり";
  else if (burden <= 25) status.textContent = "標準目安内";
  else if (burden <= 30) { status.textContent = "家計を確認"; status.classList.add("warn"); }
  else { status.textContent = "負担が大きめ"; status.classList.add("risk"); }

  const oneUp = monthlyPayment(input.principal, input.rate + 1, months);
  const twoUp = monthlyPayment(input.principal, input.rate + 2, months);
  $("stress-current").textContent = yen.format(monthly);
  $("stress-one").textContent = yen.format(oneUp);
  $("stress-two").textContent = yen.format(twoUp);
  $("stress-one-diff").textContent = `+${yen.format(oneUp-monthly)}/月`;
  $("stress-two-diff").textContent = `+${yen.format(twoUp-monthly)}/月`;

  updateSchedule(schedule);
  updateYearChart(schedule, input.years);
}

function updateSchedule(schedule) {
  $("schedule-body").innerHTML = schedule.slice(0,12).map((row) => `
    <tr>
      <td>${row.month}回目</td>
      <td>${yen.format(row.payment)}</td>
      <td>${yen.format(row.principal)}</td>
      <td>${yen.format(row.interest)}</td>
      <td>${yen.format(row.balance)}</td>
    </tr>
  `).join("");
}

function updateYearChart(schedule, years) {
  const markers = [1,5,10,15,20,25,30,35,40,45,50].filter((year) => year <= years);
  if (!markers.includes(years)) markers.push(years);
  const annual = markers.map((year) => {
    const start = (year - 1) * 12;
    const rows = schedule.slice(start, Math.min(start + 12, schedule.length));
    return {
      year,
      principal: rows.reduce((sum,row) => sum + row.principal,0),
      interest: rows.reduce((sum,row) => sum + row.interest,0)
    };
  });
  const maxTotal = Math.max(...annual.map((item) => item.principal + item.interest),1);
  $("year-chart").innerHTML = annual.map((item) => {
    const total = item.principal + item.interest;
    const totalHeight = total / maxTotal * 180;
    const principalHeight = total === 0 ? 0 : totalHeight * item.principal / total;
    const interestHeight = Math.max(0,totalHeight - principalHeight);
    return `
      <div class="year-bar" title="${item.year}年目：元本 ${yen.format(item.principal)} / 利息 ${yen.format(item.interest)}">
        <div class="bar-stack" aria-label="${item.year}年目の元本${yen.format(item.principal)}、利息${yen.format(item.interest)}">
          <i class="bar-principal" style="height:${principalHeight}px"></i>
          <i class="bar-interest" style="height:${interestHeight}px"></i>
        </div>
        <span>${item.year}年目</span>
        <small>利息 ${Math.round(item.interest/10000)}万</small>
      </div>`;
  }).join("");
}

function filteredBanks() {
  const query = $("bank-search").value.trim().toLowerCase();
  const category = $("category-filter").value;
  const region = $("region-filter").value;
  const sort = $("sort-filter").value;
  const input = getInputs();
  const months = Math.round(input.years * 12);
  const items = banks.filter((bank) => {
    const matchesQuery = !query || bank.name.toLowerCase().includes(query) || bank.prefecture.toLowerCase().includes(query);
    const matchesCategory = category === "all" || bank.category === category;
    const matchesRegion = region === "all" || bank.region === "全国" || bank.region === region;
    return matchesQuery && matchesCategory && matchesRegion;
  }).map((bank) => {
    const payment = monthlyPayment(input.principal, bank.rate, months);
    return { ...bank, payment, totalInterest:payment*months-input.principal };
  });
  items.sort((a,b) => {
    if (sort === "name") return a.name.localeCompare(b.name,"ja");
    if (sort === "rate") return a.rate - b.rate || a.name.localeCompare(b.name,"ja");
    return a.payment - b.payment || a.rate - b.rate;
  });
  return items;
}

function updateBankTable() {
  const items = filteredBanks();
  const visible = items.slice(0,state.visibleRows);
  $("bank-table-body").innerHTML = visible.map((bank,index) => `
    <tr class="${bank.id === state.selectedBankId ? "selected" : ""}">
      <td><span class="bank-name">${bank.name}<small>${index === 0 ? "表示条件内 最小返済" : "2026年9月掲載値"}</small></span></td>
      <td><span class="bank-meta">${bank.category}<small>${bank.prefecture}</small></span></td>
      <td class="rate-cell"><strong>${bank.rate.toFixed(3)}%</strong></td>
      <td><strong>${yen.format(bank.payment)}</strong></td>
      <td>${formatManYen(bank.totalInterest)}</td>
      <td><button type="button" class="select-bank" data-bank-id="${bank.id}">${bank.id === state.selectedBankId ? "選択中" : "この金利で試算"}</button></td>
    </tr>
  `).join("");

  $("result-count").textContent = `${items.length}機関中 ${Math.min(state.visibleRows,items.length)}機関を表示`;
  $("show-more").hidden = state.visibleRows >= items.length;
  if (items.length) {
    $("best-rate").textContent = `年${items[0].rate.toFixed(3)}%`;
    $("best-bank").textContent = items[0].name;
  } else {
    $("best-rate").textContent = "該当なし";
    $("best-bank").textContent = "条件を変更してください";
  }
}

function updateAll() {
  updateBankMeta();
  updateResult();
  updateBankTable();
  window.dispatchEvent(new Event("mortgagechange"));
}

function resetForm() {
  $("loan-amount").value = 4000;
  $("loan-years").value = 35;
  $("annual-income").value = 700;
  state.visibleRows = 15;
  applyBank("chugoku");
}

function bindEvents() {
  $("bank-select").addEventListener("change", (event) => applyBank(event.target.value));
  ["loan-amount","loan-years","interest-rate","annual-income"].forEach((id) => {
    $(id).addEventListener("input", updateAll);
  });
  ["bank-search","category-filter","region-filter","sort-filter"].forEach((id) => {
    $(id).addEventListener(id === "bank-search" ? "input" : "change", () => {
      state.visibleRows = 15;
      updateBankTable();
    });
  });
  $("bank-table-body").addEventListener("click", (event) => {
    const button = event.target.closest("[data-bank-id]");
    if (button) applyBank(button.dataset.bankId,true);
  });
  $("show-more").addEventListener("click", () => {
    state.visibleRows += 20;
    updateBankTable();
  });
  $("reset-button").addEventListener("click", resetForm);
}

function init() {
  $("bank-count").textContent = banks.length;
  populateBankSelect();
  bindEvents();
  applyBank(state.selectedBankId);
}

init();
