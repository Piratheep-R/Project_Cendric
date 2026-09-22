const { Transaction, Budget, Subscription } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db } = require('../utils/localDB');
const currencyService = require('../services/currencyService');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

async function getNotifications(req, res) {
  try {
    const notifications = [];
    const userId = req.user._id;
    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');

    let userTx = [];
    let budget = null;
    let userSubs = [];

    if (isMongoDBConnected()) {
      userTx = await Transaction.find({ userId }).lean();
      budget = await Budget.findOne({ userId }).lean();
      userSubs = await Subscription.find({ userId }).lean();
    } else {
      userTx = db.transactions.filter(t => t.userId === userId);
      budget = (db.budgets && db.budgets[userId]) || { monthlyLimit: 50000 };
      userSubs = (db.subscriptions || []).filter(s => s.userId === userId);
    }

    const expenses = userTx.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 1. Budget Pacing Alert
    const monthlyLimit = Number(budget?.monthlyLimit) || 50000;
    const budgetPct = Math.round((totalExpense / monthlyLimit) * 100);

    if (budgetPct >= 90) {
      notifications.push({
        id: 'budget_near_limit',
        type: 'budget',
        severity: 'danger',
        title: 'Budget Alert: Near Limit',
        message: `You have spent ${budgetPct}% of your monthly limit (${userCurr} ${totalExpense.toLocaleString()} of ${userCurr} ${monthlyLimit.toLocaleString()}).`,
        actionUrl: '/transactions',
        createdAt: new Date().toISOString()
      });
    } else if (budgetPct >= 70) {
      notifications.push({
        id: 'budget_caution',
        type: 'budget',
        severity: 'warning',
        title: 'Budget Alert: Caution',
        message: `You have reached ${budgetPct}% of your monthly spending goal.`,
        actionUrl: '/transactions',
        createdAt: new Date().toISOString()
      });
    }

    // 2. Subscriptions Renewal Alerts (within next 3 days)
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    userSubs.forEach(s => {
      if (s.renewalDate) {
        const rDate = new Date(s.renewalDate);
        if (rDate >= now && rDate <= threeDaysLater) {
          const daysLeft = Math.max(1, Math.ceil((rDate - now) / (1000 * 60 * 60 * 24)));
          notifications.push({
            id: `sub_${s._id}`,
            type: 'subscription',
            severity: 'info',
            title: `Renewal: ${s.name}`,
            message: `${s.name} renews in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} (${userCurr} ${Number(s.amount).toLocaleString()}).`,
            actionUrl: '/transactions',
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // 3. Sri Lankan Tax Compliance Calendar Deadlines
    const currentYear = now.getFullYear();
    const deadlines = [
      { name: 'Q1 APIT Installment', date: new Date(`${currentYear}-08-15`) },
      { name: 'Q2 APIT Installment', date: new Date(`${currentYear}-11-15`) },
      { name: 'Annual Income Tax Return (RAMIS)', date: new Date(`${currentYear}-11-30`) },
      { name: 'Q3 APIT Installment', date: new Date(`${currentYear + 1}-02-15`) },
      { name: 'Q4 APIT Installment', date: new Date(`${currentYear + 1}-05-15`) }
    ];

    const upcomingDeadline = deadlines.find(d => d.date >= now);
    if (upcomingDeadline) {
      const daysToDeadline = Math.ceil((upcomingDeadline.date - now) / (1000 * 60 * 60 * 24));
      if (daysToDeadline <= 60) {
        notifications.push({
          id: `tax_${upcomingDeadline.name.replace(/\s+/g, '_')}`,
          type: 'tax',
          severity: 'legal',
          title: `IRD Sri Lanka: ${upcomingDeadline.name}`,
          message: `Filing deadline is ${upcomingDeadline.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysToDeadline} days remaining).`,
          actionUrl: '/chat',
          createdAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      unreadCount: notifications.length,
      notifications
    });
  } catch (err) {
    console.error('[Notifications Error]', err);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
}

module.exports = {
  getNotifications
};
