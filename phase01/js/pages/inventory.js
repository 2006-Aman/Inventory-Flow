let allProducts = [];
let filteredProductsList = [];
let currentPage = 1;
const itemsPerPage = 10;

const getDom = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", initInventory);

async function initInventory() {
    try {
        showMessage("Loading inventory...", "loading");
        await checkServer();
        await loadProducts();

        setupFilters();
        setupActions();
        setupModalEvents();

        // Check if topbar search passed query parameter 'q'
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery) {
            const searchInput = getDom("searchInput");
            if (searchInput) {
                searchInput.value = searchQuery;
            }
            applyFilters();
        }

        hideMessage();
    } catch (error) {
        console.error("Inventory initialization error:", error);
        showMessage("Unable to load inventory.", "error");
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
        throw error;
    }
}

// ==========================================
// 2. DATA LOADING & POPULATION
// ==========================================

async function loadProducts() {
    const products = await getProducts();
    allProducts = Array.isArray(products) ? products : [];

    populateCategoryFilter();
    populateSupplierFilter();
    populateCategoryDatalist();

    renderProducts(allProducts);
    updateSummary(allProducts);
}

function populateCategoryFilter() {
    const categoryFilter = getDom("categoryFilter");
    if (!categoryFilter) return;

    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    categoryFilter.innerHTML = `<option value="">All Categories</option>`;
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function populateSupplierFilter() {
    const supplierFilter = getDom("supplierFilter");
    if (!supplierFilter) return;

    const suppliers = [...new Set(allProducts.map(p => p.supplier).filter(Boolean))].sort();
    supplierFilter.innerHTML = `<option value="">All Suppliers</option>`;
    suppliers.forEach(supplier => {
        const option = document.createElement("option");
        option.value = supplier;
        option.textContent = supplier;
        supplierFilter.appendChild(option);
    });
}

function populateCategoryDatalist() {
    const categoryDatalist = getDom("category-list");
    if (!categoryDatalist) return;

    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    categoryDatalist.innerHTML = "";
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        categoryDatalist.appendChild(option);
    });
}

// ==========================================
// 3. TABLE RENDER & PAGINATION
// ==========================================

function renderProducts(products) {
    const tableBody = getDom("inventoryTableBody");
    const emptyState = getDom("emptyState");
    const productCount = getDom("productCount");

    if (!tableBody) return;

    tableBody.innerHTML = "";
    filteredProductsList = products;

    const totalCount = products.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

    if (productCount) {
        productCount.textContent = `${totalCount} product${totalCount === 1 ? "" : "s"}`;
    }

    if (emptyState) {
        emptyState.classList.toggle("visible", totalCount === 0);
    }

    paginatedProducts.forEach(product => {
        tableBody.appendChild(createProductRow(product));
    });

    renderPagination(totalCount, totalPages);
}

