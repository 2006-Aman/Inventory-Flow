// ==========================================
// REORDER POINT ENGINE
// ==========================================

/**
 * Reorder Point Formula:
 *
 * ROP =
 * Lead Time × Average Daily Demand
 * + Safety Stock
 */
function calculateReorderPoint(leadTime, averageDailyDemand, safetyStock) {

    const lead = Number(leadTime);

    const demand = Number(averageDailyDemand);

    const safety = Number(safetyStock);

    if (!Number.isFinite(lead) || !Number.isFinite(demand) || !Number.isFinite(safety)) {
        return 0;
    }

    return Math.ceil((lead * demand) + safety);
}


/**
 * Check whether stock needs reorder.
 */
function needsReorder(currentStock, reorderPoint) {

    const stock = Number(currentStock);

    const reorder = Number(reorderPoint);

    if (!Number.isFinite(stock) || !Number.isFinite(reorder)) {
        return false;
    }

    return stock <= reorder;
}


/**
 * Determine inventory status.
 */
function calculateStockStatus(currentStock, minimumStock, reorderPoint) {

    const stock = Number(currentStock);

    const minimum = Number(minimumStock);

    const reorder = Number(reorderPoint);

    if (!Number.isFinite(stock)) {
        return "Unknown";
    }

    if (Number.isFinite(reorder) && stock <= reorder) {
        return "Reorder";
    }

    if (Number.isFinite(minimum) && stock <= minimum) {
        return "Low Stock";
    }

    return "In Stock";
}