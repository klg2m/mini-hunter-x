// ------------------------------
// Mini-Hunter X - Core Engine
// ------------------------------

let chart, candleSeries;

// ساخت چارت
function createChart() {
    const chartElement = document.getElementById("chart");

    chart = LightweightCharts.createChart(chartElement, {
        layout: {
            background: { color: "#000" },
            textColor: "#eee"
        },
        grid: {
            vertLines: { color: "#222" },
            horzLines: { color: "#222" }
        },
        width: chartElement.clientWidth,
        height: chartElement.clientHeight
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: "#0f0",
        downColor: "#f00",
        borderUpColor: "#0f0",
        borderDownColor: "#f00",
        wickUpColor: "#0f0",
        wickDownColor: "#f00"
    });
}

// دریافت داده از بایننس
async function fetchData(symbol, interval) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;

    const res = await fetch(url);
    const data = await res.json();

    return data.map(c => ({
        time: c[0] / 1000,
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4])
    }));
}

// آپدیت چارت
async function updateChart() {
    const symbol = document.getElementById("symbol").value;
    const interval = document.getElementById("interval").value;

    const candles = await fetchData(symbol, interval);
    candleSeries.setData(candles);

    runEngines(candles);
}

// اجرای اولیه
createChart();
updateChart();

// تغییر ارز یا تایم‌فریم
document.getElementById("symbol").addEventListener("change", updateChart);
document.getElementById("interval").addEventListener("change", updateChart);// ------------------------------
// بخش ۲ — Trend Engine + HeatScore + Signals
// ------------------------------

// محاسبه میانگین متحرک ساده
function SMA(data, length) {
    if (data.length < length) return null;
    const slice = data.slice(-length);
    const sum = slice.reduce((a, b) => a + b.close, 0);
    return sum / length;
}

// ------------------------------
// Trend Engine
// ------------------------------
function getTrend(candles) {
    const ma20 = SMA(candles, 20);
    const ma50 = SMA(candles, 50);

    if (!ma20 || !ma50) return "نامشخص";

    if (ma20 > ma50) return "صعودی";
    if (ma20 < ma50) return "نزولی";
    return "رنج";
}

// ------------------------------
// HeatScore (قدرت حرکت)
// ------------------------------
function getHeatScore(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;

    if (range === 0) return 0;

    const ratio = body / range;

    if (ratio > 0.7) return 90;
    if (ratio > 0.5) return 70;
    if (ratio > 0.3) return 50;
    return 20;
}

// ------------------------------
// Early Signal (هشدار زودهنگام)
// ------------------------------
function getEarlySignal(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    // کندل قوی صعودی
    if (last.close > last.open && last.close > prev.high) {
        return "هشدار صعودی";
    }

    // کندل قوی نزولی
    if (last.close < last.open && last.close < prev.low) {
        return "هشدار نزولی";
    }

    return "بدون هشدار";
}

// ------------------------------
// Prime Signal (سیگنال اصلی)
// ------------------------------
function getPrimeSignal(candles) {
    const trend = getTrend(candles);
    const heat = getHeatScore(candles);
    const last = candles[candles.length - 1];

    if (trend === "صعودی" && heat > 70 && last.close > last.open) {
        return "سیگنال خرید";
    }

    if (trend === "نزولی" && heat > 70 && last.close < last.open) {
        return "سیگنال فروش";
    }

    return "سیگنال ندارد";
}

// ------------------------------
// اجرای ماژول‌ها
// ------------------------------
function runEngines(candles) {
    document.getElementById("trend").innerText = getTrend(candles);
    document.getElementById("heat").innerText = getHeatScore(candles);
    document.getElementById("early").innerText = getEarlySignal(candles);
    document.getElementById("prime").innerText = getPrimeSignal(candles);
}// ------------------------------
// بخش ۳ — Volatility + Risk + Power + Probability
// ------------------------------

// ------------------------------
// Volatility Engine (نوسان‌سنج)
// ------------------------------
function getVolatility(candles) {
    const last = candles[candles.length - 1];
    const range = last.high - last.low;
    const close = last.close;

    const vol = (range / close) * 100;

    if (vol > 2) return "نوسان بالا";
    if (vol > 1) return "نوسان متوسط";
    return "نوسان کم";
}

// ------------------------------
// Risk Guard (محافظ ریسک)
// ------------------------------
function getRisk(candles) {
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);
    const wick = (last.high - last.low) - body;

    if (wick > body * 2) return "ریسک بالا";
    if (wick > body) return "ریسک متوسط";
    return "ریسک کم";
}

