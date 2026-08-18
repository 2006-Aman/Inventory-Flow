// ==========================================
// SALES API
// ==========================================


// GET ALL SALES
async function getSales() {

    return apiRequest(
        "/sales"
    );
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