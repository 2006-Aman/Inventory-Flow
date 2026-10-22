const SaleRecord = require('../models/SaleRecord');
const Product = require('../models/Product');

/**
 * Helper to resolve product either by Mongo ObjectId or SKU or Name
 */
const findProductFlexible = async (identifier) => {
    if (!identifier) return null;
    const str = String(identifier).trim();
    if (str.match(/^[0-9a-fA-F]{24}$/)) {
        const p = await Product.findById(str);
        if (p) return p;
    }
    const bySku = await Product.findOne({ sku: str.toUpperCase() });
    if (bySku) return bySku;
    return await Product.findOne({ name: { $regex: new RegExp(`^${str}$`, 'i') } });
};

/**
 * @desc    Record a new sale transaction (deducts inventory stock and checks ROP)
 * @route   POST /api/sales or POST /sales
 * @access  Public / Protected
 */
const createSale = async (req, res) => {
    try {
        const {
            productId,
            id,
            productName,
            productSku,
            quantity,
            qty,
            sellingPrice,
            price,
            total,
            totalAmount,
            date,
            paymentMethod,
            payment,
            customerName,
            customer,
            notes
        } = req.body;

        const targetId = productId || id || productName || productSku;
        if (!targetId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, SKU or Name is required for a sale'
            });
        }

        const saleQty = Number(quantity !== undefined ? quantity : (qty || 1));
        if (isNaN(saleQty) || saleQty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Sale quantity must be a positive number greater than 0'
            });
        }

        // Find the product in MongoDB
        const product = await findProductFlexible(targetId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product "${targetId}" not found in inventory`
            });
        }

        // Anti-Cheat / Inventory Integrity: Check stock availability
        if (product.currentStock < saleQty) {
            return res.status(400).json({
                success: false,
                message: `Insufficient inventory! Available stock for "${product.name}" is ${product.currentStock}, but attempted to sell ${saleQty}.`,
                currentStock: product.currentStock,
                requestedQuantity: saleQty
            });
        }

        // Price resolution
        const rawPrice = sellingPrice !== undefined ? sellingPrice : (price !== undefined ? price : product.price);
        const unitPrice = Number(rawPrice) || Number(product.price || 0);

        // Deduct inventory stock in MongoDB
        product.currentStock -= saleQty;
        await product.save();

        // Check if reorder alert is triggered
        const needsReorder = product.reorderPoint > 0 && product.currentStock <= product.reorderPoint;
        const isOutOfStock = product.currentStock === 0;

        // Record the sale in MongoDB
        const sale = await SaleRecord.create({
            productId: product._id,
            productName: product.name,
            productSku: product.sku,
            quantity: saleQty,
            sellingPrice: unitPrice,
            totalAmount: Number((saleQty * unitPrice).toFixed(2)),
            date: date ? new Date(date) : new Date(),
            paymentMethod: paymentMethod || payment || 'Cash',
            customerName: customerName || customer || 'Walk-in Customer',
            notes: notes ? notes.trim() : '',
            createdBy: req.user ? req.user._id : null
        });

        // Format for Phase 1 JSON-Server client
        if (!req.originalUrl.startsWith('/api')) {
            const formattedSale = {
                id: sale._id.toString(),
                _id: sale._id,
                productId: product._id.toString(),
                productName: product.name,
                productSku: product.sku,
                quantity: sale.quantity,
                sellingPrice: sale.sellingPrice,
                price: sale.sellingPrice,
                total: sale.totalAmount,
                totalAmount: sale.totalAmount,
                date: sale.date,
                paymentMethod: sale.paymentMethod,
                customer: sale.customerName,
                customerName: sale.customerName,
                invoiceNumber: sale.invoiceNumber
            };
            return res.status(201).json(formattedSale);
        }

        res.status(201).json({
            success: true,
            message: 'Sale logged successfully and inventory stock updated',
            sale,
            updatedProduct: {
                id: product._id,
                name: product.name,
                sku: product.sku,
                remainingStock: product.currentStock,
                reorderPoint: product.reorderPoint,
                status: product.status,
                alertTriggered: needsReorder || isOutOfStock,
                alertMessage: isOutOfStock
                    ? `⚠️ CRITICAL: Product "${product.name}" is now OUT OF STOCK!`
                    : (needsReorder
                        ? `⚠️ REORDER ALERT: Stock (${product.currentStock}) is at or below Reorder Point (${product.reorderPoint})!`
                        : null)
            }
        });
    } catch (error) {
        console.error('Create Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while logging sale',
            error: error.message
        });
    }
};

/**
 * @desc    Get all sales records
 * @route   GET /api/sales or GET /sales
 * @access  Public / Optional Auth
 */
const getSales = async (req, res) => {
    try {
        const { productId, startDate, endDate, paymentMethod, search, limit = 500 } = req.query;
        let andConditions = [];

        // Per-user data isolation: New users see only their own sales
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

        if (productId) {
            andConditions.push({ productId: productId });
        }

        if (paymentMethod && paymentMethod !== 'All') {
            andConditions.push({ paymentMethod: paymentMethod });
        }

        if (search) {
            andConditions.push({
                $or: [
                    { productName: { $regex: search, $options: 'i' } },
                    { productSku: { $regex: search, $options: 'i' } },
                    { customerName: { $regex: search, $options: 'i' } },
                    { invoiceNumber: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            andConditions.push({ date: dateFilter });
        }

        const query = andConditions.length > 0 ? { $and: andConditions } : {};

        const sales = await SaleRecord.find(query)
            .sort({ date: -1 })
            .limit(Number(limit))
            .populate('productId', 'name sku imageUrl currentStock leadTimeDays');

        const formattedSales = sales.map((s) => ({
            id: s._id.toString(),
            _id: s._id,
            productId: s.productId ? (s.productId._id ? s.productId._id.toString() : s.productId.toString()) : s.productId,
            productName: s.productName,
            productSku: s.productSku,
            quantity: s.quantity,
            sellingPrice: s.sellingPrice,
            price: s.sellingPrice,
            total: s.totalAmount,
            totalAmount: s.totalAmount,
            date: s.date,
            paymentMethod: s.paymentMethod,
            customer: s.customerName,
            customerName: s.customerName,
            invoiceNumber: s.invoiceNumber
        }));

        if (!req.originalUrl.startsWith('/api') || req.query.format === 'raw') {
            return res.status(200).json(formattedSales);
        }

        res.status(200).json({
            success: true,
            count: sales.length,
            sales
        });
    } catch (error) {
        console.error('Get Sales Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving sales',
            error: error.message
        });
    }
};

/**
 * @desc    Get single sale record by ID
 * @route   GET /api/sales/:id or GET /sales/:id
 * @access  Public
 */
const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await SaleRecord.findById(id).populate('productId');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: `Sale record not found with id ${id}`
            });
        }

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(sale);
        }

        res.status(200).json({
            success: true,
            sale
        });
    } catch (error) {
        console.error('Get Sale By ID Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving sale record',
            error: error.message
        });
    }
};

/**
 * @desc    Get aggregated sales statistics
 * @route   GET /api/sales/stats
 * @access  Public
 */
const getSalesStats = async (req, res) => {
    try {
        let matchStage = {};
        if (req.user) {
            const isDemoOrAdmin = req.user.email === 'demo@inventoryflow.com' || req.user.email === 'admin@inventoryflow.com';
            if (isDemoOrAdmin) {
                matchStage = {
                    $or: [
                        { createdBy: req.user._id },
                        { createdBy: null },
                        { createdBy: { $exists: false } }
                    ]
                };
            } else {
                matchStage = { createdBy: req.user._id };
            }
        }

        const totalSalesAgg = await SaleRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalUnitsSold: { $sum: '$quantity' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalRevenue = totalSalesAgg.length > 0 ? totalSalesAgg[0].totalRevenue : 0;
        const totalUnitsSold = totalSalesAgg.length > 0 ? totalSalesAgg[0].totalUnitsSold : 0;
        const totalTransactions = totalSalesAgg.length > 0 ? totalSalesAgg[0].count : 0;

        const topProducts = await SaleRecord.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$productId',
                    productName: { $first: '$productName' },
                    productSku: { $first: '$productSku' },
                    totalQuantity: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$totalAmount' },
                    transactions: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 8 }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue: Number(totalRevenue.toFixed(2)),
                totalUnitsSold,
                totalTransactions,
                averageOrderValue: totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0,
                topProducts
            }
        });
    } catch (error) {
        console.error('Get Sales Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating sales statistics',
            error: error.message
        });
    }
};

/**
 * @desc    Delete a sale record (restores product inventory)
 * @route   DELETE /api/sales/:id or DELETE /sales/:id
 * @access  Public / Protected
 */
const deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await SaleRecord.findById(id);

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: `Sale record not found with id ${id}`
            });
        }

        if (sale.productId) {
            await Product.findByIdAndUpdate(sale.productId, {
                $inc: { currentStock: sale.quantity }
            });
        }

        await sale.deleteOne();

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json({ id, message: 'Deleted and stock restored' });
        }

        res.status(200).json({
            success: true,
            message: `Sale record ${id} deleted and ${sale.quantity} units restored to inventory.`,
            deletedSaleId: id
        });
    } catch (error) {
        console.error('Delete Sale Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting sale record',
            error: error.message
        });
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById,
    getSalesStats,
    deleteSale
};
