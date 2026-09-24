const crypto = require('crypto');
const { Subscription } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const currencyService = require('../services/currencyService');
const { toUserQuery, toIdQuery } = require('../utils/dbHelper');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

async function getSubscriptions(req, res) {
  try {
    let userSubs = [];
    if (isMongoDBConnected()) {
      userSubs = await Subscription.find({ userId: toUserQuery(req.user._id) }).sort({ renewalDate: 1 }).lean();
    } else {
      if (!db.subscriptions) db.subscriptions = [];
      userSubs = db.subscriptions.filter(s => String(s.userId) === String(req.user._id));
    }

    // Seed default starter subscriptions if empty
    if (userSubs.length === 0) {
      const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
      const rate = currencyService.getRateFor(userCurr);
      const defaults = [
        { name: 'GitHub Pro', amount: Math.round(4 * rate), baseAmountUSD: 4, billingCycle: 'monthly', renewalDate: '2026-10-01', category: 'Software & Tools' },
        { name: 'Figma Professional', amount: Math.round(15 * rate), baseAmountUSD: 15, billingCycle: 'monthly', renewalDate: '2026-10-05', category: 'Design' },
        { name: 'ChatGPT Plus', amount: Math.round(20 * rate), baseAmountUSD: 20, billingCycle: 'monthly', renewalDate: '2026-10-12', category: 'AI Tools' }
      ];

      const seedDocs = [];
      defaults.forEach(d => {
        const sub = {
          _id: crypto.randomBytes(8).toString('hex'),
          userId: req.user._id,
          ...d,
          createdAt: new Date().toISOString()
        };
        seedDocs.push(sub);
        if (!db.subscriptions) db.subscriptions = [];
        db.subscriptions.push(sub);
      });

      if (isMongoDBConnected()) {
        await Subscription.insertMany(seedDocs, { ordered: false });
        userSubs = await Subscription.find({ userId: toUserQuery(req.user._id) }).sort({ renewalDate: 1 }).lean();
      } else {
        userSubs = seedDocs;
      }
      saveDB();
    }

    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);

    const formattedSubs = userSubs.map(s => {
      let baseUSD = Number(s.baseAmountUSD);
      if (!baseUSD || isNaN(baseUSD) || baseUSD <= 0) {
        if ((userCurr === 'LKR' || userCurr === 'INR') && s.amount < 100) {
          baseUSD = Number(s.amount);
        } else {
          baseUSD = Number(s.amount) / rate;
        }
      }
      const convertedAmount = userCurr === 'USD' ? baseUSD : Math.round(baseUSD * rate);
      return {
        ...s,
        baseAmountUSD: baseUSD,
        amount: convertedAmount
      };
    });

    res.json(formattedSubs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subscriptions.' });
  }
}

async function createSubscription(req, res) {
  try {
    const { name, amount, billingCycle, renewalDate, category } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ message: 'Name and amount are required.' });
    }
    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);
    const numAmt = Number(amount) || 0;

    const newSub = {
      _id: crypto.randomBytes(8).toString('hex'),
      userId: req.user._id,
      name: name.trim(),
      amount: numAmt,
      baseAmountUSD: numAmt / rate,
      billingCycle: billingCycle || 'monthly',
      renewalDate: renewalDate || new Date().toISOString().slice(0, 10),
      category: category || 'Software & Tools',
      createdAt: new Date().toISOString()
    };

    if (isMongoDBConnected()) {
      await Subscription.create(newSub);
    }
    if (!db.subscriptions) db.subscriptions = [];
    db.subscriptions.push(newSub);
    saveDB();

    res.status(201).json(newSub);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add subscription.' });
  }
}

async function deleteSubscription(req, res) {
  try {
    if (isMongoDBConnected()) {
      await Subscription.findOneAndDelete({ _id: toIdQuery(req.params.id), userId: toUserQuery(req.user._id) });
    }
    if (!db.subscriptions) db.subscriptions = [];
    db.subscriptions = db.subscriptions.filter(s => !(String(s._id) === String(req.params.id) && String(s.userId) === String(req.user._id)));
    saveDB();

    res.json({ success: true, message: 'Subscription removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete subscription.' });
  }
}

module.exports = {
  getSubscriptions,
  createSubscription,
  deleteSubscription
};
