const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticateToken, transactionController.getTransactions);
router.post('/', authenticateToken, transactionController.createTransaction);
router.put('/:id', authenticateToken, transactionController.updateTransaction);
router.delete('/:id', authenticateToken, transactionController.deleteTransaction);
router.post('/bulk', authenticateToken, transactionController.bulkImportTransactions);
router.post('/extract', authenticateToken, upload.single('receipt'), transactionController.extractReceipt);

module.exports = router;
