const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const { authenticateToken } = require('../middleware/auth');

router.get('/rates', currencyController.getRates);
router.post('/refresh', authenticateToken, currencyController.refreshRates);
router.get('/convert', currencyController.convertCurrency);

module.exports = router;
