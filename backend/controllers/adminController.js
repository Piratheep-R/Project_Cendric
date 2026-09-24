const { User, Transaction, Chat, Budget, Subscription } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const currencyService = require('../services/currencyService');
const { toUserQuery } = require('../utils/dbHelper');

function convertToLKR(amount, fromCurrency, baseUSD = null) {
  const curr = currencyService.normalizeCurrency(fromCurrency || 'LKR');
  return currencyService.convert(amount, curr, 'LKR', baseUSD);
}

/**
 * GET /api/admin/overview
 * Real-time platform KPI analytics, user counts, financial metrics, and AI observability
 */
async function getAdminOverview(req, res) {
  try {
    let users = [];
    let transactions = [];
    let chats = [];

    if (isMongoDBConnected()) {
      [users, transactions, chats] = await Promise.all([
        User.find().lean(),
        Transaction.find().lean(),
        Chat.find().lean()
      ]);
    } else {
      users = db.users || [];
      transactions = db.transactions || [];
      chats = db.chats || [];
    }

    // 1. User Metrics
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const deactivatedUsers = users.filter(u => u.isActive === false).length;
    const adminUsers = users.filter(u => u.isAdmin).length;
    const newRegistrations7d = users.filter(u => new Date(u.createdAt).getTime() >= sevenDaysAgo).length;

    // 2. Financial Metrics (Aggregated in LKR)
    let totalIncomeLKR = 0;
    let totalExpenseLKR = 0;
    let totalVolumeLKR = 0;
    const categoryBreakdown = {};

    transactions.forEach(t => {
      const amtLKR = convertToLKR(t.amount, t.currency || 'LKR', t.baseAmountUSD);
      totalVolumeLKR += amtLKR;

      if (t.type === 'income') {
        totalIncomeLKR += amtLKR;
      } else {
        totalExpenseLKR += amtLKR;
      }

      const cat = t.category || 'Other';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, totalLKR: 0 };
      }
      categoryBreakdown[cat].count += 1;
      categoryBreakdown[cat].totalLKR += amtLKR;
    });

    const netCashFlowLKR = totalIncomeLKR - totalExpenseLKR;

    // 3. AI & RAG Usage Observability
    const totalAiChats = chats.reduce((sum, c) => sum + (c.messages ? c.messages.length : 0), 0);
    const totalBillScans = transactions.filter(t => 
      t.source === 'receipt_scanner' || 
      t.source === 'receipt_scan' || 
      t.receiptUrl
    ).length;

    const ratesInfo = currencyService.getRates();

    res.json({
      success: true,
      users: {
        total: totalUsers,
        active: activeUsers,
        deactivated: deactivatedUsers,
        admins: adminUsers,
        new7d: newRegistrations7d
      },
      finances: {
        totalTransactions: transactions.length,
        totalVolumeLKR: Math.round(totalVolumeLKR),
        totalIncomeLKR: Math.round(totalIncomeLKR),
        totalExpenseLKR: Math.round(totalExpenseLKR),
        netCashFlowLKR: Math.round(netCashFlowLKR),
        categoryBreakdown
      },
      ai: {
        activeModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        totalAiMessages: totalAiChats,
        totalBillScans,
        ragDocumentsIndexed: 8,
        sriLankaTaxCorpus: 'Inland Revenue Act No. 24 of 2017 & 2024 Amendments',
        exchangeRateProvider: ratesInfo.source || 'Open Exchange Rates API',
        lastForexSync: ratesInfo.lastUpdated || new Date().toISOString()
      },
      system: {
        database: isMongoDBConnected() ? 'MongoDB Atlas (Mongoose v8.3.1)' : 'Local JSON Fallback DB',
        mongoConnected: isMongoDBConnected(),
        environment: process.env.NODE_ENV || 'production',
        uptimeSeconds: Math.round(process.uptime())
      }
    });
  } catch (err) {
    console.error('[Admin Overview Error]', err);
    res.status(500).json({ message: 'Error aggregating administrative overview.' });
  }
}

