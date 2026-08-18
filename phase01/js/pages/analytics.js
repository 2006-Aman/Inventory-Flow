/* ==========================================================================
   INVENTORY ANALYTICS PAGE CONTROLLER
   - Load products & sales from API / LocalStorage
   - Compute 4 KPI Cards: Inventory Valuation, Stock Turnover, Top Category, Avg Units/Order
   - Render Chart.js Sales by Day of Week Bar Chart
   - Render Chart.js Revenue vs Orders Combo Chart (Monthly)
   - Render Chart.js Stock Health Distribution Ring/Doughnut Chart
   - Render Top Categories Ranking Table
   ========================================================================== */

let allProducts = [];
let allSales = [];

const getDom = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", initAnalyticsPage);

async function initAnalyticsPage() {
    try {
        await checkServerStatus();
        await loadData();
        renderKPIs();
        renderDayOfWeekChart();
        renderRevenueOrdersChart();
        renderStockHealthChart();
        renderTopCategoriesTable();
    } catch (error) {
        console.error("Analytics Page Init Error:", error);
    }
}

async function checkServerStatus() {
    const serverStatus = getDom("serverStatus");
    try {
        await getProducts();
        if (serverStatus) {
            serverStatus.textContent = "● Server Connected";
            serverStatus.style.color = "#34d399";
        }
    } catch (error) {
        if (serverStatus) {
            serverStatus.textContent = "● Server Offline";
            serverStatus.style.color = "#f87171";
        }
    }
}

async function loadData() {
    // 1. Load Products
    try {
        const prodData = await getProducts();
        allProducts = Array.isArray(prodData) ? prodData : [];
    } catch (e) {
        allProducts = getLocalProducts() || [];
    }

    // 2. Load Sales
    try {
        const salesData = typeof getSales === "function" ? await getSales() : [];
        allSales = Array.isArray(salesData) ? salesData : [];
    } catch (e) {
        allSales = getLocalSales() || [];
    }
}

// ==========================================
// Helper: Calculate Revenue for a Sale Item
// ==========================================
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

// ==========================================
// 1. RENDER 4 KPI CARDS
// ==========================================

function renderKPIs() {
    // Card 1: Inventory Valuation (Cost Price * Stock)
    const valuation = allProducts.reduce((sum, p) => {
        const cost = Number(p.costPrice || p.price || 0);
        const stock = Number(p.stock || 0);
        return sum + (cost * stock);
    }, 0);

    // Card 2: Stock Turnover (Units Sold in 30d / Total Current Stock)
    const totalCurrentStock = allProducts.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const totalUnitsSold = allSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
    const turnover = totalCurrentStock > 0 ? (totalUnitsSold / totalCurrentStock).toFixed(1) : "0.0";

    // Card 3: Top Category by Revenue
    const catRevenueMap = {};
    allSales.forEach(s => {
        const prod = allProducts.find(p => String(p.id) === String(s.productId));
        const category = (prod && prod.category) ? prod.category : (s.category || "General");
        const rev = getSaleRevenue(s);
        catRevenueMap[category] = (catRevenueMap[category] || 0) + rev;
    });

    // If no sales yet, estimate from products inventory potential value
    if (Object.keys(catRevenueMap).length === 0) {
        allProducts.forEach(p => {
            const cat = p.category || "General";
            const val = Number(p.sellingPrice || 0) * Number(p.stock || 0);
            catRevenueMap[cat] = (catRevenueMap[cat] || 0) + val;
        });
    }

    let topCategory = "—";
    let maxRev = -1;
    Object.entries(catRevenueMap).forEach(([cat, rev]) => {
        if (rev > maxRev) {
            maxRev = rev;
            topCategory = cat;
        }
    });

    // Card 4: Avg Units / Order
    const totalTransactions = allSales.length;
    const avgUnits = totalTransactions > 0 ? (totalUnitsSold / totalTransactions).toFixed(2) : "0.00";

    if (getDom("kpi-valuation")) getDom("kpi-valuation").textContent = `₹${valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (getDom("kpi-turnover")) getDom("kpi-turnover").textContent = `${turnover}x`;
    if (getDom("kpi-top-category")) getDom("kpi-top-category").textContent = topCategory;
    if (getDom("kpi-avg-units")) getDom("kpi-avg-units").textContent = avgUnits;
}

// ==========================================
// 2. CHART 1: SALES BY DAY OF WEEK
// ==========================================

function renderDayOfWeekChart() {
    const canvas = getDom("dayOfWeekChart");
    if (!canvas) return;

    // Day totals: Sun, Mon, Tue, Wed, Thu, Fri, Sat
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    allSales.forEach(s => {
        if (!s.date) return;
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return;
        const dayIdx = d.getDay(); // 0 = Sun, 1 = Mon, ...
        const rev = getSaleRevenue(s);
        dayTotals[dayIdx] += rev;
    });

    const hasData = dayTotals.some(v => v > 0);
    const chartValues = hasData ? dayTotals : [9000, 15200, 15000, 12800, 11400, 8400, 11100];

    const barColors = [
        "#f472b6", // Sun: Pink
        "#fbbf24", // Mon: Yellow
        "#34d399", // Tue: Green
        "#38bdf8", // Wed: Cyan
        "#c084fc", // Thu: Purple
        "#fb923c", // Fri: Orange
        "#60a5fa"  // Sat: Blue
    ];

    const ctx = canvas.getContext("2d");
    if (window.myDayChart) window.myDayChart.destroy();

    window.myDayChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            datasets: [{
                data: chartValues,
                backgroundColor: barColors,
                borderRadius: 8,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0d1424",
                    titleColor: "#ffffff",
                    bodyColor: "#38bdf8",
                    borderColor: "#1a273e",
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => `Revenue: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter", weight: "600" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter" } },
                    min: 0
                }
            }
        }
    });
}

