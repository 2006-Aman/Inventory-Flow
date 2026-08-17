// ==========================================
// HYBRID FORECAST ENGINE
//
// Stable       → EWMA
// Trending     → Holt
// Intermittent → TSB
// ==========================================


// ==========================================
// HOLT'S DOUBLE EXPONENTIAL SMOOTHING
// ==========================================

function calculateHoltForecast(
    values,
    alpha = 0.4,
    beta = 0.2
) {

    if (!values.length) {
        return 0;
    }


    if (values.length === 1) {
        return Number(values[0]);
    }


    let level =
        Number(values[0]);


    let trend =
        Number(values[1]) -
        Number(values[0]);


    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const actual =
            Number(values[i]);


        const previousLevel =
            level;


        level =
            alpha * actual +
            (1 - alpha) *
            (level + trend);


        trend =
            beta *
            (level - previousLevel) +
            (1 - beta) *
            trend;
    }


    return Math.max(
        0,
        level + trend
    );
}


// ==========================================
// TREND SLOPE
// ==========================================

function calculateTrendSlope(values) {

    if (values.length < 2) {
        return 0;
    }


    const n =
        values.length;


    const xMean =
        (n - 1) / 2;


    const yMean =
        calculateMean(values);


    let numerator = 0;
    let denominator = 0;


    for (
        let i = 0;
        i < n;
        i++
    ) {

        numerator +=
            (i - xMean) *
            (values[i] - yMean);


        denominator +=
            Math.pow(
                i - xMean,
                2
            );
    }


    if (denominator === 0) {
        return 0;
    }


    return numerator /
        denominator;
}


// ==========================================
// TSB INTERMITTENT DEMAND
// ==========================================

function calculateTSBForecast(
    values,
    demandAlpha = 0.3,
    probabilityAlpha = 0.2
) {

    if (!values.length) {
        return 0;
    }


    const firstDemand =
        values.find(
            value =>
                Number(value) > 0
        );


    if (
        firstDemand === undefined
    ) {
        return 0;
    }


    let demandEstimate =
        Number(firstDemand);


    let probability =
        1;


    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        const actual =
            Number(values[i]);


        const occurrence =
            actual > 0 ? 1 : 0;


        probability =
            probabilityAlpha *
            occurrence +
            (1 - probabilityAlpha) *
            probability;


        if (actual > 0) {

            demandEstimate =
                demandAlpha * actual +
                (1 - demandAlpha) *
                demandEstimate;
        }
    }


    return Math.max(
        0,
        demandEstimate * probability
    );
}


// ==========================================
// DEMAND PATTERN CLASSIFICATION
// ==========================================

function classifyDemandPattern(
    values
) {

    if (!values.length) {
        return "Insufficient Data";
    }


    /*
     * We need at least 7 observed
     * calendar days before classifying.
     */
    if (values.length < 7) {
        return "Insufficient Data";
    }


    const zeroRatio =
        calculateZeroDemandRatio(
            values
        );


    const nonZeroValues =
        getNonZeroDemand(values);


    // --------------------------------------
    // Intermittent
    //
    // Only classify intermittent if:
    //
    // 1. At least 14 observed days
    // 2. At least 40% zero-demand days
    // 3. At least 4 non-zero observations
    // --------------------------------------

    if (
        values.length >= 14 &&
        zeroRatio >= 0.40 &&
        nonZeroValues.length >= 4
    ) {

        return "Intermittent";
    }


    // --------------------------------------
    // Trend detection
    // --------------------------------------

    const slope =
        calculateTrendSlope(
            values
        );


    const mean =
        calculateMean(values);


    if (mean > 0) {

        const relativeSlope =
            Math.abs(slope) /
            mean;


        /*
         * 8% relative slope threshold.
         */
        if (relativeSlope >= 0.08) {

            return "Trending";
        }
    }


    // --------------------------------------
    // Otherwise stable
    // --------------------------------------

    return "Stable";
}


// ==========================================
// MODEL SELECTION
// ==========================================

