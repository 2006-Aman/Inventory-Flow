/**
 * Comprehensive Automated Test Suite for InventoryIQ Phase 2
 * Tests Auth, Categories, Products, Sales (Anti-Cheat Stock Deduction), Forecast & ROP
 */

const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

let authToken = '';
let testProductId = '';
let testCategoryId = '';

const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const runTests = async () => {
    console.log('🧪 Starting Phase 2 API Automated Test Suite...\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, testName, details = '') => {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
            failed++;
        }
    };

    try {
        // 1. Health Check
        const health = await request('GET', '/api/health');
        assert(health.status === 200 && health.data.status === 'UP', 'Health Endpoint (GET /api/health)');

        // 2. Auth Login (Seed User)
        const loginRes = await request('POST', '/api/auth/login', {
            email: 'admin@inventoryflow.com',
            password: 'password123'
        });
        assert(loginRes.status === 200 && !!loginRes.data.token, 'Login with Seed User (POST /api/auth/login)');
        authToken = loginRes.data.token;

        // 3. Auth Profile (GET /api/auth/me)
        const meRes = await request('GET', '/api/auth/me', null, authToken);
        assert(meRes.status === 200 && meRes.data.user.email === 'admin@inventoryflow.com', 'Get User Profile (GET /api/auth/me)');

        // 4. Categories List
        const catRes = await request('GET', '/api/categories');
        assert(catRes.status === 200 && Array.isArray(catRes.data.categories) && catRes.data.categories.length > 0, 'List Categories (GET /api/categories)');
        testCategoryId = catRes.data.categories[0]._id;

        // 5. Create Category
        const newCatName = `Gadgets-${Date.now()}`;
        const createCatRes = await request('POST', '/api/categories', {
            name: newCatName,
            description: 'Cutting edge portable tech gadgets',
            status: 'Active'
        }, authToken);
        assert(createCatRes.status === 201 && createCatRes.data.category.name === newCatName, 'Create Category (POST /api/categories)');

        // 6. Products List
        const prodRes = await request('GET', '/api/products');
        assert(prodRes.status === 200 && Array.isArray(prodRes.data.products) && prodRes.data.products.length > 0, 'List Products (GET /api/products)');
        testProductId = prodRes.data.products[0]._id;
        const initialStock = prodRes.data.products[0].currentStock;

        // 7. Create Product
        const newSku = `SKU-TEST-${Date.now().toString().slice(-4)}`;
        const createProdRes = await request('POST', '/api/products', {
            name: 'Solar Powered Wireless Charger',
            sku: newSku,
            category: 'Electronics',
            currentStock: 30,
            leadTimeDays: 7,
            safetyStock: 5,
            price: 49.99,
            costPrice: 22.00
        }, authToken);
        assert(createProdRes.status === 201 && createProdRes.data.product.sku === newSku, 'Create Product (POST /api/products)');

        // 8. Log Sale & Inventory Decrement (Anti-Cheat)
        const inStockProduct = prodRes.data.products.find(p => p.currentStock >= 10) || createProdRes.data.product;
        const targetSaleProductId = inStockProduct._id;
        const targetInitialStock = inStockProduct.currentStock;
        const saleQuantity = 2;
        const saleRes = await request('POST', '/api/sales', {
            productId: targetSaleProductId,
            quantity: saleQuantity,
            sellingPrice: 129.99,
            paymentMethod: 'UPI',
            customerName: 'Aman Test Buyer'
        }, authToken);
        assert(saleRes.status === 201 && saleRes.data.updatedProduct && saleRes.data.updatedProduct.remainingStock === (targetInitialStock - saleQuantity), 'Log Sale & Deduct Stock (POST /api/sales)');

        // 9. Anti-Cheat: Reject sale when quantity > stock
        const badSaleRes = await request('POST', '/api/sales', {
            productId: testProductId,
            quantity: 999999, // Impossible quantity
            sellingPrice: 129.99
        }, authToken);
        assert(badSaleRes.status === 400, 'Anti-Cheat: Reject Sale Exceeding Current Inventory');

        // 10. Forecast Overview & Moving Average
        const forecastRes = await request('GET', '/api/forecast?forecastDays=7');
        assert(forecastRes.status === 200 && Array.isArray(forecastRes.data.forecasts), 'Forecast Overview (GET /api/forecast)');
        assert(forecastRes.data.summary.activeAlertsCount >= 0, 'Forecast Reorder Alerts Flagged');

        // 11. Active Reorder Alerts
        const alertsRes = await request('GET', '/api/forecast/alerts');
        assert(alertsRes.status === 200 && Array.isArray(alertsRes.data.alerts), 'Get Active Reorder Alerts (GET /api/forecast/alerts)');

        // 12. Single Product Forecast Breakdown
        const singleForecastRes = await request('GET', `/api/forecast/product/${testProductId}`);
        assert(singleForecastRes.status === 200 && singleForecastRes.data.forecast.reorderPoint !== undefined, 'Single Product Forecast & ROP (GET /api/forecast/product/:id)');

        // 13. Simulate Forecast Calculation
        const simRes = await request('POST', '/api/forecast/simulate', {
            leadTimeDays: 8,
            safetyStock: 6,
            currentStock: 15,
            dailySalesHistory: [3, 5, 4, 7, 6, 8, 5],
            forecastDays: 7
        });
        assert(simRes.status === 200 && simRes.data.simulation.reorderPoint > 0, 'Simulate Forecast Math (POST /api/forecast/simulate)');

        // 14. Sales Statistics
        const statsRes = await request('GET', '/api/sales/stats');
        assert(statsRes.status === 200 && statsRes.data.stats.totalTransactions > 0, 'Sales Statistics & Analytics (GET /api/sales/stats)');

        console.log(`\n===========================================`);
        console.log(`🎯 Test Results: ${passed} Passed, ${failed} Failed`);
        console.log(`===========================================\n`);

        process.exit(failed > 0 ? 1 : 0);
    } catch (e) {
        console.error('Test Suite encountered an unexpected error:', e);
        process.exit(1);
    }
};

runTests();
