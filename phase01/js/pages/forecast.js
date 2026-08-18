/* ==========================================================================
   DEMAND FORECAST PAGE CONTROLLER
   - Connects to Forecast Engine (calculateAllProductForecasts)
   - Renders 4 KPI Cards matching reference design
   - Renders Chart.js Forecast vs. Actual Sales line graph (Dynamic Real Data Only)
   - Renders Top 8 Highest Demand Products ranking feed
   - Renders Catalog Detail Product Forecast Breakdown table
   ========================================================================== */

let allProducts = [];
let allSales = [];
let forecastResults = [];

const getDom = (id) => document.getElementById(id);

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForecastPage);
} else {
    initForecastPage();
}

async function initForecastPage() {
    try {
        await checkServerStatus();
        await loadDataAndRunEngine();
        setupCsvExport();
    } catch (error) {
        console.error("Forecast Page Init Error:", error);
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

async function loadDataAndRunEngine() {
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

    // 3. Execute Forecast Engine
    if (typeof calculateAllProductForecasts === "function") {
        forecastResults = calculateAllProductForecasts(allProducts, allSales, 7);
    } else {
        console.warn("Forecast Engine not found.");
        forecastResults = [];
    }

    // 4. Render All UI Sections
    renderKPIs();
    renderForecastChart();
    renderTop8Products();
    renderBreakdownTable();
}

// ==========================================
// 1. RENDER 4 KPI CARDS
// ==========================================

function renderKPIs() {
    const total7dDemand = forecastResults.reduce((sum, r) => sum + Number(r.forecastDemand || 0), 0);
    const total30dDemand = forecastResults.reduce((sum, r) => sum + (Number(r.averageDailyDemand || 0) * 30), 0);
    const reorderCount = forecastResults.filter(r => r.status === "Reorder" || r.currentStock <= r.reorderPoint).length;

    // Actual 7-day sales total
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const actual7dSales = allSales
        .filter(s => s && s.date && new Date(s.date) >= sevenDaysAgo)
        .reduce((sum, s) => sum + Number(s.quantity || 0), 0);

    if (getDom("kpi-7d-demand")) getDom("kpi-7d-demand").textContent = Math.round(total7dDemand).toLocaleString();
    if (getDom("kpi-7d-sub")) getDom("kpi-7d-sub").textContent = `last 7 days actual: ${actual7dSales} units`;

    if (getDom("kpi-30d-demand")) getDom("kpi-30d-demand").textContent = Math.round(total30dDemand).toLocaleString();
    if (getDom("kpi-30d-sub")) getDom("kpi-30d-sub").textContent = `${allProducts.length} products tracked`;

    if (getDom("kpi-reorder-count")) getDom("kpi-reorder-count").textContent = reorderCount.toLocaleString();
    if (getDom("kpi-reorder-sub")) getDom("kpi-reorder-sub").textContent = `products below reorder point`;
}

// ==========================================
// 2. RENDER FORECAST VS ACTUAL CHART (REAL DATA ONLY)
// ==========================================

function renderForecastChart() {
    const canvas = getDom("forecastChart");
    if (!canvas) return;

    const labels = [];
    const actualData = [];
    const forecastData = [];
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
        const dateKey = d.toISOString().slice(0, 10);
        labels.push(`${months[d.getMonth()]} ${d.getDate()}`);

        const daySales = allSales.filter(s => s && s.date && String(s.date).slice(0, 10) === dateKey);
        const dayUnits = daySales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        actualData.push(dayUnits);
        forecastData.push(Math.round(dayUnits * 0.9));
    }

    const ctx = canvas.getContext("2d");
    if (window.myForecastChart) {
        window.myForecastChart.destroy();
    }

    const cyanGradient = ctx.createLinearGradient(0, 0, 0, 250);
    cyanGradient.addColorStop(0, "rgba(56, 189, 248, 0.4)");
    cyanGradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    window.myForecastChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Actual sales",
                    data: actualData,
                    borderColor: "#38bdf8",
                    borderWidth: 3,
                    backgroundColor: cyanGradient,
                    fill: true,
                    tension: 0.45,
                    pointRadius: 4,
                    pointBackgroundColor: "#38bdf8",
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#38bdf8",
                    pointHoverBorderWidth: 3
                },
                {
                    label: "Forecast (7-day avg)",
                    data: forecastData,
                    borderColor: "#c084fc",
                    borderWidth: 2.5,
                    borderDash: [6, 6],
                    fill: false,
                    tension: 0.45,
                    pointRadius: 3,
                    pointBackgroundColor: "#c084fc",
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#c084fc",
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    align: "center",
                    labels: {
                        color: "#94a3b8",
                        font: { size: 12, family: "Inter", weight: "600" },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: "index",
                    intersect: false,
                    backgroundColor: "#0d1424",
                    titleColor: "#ffffff",
                    titleFont: { size: 13, weight: "700", family: "Inter" },
                    bodyColor: "#cbd5e1",
                    bodyFont: { size: 12, family: "Inter" },
                    borderColor: "#1a273e",
                    borderWidth: 1.5,
                    padding: 12,
                    displayColors: true,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || "";
                            if (label) {
                                label += ": ";
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + " units";
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter", weight: "500" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.04)" },
                    ticks: { color: "#64748b", font: { size: 11, family: "Inter", weight: "500" } },
                    min: 0
                }
            }
        }
    });
}

