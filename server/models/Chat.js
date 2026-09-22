const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [chatMessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
