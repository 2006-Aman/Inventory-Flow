// ==========================================
// PRODUCT API
// ==========================================

async function getProducts() {
    return apiRequest("/products");
}


async function getProductById(id) {
    return apiRequest(`/products/${id}`);
}


async function createProduct(product) {
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