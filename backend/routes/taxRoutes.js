const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { authenticateToken } = require('../middleware/auth');

router.get('/laws', authenticateToken, taxController.getTaxLaws);
router.post('/calculate', authenticateToken, taxController.calculateTax);

module.exports = router;
