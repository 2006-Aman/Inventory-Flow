/* ==========================================================================
   SALES HISTORY LEDGER CONTROLLER
   - Load sales from API & LocalStorage
   - Filter by Search term, Product, From Date, To Date
   - Pagination (15 items per page)
   - Export filtered transactions to CSV
   ========================================================================== */

let allSales = [];
let filteredSales = [];
let allProducts = [];
let currentPage = 1;
const itemsPerPage = 15;

const getDom = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", initSalesHistoryPage);

async function initSalesHistoryPage() {
    try {
        showMessage("Loading sales ledger...", "loading");

        await checkServerStatus();
        await loadProductsData();
        await loadSalesData();

        setupFilterListeners();
        setupCsvExport();
        hideMessage();
    } catch (error) {
        console.error("Sales History Init Error:", error);
        showMessage("Unable to load sales history ledger.", "error");
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

async function loadProductsData() {
    try {
        const data = await getProducts();
        allProducts = Array.isArray(data) ? data : [];
    } catch (e) {
        allProducts = getLocalProducts() || [];
    }
    populateProductFilter();
}

async function loadSalesData() {
    try {
        const data = typeof getSales === "function" ? await getSales() : [];
        allSales = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn("API sales load failed, fallback to LocalStorage:", e);
        allSales = getLocalSales() || [];
    }

    applyFilters();
}

function populateProductFilter() {
    const select = getDom("productFilter");
    if (!select) return;

    select.innerHTML = `<option value="">All Products</option>`;
    allProducts.forEach(prod => {
        const opt = document.createElement("option");
        opt.value = prod.id;
        opt.textContent = prod.name;
        select.appendChild(opt);
    });
}

// ==========================================
// FILTERING LOGIC
// ==========================================

function setupFilterListeners() {
    const searchInput = getDom("searchInput");
    const productFilter = getDom("productFilter");
    const fromDateFilter = getDom("fromDateFilter");
    const toDateFilter = getDom("toDateFilter");

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (productFilter) productFilter.addEventListener("change", applyFilters);
    if (typeof flatpickr !== "undefined") {
        if (fromDateFilter) {
            flatpickr(fromDateFilter, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d-m-Y",
                theme: "dark",
                onChange: () => applyFilters()
            });
        }
        if (toDateFilter) {
            flatpickr(toDateFilter, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d-m-Y",
                theme: "dark",
                onChange: () => applyFilters()
            });
        }
    } else {
        if (fromDateFilter) fromDateFilter.addEventListener("change", applyFilters);
        if (toDateFilter) toDateFilter.addEventListener("change", applyFilters);
    }
}



function applyFilters() {
    const searchVal = (getDom("searchInput")?.value || "").toLowerCase().trim();
    const productVal = getDom("productFilter")?.value || "";
    const fromVal = getDom("fromDateFilter")?.value || "";
    const toVal = getDom("toDateFilter")?.value || "";

    filteredSales = allSales.filter(sale => {
        // Search filter (Product name, Customer name, ID)
        const nameMatch = (sale.productName || "").toLowerCase().includes(searchVal);
        const custMatch = (sale.customer || "").toLowerCase().includes(searchVal);
        const idMatch = String(sale.id || "").toLowerCase().includes(searchVal);
        const matchesSearch = !searchVal || nameMatch || custMatch || idMatch;

        // Product filter
        const matchesProduct = !productVal || String(sale.productId) === String(productVal);

        // Date filters (YYYY-MM-DD)
        let matchesDate = true;
        if (sale.date) {
            const saleDateStr = sale.date.split(" ")[0]; // YYYY-MM-DD
            if (fromVal && saleDateStr < fromVal) matchesDate = false;
            if (toVal && saleDateStr > toVal) matchesDate = false;
        }

        return matchesSearch && matchesProduct && matchesDate;
    });

    currentPage = 1;
    renderSalesTable();
}

// ==========================================
// RENDER TABLE & PAGINATION
// ==========================================

