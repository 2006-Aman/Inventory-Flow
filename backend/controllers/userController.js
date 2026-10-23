const User = require('../models/User');

/**
 * @desc    Get all users
 * @route   GET /api/users or GET /users
 * @access  Public
 */
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        const formatted = users.map(u => ({
            id: u._id.toString(),
            _id: u._id,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            email: u.email,
            role: u.role || 'user',
            organization: u.organization || 'InventoryIQ Systems',
            phone: u.phone || '',
            avatar: u.avatar || (u.firstName ? u.firstName[0].toUpperCase() : 'U'),
            status: u.status || 'Active',
            createdAt: u.createdAt
        }));

        if (!req.originalUrl.startsWith('/api') || req.query.format === 'raw') {
            return res.status(200).json(formatted);
        }

        res.status(200).json({
            success: true,
            count: users.length,
            users: formatted
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get single user by ID or email
 * @route   GET /api/users/:id or GET /users/:id
 * @access  Public
 */
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        let user;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(id).select('-password');
        } else {
            user = await User.findOne({ email: id.toLowerCase().trim() }).select('-password');
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const formatted = {
            id: user._id.toString(),
            _id: user._id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            role: user.role || 'user',
            organization: user.organization || 'InventoryIQ Systems',
            phone: user.phone || '',
            avatar: user.avatar || (user.firstName ? user.firstName[0].toUpperCase() : 'U'),
            status: user.status || 'Active',
            createdAt: user.createdAt
        };

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(formatted);
        }

        res.status(200).json({ success: true, user: formatted });
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create / Register user
 * @route   POST /api/users or POST /users
 * @access  Public
 */
const createUser = async (req, res) => {
    try {
        const { firstName, lastName, name, email, password, role, organization, phone } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            if (!req.originalUrl.startsWith('/api')) {
                return res.status(200).json(existing);
            }
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const resolvedFirstName = firstName || (name ? name.split(' ')[0] : email.split('@')[0]);
        const resolvedLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : '');
        const resolvedName = name || `${resolvedFirstName} ${resolvedLastName}`.trim();

        const user = await User.create({
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            name: resolvedName,
            email: email.toLowerCase().trim(),
            password: password || 'password123',
            role: role || 'user',
            organization: organization || 'InventoryIQ Systems',
            phone: phone || ''
        });

        const formatted = {
            id: user._id.toString(),
            _id: user._id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            role: user.role || 'user',
            organization: user.organization || 'InventoryIQ Systems',
            phone: user.phone || '',
            avatar: user.avatar || (user.firstName ? user.firstName[0].toUpperCase() : 'U'),
            status: user.status || 'Active',
            createdAt: user.createdAt
        };

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(201).json(formatted);
        }

        res.status(201).json({ success: true, user: formatted });
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id or PATCH /users/:id
 * @access  Public
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        let user;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(id);
        } else {
            user = await User.findOne({ email: id.toLowerCase().trim() });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { firstName, lastName, name, email, role } = req.body;
        if (firstName) user.firstName = firstName.trim();
        if (lastName) user.lastName = lastName.trim();
        if (name) user.name = name.trim();
        if (email) user.email = email.toLowerCase().trim();
        if (role) user.role = role;

        await user.save();

        const formatted = {
            id: user._id.toString(),
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            name: user.name,
            email: user.email,
            role: user.role
        };

        if (!req.originalUrl.startsWith('/api')) {
            return res.status(200).json(formatted);
        }

        res.status(200).json({ success: true, user: formatted });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser
};