// ------------------------------
// Buyer/Seller Power (قدرت خریدار/فروشنده)
// ------------------------------
function getPower(candles) {
    const last = candles[candles.length - 1];

    const body = Math.abs(last.close - last.open);
    const upperWick = last.high - Math.max(last.close, last.open);
    const lowerWick = Math.min(last.close, last.open) - last.low;

    let buyer = 0;
    let seller = 0;

    if (last.close > last.open) buyer += body;
    else seller += body;

    buyer += lowerWick;
    seller += upperWick;

    return {
        buyer: buyer.toFixed(2),
        seller: seller.toFixed(2),
        lastCandle: last.close > last.open ? "صعودی" : "نزولی"
    };
}

// ------------------------------
// Probability Engine (احتمالات)
// ------------------------------
function getProbabilities(candles) {
    const trend = getTrend(candles);
    const heat = getHeatScore(candles);
    const vol = getVolatility(candles);

    let up = 33, down = 33, range = 33;

    if (trend === "صعودی") up += 20;
    if (trend === "نزولی") down += 20;

    if (heat > 70) {
        if (trend === "صعودی") up += 15;
        if (trend === "نزولی") down += 15;
    }

    if (vol === "نوسان کم") range += 20;

    return {
        up: Math.min(up, 95),
        down: Math.min(down, 95),
        range: Math.min(range, 95)
    };
}

// ------------------------------
// اتصال خروجی‌ها به صفحه
// ------------------------------
function runEngines(candles) {
    // بخش‌های قبلی
    document.getElementById("trend").innerText = getTrend(candles);
    document.getElementById("heat").innerText = getHeatScore(candles);
    document.getElementById("early").innerText = getEarlySignal(candles);
    document.getElementById("prime").innerText = getPrimeSignal(candles);

    // بخش ۳
    document.getElementById("volatility").innerText = getVolatility(candles);
    document.getElementById("risk").innerText = getRisk(candles);

    const power = getPower(candles);
    document.getElementById("buyer").innerText = power.buyer;
    document.getElementById("seller").innerText = power.seller;
    document.getElementById("last-candle").innerText = power.lastCandle;

    const prob = getProbabilities(candles);
    document.getElementById("prob-up").innerText = prob.up + "%";
    document.getElementById("prob-down").innerText = prob.down + "%";
    document.getElementById("prob-range").innerText = prob.range + "%";
            }// ------------------------------
// بخش ۴ — Zone + Momentum + Wick + S/R + Noise + MicroTrend
// ------------------------------

// ------------------------------
// Zone Engine (موقعیت قیمت)
// ------------------------------
function getZone(candles) {
    const last = candles[candles.length - 1];
    const high = last.high;
    const low = last.low;
    const close = last.close;

    const pos = (close - low) / (high - low);

    if (pos > 0.7) return "بالای محدوده (قدرت خریدار)";
    if (pos < 0.3) return "پایین محدوده (قدرت فروشنده)";
    return "میانه محدوده (رنج)";
}

// ------------------------------
// Momentum Engine (زاویه حرکت)
// ------------------------------
function getMomentum(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const diff = last.close - prev.close;

    if (diff > last.close * 0.01) return "مومنتوم مثبت";
    if (diff < -last.close * 0.01) return "مومنتوم منفی";
    return "مومنتوم خنثی";
}

// ------------------------------
// Wick Ratio (نسبت شدو)
// ------------------------------
function getWickRatio(candles) {
    const last = candles[candles.length - 1];

    const body = Math.abs(last.close - last.open);
    const wick = (last.high - last.low) - body;

    if (body === 0) return 0;

    return (wick / body).toFixed(2);
}

// ------------------------------
// Support / Resistance ساده
// ------------------------------
function getSupportResistance(candles) {
    const last20 = candles.slice(-20);

    const highs = last20.map(c => c.high);
    const lows = last20.map(c => c.low);

    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    return { support, resistance };
}

// ------------------------------
// Noise Filter (فیلتر نویز)
// ------------------------------
function getNoise(candles) {
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;

    if (range === 0) return "نویز بالا";

    const ratio = body / range;

    if (ratio < 0.2) return "نویز بالا";
    if (ratio < 0.4) return "نویز متوسط";
    return "نویز کم";
}

// ------------------------------
// Micro Trend (روند خرد)
// ------------------------------
function getMicroTrend(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    if (last.close > prev.close && prev.close > prev2.close) return "صعود خرد";
    if (last.close < prev.close && prev.close < prev2.close) return "نزول خرد";
    return "خنثی";
}

