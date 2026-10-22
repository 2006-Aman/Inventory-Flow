const express = require('express');
const router = express.Router();
const {
    createSale,
    getSales,
    getSaleById,
    getSalesStats,
    deleteSale
} = require('../controllers/saleController');
const { optionalAuth } = require('../middleware/authMiddleware');

router
    .route('/')
    .get(optionalAuth, getSales)
    .post(optionalAuth, createSale);

router.get('/stats', optionalAuth, getSalesStats);

router
    .route('/:id')
    .get(getSaleById)
    .delete(optionalAuth, deleteSale);

module.exports = router;