function renderSalesTable() {
    const tbody = getDom("salesTableBody");
    const emptyState = getDom("emptySalesState");
    const tableEl = getDom("salesTable");
    const salesCountEl = getDom("salesCount");

    if (!tbody) return;

    if (salesCountEl) {
        salesCountEl.textContent = `${filteredSales.length} sale(s)`;
    }

    if (filteredSales.length === 0) {
        tbody.innerHTML = "";
        if (tableEl) tableEl.style.display = "none";
        if (emptyState) emptyState.style.display = "block";
        renderPagination(0);
        return;
    }

    if (tableEl) tableEl.style.display = "table";
    if (emptyState) emptyState.style.display = "none";

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredSales.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = "";
    pageItems.forEach(sale => {
        const qty = Number(sale.quantity || 1);
        const price = Number(sale.sellingPrice || 0);
        const profit = Number(sale.profit || 0);
        const total = price * qty;

        const dateParts = formatDisplayDate(sale.date);
        const prodId = sale.productId || sale.id || "—";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <span class="date-cell-main">${escapeHtml(dateParts.dateStr)}</span>
                <span class="date-cell-sub">${escapeHtml(dateParts.timeStr)}</span>
            </td>
            <td>
                <span class="product-cell-main">${escapeHtml(sale.productName || "Product")}</span>
                <span class="product-cell-sub">${escapeHtml(String(prodId))}</span>
            </td>
            <td>
                <span class="customer-text">${escapeHtml(sale.customer || "Walk-in Customer")}</span>
            </td>
            <td class="text-center">
                <span class="qty-badge">${qty}</span>
            </td>
            <td class="text-right">
                <span class="price-text">${formatCurrency(price)}</span>
            </td>
            <td class="text-right">
                <span class="profit-text">${formatCurrency(profit)}</span>
            </td>
            <td class="text-right">
                <span class="total-text">${formatCurrency(total)}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = getDom("paginationControls");
    if (!container) return;

    container.innerHTML = "";
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = `<i class="ph ph-caret-left"></i>`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderSalesTable();
        }
    });
    container.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `page-btn ${i === currentPage ? "active" : ""}`;
        btn.textContent = i;
        btn.addEventListener("click", () => {
            currentPage = i;
            renderSalesTable();
        });
        container.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = `<i class="ph ph-caret-right"></i>`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderSalesTable();
        }
    });
    container.appendChild(nextBtn);
}

// ==========================================
// EXPORT TO CSV
// ==========================================

function setupCsvExport() {
    const btn = getDom("exportCsvBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        if (filteredSales.length === 0) {
            alert("No sales transactions to export.");
            return;
        }

        const headers = ["Transaction ID", "Date", "Product Name", "Customer", "Quantity", "Selling Price", "Profit", "Total Amount"];
        const rows = filteredSales.map(s => [
            s.id || "",
            s.date || "",
            `"${(s.productName || "").replace(/"/g, '""')}"`,
            `"${(s.customer || "").replace(/"/g, '""')}"`,
            s.quantity || 0,
            s.sellingPrice || 0,
            s.profit || 0,
            (Number(s.sellingPrice || 0) * Number(s.quantity || 0))
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
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

function formatDisplayDate(dateStr) {
    if (!dateStr) return { dateStr: "—", timeStr: "" };
    const date = new Date(dateStr.replace(/-/g, "/"));
    if (isNaN(date.getTime())) return { dateStr: dateStr, timeStr: "" };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const tStr = `${hours}:${minutes} ${ampm}`;

    return { dateStr: dStr, timeStr: tStr };
}

function formatCurrency(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `₹${number.toFixed(2)}` : "₹0.00";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(msg, type) {
    const box = getDom("ledgerMessage");
    if (!box) return;
    box.textContent = msg;
    box.className = `ledger-message ${type}`;
}

function hideMessage() {
    const box = getDom("ledgerMessage");
    if (!box) return;
    box.textContent = "";
    box.className = "ledger-message";
}