// ------------------------------
// اتصال خروجی‌ها به صفحه
// ------------------------------
function runEngines(candles) {
    // خروجی‌های قبلی
    document.getElementById("trend").innerText = getTrend(candles);
    document.getElementById("heat").innerText = getHeatScore(candles);
    document.getElementById("early").innerText = getEarlySignal(candles);
    document.getElementById("prime").innerText = getPrimeSignal(candles);

    const power = getPower(candles);
    document.getElementById("buyer").innerText = power.buyer;
    document.getElementById("seller").innerText = power.seller;
    document.getElementById("last-candle").innerText = power.lastCandle;

    const prob = getProbabilities(candles);
    document.getElementById("prob-up").innerText = prob.up + "%";
    document.getElementById("prob-down").innerText = prob.down + "%";
    document.getElementById("prob-range").innerText = prob.range + "%";

    // بخش ۴
    document.getElementById("zone").innerText = getZone(candles);
    document.getElementById("momentum").innerText = getMomentum(candles);
    document.getElementById("wick").innerText = getWickRatio(candles);

    const sr = getSupportResistance(candles);
    document.getElementById("support").innerText = sr.support.toFixed(2);
    document.getElementById("resistance").innerText = sr.resistance.toFixed(2);

    document.getElementById("noise").innerText = getNoise(candles);
    document.getElementById("microtrend").innerText = getMicroTrend(candles);
}// ------------------------------
// بخش ۴ — Zone + Momentum + Wick + S/R + Noise + MicroTrend
// ------------------------------

// ------------------------------
// Zone Engine (موقعیت قیمت)
// ------------------------------
function getZone(candles) {
    const last = candles[candles.length - 1];
    const high = last.high;
    const low = last.low;
    const close = last.close;

    const pos = (close - low) / (high - low);

    if (pos > 0.7) return "بالای محدوده (قدرت خریدار)";
    if (pos < 0.3) return "پایین محدوده (قدرت فروشنده)";
    return "میانه محدوده (رنج)";
}

// ------------------------------
// Momentum Engine (زاویه حرکت)
// ------------------------------
function getMomentum(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const diff = last.close - prev.close;

    if (diff > last.close * 0.01) return "مومنتوم مثبت";
    if (diff < -last.close * 0.01) return "مومنتوم منفی";
    return "مومنتوم خنثی";
}

// ------------------------------
// Wick Ratio (نسبت شدو)
// ------------------------------
function getWickRatio(candles) {
    const last = candles[candles.length - 1];

    const body = Math.abs(last.close - last.open);
    const wick = (last.high - last.low) - body;

    if (body === 0) return 0;

    return (wick / body).toFixed(2);
}

// ------------------------------
// Support / Resistance ساده
// ------------------------------
function getSupportResistance(candles) {
    const last20 = candles.slice(-20);

    const highs = last20.map(c => c.high);
    const lows = last20.map(c => c.low);

    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    return { support, resistance };
}

// ------------------------------
// Noise Filter (فیلتر نویز)
// ------------------------------
function getNoise(candles) {
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;

    if (range === 0) return "نویز بالا";

    const ratio = body / range;

    if (ratio < 0.2) return "نویز بالا";
    if (ratio < 0.4) return "نویز متوسط";
    return "نویز کم";
}

// ------------------------------
// Micro Trend (روند خرد)
// ------------------------------
function getMicroTrend(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    if (last.close > prev.close && prev.close > prev2.close) return "صعود خرد";
    if (last.close < prev.close && prev.close < prev2.close) return "نزول خرد";
    return "خنثی";
}

// ------------------------------
// اتصال خروجی‌ها به صفحه
// ------------------------------
function runEngines(candles) {
    // خروجی‌های قبلی
    document.getElementById("trend").innerText = getTrend(candles);
    document.getElementById("heat").innerText = getHeatScore(candles);
    document.getElementById("early").innerText = getEarlySignal(candles);
    document.getElementById("prime").innerText = getPrimeSignal(candles);

    const power = getPower(candles);
    document.getElementById("buyer").innerText = power.buyer;
    document.getElementById("seller").innerText = power.seller;
    document.getElementById("last-candle").innerText = power.lastCandle;

    const prob = getProbabilities(candles);
    document.getElementById("prob-up").innerText = prob.up + "%";
    document.getElementById("prob-down").innerText = prob.down + "%";
    document.getElementById("prob-range").innerText = prob.range + "%";

    // بخش ۴
    document.getElementById("zone").innerText = getZone(candles);
    document.getElementById("momentum").innerText = getMomentum(candles);
    document.getElementById("wick").innerText = getWickRatio(candles);

    const sr = getSupportResistance(candles);
    document.getElementById("support").innerText = sr.support.toFixed(2);
    document.getElementById("resistance").innerText = sr.resistance.toFixed(2);

    document.getElementById("noise").innerText = getNoise(candles);
    document.getElementById("microtrend").innerText = getMicroTrend(candles);
}// ------------------------------
// بخش ۵ — Strength + Impulse + MicroVolume + Confidence + Angle
// ------------------------------

