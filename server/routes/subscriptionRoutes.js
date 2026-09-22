const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, subscriptionController.getSubscriptions);
router.post('/', authenticateToken, subscriptionController.createSubscription);
router.delete('/:id', authenticateToken, subscriptionController.deleteSubscription);

module.exports = router;
