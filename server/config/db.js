const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// On Windows, local ISP DNS often fails to resolve MongoDB Atlas SRV records (_mongodb._tcp)
// Configure Google and Cloudflare public DNS resolvers to ensure flawless Atlas connection
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  // Graceful fallback if restricted
}

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

const { User, Transaction, Budget, Subscription, Chat } = require('../models');

let isConnected = false;

async function migrateDataFromJSON() {
  const jsonPath = path.join(__dirname, '..', 'data', 'cendric_db.json');
  if (!fs.existsSync(jsonPath)) return;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const localData = JSON.parse(raw);

    // 1. Migrate Users
    const userCount = await User.countDocuments();
    if (userCount === 0 && Array.isArray(localData.users) && localData.users.length > 0) {
      console.log(`[MERN Migration] Migrating ${localData.users.length} users to MongoDB...`);
      await User.insertMany(localData.users, { ordered: false });
    }

    // 2. Migrate Transactions
    const txCount = await Transaction.countDocuments();
    if (txCount === 0 && Array.isArray(localData.transactions) && localData.transactions.length > 0) {
      console.log(`[MERN Migration] Migrating ${localData.transactions.length} transactions to MongoDB...`);
      await Transaction.insertMany(localData.transactions, { ordered: false });
    }

    // 3. Migrate Budgets
    const budgetCount = await Budget.countDocuments();
    if (budgetCount === 0 && localData.budgets && typeof localData.budgets === 'object') {
      const budgetDocs = [];
      for (const [userId, b] of Object.entries(localData.budgets)) {
        budgetDocs.push({
          userId,
          monthlyLimit: b.monthlyLimit || 50000,
          baseLimitUSD: b.baseLimitUSD || 0,
          alertsEnabled: b.alertsEnabled !== false,
          updatedAt: b.updatedAt || new Date()
        });
      }
      if (budgetDocs.length > 0) {
        console.log(`[MERN Migration] Migrating ${budgetDocs.length} budgets to MongoDB...`);
        await Budget.insertMany(budgetDocs, { ordered: false });
      }
    }

    // 4. Migrate Subscriptions
    const subCount = await Subscription.countDocuments();
    if (subCount === 0 && Array.isArray(localData.subscriptions) && localData.subscriptions.length > 0) {
      console.log(`[MERN Migration] Migrating ${localData.subscriptions.length} subscriptions to MongoDB...`);
      await Subscription.insertMany(localData.subscriptions, { ordered: false });
    }

    // 5. Migrate Chats
    const chatCount = await Chat.countDocuments();
    if (chatCount === 0 && Array.isArray(localData.chats) && localData.chats.length > 0) {
      console.log(`[MERN Migration] Migrating ${localData.chats.length} chat sessions to MongoDB...`);
      await Chat.insertMany(localData.chats, { ordered: false });
    }

    console.log('[MERN Migration] MongoDB database synchronization complete.');
  } catch (err) {
    console.error('[MERN Migration Error]', err.message);
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cendric';

  try {
    console.log(`[MongoDB] Attempting connection to ${uri.replace(/\/\/.*@/, '//***:***@')}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });

    isConnected = true;
    console.log('[MongoDB] Successfully connected to MongoDB database.');

    // Auto-migrate from JSON flat file if collections are empty
    await migrateDataFromJSON();

    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`[MongoDB] Could not connect to MongoDB (${err.message}).`);
    console.warn('[MongoDB] Server will use persistent JSON data layer as fallback.');
    return false;
  }
}

function isMongoDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isMongoDBConnected,
  migrateDataFromJSON
};
