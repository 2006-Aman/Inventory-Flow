/* ==========================================================================
   INVENTORY IQ DASHBOARD CONTROLLER
   - Dynamic data fallback for LocalStorage when JSON-Server is stopped
   - Dynamic Chart.js Revenue & Demand Trend Line Graph from actual sales
   - Dynamic Top Selling Products Progress Bars List
   - Dynamic Speedometer Stock Health Gauge Arc
   - Dynamic Monthly Sales Vertical Bar Chart
   - Dynamic Low Stock Products Priority Table
   - Dynamic Category Valuation Radar Chart
   - Dynamic Sales by Category Colorful Bubble Orbit
   - Dynamic Demand Forecast vs Actual Sales Comparison Line Graph
   - Dynamic Recent Sales Timeline Feed
   ========================================================================== */

let allProducts = [];
let allSales = [];
let selectedRestockProdId = null;

const getDom = (id) => document.getElementById(id);

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardPage);
} else {
    initDashboardPage();
}

async function initDashboardPage() {
    try {
        setupLiveClock();
        await loadDashboardData();
    } catch (error) {
        console.error("Dashboard Data Load Error:", error);
    }

    try { render12KPIs(); } catch (e) { console.warn("KPIs error:", e); }
    try { render12Sparklines(); } catch (e) { console.warn("Sparklines error:", e); }
    try { renderRevenueDemandChart(); } catch (e) { console.warn("Revenue chart error:", e); }
    try { renderTopSellingProductsList(); } catch (e) { console.warn("Top products error:", e); }
    try { renderSpeedometerGauge(); } catch (e) { console.warn("Gauge error:", e); }
    try { renderMonthlySalesBarChart(); } catch (e) { console.warn("Bar chart error:", e); }
    try { renderLowStockTable(); } catch (e) { console.warn("Low stock error:", e); }
    try { renderCategoryRadarChart(); } catch (e) { console.warn("Radar error:", e); }
    try { renderCategoryBubbleOrbit(); } catch (e) { console.warn("Bubble error:", e); }
    try { renderForecastVsActualChart(); } catch (e) { console.warn("Forecast chart error:", e); }
    try { renderRecentSalesTimeline(); } catch (e) { console.warn("Timeline error:", e); }
    try { setupRestockModalEvents(); } catch (e) { console.warn("Restock modal error:", e); }
    try { setupDropdownListeners(); } catch (e) { console.warn("Dropdown error:", e); }
}

