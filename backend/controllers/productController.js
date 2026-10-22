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
 * @desc    Create a new product (handles image upload)
 * @route   POST /api/products
 * @access  Private / Protected
 */
const createProduct = async (req, res) => {
    try {
        const {
            name,
            sku,
            currentStock,
            leadTimeDays,
            category,
            description,
            price,
            costPrice,
            safetyStock,
            reorderPoint,
            imageUrl: bodyImageUrl
        } = req.body;

        // Validation for required fields
        if (!name || !sku) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: 'Product name and SKU are required'
            });
        }

        // Check if SKU already exists
        const existingProduct = await Product.findOne({ sku: sku.toUpperCase().trim() });
        if (existingProduct) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: `Product with SKU "${sku.toUpperCase().trim()}" already exists`
            });
        }

        // Determine image URL
        let finalImageUrl = '';
        if (req.file) {
            finalImageUrl = `/uploads/products/${req.file.filename}`;
        } else if (bodyImageUrl) {
            finalImageUrl = bodyImageUrl.trim();
        }

        // Stock and lead time parsing
        const parsedStock = currentStock !== undefined ? Number(currentStock) : 0;
        const parsedLeadTime = leadTimeDays !== undefined ? Number(leadTimeDays) : 7;

        if (isNaN(parsedStock) || parsedStock < 0) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: 'Current stock must be a non-negative number'
            });
        }

        if (isNaN(parsedLeadTime) || parsedLeadTime < 1) {
            if (req.file) deleteFileIfExists(`/uploads/products/${req.file.filename}`);
            return res.status(400).json({
                success: false,
                message: 'Lead time must be at least 1 day'
            });
        }

        // Create product
        const product = await Product.create({
            name: name.trim(),
            sku: sku.toUpperCase().trim(),
            currentStock: parsedStock,
            leadTimeDays: parsedLeadTime,
            imageUrl: finalImageUrl,
            category: category ? category.trim() : 'General',
            description: description ? description.trim() : '',
            price: price !== undefined ? Number(price) : 0,
            costPrice: costPrice !== undefined ? Number(costPrice) : 0,
            safetyStock: safetyStock !== undefined ? Number(safetyStock) : 0,
            reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : 0,
            createdBy: req.user ? req.user._id : null
        });

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
 * @route   GET /api/products
 * @access  Public / Optional Auth
 */
const getProducts = async (req, res) => {
    try {
        const { search, category, status } = req.query;
        let query = {};

        // Search by name or SKU
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by category
        if (category && category !== 'All') {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }

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
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        let product;

        // Check if parameter is a valid MongoDB ObjectId
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(id).populate('createdBy', 'name email');
        } else {
            // Otherwise try finding by SKU
            product = await Product.findOne({
                sku: id.toUpperCase().trim()
            }).populate('createdBy', 'name email');
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product with ID or SKU "${id}" not found`
            });
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
 * @desc    Update a product (can also update image)
 * @route   PUT /api/products/:id
 * @access  Private / Protected
 */
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

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
            currentStock,
            leadTimeDays,
            category,
            description,
            price,
            costPrice,
            safetyStock,
            reorderPoint,
            imageUrl: bodyImageUrl
        } = req.body;

        // If SKU is being changed, verify uniqueness
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

        // Update fields if provided
        if (name !== undefined) product.name = name.trim();
        if (currentStock !== undefined) product.currentStock = Number(currentStock);
        if (leadTimeDays !== undefined) product.leadTimeDays = Number(leadTimeDays);
        if (category !== undefined) product.category = category.trim();
        if (description !== undefined) product.description = description.trim();
        if (price !== undefined) product.price = Number(price);
        if (costPrice !== undefined) product.costPrice = Number(costPrice);
        if (safetyStock !== undefined) product.safetyStock = Number(safetyStock);
        if (reorderPoint !== undefined) product.reorderPoint = Number(reorderPoint);

        // Update image if new file is uploaded
        if (req.file) {
            // Delete previous local file
            deleteFileIfExists(product.imageUrl);
            product.imageUrl = `/uploads/products/${req.file.filename}`;
        } else if (bodyImageUrl !== undefined) {
            product.imageUrl = bodyImageUrl.trim();
        }

        const updatedProduct = await product.save();

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
 * @desc    Delete a product (also removes its uploaded image)
 * @route   DELETE /api/products/:id
 * @access  Private / Protected
 */
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product not found with id ${id}`
            });
        }

        // Delete uploaded image file from server storage
        deleteFileIfExists(product.imageUrl);

        await product.deleteOne();

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
