const { Budget } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const currencyService = require('../services/currencyService');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

async function getBudget(req, res) {
  try {
    let budget = null;
    if (isMongoDBConnected()) {
      budget = await Budget.findOne({ userId: req.user._id }).lean();
    }
    if (!budget) {
      if (!db.budgets) db.budgets = {};
      budget = db.budgets[req.user._id] || { monthlyLimit: 50000, alertsEnabled: true };
    }
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch budget.' });
  }
}

async function updateBudget(req, res) {
  try {
    const { monthlyLimit, alertsEnabled } = req.body;
    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);
    const numLimit = Number(monthlyLimit) || 50000;
    const alerts = alertsEnabled !== undefined ? Boolean(alertsEnabled) : true;
    const baseLimitUSD = numLimit / rate;

    let updatedBudget = null;
    if (isMongoDBConnected()) {
      updatedBudget = await Budget.findOneAndUpdate(
        { userId: req.user._id },
        {
          monthlyLimit: numLimit,
          baseLimitUSD,
          alertsEnabled: alerts,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      ).lean();
    }

    if (!db.budgets) db.budgets = {};
    db.budgets[req.user._id] = {
      monthlyLimit: numLimit,
      baseLimitUSD,
      alertsEnabled: alerts,
      updatedAt: new Date().toISOString()
    };
    saveDB();

    res.json(updatedBudget || db.budgets[req.user._id]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update budget.' });
  }
}

module.exports = {
  getBudget,
  updateBudget
};
