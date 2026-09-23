const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

router.post('/stream', authenticateToken, chatController.streamChat);
router.post('/message', authenticateToken, chatController.postChatMessage);
router.get('/history', authenticateToken, chatController.getChatHistory);
router.delete('/history', authenticateToken, chatController.clearChatHistory);

module.exports = router;
