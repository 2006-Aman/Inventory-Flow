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
        currentStock: {
            type: Number,
            required: [true, 'Current stock level is required'],
            default: 0,
            min: [0, 'Current stock cannot be negative']
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
        // Optional complementary fields matching Phase 1 & Phase 2 inventory needs
        category: {
            type: String,
            trim: true,
            default: 'General'
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

// Virtual field for stock status
productSchema.virtual('status').get(function () {
    if (this.currentStock === 0) return 'Out of Stock';
    if (this.reorderPoint > 0 && this.currentStock <= this.reorderPoint) return 'Reorder Now';
    if (this.currentStock <= 10) return 'Low Stock';
    return 'In Stock';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
