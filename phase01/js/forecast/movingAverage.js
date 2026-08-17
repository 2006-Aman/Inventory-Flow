// ==========================================
// DEMAND DATA UTILITIES
// ==========================================


/**
 * Format Date as YYYY-MM-DD
 */
function formatDateKey(date) {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/**
 * Get valid sales dates.
 */
function getValidSalesDates(sales) {

    return sales
        .filter(sale => sale.date)
        .map(sale => new Date(sale.date))
        .filter(date => !isNaN(date.getTime()));
}


/**
 * Get first recorded sale date.
 */
function getFirstSalesDate(sales) {

    const dates = getValidSalesDates(sales);

    if (!dates.length) {
        return null;
    }

    return new Date(
        Math.min(
            ...dates.map(
                date => date.getTime()
            )
        )
    );
}


/**
 * Get latest recorded sale date.
 */
function getLatestSalesDate(sales) {

    const dates = getValidSalesDates(sales);

    if (!dates.length) {
        return null;
    }

    return new Date(
        Math.max(
            ...dates.map(
                date => date.getTime()
            )
        )
    );
}


/**
 * Build daily demand ONLY between
 * first recorded sale and latest recorded sale.
 *
 * Important:
 *
 * Before first sale = UNKNOWN
 * After latest sale  = UNKNOWN
 *
 * Missing days INSIDE observed period = 0
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


    const dailyDemand = {};


    // Create every day in observed period

    for (let current = new Date(firstDate); current <= latestDate; current.setDate(current.getDate() + 1)) {

        const dateKey = formatDateKey(current);

        // Missing day = zero demand
        dailyDemand[dateKey] = 0;
    }


    // --------------------------------------
    // Add actual sales
    // --------------------------------------

    sales.forEach(sale => {

        if (!sale.date) {
            return;
        }


        const saleDate = new Date(sale.date);

        if (isNaN(saleDate.getTime())) {
            return;
        }


        const dateKey = formatDateKey(saleDate);


        if (Object.prototype.hasOwnProperty.call(dailyDemand, dateKey)) {

            const quantity = Number(sale.quantity);


            if (Number.isFinite(quantity)) {

                dailyDemand[dateKey] += quantity;
            }
        }

    });


    return Object.entries(dailyDemand)
        .map(
            ([date, quantity]) => ({
                date,
                quantity
            })
        )
        .sort(
            (a, b) =>
                a.date.localeCompare(b.date)
        );
}


/**
 * Simple Moving Average
 */
function calculateSMA(values) {

    if (!values.length) {
        return 0;
    }


    const validValues = values
        .map(Number)
        .filter(value => Number.isFinite(value));


    if (!validValues.length) {
        return 0;
    }


    const total = validValues.reduce((sum, value) => sum + value, 0);


    return total / validValues.length;
}


/**
 * Exponentially Weighted Moving Average
 *
 * Recent observations get more weight.
 */
function calculateEWMA(
    values,
    alpha = 0.3
) {

    if (!values.length) {
        return 0;
    }


    const validValues = values.map(Number).filter(value => Number.isFinite(value));


    if (!validValues.length) {
        return 0;
    }


    let forecast = validValues[0];


    for (let i = 1; i < validValues.length; i++) {

        forecast = alpha * validValues[i] + (1 - alpha) * forecast;
    }


    return forecast;
}


/**
 * Calculate mean
 */
function calculateMean(values) {

    if (!values.length) {
        return 0;
    }


    return values.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / values.length;
}


/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(
    values
) {

    if (values.length < 2) {
        return 0;
    }


    const mean = calculateMean(values);


    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;


    return Math.sqrt(variance);
}


/**
 * Calculate coefficient of variation
 */
function calculateCoefficientOfVariation(
    values
) {

    const mean = calculateMean(values);

    if (mean === 0) {
        return 0;
    }

    const standardDeviation = calculateStandardDeviation(values);

    return standardDeviation / mean;
}


/**
 * Percentage of zero-demand days
 */
function calculateZeroDemandRatio(
    values
) {

    if (!values.length) {
        return 1;
    }


    const zeroDays = values.filter(value => Number(value) === 0).length;


    return zeroDays / values.length;
}


/**
 * Get only non-zero demand
 */
function getNonZeroDemand(values) {

    return values
        .map(Number)
        .filter(
            value =>
                Number.isFinite(value) &&
                value > 0
        );
}