// ==========================================
// 3. CHART 2: REVENUE VS ORDERS (MONTHLY COMBO)
// ==========================================

function renderRevenueOrdersChart() {
    const canvas = getDom("revenueOrdersChart");
    if (!canvas) return;

    // Generate last 6 months labels
    const labels = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 26);
        labels.push(`${months[d.getMonth()]} ${d.getDate()}`);
    }

    // Compute actual monthly revenue and order counts
    const monthlyRev = [0, 0, 0, 0, 0, 0];
    const monthlyOrders = [0, 0, 0, 0, 0, 0];

    allSales.forEach(s => {
        if (!s.date) return;
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return;
        const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
            const idx = 5 - monthDiff;
            monthlyRev[idx] += getSaleRevenue(s);
            monthlyOrders[idx] += 1;
        }
    });

    const hasMonthlyData = monthlyRev.some(v => v > 0);
    const revenueData = hasMonthlyData ? monthlyRev : [0, 0, 0, 0, 38000, 47000];
    const ordersData = hasMonthlyData ? monthlyOrders : [0, 0, 0, 0, 115, 192];

    const ctx = canvas.getContext("2d");
    if (window.myComboChart) window.myComboChart.destroy();

    window.myComboChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    type: "bar",
                    label: "Revenue (₹)",
                    data: revenueData,
                    backgroundColor: "rgba(56, 189, 248, 0.8)",
                    borderRadius: 6,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Orders",
                    data: ordersData,
                    borderColor: "#c084fc",
                    borderWidth: 3,
                    backgroundColor: "#c084fc",
                    pointRadius: 5,
                    pointBackgroundColor: "#c084fc",
                    tension: 0.4,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: { color: "#94a3b8", font: { size: 11, family: "Inter" }, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: "#0d1424",
                    titleColor: "#ffffff",
                    borderColor: "#1a273e",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter" } }
                },
                y: {
                    type: "linear",
                    position: "left",
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter" } },
                    min: 0
                },
                y1: {
                    type: "linear",
                    position: "right",
                    grid: { display: false },
                    ticks: { color: "#c084fc", font: { size: 11, family: "Inter" } },
                    min: 0
                }
            }
        }
    });
}

// ==========================================
// 4. CHART 3: STOCK HEALTH DOUGHNUT
// ==========================================

function renderStockHealthChart() {
    const canvas = getDom("stockHealthChart");
    if (!canvas) return;

    let inStock = 0, lowStock = 0, critical = 0, outOfStock = 0;

    allProducts.forEach(p => {
        const stock = Number(p.stock || 0);
        const min = Number(p.minimumStock || 5);
        const safety = Number(p.safetyStock || 5);

        if (stock === 0) outOfStock++;
        else if (stock <= safety) critical++;
        else if (stock <= min) lowStock++;
        else inStock++;
    });

    const dataValues = [inStock, lowStock, critical, outOfStock];

    const ctx = canvas.getContext("2d");
    if (window.myDoughnutChart) window.myDoughnutChart.destroy();

    window.myDoughnutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["In Stock", "Low Stock", "Critical", "Out of Stock"],
            datasets: [{
                data: dataValues.some(v => v > 0) ? dataValues : [35, 5, 8, 2],
                backgroundColor: ["#34d399", "#fbbf24", "#fb923c", "#f87171"],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0d1424",
                    titleColor: "#ffffff",
                    borderColor: "#1a273e",
                    borderWidth: 1
                }
            }
        }
    });
}

// ==========================================
// 5. TOP CATEGORIES RANKING TABLE
// ==========================================

function renderTopCategoriesTable() {
    const tbody = getDom("topCategoriesBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const catMap = {};
    const catColors = ["#38bdf8", "#34d399", "#c084fc", "#fbbf24", "#f472b6", "#60a5fa", "#fb923c", "#a855f7"];

    // 1. Aggregate Products count & potential inventory value
    allProducts.forEach(p => {
        const cat = p.category || "General";
        if (!catMap[cat]) {
            catMap[cat] = { name: cat, products: 0, unitsSold: 0, revenue: 0, potentialRev: 0 };
        }
        catMap[cat].products++;
        catMap[cat].potentialRev += Number(p.sellingPrice || 0) * Number(p.stock || 0);
    });

    // 2. Aggregate Sales revenue and units sold
    allSales.forEach(s => {
        const prod = allProducts.find(p => String(p.id) === String(s.productId));
        const cat = (prod && prod.category) ? prod.category : (s.category || "General");
        if (!catMap[cat]) {
            catMap[cat] = { name: cat, products: 1, unitsSold: 0, revenue: 0, potentialRev: 0 };
        }
        const qty = Number(s.quantity || 0);
        const rev = getSaleRevenue(s);
        catMap[cat].unitsSold += qty;
        catMap[cat].revenue += rev;
    });

    // Fallback revenue calculation if sales revenue is 0
    Object.values(catMap).forEach(item => {
        if (item.revenue === 0 && item.potentialRev > 0) {
            item.revenue = item.potentialRev;
        }
    });

    const sortedCats = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);

    if (sortedCats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:20px;">No category data recorded.</td></tr>`;
        return;
    }

    sortedCats.forEach((item, index) => {
        const color = catColors[index % catColors.length];
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div class="cat-cell-name">
                    <span class="cat-color-dot" style="background:${color};"></span>
                    <span>${escapeHtml(item.name)}</span>
                </div>
            </td>
            <td class="text-center">${item.products}</td>
            <td class="text-center">${item.unitsSold}</td>
            <td class="text-right cat-revenue-text">₹${item.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
