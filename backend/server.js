const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database
const connectDB = require('./config/db');
connectDB();

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

// Interactive Web API Tester & LocalStorage Bridge
app.get('/tester', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-tester.html'));
});

// Health check and root API endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        server: 'InventoryIQ & Forecasting API',
        phase: 'Phase 2 Backend',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        message: '📦 Welcome to Inventory Reorder Point & Demand Forecasting Backend API',
        phase: 2,
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me (Bearer Token Required)'
            },
            products: {
                list: 'GET /api/products',
                getById: 'GET /api/products/:id',
                create: 'POST /api/products (Bearer Token Required, supports multipart/form-data with "image")',
                update: 'PUT /api/products/:id (Bearer Token Required, supports multipart/form-data with "image")',
                delete: 'DELETE /api/products/:id (Bearer Token Required)'
            },
            health: 'GET /api/health'
        }
    });
});

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// 404 Route Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

// Central Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);

    // Multer-specific error handling
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum allowed size is 5MB.'
        });
    }

    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Mongoose bad ObjectId error
    if (err.name === 'CastError') {
        return res.status(404).json({
            success: false,
            message: `Resource not found with id of ${err.value}`
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `Duplicate field value entered: ${field}. Please use another value.`
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((val) => val.message);
        return res.status(400).json({
            success: false,
            message: messages.join(', ')
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 InventoryIQ Backend running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// Export app and server for testing
module.exports = { app, server };
