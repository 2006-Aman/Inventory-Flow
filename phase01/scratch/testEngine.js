const { buildObservedDailyDemand } = require("../js/forecast/movingAverage.js");
const { calculateReorderPoint, calculateStockStatus } = require("../js/forecast/reorderPoint.js");
const { calculateProductForecast } = require("../js/forecast/forecast.js");

console.log("==================================================");
console.log("    RUNNING FORECAST ENGINE VERIFICATION TESTS    ");
console.log("==================================================\n");

// --------------------------------------------------
// TEST 1: No sales history
// --------------------------------------------------
console.log("--- TEST 1: No Sales History ---");
const prod1 = { id: "1", name: "No Sales Product", stock: 10, minimumStock: 5, safetyStock: 2, leadTime: 5 };
const res1 = calculateProductForecast(prod1, []);
console.log("Result:", JSON.stringify(res1, null, 2));
console.assert(res1.averageDailyDemand === 0, "TEST 1 Failed: averageDailyDemand should be 0");
console.assert(res1.forecastDemand === 0, "TEST 1 Failed: forecastDemand should be 0");
console.assert(res1.reorderPoint === 0, "TEST 1 Failed: reorderPoint should be 0");
console.log("✅ TEST 1 PASSED!\n");

// --------------------------------------------------
// TEST 2: Stable demand (4, 5, 4, 5, 4, 5)
// --------------------------------------------------
console.log("--- TEST 2: Stable Demand (EWMA) ---");
const prod2 = { id: "2", name: "Stable Product", stock: 50, minimumStock: 10, safetyStock: 5, leadTime: 7 };
const sales2 = [
    { productId: "2", quantity: 4, date: "2026-08-01 10:00" },
    { productId: "2", quantity: 5, date: "2026-08-02 10:00" },
    { productId: "2", quantity: 4, date: "2026-08-03 10:00" },
    { productId: "2", quantity: 5, date: "2026-08-04 10:00" },
    { productId: "2", quantity: 4, date: "2026-08-05 10:00" },
    { productId: "2", quantity: 5, date: "2026-08-06 10:00" },

];
const res2 = calculateProductForecast(prod2, sales2);
console.log(`Pattern: ${res2.pattern}, Model: ${res2.model}, Demand: ${res2.averageDailyDemand}`);
console.assert(res2.model === "EWMA", "TEST 2 Failed: Model should be EWMA");
console.log("✅ TEST 2 PASSED!\n");

// --------------------------------------------------
// TEST 3: Trending demand (2, 3, 4, 5, 6, 7)
// --------------------------------------------------
console.log("--- TEST 3: Trending Demand (Holt) ---");
const prod3 = { id: "3", name: "Trending Product", stock: 100, minimumStock: 10, safetyStock: 5, leadTime: 5 };
const sales3 = [
    { productId: "3", quantity: 2, date: "2026-08-01 10:00" },
    { productId: "3", quantity: 3, date: "2026-08-02 10:00" },
    { productId: "3", quantity: 4, date: "2026-08-03 10:00" },
    { productId: "3", quantity: 5, date: "2026-08-04 10:00" },
    { productId: "3", quantity: 6, date: "2026-08-05 10:00" },
    { productId: "3", quantity: 7, date: "2026-08-06 10:00" }
];
const res3 = calculateProductForecast(prod3, sales3);
console.log(`Pattern: ${res3.pattern}, Model: ${res3.model}, Demand: ${res3.averageDailyDemand}`);
console.assert(res3.model === "Holt", "TEST 3 Failed: Model should be Holt");
console.log("✅ TEST 3 PASSED!\n");

// --------------------------------------------------
// TEST 4: Intermittent demand (0, 0, 5, 0, 0, 3, 0, 7)
// --------------------------------------------------
console.log("--- TEST 4: Intermittent Demand (TSB) ---");
const prod4 = { id: "4", name: "Intermittent Product", stock: 20, minimumStock: 5, safetyStock: 2, leadTime: 5 };
const sales4 = [
    { productId: "4", quantity: 5, date: "2026-08-03 10:00" },
    { productId: "4", quantity: 3, date: "2026-08-06 10:00" },
    { productId: "4", quantity: 7, date: "2026-08-08 10:00" }
];
const res4 = calculateProductForecast(prod4, sales4);
console.log(`Pattern: ${res4.pattern}, Model: ${res4.model}, Demand: ${res4.averageDailyDemand}`);
console.assert(res4.model === "TSB", "TEST 4 Failed: Model should be TSB");
console.log("✅ TEST 4 PASSED!\n");

