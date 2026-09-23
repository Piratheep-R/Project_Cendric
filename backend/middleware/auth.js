const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db } = require('../utils/localDB');

const JWT_SECRET = process.env.JWT_SECRET || 'cendric_super_secret_jwt_key_2024_change_this';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    try {
      let user = null;
      if (isMongoDBConnected()) {
        user = await User.findById(decoded.id).lean();
      }
      if (!user) {
        user = db.users.find(u => u._id === decoded.id);
      }

      if (!user) {
        return res.status(401).json({ message: 'User account not found.' });
      }

      req.user = user;
      next();
    } catch (authErr) {
      const fallbackUser = db.users.find(u => u._id === decoded.id);
      if (fallbackUser) {
        req.user = fallbackUser;
        return next();
      }
      return res.status(401).json({ message: 'User account authentication error.' });
    }
  });
}

function sanitizeUser(u) {
  return {
    _id: u._id,
    fullName: u.fullName,
    email: u.email,
    currencyPreference: u.currencyPreference || 'LKR',
    languagePreference: u.languagePreference || 'en',
    createdAt: u.createdAt || new Date().toISOString()
  };
}

module.exports = {
  authenticateToken,
  sanitizeUser,
  JWT_SECRET
};
