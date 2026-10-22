# 📦 InventoryIQ — Phase 2 Backend API

> **Node.js + Express + MongoDB (Mongoose) + JWT Authentication + Multer Image Upload**  
> Complete backend service for the **Inventory Reorder Point & Demand Forecasting Tool**.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Running the Server](#-running-the-server)
- [API Endpoints](#-api-endpoints)
  - [Authentication Routes](#1-authentication-routes-apiauth)
  - [Product Management Routes](#2-product-management-routes-apiproducts)
  - [System Health & Tester](#3-health--browser-tester)
- [Multer File Upload Details](#-multer-file-upload-details)
- [LocalStorage ⇄ MongoDB Bridge](#-localstorage--mongodb-bridge)
- [Automated Testing](#-automated-testing)

---

## 🌟 Overview

This backend handles Phase 2 core server requirements:
1. **User Authentication:** Registration, Login, bcrypt password hashing, and JWT token issuance.
2. **Protected Routes:** `authMiddleware.js` verifies `Bearer <token>` in the `Authorization` header.
3. **Product Management:** Complete CRUD operations for products with unique SKUs and stock tracking.
4. **Multer Image Upload:** Handles product photo uploads, validates image file types, generates unique filenames, and stores images in `/uploads/products/`.
5. **MongoDB / Mongoose Integration:** Real-time database persistence with automatic timestamps, indexes, and validation.

---

## 📁 Folder Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB Mongoose connection
├── controllers/
│   ├── authController.js     # User registration, login, profile logic
│   └── productController.js  # Product CRUD & image handling logic
├── middleware/
│   ├── authMiddleware.js     # JWT verification & route protection
│   └── uploadMiddleware.js   # Multer storage, limits & file filtering
├── models/
│   ├── User.js               # User schema (email, hashed password, role)
│   └── Product.js            # Product schema (name, sku, currentStock, leadTimeDays, imageUrl)
├── routes/
│   ├── authRoutes.js         # /api/auth routes
│   └── productRoutes.js      # /api/products routes
├── uploads/
│   └── products/             # Destination for uploaded product images
├── test/
│   └── test-api.js           # Automated end-to-end API test suite
├── api-tester.html           # Interactive browser tester & LocalStorage bridge
├── .env                      # Environment config (PORT, MONGO_URI, JWT_SECRET)
├── .env.example              # Environment variables template
├── package.json              # Node dependencies & scripts
└── server.js                 # Express application entry point
```

---

## 🚀 Installation & Setup

```bash
cd backend
npm install
```

---

## ⚙️ Environment Variables

Create or edit `.env` in the `backend/` folder:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/inventory_flow_db
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRE=7d
```

---

## 🏃 Running the Server

### Normal Mode:
```bash
npm start
```

### Development Mode (with hot-reload):
```bash
npm run dev
```

Server runs on: **`http://localhost:5000`**

---

## 📡 API Endpoints

### 1. Authentication Routes (`/api/auth`)

#### `POST /api/auth/register`
Create a new user account.
- **Access:** Public
- **Body:**
```json
{
  "name": "Aman Sharma",
  "email": "aman@example.com",
  "password": "Password123!"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6ada053165c5b6d93e2c7cff",
    "name": "Aman Sharma",
    "email": "aman@example.com",
    "role": "user"
  }
}
```

#### `POST /api/auth/login`
Authenticate existing user and retrieve JWT token.
- **Access:** Public
- **Body:**
```json
{
  "email": "aman@example.com",
  "password": "Password123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### `GET /api/auth/me`
Retrieve currently logged-in user profile.
- **Access:** Private (Header: `Authorization: Bearer <token>`)
- **Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "6ada053165c5b6d93e2c7cff",
    "name": "Aman Sharma",
    "email": "aman@example.com",
    "role": "user"
  }
}
```

---

### 2. Product Management Routes (`/api/products`)

#### `GET /api/products`
Fetch all products. Supports optional query filters `?search=mouse&category=Electronics`.
- **Access:** Public

#### `GET /api/products/:id`
Fetch single product by its MongoDB `_id` or unique `sku`.
- **Access:** Public

#### `POST /api/products`
Create a product with image upload via Multer.
- **Access:** Private (Header: `Authorization: Bearer <token>`)
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `name`: string (required)
  - `sku`: string (required, unique)
  - `currentStock`: number (required)
  - `leadTimeDays`: number (required)
  - `category`: string (optional)
  - `price`: number (optional)
  - `image`: file (`.jpg`, `.jpeg`, `.png`, `.webp`, max 5MB)
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "_id": "6ada053165c5b6d93e2c7cff",
    "name": "Pro Wireless Mouse",
    "sku": "MOU-101",
    "currentStock": 75,
    "leadTimeDays": 6,
    "imageUrl": "/uploads/products/product-Pro_Wireless_Mouse-1792673073586.png",
    "category": "Electronics",
    "price": 49.99,
    "status": "In Stock"
  }
}
```

#### `PUT /api/products/:id`
Update an existing product (supports replacing the image file).
- **Access:** Private (Header: `Authorization: Bearer <token>`)

#### `DELETE /api/products/:id`
Delete a product and automatically unlink its uploaded image from disk.
- **Access:** Private (Header: `Authorization: Bearer <token>`)

---

### 3. Health & Browser Tester

- **Health Check:** `GET http://localhost:5000/api/health`
- **Interactive UI Tester:** Open in your browser: `http://localhost:5000/tester`

---

## 🧪 Automated Testing

Run the full end-to-end automated test suite:

```bash
npm test
```

This verifies:
1. Health check response
2. User registration
3. User login & JWT generation
4. Accessing protected `/api/auth/me` with Bearer token
5. Rejection of unauthenticated requests with HTTP 401
6. Creating product with real multipart/form-data Multer image upload
7. Fetching all products from MongoDB
8. Fetching product by ID
9. Updating product stock & lead time
10. Deleting product and unlinking uploaded image
11. Verifying 404 on deleted product
