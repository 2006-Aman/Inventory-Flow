async function getSales() {
    return await apiGet("/sales");
}


async function getSaleById(id) {
    return await apiGet(`/sales/${id}`);
}


async function addSale(sale) {
    return await apiPost("/sales", sale);
}


async function updateSale(id, sale) {
    return await apiPut(`/sales/${id}`, sale);
}


async function deleteSale(id) {
    return await apiDelete(`/sales/${id}`);
}


/**
 * Get sales for a specific product
 */
async function getSalesByProductId(productId) {
    const sales = await getSales();

    return sales.filter(
        sale => Number(sale.productId) === Number(productId)
    );
}