/**
 * GET /api/admin/users
 * Returns comprehensive list of registered users with activity metrics
 */
async function getAdminUsers(req, res) {
  try {
    let users = [];
    let transactions = [];

    if (isMongoDBConnected()) {
      [users, transactions] = await Promise.all([
        User.find().sort({ createdAt: -1 }).lean(),
        Transaction.find().lean()
      ]);
    } else {
      users = [...(db.users || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      transactions = db.transactions || [];
    }

    // Map transaction aggregations per user
    const txMap = {};
    transactions.forEach(t => {
      const uid = String(t.userId);
      if (!txMap[uid]) {
        txMap[uid] = { count: 0, spentLKR: 0, incomeLKR: 0 };
      }
      txMap[uid].count += 1;
      const amtLKR = convertToLKR(t.amount, t.currency || 'LKR', t.baseAmountUSD);
      if (t.type === 'income') {
        txMap[uid].incomeLKR += amtLKR;
      } else {
        txMap[uid].spentLKR += amtLKR;
      }
    });

    const userList = users.map(u => {
      const uid = String(u._id);
      const metrics = txMap[uid] || { count: 0, spentLKR: 0, incomeLKR: 0 };
      return {
        _id: u._id,
        fullName: u.fullName || 'Anonymous User',
        email: u.email,
        currencyPreference: u.currencyPreference || 'LKR',
        languagePreference: u.languagePreference || 'en',
        isAdmin: !!u.isAdmin,
        isActive: u.isActive !== false,
        createdAt: u.createdAt || new Date().toISOString(),
        transactionCount: metrics.count,
        totalSpentLKR: Math.round(metrics.spentLKR),
        totalIncomeLKR: Math.round(metrics.incomeLKR)
      };
    });

    res.json({
      success: true,
      count: userList.length,
      users: userList
    });
  } catch (err) {
    console.error('[Admin Users Error]', err);
    res.status(500).json({ message: 'Error retrieving user list.' });
  }
}

/**
 * PATCH /api/admin/users/:id/toggle-status
 * Activate or deactivate a user account
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own administrator account.' });
    }

    let newStatus = true;

    if (isMongoDBConnected()) {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found in database.' });
      }
      user.isActive = user.isActive === false ? true : false;
      await user.save();
      newStatus = user.isActive;
    }

    // Always synchronize local JSON DB
    const localUser = db.users.find(u => String(u._id) === String(id));
    if (localUser) {
      localUser.isActive = localUser.isActive === false ? true : false;
      newStatus = localUser.isActive;
      saveDB();
    } else if (!isMongoDBConnected()) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      success: true,
      isActive: newStatus,
      message: `User account has been ${newStatus ? 'activated' : 'deactivated'} successfully.`
    });
  } catch (err) {
    console.error('[Toggle Status Error]', err);
    res.status(500).json({ message: 'Error updating user status.' });
  }
}

/**
 * PATCH /api/admin/users/:id/toggle-admin
 * Promote or demote user administrator role
 */
async function toggleUserAdmin(req, res) {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot revoke your own administrator privileges.' });
    }

    let newAdminStatus = false;

    if (isMongoDBConnected()) {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found in database.' });
      }
      user.isAdmin = !user.isAdmin;
      await user.save();
      newAdminStatus = user.isAdmin;
    }

    // Always synchronize local JSON DB
    const localUser = db.users.find(u => String(u._id) === String(id));
    if (localUser) {
      localUser.isAdmin = !localUser.isAdmin;
      newAdminStatus = localUser.isAdmin;
      saveDB();
    } else if (!isMongoDBConnected()) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      success: true,
      isAdmin: newAdminStatus,
      message: `User has been ${newAdminStatus ? 'promoted to Administrator' : 'demoted to Standard User'}.`
    });
  } catch (err) {
    console.error('[Toggle Admin Error]', err);
    res.status(500).json({ message: 'Error updating user administrator role.' });
  }
}

module.exports = {
  getAdminOverview,
  getAdminUsers,
  toggleUserStatus,
  toggleUserAdmin
};
