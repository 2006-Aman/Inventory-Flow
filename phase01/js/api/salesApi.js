// ==========================================
// SALES API - CONNECTED TO EXPRESS & MONGODB
// ==========================================

// GET ALL SALES
async function getSales() {
    const rawSales = await apiRequest("/sales");
    return Array.isArray(rawSales) ? rawSales : (rawSales && rawSales.sales ? rawSales.sales : []);
}

// GET SINGLE SALE
async function getSaleById(saleId) {
    return apiRequest(`/sales/${saleId}`);
}

// CREATE SALE (Deducts stock in MongoDB and verifies Anti-Cheat stock availability)
async function createSale(saleData) {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (user) {
        saleData.userId = user.id;
        saleData.userEmail = user.email;
    }

    return apiRequest(
        "/sales",
        {
            method: "POST",
            body: JSON.stringify(saleData)
        }
    );
}

// UPDATE SALE
async function updateSale(saleId, saleData) {
    return apiRequest(
        `/sales/${saleId}`,
        {
            method: "PUT",
            body: JSON.stringify(saleData)
        }
    );
}

// DELETE SALE
async function deleteSale(saleId) {
    return apiRequest(
        `/sales/${saleId}`,
        {
            method: "DELETE"
        }
    );
}