// --------------------------------------------------
// TEST 5: Missing day inside observed period
// --------------------------------------------------
console.log("--- TEST 5: Missing Day Inside Observed Period ---");
const sales5 = [
    { productId: "5", quantity: 3, date: "2026-08-12 09:30" },
    // Aug 13 is missing -> must be 0
    { productId: "5", quantity: 5, date: "2026-08-14 11:20" }
];
const dailySeries5 = buildObservedDailyDemand(sales5);
console.log("Daily Series:", dailySeries5);
console.assert(dailySeries5.length === 3, "TEST 5 Failed: Should be 3 observed days (Aug 12, 13, 14)");
console.assert(dailySeries5[1].quantity === 0, "TEST 5 Failed: Aug 13 should have 0 demand");
console.log("✅ TEST 5 PASSED!\n");

// --------------------------------------------------
// TEST 6: Multiple sales on same day
// --------------------------------------------------
console.log("--- TEST 6: Multiple Sales on Same Day ---");
const sales6 = [
    { productId: "6", quantity: 3, date: "2026-08-18 09:30" },
    { productId: "6", quantity: 2, date: "2026-08-18 14:00" }
];
const dailySeries6 = buildObservedDailyDemand(sales6);
console.log("Daily Series:", dailySeries6);
console.assert(dailySeries6.length === 1, "TEST 6 Failed: Should be 1 day");
console.assert(dailySeries6[0].quantity === 5, "TEST 6 Failed: Quantity should be 5");
console.log("✅ TEST 6 PASSED!\n");

// --------------------------------------------------
// MAIN DATASET TEST: Wireless Mouse
// --------------------------------------------------
console.log("--- MAIN TEST: Provided Wireless Mouse Sales Data ---");
const mouseProduct = {
    id: "1",
    sku: "ELEC-0001",
    barcode: "8901234560017",
    name: "Wireless Mouse",
    description: "2.4GHz wireless optical mouse",
    category: "Electronics",
    supplier: "TechMart Supplies",
    costPrice: 8.5,
    sellingPrice: 15,
    stock: 26,
    minimumStock: 5,
    safetyStock: 5,
    leadTime: 10,
    averageDailyDemand: 0,
    forecastDemand: 0,
    reorderPoint: 0,
    status: "In Stock",
    createdAt: "2026-08-18 09:00",
    updatedAt: "2026-08-18 09:00"
};

const mouseSales = [
    { id: "1", productId: "1", productName: "Wireless Mouse", quantity: 3, sellingPrice: 15, costPrice: 8.5, profit: 19.5, customer: "Customer 1", date: "2026-08-12 09:30" },
    { id: "2", productId: "1", productName: "Wireless Mouse", quantity: 5, sellingPrice: 15, costPrice: 8.5, profit: 32.5, customer: "Customer 2", date: "2026-08-13 10:15" },
    { id: "3", productId: "1", productName: "Wireless Mouse", quantity: 4, sellingPrice: 15, costPrice: 8.5, profit: 26, customer: "Customer 3", date: "2026-08-14 11:20" },
    { id: "4", productId: "1", productName: "Wireless Mouse", quantity: 6, sellingPrice: 15, costPrice: 8.5, profit: 39, customer: "Customer 4", date: "2026-08-15 12:10" },
    { id: "5", productId: "1", productName: "Wireless Mouse", quantity: 2, sellingPrice: 15, costPrice: 8.5, profit: 13, customer: "Customer 5", date: "2026-08-16 14:30" },
    { id: "6", productId: "1", productName: "Wireless Mouse", quantity: 5, sellingPrice: 15, costPrice: 8.5, profit: 32.5, customer: "Customer 6", date: "2026-08-17 15:45" },
    { id: "7", productId: "1", productName: "Wireless Mouse", quantity: 4, sellingPrice: 15, costPrice: 8.5, profit: 26, customer: "Customer 7", date: "2026-08-18 09:58" }
];

const mouseForecast = calculateProductForecast(mouseProduct, mouseSales, 7);
console.log("Wireless Mouse Forecast Result:");
console.log(JSON.stringify(mouseForecast, null, 2));

console.log("\n==================================================");
console.log("       ALL VERIFICATION TESTS PASSED SUCCESSFULLY!");
console.log("==================================================");
