// ==========================================
// PRODUCT API
// ==========================================

async function getProducts() {
    const rawProducts = await apiRequest("/products");
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    
    if (!user || user.id === "1" || user.id === "usr_admin_01" || user.email === "admin@inventoryflow.com") {
        return Array.isArray(rawProducts) ? rawProducts.filter(p => !p.userId || p.userId === "1" || p.userId === "usr_admin_01" || p.userEmail === "admin@inventoryflow.com") : [];
    }

    return Array.isArray(rawProducts) ? rawProducts.filter(p => p.userId === user.id || p.userEmail === user.email) : [];
}

async function getProductById(id) {
    return apiRequest(`/products/${id}`);
}

async function createProduct(product) {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (user) {
        product.userId = user.id;
        product.userEmail = user.email;
    }
    return apiRequest(
        "/products",
        {
            method: "POST",
            body: JSON.stringify(product)
        }
    );
}


async function updateProduct(id, product) {
    return apiRequest(
        `/products/${id}`,
        {
            method: "PUT",
            body: JSON.stringify(product)
        }
    );
}


async function deleteProduct(id) {
    return apiRequest(
        `/products/${id}`,
        {
            method: "DELETE"
        }
    );
}