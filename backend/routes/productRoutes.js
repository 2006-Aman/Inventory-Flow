const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Product routes
router
    .route('/')
    .get(optionalAuth, getProducts)
    .post(optionalAuth, upload.single('image'), createProduct);

router
    .route('/:id')
    .get(getProductById)
    .put(optionalAuth, upload.single('image'), updateProduct)
    .delete(optionalAuth, deleteProduct);

module.exports = router;
