// ==========================================================================
// HYBRID FORECAST ENGINE
// Pure Vanilla JavaScript implementation of demand forecasting algorithms:
// - Stable demand       -> EWMA (Exponentially Weighted Moving Average)
// - Trending demand     -> Holt's Double Exponential Smoothing
// - Intermittent demand -> TSB (Teunter-Syntetos-Babai Method)
// No DOM manipulation or API calls
// ==========================================================================

// Support Node.js requires if running in Node environment
if (typeof require !== "undefined") {
    try {
        const ma = require("./movingAverage.js");
        const rop = require("./reorderPoint.js");
        if (typeof buildObservedDailyDemand === "undefined") {
            Object.assign(global, ma, rop);
        }
    } catch (e) {
        // Ignored in browser context where scripts are loaded via tags
    }
}

// ==========================================
// 1. HOLT'S DOUBLE EXPONENTIAL SMOOTHING
// Handles trended demand (level + trend)
// ==========================================

/**
 * Calculate Holt's Exponential Smoothing forecast.
 * @param {Array<number>} values Daily demand series
 * @param {number} alpha Level smoothing parameter (0 < alpha <= 1)
 * @param {number} beta Trend smoothing parameter (0 < beta <= 1)
 * @returns {number} 1-step ahead daily forecast
 */
function calculateHoltForecast(values, alpha = 0.4, beta = 0.2) {
    if (!Array.isArray(values) || !values.length) return 0;
    const valid = values.map(Number).filter(Number.isFinite);
    if (!valid.length) return 0;
    if (valid.length === 1) return valid[0];

    let level = valid[0];
    let trend = valid[1] - valid[0];

    for (let i = 1; i < valid.length; i++) {
        const actual = valid[i];
        const prevLevel = level;

        level = (alpha * actual) + ((1 - alpha) * (level + trend));
        trend = (beta * (level - prevLevel)) + ((1 - beta) * trend);
    }

    return Math.max(0, level + trend);
}

// ==========================================
// 2. TREND SLOPE CALCULATION
// Ordinary Least Squares (OLS) slope
// ==========================================

/**
 * Calculate linear trend slope using OLS regression over time index.
 * @param {Array<number>} values 
 * @returns {number} Slope (change per day)
 */
function calculateTrendSlope(values) {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = calculateMean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (values[i] - yMean);
        denominator += Math.pow(i - xMean, 2);
    }

    if (denominator === 0) return 0;
    return numerator / denominator;
}

// ==========================================
// 3. TSB INTERMITTENT DEMAND FORECAST
// Teunter-Syntetos-Babai (TSB) method
// Updates demand probability and demand size
// ==========================================

/**
 * Calculate TSB forecast for sporadic / intermittent demand.
 * @param {Array<number>} values 
 * @param {number} demandAlpha Smoothing for demand size
 * @param {number} probabilityAlpha Smoothing for demand probability
 * @returns {number} Expected daily demand
 */
function calculateTSBForecast(values, demandAlpha = 0.3, probabilityAlpha = 0.2) {
    if (!Array.isArray(values) || !values.length) return 0;

    const firstNonZero = values.find(v => Number(v) > 0);
    if (firstNonZero === undefined) return 0;

    let demandEstimate = Number(firstNonZero);
    let probability = 1;

    for (let i = 0; i < values.length; i++) {
        const actual = Number(values[i]);
        const occurrence = actual > 0 ? 1 : 0;

        probability = (probabilityAlpha * occurrence) + ((1 - probabilityAlpha) * probability);

        if (actual > 0) {
            demandEstimate = (demandAlpha * actual) + ((1 - demandAlpha) * demandEstimate);
        }
    }

    return Math.max(0, demandEstimate * probability);
}

// ==========================================
// 4. DEMAND PATTERN CLASSIFICATION
// Classifies pattern as Intermittent, Trending, or Stable
// ==========================================

/**
 * Detect demand pattern based on zero-demand ratio and trend slope.
 * @param {Array<number>} values Daily demand values
 * @returns {string} "Intermittent" | "Trending" | "Stable" | "Insufficient Data"
 */
function classifyDemandPattern(values) {
    if (!Array.isArray(values) || !values.length) {
        return "Insufficient Data";
    }

    const zeroRatio = calculateZeroDemandRatio(values);
    const nonZeroValues = getNonZeroDemand(values);

    // Intermittent pattern: significant proportion of zero-demand days (>=35%) with sporadic sales
    if (values.length >= 5 && zeroRatio >= 0.35 && nonZeroValues.length >= 2) {
        return "Intermittent";
    }

    // Trend detection via relative slope
    const slope = calculateTrendSlope(values);
    const mean = calculateMean(values);

    if (mean > 0 && values.length >= 4) {
        const relativeSlope = Math.abs(slope) / mean;
        if (relativeSlope >= 0.08) {
            return "Trending";
        }
    }

    return "Stable";
}

// ==========================================
// 5. HYBRID MODEL SELECTION
// Selects appropriate forecasting algorithm
// ==========================================

/**
 * Select model corresponding to demand pattern.
 * @param {string} pattern 
 * @returns {string} "TSB" | "Holt" | "EWMA" | "None"
 */
function selectForecastModel(pattern) {
    switch (pattern) {
        case "Intermittent":
            return "TSB";
        case "Trending":
            return "Holt";
        case "Stable":
            return "EWMA";
        default:
            return "None";
    }
}

// ==========================================
// 6. OUTLIER CAPPING
// Robust MAD outlier suppression
// ==========================================

/**
 * Cap extreme demand spikes using Median Absolute Deviation (MAD).
 * @param {Array<number>} values 
 * @returns {Array<number>}
 */
