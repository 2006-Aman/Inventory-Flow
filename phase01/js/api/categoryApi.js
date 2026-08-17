async function getCategories() {
    return await apiGet("/categories");
}


async function getCategoryById(id) {
    return await apiGet(`/categories/${id}`);
}


async function addCategory(category) {
    return await apiPost("/categories", category);
}


async function updateCategory(id, category) {
    return await apiPut(`/categories/${id}`, category);
}


async function deleteCategory(id) {
    return await apiDelete(`/categories/${id}`);
}