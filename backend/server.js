const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
const connectDB = require('./config/db');

// Seed Helper
const seedInitialData = async () => {
    try {
        const User = require('./models/User');
        const Product = require('./models/Product');
        const Category = require('./models/Category');
        const SaleRecord = require('./models/SaleRecord');

        const productCount = await Product.countDocuments();
        if (productCount > 0) {
            return; // Already populated
        }

        console.log('🌱 Seeding initial demo inventory & sales data into MongoDB...');

        // 1. Seed Demo Admin & User
        let demoUser = await User.findOne({ email: 'demo@inventoryflow.com' });
        if (!demoUser) {
            demoUser = await User.create({
                firstName: 'Aman',
                lastName: 'Sharma',
                name: 'Aman Sharma',
                email: 'demo@inventoryflow.com',
                password: 'password123',
                role: 'admin'
            });
        }

        let adminUser = await User.findOne({ email: 'admin@inventoryflow.com' });
        if (!adminUser) {
            adminUser = await User.create({
                firstName: 'Admin',
                lastName: 'User',
                name: 'Admin User',
                email: 'admin@inventoryflow.com',
                password: 'password123',
                role: 'admin'
            });
        }

        // 2. Seed Demo Categories
        const categoriesData = [
            { name: 'Electronics', description: 'Gadgets, components and electronic devices' },
            { name: 'Audio & Acoustics', description: 'Headphones, speakers and microphones' },
            { name: 'Wearables', description: 'Smartwatches, fitness bands and accessories' },
            { name: 'Office & Desk', description: 'Ergonomic equipment and desk essentials' }
        ];

        for (const cat of categoriesData) {
            await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
        }

        // 3. Seed Demo Products
        const productsData = [
            {
                name: 'Quantum Wireless Earbuds Pro',
                sku: 'QW-EAR-001',
                barcode: '8901234567890',
                category: 'Audio & Acoustics',
                supplier: 'Acoustic Innovations Ltd',
                currentStock: 12, // Needs reorder
                leadTimeDays: 5,
                safetyStock: 10,
                price: 129.99,
                costPrice: 65.00,
                description: 'Active noise cancelling wireless earbuds with 36hr battery.',
                imageUrl: ''
            },
            {
                name: 'UltraWide Curved 34-inch Monitor',
                sku: 'MON-UW-34',
                barcode: '8901234567891',
                category: 'Electronics',
                supplier: 'VisionTech Displays',
                currentStock: 4, // Critical Reorder
                leadTimeDays: 14,
                safetyStock: 5,
                price: 549.99,
                costPrice: 320.00,
                description: '144Hz WQHD IPS display for high productivity.',
                imageUrl: ''
            },
            {
                name: 'Mechanical RGB Gaming Keyboard',
                sku: 'KB-MECH-RGB',
                barcode: '8901234567892',
                category: 'Electronics',
                supplier: 'Nexus Peripherals',
                currentStock: 65, // In Stock
                leadTimeDays: 7,
                safetyStock: 15,
                price: 89.99,
                costPrice: 42.00,
                description: 'Hot-swappable switches with customizable RGB per key.',
                imageUrl: ''
            },
            {
                name: 'Apex Smart Fitness Watch 2',
                sku: 'WTCH-APEX-02',
                barcode: '8901234567893',
                category: 'Wearables',
                supplier: 'Apex Wearables Corp',
                currentStock: 8, // Low Stock / Reorder
                leadTimeDays: 6,
                safetyStock: 10,
                price: 199.99,
                costPrice: 95.00,
                description: 'Heart rate, SpO2 tracking and GPS navigation.',
                imageUrl: ''
            },
            {
                name: 'Ergonomic Mesh Task Chair',
                sku: 'CHR-ERGO-01',
                barcode: '8901234567894',
                category: 'Office & Desk',
                supplier: 'ErgoComfort Inc',
                currentStock: 0, // Out of Stock
                leadTimeDays: 10,
                safetyStock: 8,
                price: 249.99,
                costPrice: 120.00,
                description: 'Lumbar support breathable mesh with 3D armrests.',
                imageUrl: ''
            }
        ];

        const createdProducts = [];
        for (const p of productsData) {
            const prod = await Product.create({
                ...p,
                createdBy: adminUser._id
            });
            createdProducts.push(prod);
        }

        // 4. Seed 30 days of sales history
        const now = new Date();
        const salesToInsert = [];

        createdProducts.forEach((prod) => {
            for (let daysAgo = 28; daysAgo >= 0; daysAgo--) {
                const saleDate = new Date(now);
                saleDate.setDate(saleDate.getDate() - daysAgo);

                const shouldHaveSale = Math.random() > 0.15;
                if (shouldHaveSale) {
                    const quantity = Math.floor(Math.random() * 5) + 2;
                    salesToInsert.push({
                        productId: prod._id,
                        productName: prod.name,
                        productSku: prod.sku,
                        quantity,
                        sellingPrice: prod.price,
                        totalAmount: Number((quantity * prod.price).toFixed(2)),
                        date: saleDate,
                        paymentMethod: ['Cash', 'Card', 'UPI', 'Online'][Math.floor(Math.random() * 4)],
                        customerName: `Customer #${Math.floor(100 + Math.random() * 900)}`,
                        createdBy: adminUser._id
                    });
                }
            }
        });

        if (salesToInsert.length > 0) {
            await SaleRecord.insertMany(salesToInsert);
        }

        console.log(`✅ Seeded ${createdProducts.length} products, 4 categories, and ${salesToInsert.length} sales into MongoDB!`);
    } catch (seedErr) {
        console.error('Data seeding warning:', seedErr.message);
    }
};

