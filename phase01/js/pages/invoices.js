/* ==========================================================================
   INVENTORY IQ INVOICE SYSTEM CONTROLLER
   - Load sales transactions and render invoice list ledger
   - Interactive Invoice Sheet Preview Modal with GST/Tax calculation
   - Print-ready PDF export support
   ========================================================================== */

let allSales = [];
let allProducts = [];
let filteredInvoices = [];
let currentPage = 1;
const itemsPerPage = 8;
let selectedSaleForInvoice = null;

const getDom = (id) => document.getElementById(id);

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInvoicesPage);
} else {
    initInvoicesPage();
}

async function initInvoicesPage() {
    try {
        setupLiveClock();
        await loadInvoiceData();
        setupFilters();
        setupInvoiceModal();
        setupCsvExport();
        
        // Auto-open invoice if saleId param exists in URL
        const urlParams = new URLSearchParams(window.location.search);
        const saleId = urlParams.get("saleId");
        if (saleId) {
            openInvoiceModal(saleId);
        }
    } catch (e) {
        console.error("Invoices Controller Init Error:", e);
    }
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

async function loadInvoiceData() {
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

    // Sort sales descending by date
    allSales.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Populate Product Filter Dropdown
    const prodFilter = getDom("productFilter");
    if (prodFilter) {
        prodFilter.innerHTML = '<option value="">All Products</option>';
        allProducts.forEach(p => {
            const opt = document.createElement("option");
            opt.value = String(p.id);
            opt.textContent = p.name;
            prodFilter.appendChild(opt);
        });
    }

    applyFilters();
    updateInvoiceStats();
}

function generateInvoiceNumber(sale, index) {
    if (!sale) return "INV-2026-0000";
    const cleanId = String(sale.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    const dateStr = sale.date ? sale.date.slice(0, 10).replace(/-/g, "") : "20260819";
    return `INV-${dateStr}-${cleanId}`;
}

function getSaleTotal(sale) {
    if (!sale) return 0;
    if (Number.isFinite(Number(sale.totalAmount)) && Number(sale.totalAmount) > 0) {
        return Number(sale.totalAmount);
    }
    const qty = Number(sale.quantity || 1);
    const prod = allProducts.find(p => String(p.id) === String(sale.productId));
    const price = Number(sale.sellingPrice || sale.price || (prod ? prod.sellingPrice : 0) || 0);
    return qty * price;
}

function applyFilters() {
    const searchVal = (getDom("searchInput")?.value || "").toLowerCase().trim();
    const prodId = getDom("productFilter")?.value || "";
    const fromDate = getDom("fromDateFilter")?.value || "";
    const toDate = getDom("toDateFilter")?.value || "";

    filteredInvoices = allSales.filter((s, i) => {
        const invNum = generateInvoiceNumber(s, i).toLowerCase();
        const cust = (s.customer || "Walk-in Customer").toLowerCase();
        const prod = (s.productName || "").toLowerCase();

        const matchesSearch = !searchVal || invNum.includes(searchVal) || cust.includes(searchVal) || prod.includes(searchVal);
        const matchesProd = !prodId || String(s.productId) === String(prodId);

        let matchesDate = true;
        if (s.date) {
            const sDate = s.date.slice(0, 10);
            if (fromDate && sDate < fromDate) matchesDate = false;
            if (toDate && sDate > toDate) matchesDate = false;
        }

        return matchesSearch && matchesProd && matchesDate;
    });

    currentPage = 1;
    renderInvoiceTable();
    updateInvoiceStats();
}

function setupFilters() {
    ["searchInput", "productFilter", "fromDateFilter", "toDateFilter"].forEach(id => {
        const el = getDom(id);
        if (el) {
            el.addEventListener("input", applyFilters);
            el.addEventListener("change", applyFilters);
        }
    });
}

function renderInvoiceTable() {
    const tbody = getDom("invoiceTableBody");
    const countEl = getDom("invoiceCount");
    const emptyState = getDom("emptyInvoiceState");
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;

    if (!tbody) return;
    tbody.innerHTML = "";

    if (countEl) countEl.textContent = `${filteredInvoices.length} invoice(s)`;

    if (filteredInvoices.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        renderPagination(0);
        return;
    }
    if (emptyState) emptyState.style.display = "none";

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredInvoices.slice(startIdx, startIdx + itemsPerPage);

    pageItems.forEach((sale, i) => {
        const globalIndex = startIdx + i;
        const invNum = generateInvoiceNumber(sale, globalIndex);
        const total = getSaleTotal(sale);
        const dateDisplay = sale.date ? new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Recently";
        const prod = allProducts.find(p => String(p.id) === String(sale.productId));
        const prodName = sale.productName || (prod ? prod.name : "Item");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong style="color:#38bdf8; font-family:var(--font-mono, monospace);">${invNum}</strong></td>
            <td>${dateDisplay}</td>
            <td><strong>${escapeHtml(sale.customer || "Walk-in Customer")}</strong></td>
            <td>${escapeHtml(prodName)}</td>
            <td class="text-center"><strong>${sale.quantity || 1}</strong></td>
            <td class="text-right"><strong>${fmt(total)}</strong></td>
            <td class="text-center"><span class="status-badge paid">PAID</span></td>
            <td class="text-right">
                <button type="button" class="btn-invoice-action" onclick="openInvoiceModal('${sale.id}')">
                    <i class="ph ph-file-text"></i> View Invoice
                </button>
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

    for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn-page ${p === currentPage ? 'active' : ''}`;
        btn.textContent = p;
        btn.addEventListener("click", () => {
            currentPage = p;
            renderInvoiceTable();
        });
        container.appendChild(btn);
    }
}

function openInvoiceModal(saleId) {
    const sale = allSales.find(s => String(s.id) === String(saleId)) || allSales[0];
    if (!sale) return;

    selectedSaleForInvoice = sale;
    const index = allSales.indexOf(sale);
    const invNum = generateInvoiceNumber(sale, index >= 0 ? index : 0);
    const prod = allProducts.find(p => String(p.id) === String(sale.productId));
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;

    const qty = Number(sale.quantity || 1);
    const unitPrice = Number(sale.sellingPrice || sale.price || (prod ? prod.sellingPrice : 0) || 0);
    const subtotal = qty * unitPrice;
    const tax = Number((subtotal * 0.18).toFixed(2));
    const grandTotal = subtotal + tax;

    const dateStr = sale.date ? new Date(sale.date).toLocaleDateString([], { dateStyle: 'full' }) : new Date().toLocaleDateString([], { dateStyle: 'full' });

    if (getDom("invModalNum")) getDom("invModalNum").textContent = invNum;
    if (getDom("sheetInvNum")) getDom("sheetInvNum").textContent = invNum;
    if (getDom("sheetInvDate")) getDom("sheetInvDate").textContent = `Issued: ${dateStr}`;

    if (getDom("sheetCustomerName")) getDom("sheetCustomerName").textContent = sale.customer || "Walk-in Customer";
    if (getDom("sheetCustomerContact")) getDom("sheetCustomerContact").textContent = sale.userEmail || "customer@inventoryflow.com";

    // Itemized table row
    const itemsTbody = getDom("sheetItemsBody");
    if (itemsTbody) {
        itemsTbody.innerHTML = `
            <tr>
                <td>1</td>
                <td><strong>${escapeHtml(sale.productName || (prod ? prod.name : "Product"))}</strong></td>
                <td>${escapeHtml(prod ? (prod.category || "General") : "General")}</td>
                <td class="text-center">${qty}</td>
                <td class="text-right">${fmt(unitPrice)}</td>
                <td class="text-right"><strong>${fmt(subtotal)}</strong></td>
            </tr>
        `;
    }

    if (getDom("sheetSubtotal")) getDom("sheetSubtotal").textContent = fmt(subtotal);
    if (getDom("sheetTax")) getDom("sheetTax").textContent = fmt(tax);
    if (getDom("sheetGrandTotal")) getDom("sheetGrandTotal").textContent = fmt(grandTotal);

    const modal = getDom("invoiceModal");
    if (modal) modal.style.display = "flex";
}

function setupInvoiceModal() {
    const modal = getDom("invoiceModal");
    const closeBtn = getDom("closeInvoiceModal");
    const printBtn = getDom("printInvoiceBtn");

    const closeModal = () => {
        if (modal) modal.style.display = "none";
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }
}

function updateInvoiceStats() {
    const total = filteredInvoices.length;
    let totalRevenue = 0;
    filteredInvoices.forEach(s => { totalRevenue += getSaleTotal(s); });
    const avg = total > 0 ? totalRevenue / total : 0;
    const fmt = typeof formatCurrency === "function" ? formatCurrency : (v) => `$${v.toFixed(2)}`;
    const el = (id) => getDom(id);
    if (el("invStatTotal")) el("invStatTotal").textContent = total;
    if (el("invStatRevenue")) el("invStatRevenue").textContent = fmt(totalRevenue);
    if (el("invStatAvg")) el("invStatAvg").textContent = fmt(avg);
    if (el("invStatPaid")) el("invStatPaid").textContent = total;
}

function setupCsvExport() {
    const btn = getDom("exportCsvBtn");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
        e.preventDefault();

        if (filteredInvoices.length === 0) {
            alert("No invoices to export.");
            return;
        }

        try {
            const headers = ["Invoice #", "Date", "Customer", "Product", "Quantity", "Total Amount", "Status"];
            const rows = filteredInvoices.map((s, i) => {
                const globalIndex = allSales.indexOf(s);
                const prod = allProducts.find(p => String(p.id) === String(s.productId));
                return [
                    generateInvoiceNumber(s, globalIndex >= 0 ? globalIndex : i),
                    s.date || "",
                    `"${(s.customer || "Walk-in Customer").replace(/"/g, '""')}"`,
                    `"${(s.productName || (prod ? prod.name : "Item")).replace(/"/g, '""')}"`,
                    s.quantity || 1,
                    getSaleTotal(s).toFixed(2),
                    "PAID"
                ];
            });

            const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "Invoices_" + new Date().toISOString().slice(0, 10) + ".csv";
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error("CSV Export Error:", err);
            alert("Failed to export CSV. Please try again.");
        }
    });
}