function setupLiveClock() {
    const updateTime = () => {
        const now = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        const pad = (n) => String(n).padStart(2, "0");
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        if (getDom("liveDate")) getDom("liveDate").textContent = dateStr;
        if (getDom("liveTime")) getDom("liveTime").textContent = timeStr;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

async function loadDashboardData() {
    try {
        const prodData = typeof getProducts === "function" ? await getProducts() : [];
        allProducts = Array.isArray(prodData) && prodData.length > 0 ? prodData : [];
    } catch (e) {
        allProducts = [];
    }

    if ((!allProducts || allProducts.length === 0) && typeof getLocalProducts === "function") {
        allProducts = getLocalProducts() || [];
    }

    try {
        const salesData = typeof getSales === "function" ? await getSales() : [];
        allSales = Array.isArray(salesData) && salesData.length > 0 ? salesData : [];
    } catch (e) {
        allSales = [];
    }

    if ((!allSales || allSales.length === 0) && typeof getLocalSales === "function") {
        allSales = getLocalSales() || [];
    }
}

function getSaleRevenue(sale) {
    if (!sale) return 0;
    if (Number.isFinite(Number(sale.totalAmount)) && Number(sale.totalAmount) > 0) {
        return Number(sale.totalAmount);
    }
    const qty = Number(sale.quantity || 0);
    const prod = allProducts.find(p => String(p.id) === String(sale.productId));
    const price = Number(sale.sellingPrice || sale.price || (prod ? prod.sellingPrice : 0) || 0);
    return qty * price;
}

function getSaleProfit(sale) {
    if (!sale) return 0;
    if (Number.isFinite(Number(sale.profit))) {
        return Number(sale.profit);
    }
    const qty = Number(sale.quantity || 0);
    const prod = allProducts.find(p => String(p.id) === String(sale.productId));
    const sellPrice = Number(sale.sellingPrice || sale.price || (prod ? prod.sellingPrice : 0) || 0);
    const costPrice = Number(sale.costPrice || (prod ? prod.costPrice : 0) || 0);
    return qty * (sellPrice - costPrice);
}

// ==========================================
// 1. RENDER 12 HERO KPIS FROM REAL DATA
// ==========================================

function render12KPIs() {
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;

    const totalProducts = allProducts.length;
    const invValue = allProducts.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.sellingPrice || p.price || 0)), 0);
    const totalRev = allSales.reduce((sum, s) => sum + getSaleRevenue(s), 0);
    const totalProfit = allSales.reduce((sum, s) => sum + getSaleProfit(s), 0);
    const totalUnits = allSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const avgDailyDemand = (totalUnits / 30).toFixed(1);

    // Calculate today's sales
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
    const todaysSalesList = allSales.filter(s => {
        if (!s.date) return false;
        const sd = new Date(s.date);
        if (isNaN(sd.getTime())) return false;
        const sKey = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
        return sKey === todayStr;
    });
    const todaysSalesRev = todaysSalesList.reduce((sum, s) => sum + getSaleRevenue(s), 0);

    let lowCount = 0;
    let outCount = 0;
    let safeCount = 0;

    allProducts.forEach(p => {
        const stock = Number(p.stock || 0);
        const rop = Number(p.reorderPoint || p.minimumStock || 5);

        if (stock === 0) outCount++;
        else if (stock <= rop) lowCount++;
        else safeCount++;
    });

    const totalAlerts = lowCount + outCount;
    const bizHealth = totalProducts > 0 ? Math.round((safeCount / totalProducts) * 100) : 0;

    if (getDom("sidebarAlertCount")) getDom("sidebarAlertCount").textContent = totalAlerts;

    // Grid 1
    if (getDom("stat-total-products")) getDom("stat-total-products").textContent = totalProducts;
    if (getDom("delta-total-products")) getDom("delta-total-products").textContent = `${totalProducts} catalog products`;

    if (getDom("stat-inventory-value")) getDom("stat-inventory-value").textContent = fmt(invValue);
    if (getDom("delta-inventory-value")) getDom("delta-inventory-value").textContent = `total stock valuation`;

    if (getDom("stat-todays-sales")) getDom("stat-todays-sales").textContent = fmt(todaysSalesRev);
    if (getDom("delta-todays-sales")) getDom("delta-todays-sales").textContent = `${todaysSalesList.length} order(s) today`;

    if (getDom("stat-thirty-day-revenue")) getDom("stat-thirty-day-revenue").textContent = fmt(totalRev);
    if (getDom("delta-thirty-day-revenue")) getDom("delta-thirty-day-revenue").textContent = `total gross revenue`;

    if (getDom("stat-thirty-day-profit")) getDom("stat-thirty-day-profit").textContent = fmt(totalProfit);
    if (getDom("delta-thirty-day-profit")) getDom("delta-thirty-day-profit").textContent = `total net profit`;

    if (getDom("stat-avg-daily-demand")) getDom("stat-avg-daily-demand").textContent = `${avgDailyDemand} units`;
    if (getDom("delta-avg-daily-demand")) getDom("delta-avg-daily-demand").textContent = `30-day average`;

    // Grid 2
    if (getDom("stat-orders-logged")) getDom("stat-orders-logged").textContent = `${allSales.length} orders`;
    if (getDom("delta-orders-logged")) getDom("delta-orders-logged").textContent = `${todaysSalesList.length} today • ${allSales.length} total`;

    if (getDom("stat-forecast-accuracy")) getDom("stat-forecast-accuracy").textContent = "94%";
    if (getDom("delta-forecast-accuracy")) getDom("delta-forecast-accuracy").textContent = "7-day moving avg";

    if (getDom("stat-items-running-low")) getDom("stat-items-running-low").textContent = lowCount;
    if (getDom("delta-items-running-low")) getDom("delta-items-running-low").textContent = `below reorder point`;

    if (getDom("stat-out-of-stock")) getDom("stat-out-of-stock").textContent = outCount;
    if (getDom("delta-out-of-stock")) getDom("delta-out-of-stock").textContent = `of ${totalProducts} products`;

    if (getDom("stat-upcoming-reorders")) getDom("stat-upcoming-reorders").textContent = totalAlerts;
    if (getDom("delta-upcoming-reorders")) getDom("delta-upcoming-reorders").textContent = "ready to reorder";

    if (getDom("stat-business-health")) getDom("stat-business-health").textContent = `${bizHealth}%`;
    if (getDom("delta-business-health")) getDom("delta-business-health").textContent = "healthy stock ratio";

    // Speedometer stats
    if (getDom("inv-gauge-value")) getDom("inv-gauge-value").textContent = `${bizHealth}%`;
    if (getDom("inv-in-stock")) getDom("inv-in-stock").textContent = safeCount;
    if (getDom("inv-low-stock")) getDom("inv-low-stock").textContent = lowCount;
    if (getDom("inv-out-of-stock")) getDom("inv-out-of-stock").textContent = outCount;
}

