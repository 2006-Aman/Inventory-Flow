let allProducts = [];
let allSales = [];
let selectedProduct = null;

const getDom = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", initSalesPage);


async function initSalesPage() {
    try {
        setDefaultDateTime();
        showMessage("Loading products & sales data...", "loading");

        await checkServer();
        await loadProductsData();
        await loadSalesData();

        setupSalesEvents();
        hideMessage();
    } catch (error) {
        console.error("Sales initialization error:", error);
        showMessage("Unable to initialize sales page.", "error");
    }
}

async function checkServer() {
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
    } catch (error) {
        console.warn("API load products failed, using LocalStorage:", error);
        allProducts = getLocalProducts() || [];
    }
    populateProductDropdown();
}

async function loadSalesData() {
    try {
        const data = typeof getSales === "function" ? await getSales() : [];
        allSales = Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn("API load sales failed, using LocalStorage:", error);
        allSales = getLocalSales() || [];
    }

    updateTodayPerformance();
    renderRecentSalesFeed();
}

// ==========================================
// 2. DROPDOWN & INPUT EVENT LISTENERS
// ==========================================

function populateProductDropdown() {
    const select = getDom("sale-product");
    if (!select) return;

    select.innerHTML = `<option value="">-- Select a product --</option>`;
    allProducts.forEach(product => {
        const stock = Number(product.stock || 0);
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = `${product.name} (Stock: ${stock})`;
        if (stock <= 0) {
            option.textContent += " - OUT OF STOCK";
        }
        select.appendChild(option);
    });
}

function setupSalesEvents() {
    const productSelect = getDom("sale-product");
    const quantityInput = getDom("sale-quantity");
    const saveButton = getDom("sale-save");

    if (productSelect) {
        productSelect.addEventListener("change", handleProductSelection);
    }

    if (quantityInput) {
        quantityInput.addEventListener("input", calculateLiveTotal);
    }

    if (saveButton) {
        saveButton.addEventListener("click", handleSaveSale);
    }

    const dateInput = getDom("sale-date");
    if (dateInput) {
        dateInput.addEventListener("click", () => {
            if (typeof dateInput.showPicker === "function") {
                try { dateInput.showPicker(); } catch (err) {}
            }
        });
    }
}


// ==========================================
// 3. LIVE PRODUCT INFO & TOTAL CALCULATOR
// ==========================================

function handleProductSelection() {
    const productId = getDom("sale-product")?.value;
    const infoCard = getDom("product-info-card");
    const totalBox = getDom("sale-total");

    if (!productId) {
        selectedProduct = null;
        if (infoCard) infoCard.style.display = "none";
        if (totalBox) totalBox.style.display = "none";
        return;
    }

    selectedProduct = allProducts.find(p => String(p.id) === String(productId));
    if (!selectedProduct) return;

    const price = Number(selectedProduct.sellingPrice || 0);
    const cost = Number(selectedProduct.costPrice || 0);
    const stock = Number(selectedProduct.stock || 0);
    const unitProfit = price - cost;
    const status = selectedProduct.status || "In Stock";

    if (getDom("info-price")) getDom("info-price").textContent = formatCurrency(price);
    if (getDom("info-stock")) getDom("info-stock").textContent = stock.toLocaleString();
    if (getDom("info-profit")) getDom("info-profit").textContent = formatCurrency(unitProfit);
    if (getDom("info-status")) getDom("info-status").textContent = status;

    if (infoCard) infoCard.style.display = "block";
    if (totalBox) totalBox.style.display = "flex";

    calculateLiveTotal();
}

function calculateLiveTotal() {
    if (!selectedProduct) return;

    const quantity = Number(getDom("sale-quantity")?.value || 0);
    const sellingPrice = Number(selectedProduct.sellingPrice || 0);
    const costPrice = Number(selectedProduct.costPrice || 0);

    const totalAmount = sellingPrice * quantity;
    const totalProfit = (sellingPrice - costPrice) * quantity;

    const totalAmountEl = getDom("sale-total-amount");
    const totalProfitEl = getDom("sale-total-profit");

    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
    if (totalProfitEl) totalProfitEl.textContent = `Profit ${formatCurrency(totalProfit)}`;
}

// ==========================================
// 4. SUBMIT SALE TRANSACTION
// ==========================================

