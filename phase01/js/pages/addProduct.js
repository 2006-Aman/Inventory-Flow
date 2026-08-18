document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("productForm");
    const message = document.getElementById("formMessage");
    const submitButton = document.getElementById("submitButton");
    const cancelButton = document.getElementById("cancelButton");
    const serverStatus = document.getElementById("serverStatus");

    if (!form) return;

    // Check if editing existing product
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");
    const isEditMode = Boolean(productId);

    let existingProduct = null;

    // Auto-generate default SKU and Barcode for new products
    if (!isEditMode) {
        const skuInput = document.getElementById("sku");
        const barcodeInput = document.getElementById("barcode");

        if (skuInput && !skuInput.value) skuInput.value = generateRandomSku();
        if (barcodeInput && !barcodeInput.value) barcodeInput.value = generateRandomBarcode();
    }

    if (isEditMode) {
        const pageTitle = document.getElementById("pageFormTitle");
        if (pageTitle) pageTitle.textContent = "Edit product details";
        if (submitButton) submitButton.textContent = "Update product";
        document.title = "Edit Product | Inventory Reorder System";

        try {
            showMessage(message, "Loading product details...", "loading");
            existingProduct = await getProductById(productId);

            if (existingProduct) {
                populateProductForm(existingProduct);
                clearMessage(message);
            } else {
                showMessage(message, "Product not found.", "error");
            }
        } catch (err) {
            console.error("Error loading product for edit:", err);
            const localProducts = getLocalProducts();
            existingProduct = localProducts.find(p => String(p.id) === String(productId));
            if (existingProduct) {
                populateProductForm(existingProduct);
                clearMessage(message);
            } else {
                showMessage(message, "Unable to load product details.", "error");
            }
        }
    }

    checkServerStatus(serverStatus);
    setupLivePreview();
    updateLivePreview();

    // ======================================
    // FORM SUBMIT HANDLER
    // ======================================

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage(message);

        try {
            submitButton.disabled = true;
            submitButton.textContent = isEditMode ? "Updating..." : "Saving...";
            showMessage(message, isEditMode ? "Updating product..." : "Saving product...", "loading");

            const product = collectProductFormData();
            validateProduct(product);

            // Check duplicate SKU
            const existingProducts = await getProducts();
            const duplicateSKU = existingProducts.some(existing =>
                String(existing.id) !== String(productId) &&
                existing.sku?.toLowerCase() === product.sku.toLowerCase()
            );

            if (duplicateSKU) {
                throw new Error("A product with this SKU already exists.");
            }

            if (isEditMode) {
                if (existingProduct) {
                    product.averageDailyDemand = existingProduct.averageDailyDemand ?? 0;
                    product.forecastDemand = existingProduct.forecastDemand ?? 0;
                    product.createdAt = existingProduct.createdAt ?? product.createdAt;
                    product.reorderPoint = typeof calculateReorderPoint === "function" ?
                        calculateReorderPoint(product.leadTime, product.averageDailyDemand, product.safetyStock) : 0;
                    product.status = typeof calculateStockStatus === "function" ?
                        calculateStockStatus(product.stock, product.minimumStock, product.reorderPoint) : "In Stock";
                }

                const updatedProduct = await updateProduct(productId, product);

                // Update LocalStorage
                const localProducts = getLocalProducts();
                const index = localProducts.findIndex(p => String(p.id) === String(productId));
                if (index !== -1) {
                    localProducts[index] = { ...localProducts[index], ...updatedProduct };
                } else {
                    localProducts.push(updatedProduct);
                }
                saveProducts(localProducts);

                showMessage(message, "Product updated successfully. Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = "inventory.html";
                }, 1000);

            } else {
                const createdProduct = await createProduct(product);

                // Update LocalStorage
                const localProducts = getLocalProducts();
                localProducts.push(createdProduct);
                saveProducts(localProducts);

                showMessage(message, "Product added successfully. Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = "inventory.html";
                }, 1000);
            }

        } catch (error) {
            console.error(isEditMode ? "Edit product error:" : "Add product error:", error);
            showMessage(message, error.message || (isEditMode ? "Unable to update product." : "Unable to add product."), "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = isEditMode ? "Update product" : "Save product";
        }
    });

    // CANCEL BUTTON
    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            window.location.href = "inventory.html";
        });
    }

    // FORM RESET
    form.addEventListener("reset", () => {
        setTimeout(() => {
            clearMessage(message);
            updateLivePreview();
        }, 0);
    });
});