function capOutliers(values) {
    if (!Array.isArray(values) || values.length < 5) {
        return [...(values || [])];
    }

    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const deviations = values.map(v => Math.abs(v - median));
    const sortedDev = [...deviations].sort((a, b) => a - b);
    const mad = sortedDev[Math.floor(sortedDev.length / 2)];

    if (mad === 0) return [...values];

    const upperLimit = median + (6 * mad);
    return values.map(v => (v > upperLimit ? upperLimit : v));
}

// ==========================================
// 7. FORECAST CONFIDENCE RATING
// Evaluates confidence based on observed data points
// ==========================================

/**
 * Calculate forecast confidence grade based on history sample size.
 * @param {number} dataPoints Number of observed daily demand data points
 * @returns {string} "High" | "Medium" | "Low"
 */
function calculateForecastConfidence(dataPoints) {
    if (dataPoints >= 30) return "High";
    if (dataPoints >= 7) return "Medium";
    return "Low";
}

// ==========================================
// 8. SINGLE PRODUCT FORECAST CALCULATOR
// Core business engine function
// ==========================================

/**
 * Calculate dynamic forecast, ROP, and stock status for a single product.
 * 
 * @param {Object} product Product object
 * @param {Array} sales Full or product sales array
 * @param {number} forecastDays Number of forecast days (default 7)
 * @returns {Object} Structured forecast result object
 */
function calculateProductForecast(product, sales = [], forecastDays = 7) {
    if (!product) {
        throw new Error("Product object is required for forecasting.");
    }

    const safeSales = Array.isArray(sales) ? sales : [];

    // Filter sales belonging strictly to this product
    const productSales = safeSales.filter(s => s && String(s.productId) === String(product.id));

    const currentStock = Number(product.stock || 0);
    const minStock = Number(product.minimumStock || 0);
    const safStock = Number(product.safetyStock || 0);
    const lTime = Number(product.leadTime || 0);

    // CASE 1: No Sales History
    if (!productSales.length) {
        const rop = 0;
        const status = calculateStockStatus(currentStock, minStock, rop);
        return {
            productId: String(product.id),
            productName: product.name || "Unknown Product",
            pattern: "No Sales Data",
            model: "None",
            averageDailyDemand: 0,
            forecastDemand: 0,
            forecastDays: Number(forecastDays),
            reorderPoint: rop,
            currentStock: currentStock,
            minimumStock: minStock,
            safetyStock: safStock,
            leadTime: lTime,
            status: status,
            confidence: "Low",
            dataPoints: 0
        };
    }

    // Build observed daily demand series from first to last sale
    const dailyDemandSeries = buildObservedDailyDemand(productSales);
    const rawDemandValues = dailyDemandSeries.map(d => Number(d.quantity));
    const dataPointsCount = rawDemandValues.length;

    // Outlier cleaning
    const cleanedValues = capOutliers(rawDemandValues);

    // Classify pattern & pick model
    const pattern = classifyDemandPattern(cleanedValues);
    const model = selectForecastModel(pattern);

    // Calculate average daily demand based on model
    let avgDailyDemand = 0;

    if (model === "EWMA") {
        avgDailyDemand = calculateEWMA(cleanedValues, 0.3);
    } else if (model === "Holt") {
        avgDailyDemand = calculateHoltForecast(cleanedValues, 0.4, 0.2);
    } else if (model === "TSB") {
        avgDailyDemand = calculateTSBForecast(cleanedValues, 0.3, 0.2);
    } else {
        avgDailyDemand = calculateMean(cleanedValues);
    }

    // Round average daily demand to 2 decimal places
    avgDailyDemand = Number(Math.max(0, avgDailyDemand).toFixed(2));

    // Calculate forecast demand for specified period
    const forecastDemand = Number((avgDailyDemand * Number(forecastDays)).toFixed(2));

    // Calculate dynamic Reorder Point (ROP)
    const reorderPoint = calculateReorderPoint(lTime, avgDailyDemand, safStock);

    // Calculate dynamic stock status
    const status = calculateStockStatus(currentStock, minStock, reorderPoint);

    // Calculate confidence level
    const confidence = calculateForecastConfidence(dataPointsCount);

    return {
        productId: String(product.id),
        productName: product.name || "Unknown Product",
        pattern: pattern,
        model: model,
        averageDailyDemand: avgDailyDemand,
        forecastDemand: forecastDemand,
        forecastDays: Number(forecastDays),
        reorderPoint: reorderPoint,
        currentStock: currentStock,
        minimumStock: minStock,
        safetyStock: safStock,
        leadTime: lTime,
        status: status,
        confidence: confidence,
        dataPoints: dataPointsCount
    };
}

// ==========================================
// 9. BATCH FORECAST FOR ALL PRODUCTS
// ==========================================

/**
 * Calculate dynamic forecasts for an array of products.
 * 
 * @param {Array} products Array of product objects
 * @param {Array} sales Array of sales transactions
 * @param {number} forecastDays Number of forecast days (default 7)
 * @returns {Array<Object>} Array of forecast result objects
 */
function calculateAllProductForecasts(products = [], sales = [], forecastDays = 7) {
    if (!Array.isArray(products)) return [];
    return products.map(product => calculateProductForecast(product, sales, forecastDays));
}

// Support Node.js export for automated testing
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        calculateHoltForecast,
        calculateTrendSlope,
        calculateTSBForecast,
        classifyDemandPattern,
        selectForecastModel,
        capOutliers,
        calculateForecastConfidence,
        calculateProductForecast,
        calculateAllProductForecasts
    };
}