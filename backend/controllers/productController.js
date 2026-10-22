const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

/**
 * Helper to remove old uploaded image from disk
 */
const deleteFileIfExists = (fileUrl) => {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    try {
        const filePath = path.join(__dirname, '..', fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('Error deleting image file:', err.message);
    }
};

/**
 * @desc    Create a new product (supports JSON and Multer image upload)
 * @route   POST /api/products or POST /products
 * @access  Public / Protected
 */
const createProduct = async (req, res) => {
    try {
        const {
            name,
            sku,
            barcode,
            currentStock,
            stock,
            leadTimeDays,
            leadTime,
            category,
            supplier,
            location,
            description,
            price,
            sellingPrice,
            costPrice,
            safetyStock,
            reorderPoint,
            minimumStock,
            imageUrl: bodyImageUrl
        } = req.body;

        // Validation for required fields
        if (!name) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: 'Product name is required'
            });
        }

        const generatedSku = sku ? sku.toUpperCase().trim() : `SKU-${Date.now().toString().slice(-6)}`;

        // Check if SKU already exists
        const existingProduct = await Product.findOne({ sku: generatedSku });
        if (existingProduct) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: `Product with SKU "${generatedSku}" already exists`
            });
        }

        // Determine image URL
        let finalImageUrl = '';
        if (req.file) {
            finalImageUrl = `/uploads/products/${req.file.filename}`;
        } else if (bodyImageUrl) {
            finalImageUrl = bodyImageUrl.trim();
        }

        // Stock and lead time resolution
        const rawStock = stock !== undefined ? stock : currentStock;
        const parsedStock = rawStock !== undefined ? Number(rawStock) : 0;

        const rawLeadTime = leadTime !== undefined ? leadTime : leadTimeDays;
        const parsedLeadTime = rawLeadTime !== undefined ? Number(rawLeadTime) : 7;

        const rawPrice = sellingPrice !== undefined ? sellingPrice : price;
        const parsedPrice = rawPrice !== undefined ? Number(rawPrice) : 0;

        // Create product in MongoDB
        const product = await Product.create({
            name: name.trim(),
            sku: generatedSku,
            barcode: barcode ? barcode.trim() : '',
            currentStock: Math.max(0, parsedStock),
            minimumStock: minimumStock !== undefined ? Number(minimumStock) : 5,
            leadTimeDays: Math.max(1, parsedLeadTime),
            imageUrl: finalImageUrl,
            category: category ? category.trim() : 'General',
            supplier: supplier ? supplier.trim() : 'Global Supplier',
            location: location ? location.trim() : 'Warehouse A',
            description: description ? description.trim() : '',
            price: Math.max(0, parsedPrice),
            costPrice: costPrice !== undefined ? Number(costPrice) : 0,
            safetyStock: safetyStock !== undefined ? Number(safetyStock) : 0,
            reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : 0,
            createdBy: req.user ? req.user._id : null
        });

        // If called from Phase 1 without /api prefix, return the object directly
        if (!req.originalUrl.startsWith('/api')) {
            return res.status(201).json(product);
        }

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
        console.error('Create Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating product',
            error: error.message
        });
    }
};

/**
 * @desc    Get all products (with optional search and category filters)
 * @route   GET /api/products or GET /products
 * @access  Public / Optional Auth
 */
const getProducts = async (req, res) => {
    try {
        const { search, category, status } = req.query;
        let andConditions = [];

        // Per-user data isolation: New users see only their own products; demo/admin see demo catalog
        if (req.user) {
            const isDemoOrAdmin = req.user.email === 'demo@inventoryflow.com' || req.user.email === 'admin@inventoryflow.com';
            if (isDemoOrAdmin) {
                andConditions.push({
                    $or: [
                        { createdBy: req.user._id },
                        { createdBy: null },
                        { createdBy: { $exists: false } }
                    ]
                });
            } else {
                andConditions.push({ createdBy: req.user._id });
            }
        }

        // Search by name, SKU, or barcode
        if (search) {
            andConditions.push({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } },
                    { barcode: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Filter by category
        if (category && category !== 'All' && category !== '') {
            andConditions.push({ category: { $regex: new RegExp(`^${category}$`, 'i') } });
        }

        const query = andConditions.length > 0 ? { $and: andConditions } : {};

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');

        // Optional post-filter by virtual status
        let results = products;
        if (status && status !== 'All') {
            results = products.filter(
                (p) => p.status.toLowerCase() === status.toLowerCase()
            );
        }

        // Return raw array if called without /api or format=raw
        if (!req.originalUrl.startsWith('/api') || req.query.format === 'raw') {
            return res.status(200).json(results);
        }

        res.status(200).json({
            success: true,
            count: results.length,
            products: results
        });
    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving products',
            error: error.message
        });
    }
};