async function handleSaveSale(e) {
    e.preventDefault();
    hideErrors();

    if (!selectedProduct) {
        showFieldError("error-product", "Please select a product.");
        return;
    }

    const quantity = Number(getDom("sale-quantity")?.value || 0);
    const customer = (getDom("sale-customer")?.value || "Walk-in Customer").trim();
    const dateVal = getDom("sale-date")?.value;

    // Validations
    if (!Number.isInteger(quantity) || quantity <= 0) {
        showFieldError("error-quantity", "Quantity must be at least 1.");
        return;
    }

    const currentStock = Number(selectedProduct.stock || 0);
    if (quantity > currentStock) {
        showFieldError("error-quantity", `Insufficient stock. Only ${currentStock} available.`);
        return;
    }

    const saveButton = getDom("sale-save");
    try {
        if (saveButton) saveButton.disabled = true;
        showMessage("Processing sale transaction...", "loading");

        const sellingPrice = Number(selectedProduct.sellingPrice || 0);
        const costPrice = Number(selectedProduct.costPrice || 0);
        const profit = (sellingPrice - costPrice) * quantity;
        const saleDate = dateVal ? new Date(dateVal) : new Date();

        const saleData = {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantity: quantity,
            sellingPrice: sellingPrice,
            costPrice: costPrice,
            profit: profit,
            customer: customer,
            date: formatDateTime(saleDate)
        };

        // 1. Create Sale Entry
        let createdSale = null;
        try {
            if (typeof createSale === "function") {
                createdSale = await createSale(saleData);
            }
        } catch (err) {
            console.warn("API createSale failed, saving to LocalStorage:", err);
            createdSale = { id: Date.now().toString(), ...saleData };
        }

        // Update LocalStorage Sales
        const localSales = getLocalSales();
        localSales.unshift(createdSale || saleData);
        saveSales(localSales);
        allSales.unshift(createdSale || saleData);

        // 2. Decrement Product Stock
        const newStock = currentStock - quantity;
        const minStock = selectedProduct.minimumStock ?? 5;
        const reorderPt = selectedProduct.reorderPoint ?? 0;
        const newStatus = typeof calculateStockStatus === "function" ?
            calculateStockStatus(newStock, minStock, reorderPt) : (newStock <= minStock ? "Low Stock" : "In Stock");

        const updatedProduct = {
            ...selectedProduct,
            stock: newStock,
            status: newStatus,
            updatedAt: formatDateTime(new Date())
        };

        // Update Product API & LocalStorage
        try {
            await updateProduct(selectedProduct.id, updatedProduct);
        } catch (err) {
            console.warn("API updateProduct failed, updating LocalStorage:", err);
        }

        const localProducts = getLocalProducts();
        const prodIndex = localProducts.findIndex(p => String(p.id) === String(selectedProduct.id));
        if (prodIndex !== -1) {
            localProducts[prodIndex] = { ...localProducts[prodIndex], ...updatedProduct };
        }
        saveProducts(localProducts);

        // Update in-memory product
        const memIndex = allProducts.findIndex(p => String(p.id) === String(selectedProduct.id));
        if (memIndex !== -1) {
            allProducts[memIndex] = updatedProduct;
        }

        // Refresh UI
        populateProductDropdown();
        updateTodayPerformance();
        renderRecentSalesFeed();

        // Reset Form & Info
        if (getDom("sale-quantity")) getDom("sale-quantity").value = 1;
        if (getDom("sale-product")) getDom("sale-product").value = "";
        selectedProduct = null;
        if (getDom("product-info-card")) getDom("product-info-card").style.display = "none";
        if (getDom("sale-total")) getDom("sale-total").style.display = "none";

        showMessage("Sale completed successfully! Stock updated.", "success");
        setTimeout(hideMessage, 3500);

    } catch (error) {
        console.error("Sale transaction error:", error);
        showMessage(error.message || "Failed to complete sale.", "error");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

// ==========================================
// 5. TODAY'S PERFORMANCE & RECENT FEED
// ==========================================

function updateTodayPerformance() {
    const todayStr = formatDateTime(new Date()).split(" ")[0]; // YYYY-MM-DD

    const todaySales = allSales.filter(sale => {
        if (!sale.date) return false;
        return sale.date.startsWith(todayStr);
    });

    const ordersCount = todaySales.length;
    const totalRevenue = todaySales.reduce((sum, s) => sum + (Number(s.sellingPrice || 0) * Number(s.quantity || 0)), 0);
    const totalProfit = todaySales.reduce((sum, s) => sum + Number(s.profit || 0), 0);

    if (getDom("today-orders")) getDom("today-orders").textContent = ordersCount.toLocaleString();
    if (getDom("today-revenue")) getDom("today-revenue").textContent = formatCurrency(totalRevenue);
    if (getDom("today-profit")) getDom("today-profit").textContent = formatCurrency(totalProfit);
}

function renderRecentSalesFeed() {
    const container = getDom("recent-sales-list");
    if (!container) return;

    container.innerHTML = "";
    const recent = allSales.slice(0, 6);

    if (recent.length === 0) {
        container.innerHTML = `<p style="font-size:13px; color:#64748b; margin:8px 0;">No transactions recorded today.</p>`;
        return;
    }

    recent.forEach(sale => {
        const totalAmt = Number(sale.sellingPrice || 0) * Number(sale.quantity || 0);
        const qty = Number(sale.quantity || 1);
        const cust = sale.customer || "Walk-in";

        const item = document.createElement("div");
        item.className = "recent-sale-item";
        item.innerHTML = `
            <div class="recent-sale-left">
                <span class="recent-sale-title">${escapeHtml(sale.productName || "Product")}</span>
                <span class="recent-sale-sub">${qty} pcs • ${escapeHtml(cust)}</span>
            </div>
            <div class="recent-sale-right">
                <span class="recent-sale-price">${formatCurrency(totalAmt)}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// ==========================================
// 6. LOCAL STORAGE HELPERS & UTILITIES
// ==========================================

function getLocalSales() {
    try {
        const stored = localStorage.getItem("inventory_sales");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveSales(sales) {
    try {
        localStorage.setItem("inventory_sales", JSON.stringify(sales));
    } catch (e) {
        console.error("Save sales error:", e);
    }
}

function setDefaultDateTime() {
    const dateInput = getDom("sale-date");
    if (!dateInput) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(dateInput.getMonth ? dateInput.getMonth() : (now.getMonth() + 1))}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    dateInput.value = localIso;
}

function showFieldError(id, msg) {
    const el = getDom(id);
    if (el) {
        el.textContent = msg;
        el.classList.add("active");
    }
}

function hideErrors() {
    document.querySelectorAll(".field-error").forEach(el => {
        el.textContent = "";
        el.classList.remove("active");
    });
}

function showMessage(msg, type) {
    const box = getDom("salesMessage");
    if (!box) return;
    box.textContent = msg;
    box.className = `sales-message ${type}`;
}

function hideMessage() {
    const box = getDom("salesMessage");
    if (!box) return;
    box.textContent = "";
    box.className = "sales-message";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `₹${number.toFixed(2)}` : "₹0.00";
}

function formatDateTime(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}