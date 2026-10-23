// ==========================================
// DEMAND DATA & FORECAST MATHEMATICS UTILITIES
// Pure business logic & reusable math functions
// No DOM manipulation or API calls
// ==========================================

/**
 * Format a Date object into YYYY-MM-DD string.
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Extract valid Date objects from a list of sales transactions.
 * @param {Array} sales 
 * @returns {Array<Date>}
 */
function getValidSalesDates(sales) {
    if (!Array.isArray(sales)) return [];
    return sales
        .filter(sale => sale && sale.date)
        .map(sale => new Date(sale.date))
        .filter(date => !isNaN(date.getTime()));
}

/**
 * Find the earliest recorded sale date.
 * @param {Array} sales 
 * @returns {Date|null}
 */
function getFirstSalesDate(sales) {
    const dates = getValidSalesDates(sales);
    if (!dates.length) return null;
    return new Date(Math.min(...dates.map(d => d.getTime())));
}

/**
 * Find the latest recorded sale date.
 * @param {Array} sales 
 * @returns {Date|null}
 */
function getLatestSalesDate(sales) {
    const dates = getValidSalesDates(sales);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Build a daily demand series ONLY for the observed period
 * (from the first recorded sale to the latest recorded sale).
 * 
 * Rules:
 * - Days before the first sale are NOT treated as zero.
 * - Days after the latest sale are NOT included.
 * - Missing days INSIDE the observed period are assigned 0 demand.
 * - Multiple sales on the same day are aggregated into a single total.
 * 
 * @param {Array} sales 
 * @returns {Array<{date: string, quantity: number}>}
 */
function buildObservedDailyDemand(sales) {
    if (!Array.isArray(sales) || !sales.length) {
        return [];
    }

    const firstDate = getFirstSalesDate(sales);
    const latestDate = getLatestSalesDate(sales);

    if (!firstDate || !latestDate) {
        return [];
    }

    // Initialize daily map for all dates in the observed range
    const dailyMap = {};
    const current = new Date(firstDate);
    // Reset time components to compare calendar days cleanly
    current.setHours(0, 0, 0, 0);

    const end = new Date(latestDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        const key = formatDateKey(current);
        dailyMap[key] = 0;
        current.setDate(current.getDate() + 1);
    }

    // Aggregate quantities for each day
    sales.forEach(sale => {
        if (!sale || !sale.date) return;
        const sDate = new Date(sale.date);
        if (isNaN(sDate.getTime())) return;

        const key = formatDateKey(sDate);
        if (Object.prototype.hasOwnProperty.call(dailyMap, key)) {
            const qty = Number(sale.quantity || 0);
            if (Number.isFinite(qty) && qty > 0) {
                dailyMap[key] += qty;
            }
        }
    });

    // Convert map to sorted array
    return Object.entries(dailyMap)
        .map(([date, quantity]) => ({ date, quantity }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Simple Moving Average (SMA)
 * @param {Array<number>} values 
 * @returns {number}
 */
function calculateSMA(values) {
    if (!Array.isArray(values) || !values.length) return 0;
    const valid = values.map(Number).filter(Number.isFinite);
    if (!valid.length) return 0;
    const sum = valid.reduce((acc, v) => acc + v, 0);
    return sum / valid.length;
}

/**
 * Exponentially Weighted Moving Average (EWMA)
 * S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
 * @param {Array<number>} values 
 * @param {number} alpha Smoothing factor (0 < alpha <= 1), default 0.3
 * @returns {number}
 */
function calculateEWMA(values, alpha = 0.3) {
    if (!Array.isArray(values) || !values.length) return 0;
    const valid = values.map(Number).filter(Number.isFinite);
    if (!valid.length) return 0;

    let forecast = valid[0];
    for (let i = 1; i < valid.length; i++) {
        forecast = (alpha * valid[i]) + ((1 - alpha) * forecast);
    }
    return forecast;
}

/**
 * Calculate arithmetic mean.
 * @param {Array<number>} values 
 * @returns {number}
 */
function calculateMean(values) {
    if (!Array.isArray(values) || !values.length) return 0;
    const valid = values.map(Number).filter(Number.isFinite);
    if (!valid.length) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Calculate standard deviation.
 * @param {Array<number>} values 
 * @returns {number}
 */
function calculateStandardDeviation(values) {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const valid = values.map(Number).filter(Number.isFinite);
    if (valid.length < 2) return 0;

    const mean = calculateMean(valid);
    const variance = valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valid.length;
    return Math.sqrt(variance);
}

/**
 * Calculate Coefficient of Variation (CV = StdDev / Mean)
 * @param {Array<number>} values 
 * @returns {number}
 */
function calculateCoefficientOfVariation(values) {
    const mean = calculateMean(values);
    if (mean === 0) return 0;
    const stdDev = calculateStandardDeviation(values);
    return stdDev / mean;
}

/**
 * Calculate proportion of zero-demand days in a series.
 * @param {Array<number>} values 
 * @returns {number} Ratio between 0 and 1
 */
function calculateZeroDemandRatio(values) {
    if (!Array.isArray(values) || !values.length) return 1;
    const zeroDays = values.filter(v => Number(v) === 0).length;
    return zeroDays / values.length;
}

/**
 * Filter and return non-zero demand values.
 * @param {Array<number>} values 
 * @returns {Array<number>}
 */
function getNonZeroDemand(values) {
    if (!Array.isArray(values)) return [];
    return values.map(Number).filter(v => Number.isFinite(v) && v > 0);
}

// Support Node.js export for automated testing
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        formatDateKey,
        getValidSalesDates,
        getFirstSalesDate,
        getLatestSalesDate,
        buildObservedDailyDemand,
        calculateSMA,
        calculateEWMA,
        calculateMean,
        calculateStandardDeviation,
        calculateCoefficientOfVariation,
        calculateZeroDemandRatio,
        getNonZeroDemand
    };
}