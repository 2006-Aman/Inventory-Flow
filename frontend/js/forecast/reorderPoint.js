// ==========================================
// REORDER POINT & STOCK STATUS ENGINE
// Pure business logic functions
// No DOM access or API calls
// ==========================================

/**
 * Calculate Reorder Point (ROP).
 * 
 * Formula:
 * Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock
 * 
 * @param {number} leadTime Lead time in days
 * @param {number} averageDailyDemand Average daily demand rate
 * @param {number} safetyStock Buffer stock kept for demand spikes
 * @returns {number} Calculated ROP rounded to integer
 */
function calculateReorderPoint(leadTime, averageDailyDemand, safetyStock) {
    const lead = Number(leadTime);
    const demand = Number(averageDailyDemand);
    const safety = Number(safetyStock);

    if (!Number.isFinite(lead) || !Number.isFinite(demand) || !Number.isFinite(safety)) {
        return 0;
    }

    if (lead < 0 || demand <= 0) {
        return Math.max(0, Math.round(safety));
    }

    const rop = (demand * lead) + safety;
    return Math.max(0, Math.round(rop));
}

/**
 * Check if current stock level triggers a reorder requirement.
 * 
 * @param {number} currentStock Current inventory level
 * @param {number} reorderPoint Reorder point threshold
 * @returns {boolean} True if stock <= ROP
 */
function needsReorder(currentStock, reorderPoint) {
    const stock = Number(currentStock);
    const rop = Number(reorderPoint);

    if (!Number.isFinite(stock) || !Number.isFinite(rop)) {
        return false;
    }

    return stock <= rop;
}

/**
 * Determine dynamic stock status based on inventory thresholds.
 * 
 * Evaluation Order:
 * 1. Invalid stock -> "Unknown"
 * 2. reorderPoint > 0 AND currentStock <= reorderPoint -> "Reorder"
 * 3. currentStock <= minimumStock -> "Low Stock"
 * 4. Otherwise -> "In Stock"
 * 
 * @param {number} currentStock Current available inventory
 * @param {number} minimumStock Minimum stock threshold
 * @param {number} reorderPoint Calculated reorder point
 * @returns {string} "Unknown" | "Reorder" | "Low Stock" | "In Stock"
 */
function calculateStockStatus(currentStock, minimumStock, reorderPoint) {
    const stock = Number(currentStock);
    const minimum = Number(minimumStock);
    const rop = Number(reorderPoint);

    if (!Number.isFinite(stock)) {
        return "Unknown";
    }

    if (Number.isFinite(rop) && rop > 0 && stock <= rop) {
        return "Reorder";
    }

    if (Number.isFinite(minimum) && stock <= minimum) {
        return "Low Stock";
    }

    return "In Stock";
}

// Support Node.js export for automated testing
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        calculateReorderPoint,
        needsReorder,
        calculateStockStatus
    };
}