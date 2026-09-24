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

      if (user.isActive === false) {
        return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
      }

      req.user = user;
      next();
    } catch (authErr) {
      const fallbackUser = db.users.find(u => u._id === decoded.id);
      if (fallbackUser) {
        if (fallbackUser.isActive === false) {
          return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
        }
        req.user = fallbackUser;
        return next();
      }
      return res.status(401).json({ message: 'User account authentication error.' });
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
  next();
}

function sanitizeUser(u) {
  return {
    _id: u._id,
    fullName: u.fullName,
    email: u.email,
    currencyPreference: u.currencyPreference || 'LKR',
    languagePreference: u.languagePreference || 'en',
    isAdmin: !!u.isAdmin,
    isActive: u.isActive !== false,
    createdAt: u.createdAt || new Date().toISOString()
  };
}

module.exports = {
  authenticateToken,
  requireAdmin,
  sanitizeUser,
  JWT_SECRET
};