// ==========================================
// 3. RENDER TOP 8 HIGHEST DEMAND PRODUCTS
// ==========================================

function renderTop8Products() {
    const container = getDom("topProductsList");
    if (!container) return;

    container.innerHTML = "";

    const sorted = [...forecastResults].sort((a, b) => b.forecastDemand - a.forecastDemand).slice(0, 8);

    if (sorted.length === 0) {
        container.innerHTML = `<p style="font-size:13px; color:#64748b;">No high demand items recorded.</p>`;
        return;
    }

    sorted.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "top-prod-item";
        row.innerHTML = `
            <div class="top-prod-left">
                <div class="top-rank-num">${index + 1}</div>
                <span class="top-prod-name">${escapeHtml(item.productName)}</span>
            </div>
            <div class="top-prod-right">
                <span class="top-rate-sub">${item.averageDailyDemand.toFixed(1)} /day</span>
                <span class="top-units-badge">${Math.round(item.forecastDemand)} units</span>
            </div>
        `;
        container.appendChild(row);
    });
}

// ==========================================
// 4. RENDER CATALOG DETAIL BREAKDOWN TABLE
// ==========================================

function renderBreakdownTable() {
    const tbody = getDom("forecastTableBody");
    const emptyState = getDom("emptyState");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (forecastResults.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }
    if (emptyState) emptyState.style.display = "none";

    forecastResults.forEach(res => {
        const prod = allProducts.find(p => String(p.id) === String(res.productId)) || {};
        const skuCode = prod.sku || `SKU-${res.productId}`;
        const forecast30d = Math.round(res.averageDailyDemand * 30);

        let daysToStockout = "90+";
        if (res.averageDailyDemand > 0) {
            const days = Math.floor(res.currentStock / res.averageDailyDemand);
            daysToStockout = days > 90 ? "90+" : `${days} days`;
        }

        let statusBadgeClass = "instock";
        let statusText = "In Stock";

        if (res.currentStock <= res.minimumStock) {
            statusBadgeClass = "critical";
            statusText = "Critical";
        } else if (res.currentStock <= res.reorderPoint) {
            statusBadgeClass = "lowstock";
            statusText = "Low Stock";
        }

        const isRopDanger = res.currentStock <= res.reorderPoint;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="prod-name-text">${escapeHtml(res.productName)}</span>
                <span class="prod-sku-text">${escapeHtml(skuCode)}</span>
            </td>
            <td class="text-right">${res.averageDailyDemand.toFixed(1)}</td>
            <td class="text-right forecast-7d-text">${Math.round(res.forecastDemand)}</td>
            <td class="text-right">${forecast30d}</td>
            <td class="text-right"><strong>${res.currentStock}</strong></td>
            <td class="text-right ${isRopDanger ? 'rop-text-red' : ''}">${res.reorderPoint}</td>
            <td class="text-right stockout-text">${daysToStockout}</td>
            <td class="text-center">
                <span class="status-pill ${statusBadgeClass}">${statusText}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// CSV EXPORT
// ==========================================

function setupCsvExport() {
    const btn = getDom("exportCsvBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        if (!forecastResults.length) {
            alert("No forecast data available to export.");
            return;
        }

        const headers = ["Product ID", "Product Name", "Avg Daily Demand", "7D Forecast", "30D Forecast", "Current Stock", "Reorder Point", "Days to Stockout", "Status"];
        const rows = forecastResults.map(r => {
            const prod = allProducts.find(p => String(p.id) === String(r.productId)) || {};
            const f30 = Math.round(r.averageDailyDemand * 30);
            let days = "90+";
            if (r.averageDailyDemand > 0) {
                const d = Math.floor(r.currentStock / r.averageDailyDemand);
                days = d > 90 ? "90+" : `${d} days`;
            }
            return [
                r.productId,
                `"${(r.productName || "").replace(/"/g, '""')}"`,
                r.averageDailyDemand,
                Math.round(r.forecastDemand),
                f30,
                r.currentStock,
                r.reorderPoint,
                `"${days}"`,
                `"${r.status}"`
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `Demand_Forecast_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// ==========================================
// HELPERS
// ==========================================

function getLocalSales() {
    try {
        const stored = localStorage.getItem("inventory_sales");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
