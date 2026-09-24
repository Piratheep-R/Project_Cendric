const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All administrative routes require a valid JWT token AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/overview', adminController.getAdminOverview);
router.get('/users', adminController.getAdminUsers);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.patch('/users/:id/toggle-admin', adminController.toggleUserAdmin);

module.exports = router;
