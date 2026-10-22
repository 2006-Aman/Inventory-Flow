const express = require('express');
const router = express.Router();
const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router
    .route('/')
    .get(optionalAuth, getCategories)
    .post(protect, createCategory);

router
    .route('/:id')
    .get(getCategoryById)
    .put(protect, updateCategory)
    .delete(protect, deleteCategory);

module.exports = router;
