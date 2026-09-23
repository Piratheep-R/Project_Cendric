const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

router.get('/csv', authenticateToken, transactionController.exportTransactionsCSV);

module.exports = router;
