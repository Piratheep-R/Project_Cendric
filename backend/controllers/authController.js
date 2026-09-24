const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Transaction, Budget, Subscription } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const { sanitizeUser, JWT_SECRET } = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const { toUserQuery } = require('../utils/dbHelper');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

function convertAmount(amount, fromCurr, toCurr, baseUSD = null) {
  return currencyService.convert(amount, fromCurr, toCurr, baseUSD);
}

async function register(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide full name, email, and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing
    let existing = null;
    if (isMongoDBConnected()) {
      existing = await User.findOne({ email: normalizedEmail });
    } else {
      existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    }

    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomBytes(12).toString('hex');
    const newUserObj = {
      _id: userId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      currencyPreference: 'LKR',
      languagePreference: 'en',
      createdAt: new Date().toISOString()
    };

    if (isMongoDBConnected()) {
      await User.create(newUserObj);
    }
    db.users.push(newUserObj);
    saveDB();

    const token = jwt.sign({ id: newUserObj._id, email: newUserObj.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      user: sanitizeUser(newUserObj),
      token
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = null;

    if (isMongoDBConnected()) {
      user = await User.findOne({ email: normalizedEmail }).lean();
    }
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password || user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
}

function getMe(req, res) {
  res.json(sanitizeUser(req.user));
}

async function updateProfile(req, res) {
  try {
    const { currencyPreference, languagePreference, fullName } = req.body;
    let user = req.user;

    const updates = {};
    if (fullName) updates.fullName = fullName.trim();
    if (languagePreference && ['en', 'ta', 'si'].includes(languagePreference.toLowerCase())) {
      updates.languagePreference = languagePreference.toLowerCase();
    }

    let convertedCount = 0;
    const oldCurr = normalizeCurrency(user.currencyPreference || 'LKR');

    if (currencyPreference) {
      const newCurr = normalizeCurrency(currencyPreference);

      if (oldCurr !== newCurr) {
        console.log(`[Currency Engine] Converting all amounts for ${user.email} from ${oldCurr} to ${newCurr} using live rates`);

        const oldRate = currencyService.getRateFor(oldCurr);
        const userQ = toUserQuery(user._id);

        // 1. Convert all transactions
        if (isMongoDBConnected()) {
          const txs = await Transaction.find({ userId: userQ });
          for (const t of txs) {
            let baseUSD = Number(t.baseAmountUSD);
            if (!baseUSD || isNaN(baseUSD) || baseUSD <= 0) {
              baseUSD = (Number(t.amount) || 0) / oldRate;
            }
            const newAmount = convertAmount(t.amount, oldCurr, newCurr, baseUSD);
            await Transaction.findByIdAndUpdate(t._id, { amount: newAmount, baseAmountUSD: baseUSD });
            convertedCount++;
          }
        }

        db.transactions.forEach(t => {
          if (String(t.userId) === String(user._id)) {
            let baseUSD = Number(t.baseAmountUSD);
            if (!baseUSD || isNaN(baseUSD) || baseUSD <= 0) {
              baseUSD = (Number(t.amount) || 0) / oldRate;
            }
            t.baseAmountUSD = baseUSD;
            t.amount = convertAmount(t.amount, oldCurr, newCurr, baseUSD);
          }
        });

        // 2. Convert monthly budget
        if (isMongoDBConnected()) {
          const b = await Budget.findOne({ userId: userQ });
          if (b && b.monthlyLimit) {
            let baseLimitUSD = Number(b.baseLimitUSD);
            if (!baseLimitUSD || isNaN(baseLimitUSD) || baseLimitUSD <= 0) {
              baseLimitUSD = Number(b.monthlyLimit) / oldRate;
            }
            const newLimit = convertAmount(b.monthlyLimit, oldCurr, newCurr, baseLimitUSD);
            await Budget.findOneAndUpdate({ userId: userQ }, { monthlyLimit: newLimit, baseLimitUSD });
          }
        }
        const bLocal = db.budgets && (db.budgets[user._id] || db.budgets[String(user._id)]);
        if (bLocal && bLocal.monthlyLimit) {
          let baseLimitUSD = Number(bLocal.baseLimitUSD);
          if (!baseLimitUSD || isNaN(baseLimitUSD) || baseLimitUSD <= 0) {
            baseLimitUSD = (Number(bLocal.monthlyLimit) || 0) / oldRate;
          }
          bLocal.baseLimitUSD = baseLimitUSD;
          bLocal.monthlyLimit = convertAmount(bLocal.monthlyLimit, oldCurr, newCurr, baseLimitUSD);
        }

        // 3. Convert subscriptions
        if (isMongoDBConnected()) {
          const subs = await Subscription.find({ userId: userQ });
          for (const s of subs) {
            let baseUSD = Number(s.baseAmountUSD);
            if (!baseUSD || isNaN(baseUSD) || baseUSD <= 0) {
              baseUSD = Number(s.amount) / oldRate;
            }
            const newSubAmt = convertAmount(s.amount, oldCurr, newCurr, baseUSD);
            await Subscription.findByIdAndUpdate(s._id, { amount: newSubAmt, baseAmountUSD: baseUSD });
          }
        }
        if (db.subscriptions) {
          db.subscriptions.forEach(s => {
            if (String(s.userId) === String(user._id)) {
              let baseUSD = Number(s.baseAmountUSD);
              if (!baseUSD || isNaN(baseUSD) || baseUSD <= 0) {
                baseUSD = (Number(s.amount) || 0) / oldRate;
              }
              s.baseAmountUSD = baseUSD;
              s.amount = convertAmount(s.amount, oldCurr, newCurr, baseUSD);
            }
          });
        }

        updates.currencyPreference = newCurr;
      }
    }

    if (isMongoDBConnected()) {
      user = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true }).lean();
    }

    const localUser = db.users.find(u => u._id === req.user._id);
    if (localUser) {
      Object.assign(localUser, updates);
      user = localUser;
    }
    saveDB();

    res.json({
      currencyPreference: user.currencyPreference,
      convertedCount,
      oldCurrency: oldCurr,
      newCurrency: user.currencyPreference,
      exchangeRateInfo: {
        rates: currencyService.rates,
        source: currencyService.source,
        lastUpdated: currencyService.lastUpdated
      },
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('[Profile Update Error]', err);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
