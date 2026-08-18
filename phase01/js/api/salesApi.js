// ==========================================
// SALES API
// ==========================================


// GET ALL SALES
async function getSales() {
    const rawSales = await apiRequest("/sales");
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    if (!user || user.id === "1" || user.id === "usr_admin_01" || user.email === "admin@inventoryflow.com") {
        return Array.isArray(rawSales) ? rawSales.filter(s => !s.userId || s.userId === "1" || s.userId === "usr_admin_01" || s.userEmail === "admin@inventoryflow.com") : [];
    }

    return Array.isArray(rawSales) ? rawSales.filter(s => s.userId === user.id || s.userEmail === user.email) : [];
}


// GET SINGLE SALE
async function getSaleById(
    saleId
) {

    return apiRequest(
        `/sales/${saleId}`
    );
}


// CREATE SALE
async function createSale(
    saleData
) {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (user) {
        saleData.userId = user.id;
        saleData.userEmail = user.email;
    }

    return apiRequest(
        "/sales",
        {
            method: "POST",

            body: JSON.stringify(
                saleData
            )
        }
    );
}


// UPDATE SALE
async function updateSale(
    saleId,
    saleData
) {

    return apiRequest(
        `/sales/${saleId}`,
        {
            method: "PUT",

            body: JSON.stringify(
                saleData
            )
        }
    );
}


// DELETE SALE
async function deleteSale(
    saleId
) {

    return apiRequest(
        `/sales/${saleId}`,
        {
            method: "DELETE"
        }
    );
}