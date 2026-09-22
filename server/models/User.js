const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  currencyPreference: {
    type: String,
    default: 'LKR',
    trim: true
  },
  languagePreference: {
    type: String,
    default: 'en',
    enum: ['en', 'ta', 'si']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Helper method to return clean user object without password
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    currencyPreference: this.currencyPreference || 'LKR',
    languagePreference: this.languagePreference || 'en',
    createdAt: this.createdAt
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