// ------------------------------
// Strength Score (قدرت کلی)
// ------------------------------
function getStrengthScore(candles) {
    const trend = getTrend(candles);
    const heat = getHeatScore(candles);
    const momentum = getMomentum(candles);

    let score = 50;

    if (trend === "صعودی") score += 15;
    if (trend === "نزولی") score -= 15;

    if (heat > 70) score += 10;
    if (heat < 30) score -= 10;

    if (momentum === "مومنتوم مثبت") score += 10;
    if (momentum === "مومنتوم منفی") score -= 10;

    return Math.max(5, Math.min(score, 95));
}

// ------------------------------
// Impulse Engine (ضربه قیمتی)
// ------------------------------
function getImpulse(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const impulse = last.close - prev.close;

    if (impulse > last.close * 0.015) return "Impulse صعودی";
    if (impulse < -last.close * 0.015) return "Impulse نزولی";
    return "بدون Impulse";
}

// ------------------------------
// Micro Volume Engine (حجم خرد)
// ------------------------------
function getMicroVolume(candles) {
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);

    if (body > last.close * 0.01) return "حجم فعال";
    if (body > last.close * 0.005) return "حجم متوسط";
    return "حجم کم";
}

// ------------------------------
// Trend Confidence (اعتماد به روند)
// ------------------------------
function getTrendConfidence(candles) {
    const trend = getTrend(candles);
    const heat = getHeatScore(candles);
    const vol = getVolatility(candles);

    let conf = 50;

    if (trend === "صعودی") conf += 20;
    if (trend === "نزولی") conf += 20;

    if (heat > 70) conf += 15;
    if (vol === "نوسان کم") conf -= 10;

    return Math.min(conf, 95);
}

// ------------------------------
// Momentum Angle (زاویه حرکت)
// ------------------------------
function getMomentumAngle(candles) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const diff = last.close - prev.close;

    if (diff > last.close * 0.02) return "زاویه تند صعودی";
    if (diff > last.close * 0.01) return "زاویه ملایم صعودی";

    if (diff < -last.close * 0.02) return "زاویه تند نزولی";
    if (diff < -last.close * 0.01) return "زاویه ملایم نزولی";

    return "زاویه خنثی";
}

// ------------------------------
// اتصال خروجی‌ها به صفحه
// ------------------------------
function runEngines(candles) {
    // خروجی‌های قبلی
    document.getElementById("trend").innerText = getTrend(candles);
    document.getElementById("heat").innerText = getHeatScore(candles);
    document.getElementById("early").innerText = getEarlySignal(candles);
    document.getElementById("prime").innerText = getPrimeSignal(candles);

    const power = getPower(candles);
    document.getElementById("buyer").innerText = power.buyer;
    document.getElementById("seller").innerText = power.seller;
    document.getElementById("last-candle").innerText = power.lastCandle;

    const prob = getProbabilities(candles);
    document.getElementById("prob-up").innerText = prob.up + "%";
    document.getElementById("prob-down").innerText = prob.down + "%";
    document.getElementById("prob-range").innerText = prob.range + "%";

    document.getElementById("zone").innerText = getZone(candles);
    document.getElementById("momentum").innerText = getMomentum(candles);
    document.getElementById("wick").innerText = getWickRatio(candles);

    const sr = getSupportResistance(candles);
    document.getElementById("support").innerText = sr.support.toFixed(2);
    document.getElementById("resistance").innerText = sr.resistance.toFixed(2);

    document.getElementById("noise").innerText = getNoise(candles);
    document.getElementById("microtrend").innerText = getMicroTrend(candles);

    // بخش ۵
    document.getElementById("strength").innerText = getStrengthScore(candles);
    document.getElementById("impulse").innerText = getImpulse(candles);
    document.getElementById("microvol").innerText = getMicroVolume(candles);
    document.getElementById("confidence").innerText = getTrendConfidence(candles);
    document.getElementById("angle").innerText = getMomentumAngle(candles);
}
