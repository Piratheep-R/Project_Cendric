const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  monthlyLimit: {
    type: Number,
    default: 50000,
    min: [0, 'Limit must be non-negative']
  },
  baseLimitUSD: {
    type: Number,
    default: 0
  },
  alertsEnabled: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