// ==========================================
// LIVE PREVIEW CONTROLLER
// ==========================================

function setupLivePreview() {
    const inputIds = ["productName", "category", "supplier", "costPrice", "sellingPrice", "stock", "safetyStock", "leadTime", "sku", "barcode"];
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", updateLivePreview);
            input.addEventListener("change", updateLivePreview);
        }
    });
}

function updateLivePreview() {
    const nameVal = document.getElementById("productName")?.value.trim();
    const categoryVal = document.getElementById("category")?.value.trim();
    const supplierVal = document.getElementById("supplier")?.value.trim();
    const costVal = Number(document.getElementById("costPrice")?.value || 0);
    const sellingVal = Number(document.getElementById("sellingPrice")?.value || 0);
    const stockVal = Number(document.getElementById("stock")?.value || 0);
    const safetyVal = Number(document.getElementById("safetyStock")?.value || 0);
    const leadVal = Number(document.getElementById("leadTime")?.value || 0);
    const skuVal = document.getElementById("sku")?.value.trim();
    const barcodeVal = document.getElementById("barcode")?.value.trim();

    // 1. Name Banner
    const previewName = document.getElementById("previewName");
    if (previewName) {
        previewName.textContent = nameVal || "Your product name";
    }

    // 2. Category & Supplier
    const previewCategory = document.getElementById("previewCategory");
    if (previewCategory) previewCategory.textContent = categoryVal || "—";

    const previewSupplier = document.getElementById("previewSupplier");
    if (previewSupplier) previewSupplier.textContent = supplierVal || "Unassigned";

    // 3. Unit Profit & Margin
    const unitProfit = sellingVal > 0 ? (sellingVal - costVal) : 0;
    const margin = sellingVal > 0 ? ((unitProfit / sellingVal) * 100) : 0;

    const previewProfit = document.getElementById("previewProfit");
    if (previewProfit) previewProfit.textContent = `₹${unitProfit.toFixed(2)}`;

    const previewMargin = document.getElementById("previewMargin");
    if (previewMargin) previewMargin.textContent = `${margin.toFixed(1)}%`;

    // 4. Stock Value
    const stockValue = stockVal * costVal;
    const previewStockValue = document.getElementById("previewStockValue");
    if (previewStockValue) previewStockValue.textContent = `₹${stockValue.toFixed(2)}`;

    // 5. ROP Estimate (Lead time * 2 + Safety stock default formula if no sales history)
    const estimatedDemand = 1.5;
    const estimatedRop = Math.round((leadVal * estimatedDemand) + safetyVal);
    const previewRop = document.getElementById("previewRop");
    if (previewRop) previewRop.textContent = `${estimatedRop} units`;

    // 6. Codes Card
    const previewSkuCode = document.getElementById("previewSkuCode");
    if (previewSkuCode) previewSkuCode.textContent = skuVal || "G-L8FE2R";

    const previewBarcodeText = document.getElementById("previewBarcodeText");
    if (previewBarcodeText) previewBarcodeText.textContent = barcodeVal || "8769933320623";
}

// ==========================================
// POPULATE FORM
// ==========================================