/**
 * @desc    Get single product by ID or SKU
 * @route   GET /api/products/:id or GET /products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        let product;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(id).populate('createdBy', 'name email');
        } else {
            product = await Product.findOne({ sku: id.toUpperCase().trim() }).populate('createdBy', 'name email');
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product with ID or SKU "${id}" not found`
            });
        }

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(product);
        }

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Get Product By ID Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving product',
            error: error.message
        });
    }
};

/**
 * @desc    Update a product (stock, details, or image)
 * @route   PUT /api/products/:id or PUT /products/:id
 * @access  Public / Protected
 */
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        let product;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(id);
        } else {
            product = await Product.findOne({ sku: id.toUpperCase().trim() });
        }

        if (!product) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(404).json({
                success: false,
                message: `Product not found with id ${id}`
            });
        }

        const {
            name,
            sku,
            barcode,
            currentStock,
            stock,
            leadTimeDays,
            leadTime,
            category,
            supplier,
            location,
            description,
            price,
            sellingPrice,
            costPrice,
            safetyStock,
            reorderPoint,
            minimumStock,
            imageUrl: bodyImageUrl
        } = req.body;

        if (sku && sku.toUpperCase().trim() !== product.sku) {
            const skuExists = await Product.findOne({
                sku: sku.toUpperCase().trim(),
                _id: { $ne: product._id }
            });
            if (skuExists) {
                if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
                return res.status(400).json({
                    success: false,
                    message: `Product with SKU "${sku.toUpperCase().trim()}" already exists`
                });
            }
            product.sku = sku.toUpperCase().trim();
        }

        if (name !== undefined) product.name = name.trim();
        if (barcode !== undefined) product.barcode = barcode.trim();
        if (stock !== undefined) product.currentStock = Number(stock);
        else if (currentStock !== undefined) product.currentStock = Number(currentStock);

        if (leadTime !== undefined) product.leadTimeDays = Number(leadTime);
        else if (leadTimeDays !== undefined) product.leadTimeDays = Number(leadTimeDays);

        if (category !== undefined) product.category = category.trim();
        if (supplier !== undefined) product.supplier = supplier.trim();
        if (location !== undefined) product.location = location.trim();
        if (description !== undefined) product.description = description.trim();

        if (sellingPrice !== undefined) product.price = Number(sellingPrice);
        else if (price !== undefined) product.price = Number(price);

        if (costPrice !== undefined) product.costPrice = Number(costPrice);
        if (safetyStock !== undefined) product.safetyStock = Number(safetyStock);
        if (reorderPoint !== undefined) product.reorderPoint = Number(reorderPoint);
        if (minimumStock !== undefined) product.minimumStock = Number(minimumStock);

        if (req.file) {
            deleteFileIfExists(product.imageUrl);
            product.imageUrl = `/uploads/products/${req.file.filename}`;
        } else if (bodyImageUrl !== undefined) {
            product.imageUrl = bodyImageUrl.trim();
        }

        const updatedProduct = await product.save();

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(updatedProduct);
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
        console.error('Update Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating product',
            error: error.message
        });
    }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id or DELETE /products/:id
 * @access  Public / Protected
 */
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        let product;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(id);
        } else {
            product = await Product.findOne({ sku: id.toUpperCase().trim() });
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product not found with id ${id}`
            });
        }

        deleteFileIfExists(product.imageUrl);
        await product.deleteOne();

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json({ id, message: 'Deleted successfully' });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
            deletedProductId: id
        });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting product',
            error: error.message
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
};
