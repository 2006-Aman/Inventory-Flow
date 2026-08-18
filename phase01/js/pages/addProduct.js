document.addEventListener("DOMContentLoaded", async () => {
        const form = document.getElementById("productForm");
        const message = document.getElementById("formMessage");
        const submitButton = document.getElementById("submitButton");
        const cancelButton = document.getElementById("cancelButton");
        const serverStatus = document.getElementById("serverStatus");
        const pageTitle = document.querySelector(".page-header h1");
        const pageSubtext = document.querySelector(".page-header p");

        if (!form) {
            return;
        }

        // Check if editing existing product
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get("id");
        const isEditMode = Boolean(productId);

        let existingProduct = null;

        if (isEditMode) {
            if (pageTitle) pageTitle.textContent = "Edit Product";
            if (pageSubtext) pageSubtext.textContent = "Update product details in your inventory.";
            if (submitButton) submitButton.textContent = "Update Product";
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

        // ======================================
        // CHECK JSON SERVER
        // ======================================

        checkServerStatus(serverStatus);

        // ======================================
        // FORM SUBMIT
        // ======================================

        form.addEventListener("submit", async (event) => {

            event.preventDefault();

            clearMessage(message);


                try {

                    submitButton.disabled = true;

                    submitButton.textContent = isEditMode ? "Updating..." : "Saving...";

                    showMessage(
                        message,
                        isEditMode ? "Updating product..." : "Saving product...",
                        "loading"
                    );

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
                        }, 1200);

                    } else {
                        // Create product in JSON Server
                        const createdProduct = await createProduct(product);

                        // Update LocalStorage
                        const localProducts = getLocalProducts();
                        localProducts.push(createdProduct);
                        saveProducts(localProducts);

                        // Success
                        showMessage(message, "Product added successfully.", "success");
                        console.log("Created Product:", createdProduct);
                        form.reset();
                    }

                } catch (error) {

                    console.error(isEditMode ? "Edit product error:" : "Add product error:", error);
                    showMessage(message, error.message || (isEditMode ? "Unable to update product." : "Unable to add product."), "error");


                } finally {

                    submitButton.disabled = false;
                    submitButton.textContent = isEditMode ? "Update Product" : "Add Product";
                }
            }
        );

        // CANCEL
        cancelButton.addEventListener("click", () => {
            window.location.href = "inventory.html";
        });
    
        // RESET MESSAGE
        form.addEventListener("reset", () => {
            setTimeout(() => {clearMessage(message);},0);
            }
        );

    }
);

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
    if (document.getElementById("minimumStock")) document.getElementById("minimumStock").value = product.minimumStock ?? "";
    if (document.getElementById("safetyStock")) document.getElementById("safetyStock").value = product.safetyStock ?? "";
    if (document.getElementById("leadTime")) document.getElementById("leadTime").value = product.leadTime ?? "";
}

// ==========================================
// COLLECT FORM DATA
// ==========================================

function collectProductFormData() {

    const now = new Date();

    const stock = Number(document.getElementById("stock").value);

    const minimumStock = Number(document.getElementById("minimumStock").value);

    const safetyStock = Number(document.getElementById("safetyStock").value);

    const leadTime = Number(document.getElementById("leadTime").value);

    const reorderPoint = 0;

    const status = calculateStockStatus(stock,minimumStock,reorderPoint);


    return {

        sku: document.getElementById("sku").value.trim(),

        barcode: document.getElementById("barcode").value.trim(),

        name: document.getElementById("productName").value.trim(),

        description: document.getElementById("description").value.trim(),

        category:document.getElementById("category").value.trim(),

        supplier:document.getElementById("supplier").value.trim(),

        costPrice:Number(document.getElementById("costPrice").value),

        sellingPrice:Number(document.getElementById("sellingPrice").value),

        stock: stock,

        minimumStock: minimumStock,

        safetyStock: safetyStock,

        leadTime: leadTime,


        // --------------------------------------
        // Forecast fields
        // --------------------------------------

        // No sales history yet
        averageDailyDemand: 0,

        // No demand forecast yet
        forecastDemand: 0,

        // No forecast → ROP starts at 0
        reorderPoint: reorderPoint,


        status: status,

        createdAt:formatDateTime(now),

        updatedAt:formatDateTime(now)
    };
}

// ==========================================
// VALIDATE PRODUCT
// ==========================================

function validateProduct(product) {

    if (!product.name) {
        throw new Error("Product name is required.");
    }

    if (!product.sku) {
        throw new Error("SKU is required.");
    }

    if (!product.category) {
        throw new Error("Category is required.");
    }

    if (!Number.isFinite(product.costPrice) || product.costPrice < 0) {
        throw new Error("Cost price must be 0 or greater.");
    }

    if (!Number.isFinite(product.sellingPrice) || product.sellingPrice < 0) {
        throw new Error("Selling price must be 0 or greater.");
    }

    if (product.sellingPrice < product.costPrice) {
        throw new Error("Selling price cannot be lower than cost price.");
    }

    if (!Number.isFinite(product.stock) || product.stock < 0) {
        throw new Error("Stock must be 0 or greater.");
    }

    if (!Number.isInteger(product.stock)) {
        throw new Error("Stock must be a whole number.");
    }

    if (!Number.isFinite(product.minimumStock) || product.minimumStock < 0) {
        throw new Error("Minimum stock must be 0 or greater.");
    }

    if (!Number.isFinite(product.safetyStock) || product.safetyStock < 0) {
        throw new Error("Safety stock must be 0 or greater.");
    }

    if (!Number.isFinite(product.leadTime) || product.leadTime <= 0) {
        throw new Error("Lead time must be greater than 0.");
    }

    if (!Number.isInteger(product.leadTime)) {
        throw new Error("Lead time must be a whole number of days.");
    }
}

// ==========================================
// SERVER STATUS
// ==========================================

async function checkServerStatus(statusElement) {

    if (!statusElement) {
        return;
    }


    try {

        await getProducts();

        statusElement.textContent = "● JSON Server Connected";
        statusElement.style.color = "#059669";


    } catch (error) {
        statusElement.textContent = "● JSON Server Offline";
        statusElement.style.color = "#dc2626";

        console.error("JSON Server connection failed:",error);
    }
}

// ==========================================
// MESSAGE
// ==========================================

function showMessage(element, text, type) {

    element.textContent = text;
    element.className = `message ${type}`;
}

function clearMessage(element) {

    element.textContent = "";
    element.className = "message";
}

// ==========================================
// DATE FORMAT
// ==========================================

function formatDateTime(date) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}