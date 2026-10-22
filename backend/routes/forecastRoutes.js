const express = require('express');
const router = express.Router();
const {
    getForecastOverview,
    getReorderAlerts,
    getProductForecastById,
    simulateForecast
} = require('../controllers/forecastController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, getForecastOverview);
router.get('/alerts', optionalAuth, getReorderAlerts);
router.get('/product/:id', optionalAuth, getProductForecastById);
router.post('/simulate', optionalAuth, simulateForecast);

module.exports = router;