function selectForecastModel(
    pattern
) {

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
// OUTLIER PROTECTION
// ==========================================

function capOutliers(values) {

    if (values.length < 5) {
        return [...values];
    }


    const sorted =
        [...values].sort(
            (a, b) => a - b
        );


    const middle =
        Math.floor(
            sorted.length / 2
        );


    const median =
        sorted[middle];


    const deviations =
        values.map(
            value =>
                Math.abs(
                    value - median
                )
        );


    const sortedDeviations =
        [...deviations].sort(
            (a, b) => a - b
        );


    const mad =
        sortedDeviations[
            Math.floor(
                sortedDeviations.length / 2
            )
        ];


    /*
     * If MAD is zero, do not modify
     * the original values.
     */
    if (mad === 0) {
        return [...values];
    }


    /*
     * Robust upper threshold.
     */
    const threshold =
        median + (6 * mad);


    return values.map(value => {

        if (value > threshold) {
            return threshold;
        }


        return value;
    });
}


// ==========================================
// CONFIDENCE
// ==========================================

function calculateForecastConfidence(
    dataPoints
) {

    if (dataPoints >= 30) {
        return "High";
    }


    if (dataPoints >= 14) {
        return "Medium";
    }


    return "Low";
}


// ==========================================
// SINGLE PRODUCT FORECAST
// ==========================================

function calculateProductForecast(
    product,
    sales,
    forecastDays = 7
) {

    if (!product) {

        throw new Error(
            "Product is required."
        );
    }


    if (!Array.isArray(sales)) {
        sales = [];
    }


    // --------------------------------------
    // Only sales belonging to this product
    // --------------------------------------

    const productSales =
        sales.filter(
            sale =>
                Number(sale.productId) ===
                Number(product.id)
        );


    // --------------------------------------
    // IMPORTANT:
    //
    // Use only the observed period:
    // first sale → latest sale
    //
    // Do NOT create artificial historical
    // zero days before first sale.
    // --------------------------------------

    const dailyDemand =
        buildObservedDailyDemand(
            productSales
        );


    const demandValues =
        dailyDemand.map(
            day =>
                Number(day.quantity)
        );


    // --------------------------------------
    // No sales
    // --------------------------------------

    if (!productSales.length) {

        return {

            productId:
                product.id,

            productName:
                product.name,

            pattern:
                "No Sales Data",

            model:
                "None",

            averageDailyDemand:
                0,

            forecastDemand:
                0,

            forecastDays:
                Number(forecastDays),

            reorderPoint:
                0,

            currentStock:
                Number(product.stock),

            minimumStock:
                Number(product.minimumStock),

            safetyStock:
                Number(product.safetyStock),

            leadTime:
                Number(product.leadTime),

            status:
                "No Sales Data",

            confidence:
                "Low",

            dataPoints:
                0
        };
    }


    // --------------------------------------
    // Insufficient observed history
    // --------------------------------------

    if (demandValues.length < 7) {

        return {

            productId:
                product.id,

            productName:
                product.name,

            pattern:
                "Insufficient Data",

            model:
                "None",

            averageDailyDemand:
                0,

            forecastDemand:
                0,

            forecastDays:
                Number(forecastDays),

            reorderPoint:
                0,

            currentStock:
                Number(product.stock),

            minimumStock:
                Number(product.minimumStock),

            safetyStock:
                Number(product.safetyStock),

            leadTime:
                Number(product.leadTime),

            status:
                "Insufficient Data",

            confidence:
                "Low",

            dataPoints:
                demandValues.length
        };
    }


    // --------------------------------------
    // Outlier protection
    // --------------------------------------

    const cleanedValues =
        capOutliers(
            demandValues
        );


    // --------------------------------------
    // Detect pattern
    // --------------------------------------

    const pattern =
        classifyDemandPattern(
            cleanedValues
        );


    // --------------------------------------
    // Select model
    // --------------------------------------

    const model =
        selectForecastModel(
            pattern
        );


    // --------------------------------------
    // Calculate daily demand forecast
    // --------------------------------------

    let averageDailyDemand = 0;


    if (model === "EWMA") {

        averageDailyDemand =
            calculateEWMA(
                cleanedValues,
                0.3
            );
    }


    else if (model === "Holt") {

        averageDailyDemand =
            calculateHoltForecast(
                cleanedValues,
                0.4,
                0.2
            );
    }


    else if (model === "TSB") {

        averageDailyDemand =
            calculateTSBForecast(
                cleanedValues,
                0.3,
                0.2
            );
    }


    // --------------------------------------
    // Round daily demand
    // --------------------------------------

    averageDailyDemand =
        Number(
            Math.max(
                0,
                averageDailyDemand
            ).toFixed(2)
        );


    // --------------------------------------
    // Forecast future demand
    // --------------------------------------

    const forecastDemand =
        Number(
            (
                averageDailyDemand *
                Number(forecastDays)
            ).toFixed(2)
        );


    // --------------------------------------
    // Reorder Point
    // --------------------------------------

    const reorderPoint =
        calculateReorderPoint(
            product.leadTime,
            averageDailyDemand,
            product.safetyStock
        );


    // --------------------------------------
    // Stock Status
    // --------------------------------------

    const status =
        calculateStockStatus(
            product.stock,
            product.minimumStock,
            reorderPoint
        );


    // --------------------------------------
    // Confidence
    // --------------------------------------

    const confidence =
        calculateForecastConfidence(
            demandValues.length
        );


    // --------------------------------------
    // Final result
    // --------------------------------------

    return {

        productId:
            product.id,

        productName:
            product.name,

        pattern,

        model,

        averageDailyDemand,

        forecastDemand,

        forecastDays:
            Number(forecastDays),

        reorderPoint,

        currentStock:
            Number(product.stock),

        minimumStock:
            Number(product.minimumStock),

        safetyStock:
            Number(product.safetyStock),

        leadTime:
            Number(product.leadTime),

        status,

        confidence,

        dataPoints:
            demandValues.length
    };
}


// ==========================================
// FORECAST ALL PRODUCTS
// ==========================================

function calculateAllProductForecasts(
    products,
    sales,
    forecastDays = 7
) {

    if (!Array.isArray(products)) {
        return [];
    }


    return products.map(
        product =>
            calculateProductForecast(
                product,
                sales,
                forecastDays
            )
    );
}