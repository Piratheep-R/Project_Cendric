const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed,
    default: () => new mongoose.Types.ObjectId()
  },
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense'],
    lowercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  date: {
    type: String,
    required: [true, 'Date is required'] // Format: YYYY-MM-DD
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  source: {
    type: String,
    default: 'manual',
    enum: ['manual', 'bank_csv_import', 'receipt_scanner']
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

// Index for efficient user transaction sorting and filtering
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
