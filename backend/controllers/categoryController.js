const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * @desc    Create a new category
 * @route   POST /api/categories or POST /categories
 * @access  Public / Private
 */
const createCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const normalizedName = name.trim();

        // Check if category already exists
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: `Category "${normalizedName}" already exists`
            });
        }

        const category = await Category.create({
            name: normalizedName,
            description: description ? description.trim() : '',
            status: status === 'Inactive' ? 'Inactive' : 'Active',
            createdBy: req.user ? req.user._id : null
        });

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(201).json({
                id: category._id.toString(),
                _id: category._id,
                name: category.name,
                description: category.description,
                status: category.status
            });
        }

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating category',
            error: error.message
        });
    }
};

/**
 * @desc    Get all categories with associated product count
 * @route   GET /api/categories or GET /categories
 * @access  Public
 */
const getCategories = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        const categories = await Category.find(query).sort({ name: 1 });

        // Calculate product count for each category
        const categoryCounts = await Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        categoryCounts.forEach(c => {
            if (c._id) countMap[c._id.toLowerCase()] = c.count;
        });

        const results = categories.map(cat => ({
            _id: cat._id,
            id: cat._id.toString(),
            name: cat.name,
            description: cat.description,
            status: cat.status,
            productCount: countMap[cat.name.toLowerCase()] || 0,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
        }));

        if (!req.originalUrl.startsWith('/api') || req.query.format === 'raw') {
            return res.status(200).json(results);
        }

        res.status(200).json({
            success: true,
            count: results.length,
            categories: results
        });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving categories',
            error: error.message
        });
    }
};

/**
 * @desc    Get single category by ID
 * @route   GET /api/categories/:id or GET /categories/:id
 * @access  Public
 */
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category not found with id ${id}`
            });
        }

        const productCount = await Product.countDocuments({
            category: { $regex: new RegExp(`^${category.name}$`, 'i') }
        });

        const formatted = {
            ...category.toObject(),
            id: category._id.toString(),
            productCount
        };

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(formatted);
        }

        res.status(200).json({
            success: true,
            category: formatted
        });
    } catch (error) {
        console.error('Get Category By ID Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving category',
            error: error.message
        });
    }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id or PUT /categories/:id
 * @access  Public / Private
 */
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category not found with id ${id}`
            });
        }

        const oldName = category.name;

        if (name && name.trim() !== category.name) {
            const trimmedName = name.trim();
            const duplicate = await Category.findOne({
                name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
                _id: { $ne: category._id }
            });

            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: `Category "${trimmedName}" already exists`
                });
            }

            category.name = trimmedName;

            await Product.updateMany(
                { category: oldName },
                { $set: { category: trimmedName } }
            );
        }

        if (description !== undefined) category.description = description.trim();
        if (status !== undefined) category.status = status;

        const updatedCategory = await category.save();

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json({
                id: updatedCategory._id.toString(),
                ...updatedCategory.toObject()
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating category',
            error: error.message
        });
    }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id or DELETE /categories/:id
 * @access  Public / Private
 */
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: `Category not found with id ${id}`
            });
        }

        await Product.updateMany(
            { category: category.name },
            { $set: { category: 'General' } }
        );

        await category.deleteOne();

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json({ id, message: 'Category deleted' });
        }

        res.status(200).json({
            success: true,
            message: `Category "${category.name}" deleted successfully. Associated products moved to General.`,
            deletedCategoryId: id
        });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting category',
            error: error.message
        });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};
