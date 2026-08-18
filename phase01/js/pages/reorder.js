/* ==========================================================================
   INVENTORY REORDER PLANNING CONTROLLER
   - Connects to Forecast Engine (calculateAllProductForecasts)
   - Calculates 4 KPI Cards: Safe Stock, Low Stock, Critical, Out of Stock
   - Renders Products Needing Reorder Table with Recommended Order & Status
   - Interactive + Restock Modal for instant inventory updates
   - Export CSV Functionality
   ========================================================================== */

let allProducts = [];
let allSales = [];
let forecastResults = [];
let activeRestockProduct = null;

const getDom = (id) => document.getElementById(id);

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReorderPage);
} else {
    initReorderPage();
}


async function initReorderPage() {
    try {
        await checkServerStatus();
        await loadDataAndRunEngine();
        setupModalEvents();
        setupCsvExport();
    } catch (error) {
        console.error("Reorder Page Init Error:", error);
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
    // 1. Fetch Products
    try {
        const prodData = await getProducts();
        allProducts = Array.isArray(prodData) ? prodData : [];
    } catch (e) {
        allProducts = getLocalProducts() || [];
    }

    // 2. Fetch Sales
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
        console.warn("Forecast Engine not loaded.");
        forecastResults = [];
    }

    // 4. Render UI
    renderKPIs();
    renderReorderTable();
}

// ==========================================
// 1. RENDER 4 KPI CARDS
// ==========================================

function renderKPIs() {
    let safeCount = 0;
    let lowStockCount = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;

    forecastResults.forEach(r => {
        const stock = Number(r.currentStock || 0);
        const rop = Number(r.reorderPoint || 0);
        const safety = Number(r.safetyStock || 0);
        const min = Number(r.minimumStock || 0);

        if (stock === 0) {
            outOfStockCount++;
        } else if (stock <= safety) {
            criticalCount++;
        } else if (stock <= rop || stock <= min) {
            lowStockCount++;
        } else {
            safeCount++;
        }
    });

    if (getDom("kpi-safe-count")) getDom("kpi-safe-count").textContent = safeCount.toLocaleString();
    if (getDom("kpi-lowstock-count")) getDom("kpi-lowstock-count").textContent = lowStockCount.toLocaleString();
    if (getDom("kpi-critical-count")) getDom("kpi-critical-count").textContent = criticalCount.toLocaleString();
    if (getDom("kpi-outofstock-count")) getDom("kpi-outofstock-count").textContent = outOfStockCount.toLocaleString();
}

// ==========================================
// 2. RENDER REORDER PRODUCTS TABLE
// ==========================================

