document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form = document.getElementById("productForm");
        const message = document.getElementById("formMessage");
        const submitButton = document.getElementById("submitButton");
        const cancelButton = document.getElementById("cancelButton");
        const serverStatus = document.getElementById("serverStatus");


        if (!form) {
            return;
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

                    submitButton.textContent = "Saving...";

                    showMessage(
                        message,
                        "Saving product...",
                        "loading"
                    );

                    const product = collectProductFormData();

                    validateProduct(product);

                    // Check duplicate SKU
                    const existingProducts = await getProducts();

                    const duplicateSKU = existingProducts.some(existing =>
                        existing.sku?.toLowerCase() === product.sku.toLowerCase()
                    );


                    if (duplicateSKU) {
                        throw new Error("A product with this SKU already exists.");
                    }


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

                } catch (error) {

                    console.error("Add product error:", error);
                    showMessage(message,error.message || "Unable to add product.","error");


                } finally {

                    submitButton.disabled = false;
                    submitButton.textContent = "Add Product";
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