const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed,
    default: () => new mongoose.Types.ObjectId()
  },
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'User ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Subscription name is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  billingCycle: {
    type: String,
    default: 'monthly',
    enum: ['monthly', 'yearly']
  },
  renewalDate: {
    type: String,
    required: [true, 'Renewal date is required'] // Format: YYYY-MM-DD
  },
  category: {
    type: String,
    default: 'Software & Tools',
    trim: true
  },
  baseAmountUSD: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

subscriptionSchema.index({ userId: 1, renewalDate: 1 });

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