function renderPagination(totalCount, totalPages) {
    const countText = getDom("productCountText");
    const paginationContainer = getDom("paginationContainer");

    if (countText) countText.textContent = `${totalCount} product(s)`;
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";
    if (totalCount === 0) return;

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = "‹";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts(filteredProductsList);
        }
    };
    paginationContainer.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `page-btn ${i === currentPage ? "active" : ""}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            renderProducts(filteredProductsList);
        };
        paginationContainer.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = "›";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts(filteredProductsList);
        }
    };
    paginationContainer.appendChild(nextBtn);
}

function createProductRow(product) {
    const row = document.createElement("tr");
    const status = product.status || "Unknown";
    const statusClass = getStatusClass(status);
    const metaText = [product.sku, product.barcode].filter(Boolean).join(" • ");

    row.innerHTML = `
        <td>
            <div class="product-cell">
                <span class="product-name">${escapeHtml(product.name || "Unnamed Product")}</span>
                <span class="product-meta">${escapeHtml(metaText || "-")}</span>
            </div>
        </td>
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${escapeHtml(product.supplier || "-")}</td>
        <td class="cost-value">${formatCurrency(product.costPrice)}</td>
        <td class="selling-value">${formatCurrency(product.sellingPrice)}</td>
        <td class="stock-value">${formatNumber(product.stock)}</td>
        <td class="reorder-value">${formatNumber(product.reorderPoint)}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
        <td>
            <div class="action-buttons">
                <button type="button" class="action-btn edit" data-id="${product.id}" title="Edit Product">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button type="button" class="action-btn reorder" data-id="${product.id}" title="Update Stock Level">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                </button>
                <button type="button" class="action-btn delete" data-id="${product.id}" title="Delete Product">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </td>
    `;
    return row;
}

function getStatusClass(status) {
    switch (status) {
        case "In Stock": return "status-in-stock";
        case "Low Stock": return "status-low-stock";
        case "Reorder":
        case "Critical": return "status-reorder";
        default: return "status-unknown";
    }
}

function updateSummary(products) {
    const total = products.length;
    const stock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const lowStock = products.filter(p => p.status === "Low Stock").length;
    const reorder = products.filter(p => p.status === "Reorder" || p.status === "Critical").length;

    if (getDom("totalProducts")) getDom("totalProducts").textContent = total;
    if (getDom("totalStock")) getDom("totalStock").textContent = formatNumber(stock);
    if (getDom("lowStockProducts")) getDom("lowStockProducts").textContent = lowStock;
    if (getDom("reorderProducts")) getDom("reorderProducts").textContent = reorder;
}

// ==========================================
// 4. SEARCH & FILTERS
// ==========================================

function setupFilters() {
    ["searchInput", "categoryFilter", "supplierFilter", "statusFilter"].forEach(id => {
        const el = getDom(id);
        if (el) el.addEventListener(id === "searchInput" ? "input" : "change", applyFilters);
    });
}

function applyFilters() {
    currentPage = 1;
    const search = (getDom("searchInput")?.value || "").trim().toLowerCase();
    const category = getDom("categoryFilter")?.value || "";
    const supplier = getDom("supplierFilter")?.value || "";
    const status = getDom("statusFilter")?.value || "";

    const filtered = allProducts.filter(p => {
        const matchesSearch = !search ||
            (p.name || "").toLowerCase().includes(search) ||
            (p.sku || "").toLowerCase().includes(search) ||
            (p.barcode || "").toLowerCase().includes(search);

        const matchesCategory = !category || p.category === category;
        const matchesSupplier = !supplier || p.supplier === supplier;
        const matchesStatus = !status || p.status === status;

        return matchesSearch && matchesCategory && matchesSupplier && matchesStatus;
    });

    renderProducts(filtered);
}

// ==========================================
// 5. ACTION BUTTON HANDLERS
// ==========================================

function setupActions() {
    const tableBody = getDom("inventoryTableBody");
    if (!tableBody) return;

    tableBody.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".action-btn.edit");
        const reorderBtn = e.target.closest(".action-btn.reorder");
        const deleteBtn = e.target.closest(".action-btn.delete");

        if (editBtn) openEditModal(editBtn.dataset.id);
        else if (reorderBtn) openStockModal(reorderBtn.dataset.id);
        else if (deleteBtn) await deleteProductHandler(deleteBtn.dataset.id);
    });
}

// ==========================================
// 6. EDIT PRODUCT MODAL
// ==========================================

function openEditModal(productId) {
    const editModal = getDom("edit-modal");
    if (!productId || !editModal) return;

    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    setInputValue("edit-id", product.id);
    setInputValue("edit-name", product.name);
    setInputValue("edit-sku", product.sku);
    setInputValue("edit-barcode", product.barcode);
    setInputValue("edit-category", product.category);
    setInputValue("edit-supplier", product.supplier);
    setInputValue("edit-cost", product.costPrice);
    setInputValue("edit-selling", product.sellingPrice);
    setInputValue("edit-stock", product.stock);
    setInputValue("edit-safety", product.safetyStock);
    setInputValue("edit-lead", product.leadTime);
    setInputValue("edit-description", product.description);

    setElementMessage("editModalMessage", "");
    editModal.classList.add("active");
}

function closeEditModal() {
    getDom("edit-modal")?.classList.remove("active");
    setElementMessage("editModalMessage", "");
}

// ==========================================
// 7. UPDATE STOCK LEVEL MODAL
// ==========================================

function openStockModal(productId) {
    const stockModal = getDom("stock-modal");
    if (!productId || !stockModal) return;

    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    setInputValue("stock-product-id", product.id);
    setInputValue("stock-new-qty", product.stock ?? 0);

    const stockInfoEl = getDom("stock-product-info");
    if (stockInfoEl) {
        stockInfoEl.textContent = `${product.name || "Product"} - currently ${product.stock ?? 0} in stock (reorder point ${product.reorderPoint ?? 0})`;
    }

    setElementMessage("stockModalMessage", "");
    stockModal.classList.add("active");
}

function closeStockModal() {
    getDom("stock-modal")?.classList.remove("active");
    setElementMessage("stockModalMessage", "");
}

// ==========================================
// 8. MODAL SUBMIT & EVENT LISTENERS
// ==========================================

function setupModalEvents() {
    const editModal = getDom("edit-modal");
    const stockModal = getDom("stock-modal");

    // Close buttons
    editModal?.querySelectorAll("[data-close]").forEach(btn => btn.onclick = closeEditModal);
    stockModal?.querySelectorAll("[data-stock-close]").forEach(btn => btn.onclick = closeStockModal);

    // Overlay clicks
    if (editModal) editModal.onclick = (e) => { if (e.target === editModal) closeEditModal(); };
    if (stockModal) stockModal.onclick = (e) => { if (e.target === stockModal) closeStockModal(); };

    // Save Edit Product
    const editSaveBtn = getDom("edit-save");
    if (editSaveBtn) {
        editSaveBtn.onclick = async (e) => {
            e.preventDefault();
            const productId = getDom("edit-id")?.value;
            const existingProduct = allProducts.find(p => String(p.id) === String(productId));
            if (!existingProduct) return;

            try {
                editSaveBtn.disabled = true;
                setElementMessage("editModalMessage", "Saving changes...", "loading");

                const updatedData = {
                    name: getDom("edit-name")?.value.trim() || "",
                    sku: getDom("edit-sku")?.value.trim() || "",
                    barcode: getDom("edit-barcode")?.value.trim() || "",
                    category: getDom("edit-category")?.value.trim() || "",
                    supplier: getDom("edit-supplier")?.value.trim() || "",
                    costPrice: Number(getDom("edit-cost")?.value || 0),
                    sellingPrice: Number(getDom("edit-selling")?.value || 0),
                    stock: Number(getDom("edit-stock")?.value || 0),
                    safetyStock: Number(getDom("edit-safety")?.value || 0),
                    minimumStock: existingProduct.minimumStock ?? 5,
                    leadTime: Number(getDom("edit-lead")?.value || 10),
                    description: getDom("edit-description")?.value.trim() || "",
                    updatedAt: formatDateTime(new Date())
                };

                if (!updatedData.name) throw new Error("Product name is required.");
                if (!updatedData.sku) throw new Error("SKU is required.");
                if (!updatedData.category) throw new Error("Category is required.");
                if (updatedData.sellingPrice < updatedData.costPrice) {
                    throw new Error("Selling price cannot be lower than cost price.");
                }

                const duplicateSKU = allProducts.some(p =>
                    String(p.id) !== String(productId) &&
                    p.sku?.toLowerCase() === updatedData.sku.toLowerCase()
                );
                if (duplicateSKU) throw new Error("A product with this SKU already exists.");

                const avgDemand = existingProduct.averageDailyDemand ?? 0;
                const forecastDemand = existingProduct.forecastDemand ?? 0;
                const createdAt = existingProduct.createdAt ?? updatedData.updatedAt;

                const reorderPoint = typeof calculateReorderPoint === "function" ?
                    calculateReorderPoint(updatedData.leadTime, avgDemand, updatedData.safetyStock) : (existingProduct.reorderPoint ?? 0);

                const status = typeof calculateStockStatus === "function" ?
                    calculateStockStatus(updatedData.stock, updatedData.minimumStock, reorderPoint) : "In Stock";

                const fullUpdatedProduct = {
                    ...existingProduct,
                    ...updatedData,
                    averageDailyDemand: avgDemand,
                    forecastDemand: forecastDemand,
                    reorderPoint: reorderPoint,
                    status: status,
                    createdAt: createdAt
                };

                const result = await updateProduct(productId, fullUpdatedProduct);
                updateLocalStorageProduct(result);
                await loadProducts();

                setElementMessage("editModalMessage", "Product updated successfully!", "success");
                setTimeout(() => {
                    closeEditModal();
                    showMessage("Product updated successfully.", "success");
                    setTimeout(hideMessage, 3000);
                }, 800);

            } catch (error) {
                console.error("Modal edit error:", error);
                setElementMessage("editModalMessage", error.message || "Unable to update product.", "error");
            } finally {
                editSaveBtn.disabled = false;
            }
        };
    }

    // Save Stock Level
    const stockSaveBtn = getDom("stock-save");
    if (stockSaveBtn) {
        stockSaveBtn.onclick = async (e) => {
            e.preventDefault();
            const productId = getDom("stock-product-id")?.value;
            const existingProduct = allProducts.find(p => String(p.id) === String(productId));
            if (!existingProduct) return;

            try {
                stockSaveBtn.disabled = true;
                setElementMessage("stockModalMessage", "Updating stock...", "loading");

                const newStock = Number(getDom("stock-new-qty")?.value || 0);
                if (!Number.isFinite(newStock) || newStock < 0) {
                    throw new Error("Stock quantity must be 0 or greater.");
                }

                const minStock = existingProduct.minimumStock ?? 5;
                const reorderPt = existingProduct.reorderPoint ?? 0;
                const newStatus = typeof calculateStockStatus === "function" ?
                    calculateStockStatus(newStock, minStock, reorderPt) : "In Stock";

                const updatedProduct = {
                    ...existingProduct,
                    stock: newStock,
                    status: newStatus,
                    updatedAt: formatDateTime(new Date())
                };

                const result = await updateProduct(productId, updatedProduct);
                updateLocalStorageProduct(result);
                await loadProducts();

                setElementMessage("stockModalMessage", "Stock updated successfully!", "success");
                setTimeout(() => {
                    closeStockModal();
                    showMessage("Stock level updated successfully.", "success");
                    setTimeout(hideMessage, 3000);
                }, 800);

            } catch (error) {
                console.error("Stock update error:", error);
                setElementMessage("stockModalMessage", error.message || "Unable to update stock.", "error");
            } finally {
                stockSaveBtn.disabled = false;
            }
        };
    }
}

// ==========================================
// 9. DELETE PRODUCT & UTILITIES
// ==========================================

async function deleteProductHandler(productId) {
    if (!productId) return;
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        showMessage("Deleting product...", "loading");
        await deleteProduct(productId);

        const localProducts = getLocalProducts().filter(p => String(p.id) !== String(productId));
        saveProducts(localProducts);

        showMessage("Product deleted successfully.", "success");
        await loadProducts();
        setTimeout(hideMessage, 3000);
    } catch (error) {
        console.error("Delete product error:", error);
        showMessage(error.message || "Unable to delete product.", "error");
    }
}

function updateLocalStorageProduct(updatedProduct) {
    if (!updatedProduct || !updatedProduct.id) return;
    const localProducts = getLocalProducts();
    const index = localProducts.findIndex(p => String(p.id) === String(updatedProduct.id));
    if (index !== -1) {
        localProducts[index] = { ...localProducts[index], ...updatedProduct };
    } else {
        localProducts.push(updatedProduct);
    }
    saveProducts(localProducts);
}

function setInputValue(id, val) {
    const el = getDom(id);
    if (el) el.value = val ?? "";
}

function setElementMessage(id, msg, type = "") {
    const el = getDom(id);
    if (!el) return;
    el.textContent = msg;
    el.className = type ? `inventory-message ${type}` : "inventory-message";
}

function showMessage(message, type) {
    setElementMessage("inventoryMessage", message, type);
}

function hideMessage() {
    setElementMessage("inventoryMessage", "");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : "0";
}

function formatCurrency(value) {
    if (typeof convertCurrency === "function" && typeof getCurrencySymbol === "function") {
        const converted = convertCurrency(value);
        const sym = getCurrencySymbol();
        const isForeign = sym !== "₹";
        return `${sym}${converted.toLocaleString(isForeign ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const number = Number(value || 0);
    return `₹${number.toFixed(2)}`;
}



function formatDateTime(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}