function renderReorderTable() {
    const tbody = getDom("reorderTableBody");
    const emptyState = getDom("emptyReorderState");
    const tableEl = document.querySelector(".reorder-table");

    if (!tbody) return;
    tbody.innerHTML = "";

    if (forecastResults.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (tableEl) tableEl.style.display = "table";
    if (emptyState) emptyState.style.display = "none";

    // Sort table: Out of stock & Critical first, then low stock, then safe stock
    const sortedResults = [...forecastResults].sort((a, b) => {
        const priority = (r) => {
            if (r.currentStock === 0) return 1;
            if (r.currentStock <= r.safetyStock) return 2;
            if (r.currentStock <= r.reorderPoint) return 3;
            return 4;
        };
        return priority(a) - priority(b);
    });

    sortedResults.forEach(res => {
        const prod = allProducts.find(p => String(p.id) === String(res.productId)) || {};
        const skuCode = prod.sku || `SKU-${res.productId}`;
        const stock = Number(res.currentStock || 0);
        const rop = Number(res.reorderPoint || 0);
        const safety = Number(res.safetyStock || 0);

        // Recommended Order calculation
        let recOrder = 0;
        if (stock <= rop) {
            recOrder = Math.max(1, Math.round((rop + safety) - stock));
        }

        // Status Badge Logic
        let statusPillClass = "instock";
        let statusText = "In Stock";
        let statusSubText = `margin of ${stock - rop}`;

        if (stock === 0) {
            statusPillClass = "outofstock";
            statusText = "Out of Stock";
            statusSubText = "needs reorder";
        } else if (stock <= safety) {
            statusPillClass = "critical";
            statusText = "Critical Level";
            statusSubText = "needs reorder";
        } else if (stock <= rop) {
            statusPillClass = "lowstock";
            statusText = "Low Stock";
            statusSubText = "needs reorder";
        }

        const isReorderNeeded = stock <= rop;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="prod-name-text">${escapeHtml(res.productName)}</span>
                <span class="prod-sku-text">${escapeHtml(skuCode)}</span>
            </td>
            <td class="text-right ${stock === 0 ? 'stock-zero' : ''}"><strong>${stock}</strong></td>
            <td class="text-right">${rop}</td>
            <td class="text-right">${res.averageDailyDemand.toFixed(1)}</td>
            <td class="text-right">${res.leadTime} days</td>
            <td class="text-right">${res.safetyStock}</td>
            <td class="text-right rec-order-text">${recOrder > 0 ? recOrder : 0}</td>
            <td class="text-center">
                <div class="status-cell-wrapper">
                    <span class="status-pill ${statusPillClass}">${statusText}</span>
                    <span class="status-sub-text">${escapeHtml(statusSubText)}</span>
                </div>
            </td>
            <td class="text-center">
                <button type="button" class="btn-restock ${isReorderNeeded ? '' : 'outline'}" data-product-id="${res.productId}">
                    <i class="ph ph-plus"></i> Restock
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach click listeners to all Restock buttons
    document.querySelectorAll(".btn-restock").forEach(btn => {
        btn.addEventListener("click", () => {
            const pId = btn.getAttribute("data-product-id");
            openStockModal(pId);
        });
    });
}

// ==========================================
// 3. UPDATE STOCK MODAL POPUP
// ==========================================

function openStockModal(productId) {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    activeRestockProduct = product;
    const modal = getDom("stock-modal");
    const infoText = getDom("modalStockProductInfo");
    const qtyInput = getDom("stockAddQuantity");

    if (infoText) {
        infoText.innerHTML = `Product: <strong>${escapeHtml(product.name)}</strong><br>Currently <strong>${product.stock || 0}</strong> in stock.`;
    }

    if (qtyInput) {
        qtyInput.value = 10;
    }

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeStockModal() {
    const modal = getDom("stock-modal");
    if (modal) {
        modal.style.display = "none";
    }
    activeRestockProduct = null;
}

function setupModalEvents() {
    const closeBtn = getDom("closeStockModal");
    const cancelBtn = getDom("cancelStockModal");
    const saveBtn = getDom("saveStockModal");

    if (closeBtn) closeBtn.addEventListener("click", closeStockModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeStockModal);
    if (saveBtn) saveBtn.addEventListener("click", handleSaveStockUpdate);
}

async function handleSaveStockUpdate() {
    if (!activeRestockProduct) return;

    const qtyInput = getDom("stockAddQuantity");
    const addQty = Number(qtyInput?.value || 0);

    if (!Number.isInteger(addQty) || addQty <= 0) {
        alert("Please enter a valid positive quantity to restock.");
        return;
    }

    const currentStock = Number(activeRestockProduct.stock || 0);
    const newStock = currentStock + addQty;
    const minStock = activeRestockProduct.minimumStock ?? 5;
    const reorderPt = activeRestockProduct.reorderPoint ?? 0;

    const newStatus = typeof calculateStockStatus === "function" ?
        calculateStockStatus(newStock, minStock, reorderPt) : (newStock <= minStock ? "Low Stock" : "In Stock");

    const updatedProduct = {
        ...activeRestockProduct,
        stock: newStock,
        status: newStatus,
        updatedAt: formatDateTime(new Date())
    };

    const saveBtn = getDom("saveStockModal");
    try {
        if (saveBtn) saveBtn.disabled = true;

        // 1. Update JSON Server
        try {
            await updateProduct(activeRestockProduct.id, updatedProduct);
        } catch (err) {
            console.warn("API updateProduct failed, updating LocalStorage:", err);
        }

        // 2. Update LocalStorage
        const localProducts = getLocalProducts();
        const index = localProducts.findIndex(p => String(p.id) === String(activeRestockProduct.id));
        if (index !== -1) {
            localProducts[index] = { ...localProducts[index], ...updatedProduct };
        }
        saveProducts(localProducts);

        // 3. Update in-memory product
        const memIndex = allProducts.findIndex(p => String(p.id) === String(activeRestockProduct.id));
        if (memIndex !== -1) {
            allProducts[memIndex] = updatedProduct;
        }

        closeStockModal();

        // 4. Re-run Forecast Engine & Refresh UI
        forecastResults = calculateAllProductForecasts(allProducts, allSales, 7);
        renderKPIs();
        renderReorderTable();

    } catch (error) {
        console.error("Error updating stock:", error);
        alert("Unable to update stock level.");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// ==========================================
// 4. CSV EXPORT
// ==========================================

function setupCsvExport() {
    const btn = getDom("exportCsvBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        if (!forecastResults.length) {
            alert("No reorder data available to export.");
            return;
        }

        const headers = ["Product ID", "Product Name", "Current Stock", "Reorder Point", "Avg Daily Demand", "Lead Time", "Safety Stock", "Recommended Order", "Status"];
        const rows = forecastResults.map(r => {
            const stock = Number(r.currentStock || 0);
            const rop = Number(r.reorderPoint || 0);
            const safety = Number(r.safetyStock || 0);
            let recOrder = 0;
            if (stock <= rop) {
                recOrder = Math.max(1, Math.round((rop + safety) - stock));
            }

            return [
                r.productId,
                `"${(r.productName || "").replace(/"/g, '""')}"`,
                stock,
                rop,
                r.averageDailyDemand,
                r.leadTime,
                safety,
                recOrder,
                `"${r.status}"`
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `Reorder_Planning_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// ==========================================
// UTILITIES
// ==========================================

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
