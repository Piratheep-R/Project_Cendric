const express = require('express');
const router = express.Router();

const { isMongoDBConnected } = require('../config/db');
const authRoutes = require('./authRoutes');
const transactionRoutes = require('./transactionRoutes');
const exportRoutes = require('./exportRoutes');
const budgetRoutes = require('./budgetRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const chatRoutes = require('./chatRoutes');
const currencyRoutes = require('./currencyRoutes');
const taxRoutes = require('./taxRoutes');
const notificationRoutes = require('./notificationRoutes');

// System Health & MERN Stack Status
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isMongoDBConnected() ? 'MongoDB (Mongoose)' : 'Local JSON Database (Fallback)',
    mongoConnected: isMongoDBConnected(),
    stack: 'MERN'
  });
});

// Domain Routes
router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/export', exportRoutes);
router.use('/budgets', budgetRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/chat', chatRoutes);
router.use('/currency', currencyRoutes);
router.use('/tax', taxRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
