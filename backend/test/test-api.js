const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// ANSI terminal colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function pass(testName, details = '') {
    console.log(`  ${colors.green}✔ PASS${colors.reset} - ${colors.bold}${testName}${colors.reset} ${details ? colors.cyan + '(' + details + ')' + colors.reset : ''}`);
}

function fail(testName, error) {
    console.log(`  ${colors.red}✖ FAIL${colors.reset} - ${colors.bold}${testName}${colors.reset}`);
    console.error(`    ${colors.red}Error:${colors.reset}`, error);
}

// Generate a dummy 1x1 PNG file for testing Multer image upload
function createSampleImageFile(filePath) {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );
    fs.writeFileSync(filePath, pngBuffer);
}

async function runAllTests() {
    console.log(`\n${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.cyan}🧪 RUNNING FULL API TEST SUITE FOR PHASE 2 BACKEND${colors.reset}`);
    console.log(`${colors.bold}Base URL:${colors.reset} ${BASE_URL}`);
    console.log(`${colors.bold}====================================================${colors.reset}\n`);

    let passedCount = 0;
    let failedCount = 0;
    let authToken = '';
    let testProductId = '';

    const timestamp = Date.now();
    const testUser = {
        name: `Test User ${timestamp}`,
        email: `tester_${timestamp}@inventoryflow.com`,
        password: 'Password123!'
    };

    const tempImagePath = path.join(__dirname, `sample_${timestamp}.png`);
    createSampleImageFile(tempImagePath);

    try {
        // TEST 1: Health Check
        console.log(`${colors.yellow}[1] Testing Server Health Endpoint...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            const data = await res.json();
            if (res.ok && data.status === 'UP') {
                pass('GET /api/health', `Server is UP, Phase: ${data.phase}`);
                passedCount++;
            } else {
                throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
            }
        } catch (err) {
            fail('GET /api/health', err.message);
            failedCount++;
        }

        // TEST 2: User Registration
        console.log(`\n${colors.yellow}[2] Testing User Registration...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            });
            const data = await res.json();
            if (res.status === 201 && data.success && data.token) {
                authToken = data.token;
                pass('POST /api/auth/register', `Registered: ${data.user.email}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (err) {
            fail('POST /api/auth/register', err.message);
            failedCount++;
        }

        // TEST 3: User Login
        console.log(`\n${colors.yellow}[3] Testing User Login...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: testUser.password
                })
            });
            const data = await res.json();
            if (res.status === 200 && data.success && data.token) {
                authToken = data.token; // Update with login token
                pass('POST /api/auth/login', `Logged in, Token Length: ${data.token.length}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (err) {
            fail('POST /api/auth/login', err.message);
            failedCount++;
        }

        // TEST 4: Protected Profile Route (with Token)
        console.log(`\n${colors.yellow}[4] Testing Protected Route (GET /api/auth/me with Bearer Token)...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (res.status === 200 && data.success && data.user.email === testUser.email) {
                pass('GET /api/auth/me (Authenticated)', `User: ${data.user.name}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Profile fetch failed');
            }
        } catch (err) {
            fail('GET /api/auth/me (Authenticated)', err.message);
            failedCount++;
        }

        // TEST 5: Protected Route Rejection (without Token)
        console.log(`\n${colors.yellow}[5] Testing Protected Route Security (without Token)...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/me`);
            const data = await res.json();
            if (res.status === 401 && !data.success) {
                pass('GET /api/auth/me (Unauthenticated 401 Rejection)', 'Correctly blocked unauthorized request');
                passedCount++;
            } else {
                throw new Error('Endpoint failed to reject unauthenticated request!');
            }
        } catch (err) {
            fail('GET /api/auth/me (Unauthenticated 401 Rejection)', err.message);
            failedCount++;
        }

        // TEST 6: Create Product with Multer Image Upload
        console.log(`\n${colors.yellow}[6] Testing Product Creation with Multer Image Upload...${colors.reset}`);
        try {
            const formData = new FormData();
            formData.append('name', `Wireless Ergonomic Mouse ${timestamp}`);
            formData.append('sku', `MOU-${timestamp.toString().slice(-4)}`);
            formData.append('currentStock', '45');
            formData.append('leadTimeDays', '5');
            formData.append('category', 'Electronics');
            formData.append('price', '29.99');
            formData.append('costPrice', '15.00');

            // Attach image blob
            const fileBytes = fs.readFileSync(tempImagePath);
            const blob = new Blob([fileBytes], { type: 'image/png' });
            formData.append('image', blob, `test_mouse_${timestamp}.png`);

            const res = await fetch(`${BASE_URL}/api/products`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}` },
                body: formData
            });

            const data = await res.json();
            if (res.status === 201 && data.success && data.product) {
                testProductId = data.product._id;
                pass('POST /api/products (Multer Image Upload)', `SKU: ${data.product.sku}, Image: ${data.product.imageUrl}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Product creation failed');
            }
        } catch (err) {
            fail('POST /api/products (Multer Image Upload)', err.message);
            failedCount++;
        }

        // TEST 7: Get All Products
        console.log(`\n${colors.yellow}[7] Testing Fetch All Products...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/products`);
            const data = await res.json();
            if (res.status === 200 && data.success && Array.isArray(data.products)) {
                pass('GET /api/products', `Total Products Found: ${data.count}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Fetching products failed');
            }
        } catch (err) {
            fail('GET /api/products', err.message);
            failedCount++;
        }

        // TEST 8: Get Product By ID
        console.log(`\n${colors.yellow}[8] Testing Fetch Single Product By ID...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/products/${testProductId}`);
            const data = await res.json();
            if (res.status === 200 && data.success && data.product._id === testProductId) {
                pass('GET /api/products/:id', `Found: ${data.product.name} (Stock: ${data.product.currentStock})`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Fetching product by ID failed');
            }
        } catch (err) {
            fail('GET /api/products/:id', err.message);
            failedCount++;
        }

        // TEST 9: Update Product
        console.log(`\n${colors.yellow}[9] Testing Update Product...${colors.reset}`);
        try {
            const updateData = {
                name: `Updated Mouse ${timestamp}`,
                currentStock: 120,
                leadTimeDays: 8
            };

            const res = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await res.json();
            if (res.status === 200 && data.success && data.product.currentStock === 120) {
                pass('PUT /api/products/:id', `New Stock: ${data.product.currentStock}, Lead Time: ${data.product.leadTimeDays}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Update failed');
            }
        } catch (err) {
            fail('PUT /api/products/:id', err.message);
            failedCount++;
        }

        // TEST 10: Delete Product
        console.log(`\n${colors.yellow}[10] Testing Delete Product...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const data = await res.json();
            if (res.status === 200 && data.success) {
                pass('DELETE /api/products/:id', `Deleted ID: ${testProductId}`);
                passedCount++;
            } else {
                throw new Error(data.message || 'Delete failed');
            }
        } catch (err) {
            fail('DELETE /api/products/:id', err.message);
            failedCount++;
        }

        // TEST 11: Confirm Product is Deleted (404)
        console.log(`\n${colors.yellow}[11] Verifying Deleted Product Returns 404...${colors.reset}`);
        try {
            const res = await fetch(`${BASE_URL}/api/products/${testProductId}`);
            if (res.status === 404) {
                pass('GET /api/products/:id (Post-Delete 404 Check)', 'Product successfully removed from database');
                passedCount++;
            } else {
                throw new Error(`Expected 404 but got ${res.status}`);
            }
        } catch (err) {
            fail('GET /api/products/:id (Post-Delete 404 Check)', err.message);
            failedCount++;
        }

    } finally {
        // Cleanup temp file
        if (fs.existsSync(tempImagePath)) {
            fs.unlinkSync(tempImagePath);
        }
    }

    console.log(`\n${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.bold}TEST RESULTS SUMMARY:${colors.reset}`);
    console.log(`  ${colors.green}Passed:${colors.reset} ${passedCount}`);
    console.log(`  ${colors.red}Failed:${colors.reset} ${failedCount}`);
    console.log(`${colors.bold}====================================================${colors.reset}\n`);

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllTests();
