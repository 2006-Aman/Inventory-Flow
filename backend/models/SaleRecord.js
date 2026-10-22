const mongoose = require('mongoose');

const saleRecordSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product ID is required for a sale transaction']
        },
        productName: {
            type: String,
            trim: true,
            default: ''
        },
        productSku: {
            type: String,
            trim: true,
            uppercase: true,
            default: ''
        },
        quantity: {
            type: Number,
            required: [true, 'Sale quantity is required'],
            min: [1, 'Sale quantity must be at least 1']
        },
        sellingPrice: {
            type: Number,
            required: [true, 'Selling price per unit is required'],
            min: [0, 'Selling price cannot be negative']
        },
        totalAmount: {
            type: Number,
            min: [0, 'Total amount cannot be negative']
        },
        date: {
            type: Date,
            default: Date.now,
            required: true
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Online'],
            default: 'Cash'
        },
        customerName: {
            type: String,
            trim: true,
            default: 'Walk-in Customer'
        },
        invoiceNumber: {
            type: String,
            trim: true,
            default: ''
        },
        notes: {
            type: String,
            trim: true,
            default: ''
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

// Pre-save calculation for totalAmount and invoiceNumber
saleRecordSchema.pre('save', function (next) {
    if (this.quantity !== undefined && this.sellingPrice !== undefined) {
        this.totalAmount = Number((this.quantity * this.sellingPrice).toFixed(2));
    }

    if (!this.invoiceNumber) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        this.invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${rand}`;
    }

    next();
});

const SaleRecord = mongoose.model('SaleRecord', saleRecordSchema);

module.exports = SaleRecord;
