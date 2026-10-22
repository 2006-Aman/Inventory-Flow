const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true
        },
        sku: {
            type: String,
            required: [true, 'Product SKU is required'],
            unique: true,
            trim: true,
            uppercase: true
        },
        barcode: {
            type: String,
            trim: true,
            default: ''
        },
        currentStock: {
            type: Number,
            required: [true, 'Current stock level is required'],
            default: 0,
            min: [0, 'Current stock cannot be negative']
        },
        minimumStock: {
            type: Number,
            default: 5,
            min: 0
        },
        leadTimeDays: {
            type: Number,
            required: [true, 'Lead time in days is required'],
            default: 7,
            min: [1, 'Lead time must be at least 1 day']
        },
        imageUrl: {
            type: String,
            default: ''
        },
        category: {
            type: String,
            trim: true,
            default: 'General'
        },
        supplier: {
            type: String,
            trim: true,
            default: 'Global Supplier'
        },
        location: {
            type: String,
            trim: true,
            default: 'Warehouse A'
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        price: {
            type: Number,
            default: 0,
            min: [0, 'Selling price cannot be negative']
        },
        costPrice: {
            type: Number,
            default: 0,
            min: [0, 'Cost price cannot be negative']
        },
        safetyStock: {
            type: Number,
            default: 0,
            min: 0
        },
        reorderPoint: {
            type: Number,
            default: 0,
            min: 0
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Virtual field for aliases used across Phase 1 and Phase 2
productSchema.virtual('stock')
    .get(function () { return this.currentStock; })
    .set(function (v) { this.currentStock = v; });

productSchema.virtual('sellingPrice')
    .get(function () { return this.price; })
    .set(function (v) { this.price = v; });

productSchema.virtual('leadTime')
    .get(function () { return this.leadTimeDays; })
    .set(function (v) { this.leadTimeDays = v; });

// Virtual field for dynamic stock status
productSchema.virtual('status').get(function () {
    if (this.currentStock === 0) return 'Out of Stock';
    if (this.reorderPoint > 0 && this.currentStock <= this.reorderPoint) return 'Reorder Now';
    if (this.currentStock <= (this.minimumStock || 10)) return 'Low Stock';
    return 'In Stock';
});

// Format toJSON to ensure id, stock, sellingPrice, leadTime are present
productSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.stock = ret.currentStock;
        ret.sellingPrice = ret.price;
        ret.leadTime = ret.leadTimeDays;
        return ret;
    }
});

productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
