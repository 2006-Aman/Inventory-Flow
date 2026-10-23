// ==========================================
// PRODUCT API - CONNECTED TO EXPRESS & MONGODB
// ==========================================

async function getProducts() {
    const rawProducts = await apiRequest("/products");
    return Array.isArray(rawProducts) ? rawProducts : (rawProducts && rawProducts.products ? rawProducts.products : []);
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