function populateProductForm(product) {
    if (!product) return;
    if (document.getElementById("productName")) document.getElementById("productName").value = product.name || "";
    if (document.getElementById("sku")) document.getElementById("sku").value = product.sku || "";
    if (document.getElementById("barcode")) document.getElementById("barcode").value = product.barcode || "";
    if (document.getElementById("category")) document.getElementById("category").value = product.category || "";
    if (document.getElementById("supplier")) document.getElementById("supplier").value = product.supplier || "";
    if (document.getElementById("description")) document.getElementById("description").value = product.description || "";
    if (document.getElementById("costPrice")) document.getElementById("costPrice").value = product.costPrice ?? "";
    if (document.getElementById("sellingPrice")) document.getElementById("sellingPrice").value = product.sellingPrice ?? "";
    if (document.getElementById("stock")) document.getElementById("stock").value = product.stock ?? "";
    if (document.getElementById("minimumStock")) document.getElementById("minimumStock").value = product.minimumStock ?? 5;
    if (document.getElementById("safetyStock")) document.getElementById("safetyStock").value = product.safetyStock ?? "";
    if (document.getElementById("leadTime")) document.getElementById("leadTime").value = product.leadTime ?? "";

    updateLivePreview();
}

// ==========================================
// COLLECT FORM DATA
// ==========================================

function collectProductFormData() {
    const now = new Date();
    const stock = Number(document.getElementById("stock").value || 0);
    const minimumStock = Number(document.getElementById("minimumStock")?.value || 5);
    const safetyStock = Number(document.getElementById("safetyStock").value || 0);
    const leadTime = Number(document.getElementById("leadTime").value || 10);
    const reorderPoint = 0;
    const status = calculateStockStatus(stock, minimumStock, reorderPoint);

    return {
        sku: document.getElementById("sku").value.trim(),
        barcode: (document.getElementById("barcode")?.value || generateRandomBarcode()).trim(),
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value.trim(),
        supplier: document.getElementById("supplier").value.trim(),
        costPrice: Number(document.getElementById("costPrice").value || 0),
        sellingPrice: Number(document.getElementById("sellingPrice").value || 0),
        stock: stock,
        minimumStock: minimumStock,
        safetyStock: safetyStock,
        leadTime: leadTime,
        averageDailyDemand: 0,
        forecastDemand: 0,
        reorderPoint: reorderPoint,
        status: status,
        createdAt: formatDateTime(now),
        updatedAt: formatDateTime(now)
    };
}

// ==========================================
// VALIDATE FORM DATA
// ==========================================

function validateProduct(product) {
    if (!product.name) throw new Error("Product name is required.");
    if (!product.sku) throw new Error("SKU is required.");
    if (!product.category) throw new Error("Category is required.");
    if (!Number.isFinite(product.costPrice) || product.costPrice < 0) throw new Error("Cost price must be 0 or greater.");
    if (!Number.isFinite(product.sellingPrice) || product.sellingPrice < 0) throw new Error("Selling price must be 0 or greater.");
    if (product.sellingPrice < product.costPrice) throw new Error("Selling price cannot be lower than cost price.");
    if (!Number.isFinite(product.stock) || product.stock < 0) throw new Error("Stock must be 0 or greater.");
    if (!Number.isInteger(product.stock)) throw new Error("Stock must be a whole number.");
    if (!Number.isFinite(product.safetyStock) || product.safetyStock < 0) throw new Error("Safety stock must be 0 or greater.");
    if (!Number.isFinite(product.leadTime) || product.leadTime <= 0) throw new Error("Lead time must be greater than 0.");
}

// ==========================================
// HELPERS
// ==========================================

function generateRandomSku() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `G-${rand}`;
}

function generateRandomBarcode() {
    let rand = "876";
    for (let i = 0; i < 10; i++) {
        rand += Math.floor(Math.random() * 10);
    }
    return rand;
}

async function checkServerStatus(statusElement) {
    if (!statusElement) return;
    try {
        await getProducts();
        statusElement.textContent = "● Server Connected";
        statusElement.style.color = "#34d399";
    } catch (error) {
        statusElement.textContent = "● Server Offline";
        statusElement.style.color = "#f87171";
    }
}

function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type}`;
}

function clearMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.className = "message";
}

function formatDateTime(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}