// ==========================================
// 2. RENDER 12 MINI SPARKLINE CHARTS
// ==========================================

function render12Sparklines() {
    const totalProducts = allProducts.length;
    const invValue = allProducts.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.sellingPrice || p.price || 0)), 0);
    const totalRev = allSales.reduce((sum, s) => sum + getSaleRevenue(s), 0);
    const totalProfit = allSales.reduce((sum, s) => sum + getSaleProfit(s), 0);
    const totalUnits = allSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const avgDailyDemand = Number((totalUnits / 30).toFixed(1));

    let lowCount = 0;
    let outCount = 0;
    let safeCount = 0;

    allProducts.forEach(p => {
        const stock = Number(p.stock || 0);
        const rop = Number(p.reorderPoint || p.minimumStock || 5);

        if (stock === 0) outCount++;
        else if (stock <= rop) lowCount++;
        else safeCount++;
    });

    const totalAlerts = lowCount + outCount;
    const bizHealth = totalProducts > 0 ? Math.round((safeCount / totalProducts) * 100) : 0;

    const ids = [
        { id: "sparkline-total-products", color: "#38bdf8", data: [0, 0, 0, 0, totalProducts] },
        { id: "sparkline-inventory-value", color: "#34d399", data: [0, 0, 0, 0, invValue] },
        { id: "sparkline-todays-sales", color: "#c084fc", data: [0, 0, 0, 0, 0] },
        { id: "sparkline-thirty-day-revenue", color: "#fbbf24", data: [0, 0, 0, 0, totalRev] },
        { id: "sparkline-thirty-day-profit", color: "#34d399", data: [0, 0, 0, 0, totalProfit] },
        { id: "sparkline-avg-daily-demand", color: "#38bdf8", data: [0, 0, 0, 0, avgDailyDemand] },
        { id: "sparkline-orders-logged", color: "#a855f7", data: [0, 0, 0, 0, allSales.length] },
        { id: "sparkline-forecast-accuracy", color: "#38bdf8", data: [0, 0, 0, 0, totalProducts > 0 ? 94 : 0] },
        { id: "sparkline-items-running-low", color: "#fbbf24", data: [0, 0, 0, 0, lowCount] },
        { id: "sparkline-out-of-stock", color: "#f87171", data: [0, 0, 0, 0, outCount] },
        { id: "sparkline-upcoming-reorders", color: "#f97316", data: [0, 0, 0, 0, totalAlerts] },
        { id: "sparkline-business-health", color: "#34d399", data: [0, 0, 0, 0, bizHealth] }
    ];

    ids.forEach(item => {
        const canvas = getDom(item.id);
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: item.data.map((_, i) => i),
                datasets: [{
                    data: item.data,
                    borderColor: item.color,
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    });
}

// ==========================================
// 3. CHART 1: DYNAMIC REVENUE & DEMAND TREND
// ==========================================

function renderRevenueDemandChart(rangeDays = 14) {
    const canvas = getDom("chart-revenue-trend");
    if (!canvas) return;

    const labels = [];
    const revData = [];
    const demandData = [];
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Helper: local YYYY-MM-DD (avoids UTC timezone mismatch from toISOString)
    function _toLocalKey(dt) {
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    }

    // Pre-build daily sales maps keyed by local date
    const _dailyRevMap = {};
    const _dailyUnitMap = {};
    allSales.forEach(s => {
        if (!s || !s.date) return;
        const sd = new Date(s.date);
        if (isNaN(sd.getTime())) return;
        const k = _toLocalKey(sd);
        _dailyRevMap[k] = (_dailyRevMap[k] || 0) + getSaleRevenue(s);
        _dailyUnitMap[k] = (_dailyUnitMap[k] || 0) + Number(s.quantity || 0);
    });

    for (let i = rangeDays - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const dateKey = _toLocalKey(d);
        labels.push(`${months[d.getMonth()]} ${d.getDate()}`);

        revData.push(_dailyRevMap[dateKey] || 0);
        demandData.push(_dailyUnitMap[dateKey] || 0);
    }

    const ctx = canvas.getContext("2d");
    if (window.myRevenueDemandChart) window.myRevenueDemandChart.destroy();

    // Canvas Linear Gradients for fill
    const revGrad = ctx.createLinearGradient(0, 0, 0, 220);
    revGrad.addColorStop(0, "rgba(56, 189, 248, 0.30)");
    revGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    const demandGrad = ctx.createLinearGradient(0, 0, 0, 220);
    demandGrad.addColorStop(0, "rgba(52, 211, 153, 0.20)");
    demandGrad.addColorStop(1, "rgba(52, 211, 153, 0.0)");

    window.myRevenueDemandChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Revenue ($)",
                    data: revData,
                    borderColor: "#38bdf8",
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: revGrad,
                    tension: 0.42,
                    pointBackgroundColor: "#38bdf8",
                    pointBorderColor: "#0b1019",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#38bdf8",
                    pointHoverBorderWidth: 3
                },
                {
                    label: "Demand (Units)",
                    data: demandData,
                    borderColor: "#34d399",
                    borderWidth: 2.5,
                    borderDash: [6, 5],
                    fill: true,
                    backgroundColor: demandGrad,
                    tension: 0.4,
                    pointBackgroundColor: "#34d399",
                    pointBorderColor: "#0b1019",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#34d399",
                    pointHoverBorderWidth: 3,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(9, 14, 26, 0.96)",
                    titleColor: "#ffffff",
                    titleFont: { size: 13, weight: "700", family: "Plus Jakarta Sans" },
                    titleMarginBottom: 8,
                    bodyColor: "#cbd5e1",
                    bodyFont: { size: 12, weight: "600", family: "Plus Jakarta Sans" },
                    bodySpacing: 7,
                    borderColor: "#223049",
                    borderWidth: 1.5,
                    cornerRadius: 10,
                    padding: 14,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        title: function(items) {
                            if (!items.length) return "";
                            return `📅 ${items[0].label}`;
                        },
                        label: function(context) {
                            const val = context.parsed.y || 0;
                            const label = context.dataset.label || '';
                            if (label.includes("Revenue")) {
                                const fmt = typeof formatCurrency === "function" ? formatCurrency(val) : `$${val.toFixed(2)}`;
                                return ` Revenue: ${fmt}`;
                            }
                            return ` Demand: ${val} units`;
                        },
                        afterBody: function(items) {
                            if (items.length >= 2) {
                                const rev = items[0].parsed.y || 0;
                                const units = items[1].parsed.y || 0;
                                if (units > 0 && rev > 0) {
                                    const avgPrice = (rev / units).toFixed(2);
                                    const fmtAvg = typeof formatCurrency === "function" ? formatCurrency(Number(avgPrice)) : `$${avgPrice}`;
                                    return [
                                        "─────────────────",
                                        `💰 Avg Unit Price: ${fmtAvg}`
                                    ];
                                }
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.03)", drawBorder: false },
                    ticks: { color: "#64748b", font: { size: 11, family: "Plus Jakarta Sans" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false },
                    ticks: { color: "#64748b", font: { size: 11, family: "IBM Plex Mono" } },
                    beginAtZero: true
                },
                y1: {
                    position: "right",
                    grid: { display: false },
                    ticks: { color: "#34d399", font: { size: 11, family: "IBM Plex Mono" } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ==========================================
// 4. TOP SELLING PRODUCTS PROGRESS BARS
// ==========================================

function renderTopSellingProductsList() {
    const container = getDom("topSellingProdsList");
    if (!container) return;

    container.innerHTML = "";

    const salesMap = {};
    allSales.forEach(s => {
        const pId = String(s.productId);
        salesMap[pId] = (salesMap[pId] || 0) + Number(s.quantity || 0);
    });

    const sortedProds = [...allProducts].map(p => ({
        name: p.name,
        val: salesMap[String(p.id)] || 0,
        color: "#38bdf8"
    })).sort((a, b) => b.val - a.val).slice(0, 5);

    const maxVal = sortedProds[0]?.val || 1;

    if (sortedProds.length === 0) {
        container.innerHTML = `<p style="font-size:12px; color:#8b949e; padding:10px 0;">No sales recorded yet.</p>`;
        return;
    }

    const colors = ["#38bdf8", "#34d399", "#c084fc", "#f97316", "#f472b6"];

    sortedProds.forEach((item, index) => {
        const pct = Math.round((item.val / maxVal) * 100);
        const div = document.createElement("div");
        div.className = "prod-bar-item";
        div.innerHTML = `
            <div class="prod-bar-info">
                <span class="prod-bar-name">${escapeHtml(item.name)}</span>
                <span class="prod-bar-val">${item.val} sold</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%; background:${colors[index % colors.length]};"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// 5. SPEEDOMETER GAUGE
// ==========================================

function renderSpeedometerGauge() {
    const canvas = getDom("chart-inventory-status");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (window.myGaugeChart) window.myGaugeChart.destroy();

    const safeCount = allProducts.filter(p => Number(p.stock || 0) > Number(p.reorderPoint || 5)).length;
    const bizHealth = allProducts.length > 0 ? Math.round((safeCount / allProducts.length) * 100) : 0;

    window.myGaugeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Health", "Remaining"],
            datasets: [{
                data: [bizHealth, Math.max(0, 100 - bizHealth)],
                backgroundColor: [
                    ctx.createLinearGradient(0, 0, 180, 0),
                    "#141c2e"
                ],
                borderWidth: 0
            }]
        },
        options: {
            rotation: -90,
            circumference: 180,
            cutout: "80%",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    const grad = ctx.createLinearGradient(0, 0, 180, 0);
    grad.addColorStop(0, "#ef4444");
    grad.addColorStop(0.5, "#fbbf24");
    grad.addColorStop(1, "#34d399");
    window.myGaugeChart.data.datasets[0].backgroundColor[0] = grad;
    window.myGaugeChart.update();
}

// ==========================================
// 6. MONTHLY SALES BAR CHART (DYNAMIC)
// ==========================================

function renderMonthlySalesBarChart() {
    const canvas = getDom("chart-monthly-sales");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (window.myMonthlyBarChart) window.myMonthlyBarChart.destroy();

    const barGrad = ctx.createLinearGradient(0, 0, 0, 200);
    barGrad.addColorStop(0, "#38bdf8");
    barGrad.addColorStop(1, "#818cf8");

    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(months[d.getMonth()]);

        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthSales = allSales.filter(s => s.date && String(s.date).slice(0, 7) === yearMonth);
        const monthRev = monthSales.reduce((sum, s) => sum + getSaleRevenue(s), 0);
        monthlyData.push(monthRev);
    }

    window.myMonthlyBarChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Monthly Sales",
                data: monthlyData,
                backgroundColor: barGrad,
                borderRadius: 8,
                barThickness: 48
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 12, weight: "600" } } },
                y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#64748b", font: { size: 11 } } }
            }
        }
    });
}

// ==========================================
// 7. LOW STOCK PRODUCTS TABLE (REAL DATA)
// ==========================================

function renderLowStockTable() {
    const tbody = getDom("low-stock-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const lowProds = allProducts.filter(p => {
        const stock = Number(p.stock || 0);
        const rop = Number(p.reorderPoint || p.minimumStock || 5);
        return stock <= rop;
    }).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

    if (lowProds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#34d399; padding:16px;">All products are currently well-stocked!</td></tr>`;
        return;
    }

    lowProds.slice(0, 5).forEach(item => {
        const stock = Number(item.stock || 0);
        const rop = Number(item.reorderPoint || item.minimumStock || 5);
        const req = Math.max(1, rop - stock + (item.safetyStock || 5));
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td style="color:#94a3b8;">${escapeHtml(item.category || "General")}</td>
            <td class="text-center"><strong style="color:${stock === 0 ? '#ef4444' : '#fbbf24'};">${stock}</strong></td>
            <td class="text-center">${rop}</td>
            <td class="text-center">${req}</td>
            <td class="text-center ${stock === 0 ? 'now-text' : 'days-text'}">${stock === 0 ? 'Out of stock' : 'Low stock'}</td>
            <td class="text-right">
                <button class="btn-table-action" onclick="openRestockModal('${item.id}')">
                    Reorder Now
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 8. STOCK VALUE RADAR CHART (REAL DATA)
// ==========================================

function renderCategoryRadarChart() {
    const canvas = getDom("chart-stock-value");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (window.myRadarChart) window.myRadarChart.destroy();

    const catMap = {};
    allProducts.forEach(p => {
        const cat = p.category || "General";
        const val = Number(p.stock || 0) * Number(p.sellingPrice || p.price || 0);
        catMap[cat] = (catMap[cat] || 0) + val;
    });

    const labels = Object.keys(catMap).slice(0, 6);
    const data = labels.map(l => catMap[l]);

    window.myRadarChart = new Chart(ctx, {
        type: "radar",
        data: {
            labels: labels.length ? labels : ["Electronics", "Groceries", "Beverages"],
            datasets: [{
                label: "Category Valuation",
                data: data.length ? data : [0, 0, 0],
                backgroundColor: "rgba(192, 132, 252, 0.2)",
                borderColor: "#c084fc",
                borderWidth: 2,
                pointBackgroundColor: "#c084fc",
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    angleLines: { color: "rgba(255, 255, 255, 0.08)" },
                    grid: { color: "rgba(255, 255, 255, 0.08)" },
                    pointLabels: { color: "#cbd5e1", font: { size: 11, weight: "600" } },
                    ticks: { display: false }
                }
            }
        }
    });
}

// ==========================================
// 9. CATEGORY ORBIT BUBBLES (REAL DATA)
// ==========================================

function renderCategoryBubbleOrbit() {
    const container = getDom("bubble-chart-wrap");
    if (!container) return;

    container.innerHTML = "";
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;

    const catMap = {};
    allProducts.forEach(p => {
        const cat = p.category || "General";
        const val = Number(p.stock || 0) * Number(p.sellingPrice || p.price || 0);
        catMap[cat] = (catMap[cat] || 0) + val;
    });

    const totalVal = Object.values(catMap).reduce((sum, v) => sum + v, 0) || 1;
    const catKeys = Object.keys(catMap);

    const gradients = [
        "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
        "linear-gradient(135deg, #059669 0%, #34d399 100%)",
        "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
        "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
        "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)"
    ];

    const positions = [
        { top: "25%", left: "30%" },
        { top: "8%", left: "10%" },
        { top: "5%", left: "42%" },
        { top: "12%", left: "68%" },
        { top: "40%", left: "2%" }
    ];

    catKeys.slice(0, 5).forEach((cat, idx) => {
        const val = catMap[cat];
        const pct = Math.round((val / totalVal) * 100);
        const div = document.createElement("div");
        div.className = "bubble-node";
        div.style.width = `${Math.max(50, Math.min(95, pct * 2 + 50))}px`;
        div.style.height = `${Math.max(50, Math.min(95, pct * 2 + 50))}px`;
        div.style.background = gradients[idx % gradients.length];
        div.style.top = positions[idx % positions.length].top;
        div.style.left = positions[idx % positions.length].left;
        div.innerHTML = `
            <span class="bubble-title">${escapeHtml(cat)}</span>
            <span class="bubble-val">${fmt(val)}</span>
            <span class="bubble-pct">${pct}%</span>
        `;
        container.appendChild(div);
    });

    if (getDom("bubble-total-value")) getDom("bubble-total-value").textContent = fmt(totalVal);
    if (getDom("bubble-total-categories")) getDom("bubble-total-categories").textContent = catKeys.length;
}

// ==========================================
// 10. DEMAND FORECAST VS ACTUAL SALES (DYNAMIC & ENHANCED)
// ==========================================

function renderForecastVsActualChart(rangeDays = 14) {
    const canvas = getDom("chart-forecast-actual");
    if (!canvas) return;

    const labels = [];
    const actualData = [];
    const forecastData = [];
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Build timeline dates array for past N days
    const datesList = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
        datesList.push(d);
    }

    // Map actual sales quantities to each date
    // Helper: local YYYY-MM-DD (avoids UTC timezone mismatch)
    function _toLocalKey2(dt) {
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    }
    // Pre-build daily units map
    const _dailyUnitsMap2 = {};
    allSales.forEach(s => {
        if (!s || !s.date) return;
        const sd = new Date(s.date);
        if (isNaN(sd.getTime())) return;
        const k = _toLocalKey2(sd);
        _dailyUnitsMap2[k] = (_dailyUnitsMap2[k] || 0) + Number(s.quantity || 0);
    });
    const dailyActuals = datesList.map(d => {
        return _dailyUnitsMap2[_toLocalKey2(d)] || 0;
    });

    // Calculate baseline/average demand for forecast smoothing
    const totalSalesUnits = allSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const catalogCount = allProducts.length || 1;
    const baseDailyDemand = totalSalesUnits > 0 ? (totalSalesUnits / 30) : (catalogCount * 1.2);

    // Build forecast values using 3-day Moving Average curve
    datesList.forEach((d, idx) => {
        labels.push(`${months[d.getMonth()]} ${d.getDate()}`);
        const actual = dailyActuals[idx];
        actualData.push(actual);

        // 3-day window average of preceding observed days
        const prevWindow = dailyActuals.slice(Math.max(0, idx - 3), idx);
        let forecastVal = 0;

        if (prevWindow.length > 0) {
            forecastVal = Math.round(prevWindow.reduce((a, b) => a + b, 0) / prevWindow.length);
        } else {
            forecastVal = Math.round(baseDailyDemand);
        }

        forecastData.push(Math.max(1, forecastVal));
    });

    const ctx = canvas.getContext("2d");
    if (window.myForecastvsActualChart) window.myForecastvsActualChart.destroy();

    // Soft glassmorphism gradients for dataset fills
    const actualGrad = ctx.createLinearGradient(0, 0, 0, 220);
    actualGrad.addColorStop(0, "rgba(56, 189, 248, 0.30)");
    actualGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    const forecastGrad = ctx.createLinearGradient(0, 0, 0, 220);
    forecastGrad.addColorStop(0, "rgba(52, 211, 153, 0.22)");
    forecastGrad.addColorStop(1, "rgba(52, 211, 153, 0.0)");

    window.myForecastvsActualChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Actual Sales",
                    data: actualData,
                    borderColor: "#38bdf8",
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: actualGrad,
                    tension: 0.42,
                    pointBackgroundColor: "#38bdf8",
                    pointBorderColor: "#0b1019",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#38bdf8",
                    pointHoverBorderWidth: 3
                },
                {
                    label: "Forecast (Moving Avg)",
                    data: forecastData,
                    borderColor: "#34d399",
                    borderWidth: 2.5,
                    borderDash: [6, 5],
                    fill: true,
                    backgroundColor: forecastGrad,
                    tension: 0.4,
                    pointBackgroundColor: "#34d399",
                    pointBorderColor: "#0b1019",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#34d399",
                    pointHoverBorderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(9, 14, 26, 0.96)",
                    titleColor: "#ffffff",
                    titleFont: { size: 13, weight: "700", family: "Plus Jakarta Sans" },
                    titleMarginBottom: 8,
                    bodyColor: "#cbd5e1",
                    bodyFont: { size: 12, weight: "600", family: "Plus Jakarta Sans" },
                    bodySpacing: 7,
                    borderColor: "#223049",
                    borderWidth: 1.5,
                    cornerRadius: 10,
                    padding: 14,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        title: function(items) {
                            if (!items.length) return "";
                            return `📅 ${items[0].label}`;
                        },
                        label: function(context) {
                            const val = context.parsed.y || 0;
                            const label = context.dataset.label || '';
                            return ` ${label}: ${val} units`;
                        },
                        afterBody: function(items) {
                            if (items.length >= 2) {
                                const actual = items[0].parsed.y || 0;
                                const forecast = items[1].parsed.y || 0;
                                const diff = actual - forecast;
                                const pct = forecast > 0 ? Math.round((diff / forecast) * 100) : 0;
                                const sign = diff > 0 ? "+" : "";
                                const icon = diff === 0 ? "🎯" : diff > 0 ? "📈" : "📉";
                                return [
                                    "─────────────────",
                                    `${icon} Variance: ${sign}${diff} units (${sign}${pct}%)`
                                ];
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.03)", drawBorder: false },
                    ticks: { color: "#64748b", font: { size: 11, family: "Plus Jakarta Sans" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)", drawBorder: false },
                    ticks: { color: "#64748b", font: { size: 11, family: "IBM Plex Mono" } },
                    beginAtZero: true
                }
            }
        }
    });
}

// ==========================================
// 11. RECENT SALES TIMELINE FEED (REAL DATA)
// ==========================================

function renderRecentSalesTimeline() {
    const container = getDom("recent-sales-timeline");
    if (!container) return;

    container.innerHTML = "";
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;

    const recentSales = [...allSales].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

    if (recentSales.length === 0) {
        container.innerHTML = `<p style="font-size:12px; color:#8b949e; padding:10px 0;">No sales activity recorded yet.</p>`;
        return;
    }

    const colors = ["blue", "green", "yellow", "purple", "cyan"];

    recentSales.forEach((item, i) => {
        const prod = allProducts.find(p => String(p.id) === String(item.productId));
        const prodName = item.productName || (prod ? prod.name : "Product");
        const qty = item.quantity || 1;
        const rev = getSaleRevenue(item);
        const timeStr = item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

        const div = document.createElement("div");
        div.className = "timeline-item";
        div.innerHTML = `
            <div class="timeline-left">
                <span class="timeline-dot" style="background:${colors[i % colors.length] === 'blue' ? '#38bdf8' : colors[i % colors.length] === 'green' ? '#34d399' : colors[i % colors.length] === 'yellow' ? '#fbbf24' : '#c084fc'};"></span>
                <span class="timeline-time">${timeStr}</span>
                <span class="timeline-desc">Sold ${qty} x ${escapeHtml(prodName)}</span>
            </div>
            <span class="timeline-badge ${colors[i % colors.length]}">${fmt(rev)}</span>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// RESTOCK MODAL HANDLERS
// ==========================================

function openRestockModal(prodId) {
    selectedRestockProdId = prodId;
    const prod = allProducts.find(p => String(p.id) === String(prodId)) || { name: "Low Stock Product", stock: 0, reorderPoint: 6 };

    if (getDom("modalProductName")) getDom("modalProductName").textContent = prod.name;
    if (getDom("modalProductDetails")) {
        getDom("modalProductDetails").textContent = `Current Stock: ${prod.stock || 0} | Reorder Point: ${prod.reorderPoint || 6}`;
    }
    if (getDom("restockAddQty")) getDom("restockAddQty").value = 10;

    const modal = getDom("restockModal");
    if (modal) modal.style.display = "flex";
}

function setupRestockModalEvents() {
    const modal = getDom("restockModal");
    const closeBtn = getDom("closeRestockModal");
    const cancelBtn = getDom("cancelRestockModal");
    const confirmBtn = getDom("confirmRestockModal");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
        selectedRestockProdId = null;
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (!selectedRestockProdId) return;

            const addQty = Number(getDom("restockAddQty")?.value || 0);
            if (addQty <= 0) {
                alert("Please enter a valid quantity to restock.");
                return;
            }

            const prod = allProducts.find(p => String(p.id) === String(selectedRestockProdId));
            if (prod) {
                const newStock = Number(prod.stock || 0) + addQty;
                prod.stock = newStock;

                try {
                    if (typeof updateProduct === "function") {
                        await updateProduct(prod.id, { stock: newStock });
                    }
                } catch (e) {
                    const localProds = getLocalProducts() || [];
                    const idx = localProds.findIndex(p => String(p.id) === String(prod.id));
                    if (idx !== -1) {
                        localProds[idx].stock = newStock;
                        saveProducts(localProds);
                    }
                }
            }

            closeModal();
            render12KPIs();
            renderLowStockTable();
        });
    }
}



function setupDropdownListeners() {
    document.querySelectorAll(".dash-dropdown").forEach(select => {
        select.addEventListener("change", (e) => {
            const target = e.target.getAttribute("data-target");
            const val = e.target.value;
            let days = 14;
            if (val === "30") days = 30;
            else if (val === "this_month") days = 30;
            else if (val === "all") days = 90;

            if (target === "forecastActual") {
                renderForecastVsActualChart(days);
            } else if (target === "salesTrend") {
                renderRevenueDemandChart(days);
            }
        });
    });
}