// Initialize Express app
const app = express();

// Core Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        server: 'InventoryIQ Phase 1 + Phase 2 Backend',
        database: 'MongoDB Active',
        timestamp: new Date().toISOString()
    });
});

// Mount All API & Dual Routes (Supports both REST /api/... and Phase 1 JSON-Server style)
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

// Primary REST Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/users', userRoutes);

// Dual Phase 1 Compatibility Endpoints
app.use('/products', productRoutes);
app.use('/sales', saleRoutes);
app.use('/categories', categoryRoutes);
app.use('/forecast', forecastRoutes);
app.use('/users', userRoutes);

// Root API documentation endpoint
app.get('/api', (req, res) => {
    res.status(200).json({
        message: '📦 Welcome to InventoryIQ Backend API & AI Forecast Engine',
        version: '2.0.0',
        database: 'MongoDB',
        endpoints: {
            products: '/api/products or /products',
            sales: '/api/sales or /sales',
            categories: '/api/categories or /categories',
            forecast: '/api/forecast or /forecast',
            users: '/api/users or /users',
            auth: '/api/auth'
        }
    });
});

// Serve Frontend Web Application Directly
const frontendPath = fs.existsSync(path.join(__dirname, '..', 'frontend'))
    ? path.join(__dirname, '..', 'frontend')
    : path.join(__dirname, '..', 'phase01');

if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));

    // Redirect root to dashboard.html if index.html is requested or root
    app.get('/', (req, res) => {
        res.sendFile(path.join(frontendPath, 'dashboard.html'));
    });
}

// 404 Route Handler for unmatched API endpoints
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
        return res.status(404).json({
            success: false,
            message: `Endpoint not found: ${req.method} ${req.originalUrl}`
        });
    }
    // Fallback to dashboard for client side navigation
    if (fs.existsSync(frontendPath)) {
        res.sendFile(path.join(frontendPath, 'dashboard.html'));
    } else {
        res.status(404).send('Frontend not found');
    }
});

// Central Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum allowed size is 5MB.'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Start Server and connect Database
const PORT = process.env.PORT || 5000;
let serverInstance = null;

const startServer = async () => {
    await connectDB();
    await seedInitialData();

    serverInstance = app.listen(PORT, () => {
        console.log(`🚀 InventoryIQ Backend running on http://localhost:${PORT}`);
        console.log(`🌐 Serving Phase 1 UI at http://localhost:${PORT}/dashboard.html`);
    });
};

startServer();

module.exports = { app, server: serverInstance };
