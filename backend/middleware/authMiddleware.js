const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - requires valid JWT token in Authorization header
 */
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'inventory_flow_super_secure_jwt_secret_key_2026_xyz'
        );

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'The user belonging to this token no longer exists.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized. Token is invalid or expired.',
            error: error.message
        });
    }
};

/**
 * Optional authentication - attaches req.user if token is present, continues if not
 */
const optionalAuth = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'inventory_flow_super_secure_jwt_secret_key_2026_xyz'
        );
        req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
        req.user = null;
    }

    next();
};

/**
 * Admin role authorization
 */
const authorizeAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Administrator privileges required.'
        });
    }
    next();
};

module.exports = {
    protect,
    optionalAuth,
    authorizeAdmin
};
