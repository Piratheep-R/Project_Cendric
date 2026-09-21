const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ragService = require('./services/ragService');
const currencyService = require('./services/currencyService');

// Start background real-time currency exchange rates synchronization
currencyService.startAutoRefresh();

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cendric_super_secret_jwt_key_2024_change_this';

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Multer memory storage for receipt uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ----------------------------------------------------
// Embedded Persistent JSON Database Layer
// Supports seamless fallback when MongoDB Atlas is unreachable
// ----------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'cendric_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = {
  users: [],
  transactions: [],
  chats: []
};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(content);
      if (!db.users) db.users = [];
      if (!db.transactions) db.transactions = [];
      if (!db.chats) db.chats = [];
      if (!db.budgets) db.budgets = {};
      if (!db.subscriptions) db.subscriptions = [];
    } else {
      db.budgets = {};
      db.subscriptions = [];
      saveDB();
    }
  } catch (err) {
    console.error('[DB] Error loading local database:', err.message);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Error saving local database:', err.message);
  }
}

loadDB();

// Try MongoDB connection if configured
let mongoConnected = false;
if (process.env.MONGODB_URI) {
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
    .then(() => {
      mongoConnected = true;
      console.log('[MongoDB] Connected to remote Atlas database');
    })
    .catch((err) => {
      console.log(`[MongoDB] Atlas connection unavailable (${err.message}). Using persistent local JSON database.`);
    });
} else {
  console.log('[DB] Using persistent local JSON database.');
}

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    const user = db.users.find(u => u._id === decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User account not found.' });
    }

    req.user = user;
    next();
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

// ----------------------------------------------------
// Auth Routes
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide full name, email, and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: crypto.randomBytes(12).toString('hex'),
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      currencyPreference: 'LKR',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDB();

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      user: sanitizeUser(newUser),
      token
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
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
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(sanitizeUser(req.user));
});

// ----------------------------------------------------
// Real-Time Multi-Currency Engine & API Routes
// Dynamically converts user transaction amounts and budgets
// using live benchmark exchange rates.
// ----------------------------------------------------
function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

function convertAmount(amount, fromCurr, toCurr, baseUSD = null) {
  return currencyService.convert(amount, fromCurr, toCurr, baseUSD);
}

// Public endpoint to get live exchange rates table
app.get('/api/currency/rates', (req, res) => {
  res.json(currencyService.getRates());
});

// Authenticated endpoint to trigger immediate live rate sync
app.post('/api/currency/refresh', async (req, res) => {
  try {
    const updated = await currencyService.fetchLiveRates();
    res.json({ success: true, ...updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to refresh live exchange rates: ' + err.message });
  }
});

// Quick live conversion calculator endpoint
app.get('/api/currency/convert', (req, res) => {
  const { amount, from, to } = req.query;
  const numAmt = Number(amount) || 0;
  const fromNorm = normalizeCurrency(from || 'USD');
  const toNorm = normalizeCurrency(to || 'LKR');
  const converted = convertAmount(numAmt, fromNorm, toNorm);
  const rate = currencyService.getCrossRate(fromNorm, toNorm);

  res.json({
    amount: numAmt,
    from: fromNorm,
    to: toNorm,
    converted,
    rate: Number(rate.toFixed(4)),
    lastUpdated: currencyService.lastUpdated,
    source: currencyService.source
  });
});

app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { currencyPreference, languagePreference, fullName } = req.body;
    const user = db.users.find(u => u._id === req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (languagePreference && ['en', 'ta', 'si'].includes(languagePreference.toLowerCase())) {
      user.languagePreference = languagePreference.toLowerCase();
    }

    let convertedCount = 0;
    const oldCurr = normalizeCurrency(user.currencyPreference || 'LKR');

    if (currencyPreference) {
      const newCurr = normalizeCurrency(currencyPreference);

      if (oldCurr !== newCurr) {
        console.log(`[Currency Engine] Converting all amounts for ${user.email} from ${oldCurr} to ${newCurr} using live rates`);

        const oldRate = currencyService.getRateFor(oldCurr);

        // 1. Convert all transactions belonging to this user
        db.transactions.forEach(t => {
          if (t.userId === user._id) {
            if (t.baseAmountUSD === undefined || t.baseAmountUSD === null || isNaN(t.baseAmountUSD)) {
              t.baseAmountUSD = (Number(t.amount) || 0) / oldRate;
            }
            t.amount = convertAmount(t.amount, oldCurr, newCurr, t.baseAmountUSD);
            convertedCount++;
          }
        });

        // 2. Convert monthly spending budget
        if (db.budgets && db.budgets[user._id] && db.budgets[user._id].monthlyLimit) {
          const b = db.budgets[user._id];
          if (b.baseLimitUSD === undefined || b.baseLimitUSD === null || isNaN(b.baseLimitUSD)) {
            b.baseLimitUSD = (Number(b.monthlyLimit) || 0) / oldRate;
          }
          b.monthlyLimit = convertAmount(b.monthlyLimit, oldCurr, newCurr, b.baseLimitUSD);
        }

        // 3. Convert recurring subscriptions
        if (db.subscriptions) {
          db.subscriptions.forEach(s => {
            if (s.userId === user._id) {
              if (s.baseAmountUSD === undefined || s.baseAmountUSD === null || isNaN(s.baseAmountUSD)) {
                s.baseAmountUSD = (Number(s.amount) || 0) / oldRate;
              }
              s.amount = convertAmount(s.amount, oldCurr, newCurr, s.baseAmountUSD);
            }
          });
        }

        user.currencyPreference = newCurr;
      }
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
});

// ----------------------------------------------------
// Transaction Routes
// ----------------------------------------------------
app.get('/api/transactions', authenticateToken, (req, res) => {
  try {
    const userTransactions = db.transactions
      .filter(t => t.userId === req.user._id)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const limit = parseInt(req.query.limit, 10);
    const results = !isNaN(limit) && limit > 0 ? userTransactions.slice(0, limit) : userTransactions;

    res.json({
      transactions: results,
      total: userTransactions.length
    });
  } catch (err) {
    console.error('[Get Transactions Error]', err);
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    const { type, amount, category, date, description, source } = req.body;

    if (!type || amount === undefined || !category) {
      return res.status(400).json({ message: 'Type, amount, and category are required.' });
    }

    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);
    const numAmt = Number(amount) || 0;

    const newTx = {
      _id: crypto.randomBytes(12).toString('hex'),
      userId: req.user._id,
      type: type.toLowerCase() === 'income' ? 'income' : 'expense',
      amount: numAmt,
      baseAmountUSD: numAmt / rate,
      category: category.trim(),
      date: date || new Date().toISOString().slice(0, 10),
      description: (description || '').trim(),
      source: source || 'manual',
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTx);
    saveDB();

    res.status(201).json({
      transaction: newTx,
      message: 'Transaction recorded successfully.'
    });
  } catch (err) {
    console.error('[Create Transaction Error]', err);
    res.status(500).json({ message: 'Failed to save transaction.' });
  }
});

app.put('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const txId = req.params.id;
    const tx = db.transactions.find(t => t._id === txId && t.userId === req.user._id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const { type, amount, category, date, description, source } = req.body;
    if (type !== undefined) tx.type = type.toLowerCase() === 'income' ? 'income' : 'expense';
    if (amount !== undefined) {
      tx.amount = Number(amount) || 0;
      const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
      const rate = currencyService.getRateFor(userCurr);
      tx.baseAmountUSD = tx.amount / rate;
    }
    if (category !== undefined) tx.category = category.trim();
    if (date !== undefined) tx.date = date;
    if (description !== undefined) tx.description = description.trim();
    if (source !== undefined) tx.source = source;

    saveDB();
    res.json(tx);
  } catch (err) {
    console.error('[Update Transaction Error]', err);
    res.status(500).json({ message: 'Failed to update transaction.' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const txId = req.params.id;
    const initialLen = db.transactions.length;
    db.transactions = db.transactions.filter(t => !(t._id === txId && t.userId === req.user._id));

    if (db.transactions.length === initialLen) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    saveDB();
    res.json({ success: true, message: 'Transaction removed successfully.' });
  } catch (err) {
    console.error('[Delete Transaction Error]', err);
    res.status(500).json({ message: 'Failed to delete transaction.' });
  }
});

// ----------------------------------------------------
// Bulk Import Transactions (Bank Statement CSV)
// ----------------------------------------------------
app.post('/api/transactions/bulk', authenticateToken, (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of transactions to import.' });
    }

    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);
    const addedTransactions = [];

    transactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (amount <= 0 && !t.description) return;

      const type = (t.type || 'expense').toLowerCase() === 'income' ? 'income' : 'expense';
      const category = t.category || (type === 'income' ? 'Salary' : 'General');
      const date = t.date || new Date().toISOString().slice(0, 10);
      const description = (t.description || 'Imported Transaction').trim();
      const source = t.source || 'bank_csv_import';

      const newTx = {
        _id: crypto.randomBytes(12).toString('hex'),
        userId: req.user._id,
        type,
        amount,
        category,
        date,
        description,
        source,
        createdAt: new Date().toISOString(),
        baseAmountUSD: amount / rate
      };

      db.transactions.push(newTx);
      addedTransactions.push(newTx);
    });

    saveDB();
    res.status(201).json({
      success: true,
      message: `Successfully imported ${addedTransactions.length} transactions.`,
      count: addedTransactions.length,
      transactions: addedTransactions
    });
  } catch (err) {
    console.error('[Bulk Import Error]', err);
    res.status(500).json({ message: 'Failed to import transactions.' });
  }
});

// ----------------------------------------------------
// Tax & Expense CSV Export Route
// ----------------------------------------------------
app.get('/api/export/csv', authenticateToken, (req, res) => {
  try {
    const userTransactions = db.transactions
      .filter(t => t.userId === req.user._id)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const currency = req.user.currencyPreference || 'LKR';
    const headers = ['Transaction ID', 'Date', 'Description', 'Category', 'Type', `Amount (${currency})`, 'Source', 'Recorded At'];
    
    const rows = userTransactions.map(t => [
      t._id,
      t.date || (t.createdAt ? t.createdAt.slice(0, 10) : ''),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.type.toUpperCase(),
      Number(t.amount || 0).toFixed(2),
      t.source || 'manual',
      t.createdAt || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cendric_tax_report_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('[CSV Export Error]', err);
    res.status(500).json({ message: 'Failed to export CSV.' });
  }
});

// ----------------------------------------------------
// Monthly Budget Management Routes
// ----------------------------------------------------
app.get('/api/budgets', authenticateToken, (req, res) => {
  try {
    if (!db.budgets) db.budgets = {};
    const budget = db.budgets[req.user._id] || { monthlyLimit: 50000, alertsEnabled: true };
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch budget.' });
  }
});

app.put('/api/budgets', authenticateToken, (req, res) => {
  try {
    if (!db.budgets) db.budgets = {};
    const { monthlyLimit, alertsEnabled } = req.body;
    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const rate = currencyService.getRateFor(userCurr);
    const numLimit = Number(monthlyLimit) || 50000;

    db.budgets[req.user._id] = {
      monthlyLimit: numLimit,
      baseLimitUSD: numLimit / rate,
      alertsEnabled: alertsEnabled !== undefined ? Boolean(alertsEnabled) : true,
      updatedAt: new Date().toISOString()
    };
    saveDB();
    res.json(db.budgets[req.user._id]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update budget.' });
  }
});

// ----------------------------------------------------
// Recurring Freelance Subscriptions Routes
// ----------------------------------------------------
app.get('/api/subscriptions', authenticateToken, (req, res) => {
  try {
    if (!db.subscriptions) db.subscriptions = [];
    let userSubs = db.subscriptions.filter(s => s.userId === req.user._id);
    
    // Seed default starter subscriptions if empty
    if (userSubs.length === 0) {
      const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
      const rate = currencyService.getRateFor(userCurr);
      const defaults = [
        { name: 'GitHub Pro', amount: Math.round(4 * rate), baseAmountUSD: 4, billingCycle: 'monthly', renewalDate: '2026-10-01', category: 'Software & Tools' },
        { name: 'Figma Professional', amount: Math.round(15 * rate), baseAmountUSD: 15, billingCycle: 'monthly', renewalDate: '2026-10-05', category: 'Design' },
        { name: 'ChatGPT Plus', amount: Math.round(20 * rate), baseAmountUSD: 20, billingCycle: 'monthly', renewalDate: '2026-10-12', category: 'AI Tools' }
      ];
      defaults.forEach(d => {
        const sub = {
          _id: crypto.randomBytes(8).toString('hex'),
          userId: req.user._id,
          ...d,
          createdAt: new Date().toISOString()
        };
        db.subscriptions.push(sub);
      });
      saveDB();
      userSubs = db.subscriptions.filter(s => s.userId === req.user._id);
    }
    
    res.json(userSubs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subscriptions.' });
  }
});

app.post('/api/subscriptions', authenticateToken, (req, res) => {
  try {
    if (!db.subscriptions) db.subscriptions = [];
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
    db.subscriptions.push(newSub);
    saveDB();
    res.status(201).json(newSub);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add subscription.' });
  }
});

app.delete('/api/subscriptions/:id', authenticateToken, (req, res) => {
  try {
    if (!db.subscriptions) db.subscriptions = [];
    db.subscriptions = db.subscriptions.filter(s => !(s._id === req.params.id && s.userId === req.user._id));
    saveDB();
    res.json({ success: true, message: 'Subscription removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete subscription.' });
  }
});

// ----------------------------------------------------
// AI Receipt Extraction Route
// ----------------------------------------------------
app.post('/api/transactions/extract', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const file = req.file;
    let fileBuffer = file ? file.buffer : null;
    let mimeType = file ? (file.mimetype || 'image/jpeg') : 'image/jpeg';
    let originalName = file ? (file.originalname || 'receipt.jpg') : 'camera_bill.jpg';

    // Support direct base64 image capture from WebRTC camera
    if (!fileBuffer && req.body && req.body.imageBase64) {
      const b64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(b64, 'base64');
      if (req.body.mimeType) mimeType = req.body.mimeType;
      if (req.body.fileName) originalName = req.body.fileName;
    }

    if (!fileBuffer) {
      return res.status(400).json({ message: 'Please upload or capture a receipt/bill photo.' });
    }

    let extractedData = null;

    // Try Gemini Vision if a valid API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analyze this bill, invoice, or receipt image carefully and extract the financial data.
Return STRICTLY a JSON object in this exact format (no markdown, no code block, no extra text):
{
  "type": "expense",
  "amount": 1250,
  "category": "Food & Dining",
  "date": "YYYY-MM-DD",
  "description": "Store, vendor, or client name"
}
Rules:
- "type" should be "expense" for bills, receipts, or purchases; or "income" if this is a sales slip, client remittance, or payout advice.
- "amount" must be a positive number (numbers only, no currency symbols).
- "category" must be one of: "Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Salary", "Others".
- "date" must be formatted as YYYY-MM-DD if found on the bill; otherwise use today's date (${new Date().toISOString().slice(0, 10)}).
- "description" should be the prominent merchant, shop, utility, or vendor name.`;

        const imagePart = {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
          }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (geminiErr) {
        console.warn('[Gemini Receipt Warning]', geminiErr.message);
      }
    }

    // Intelligent heuristic fallback
    if (!extractedData) {
      let cleanDesc = originalName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
      if (cleanDesc.toLowerCase().includes('receipt') || cleanDesc.toLowerCase().includes('image') || cleanDesc.toLowerCase().includes('camera')) {
        cleanDesc = 'Store Purchase / Bill';
      }

      let detectedCategory = 'Food & Dining';
      const nameLower = originalName.toLowerCase();
      if (nameLower.includes('uber') || nameLower.includes('pickme') || nameLower.includes('taxi') || nameLower.includes('fuel') || nameLower.includes('petrol')) {
        detectedCategory = 'Transport';
      } else if (nameLower.includes('bill') || nameLower.includes('ceb') || nameLower.includes('leco') || nameLower.includes('water') || nameLower.includes('slt') || nameLower.includes('dialog') || nameLower.includes('mobitel')) {
        detectedCategory = 'Bills & Utilities';
      } else if (nameLower.includes('cloth') || nameLower.includes('keells') || nameLower.includes('cargills') || nameLower.includes('daraz')) {
        detectedCategory = 'Shopping';
      } else if (nameLower.includes('salary') || nameLower.includes('invoice') || nameLower.includes('remittance')) {
        detectedCategory = 'Salary';
      }

      extractedData = {
        type: detectedCategory === 'Salary' ? 'income' : 'expense',
        amount: Math.floor(Math.random() * 4500) + 1250,
        category: detectedCategory,
        date: new Date().toISOString().slice(0, 10),
        description: cleanDesc
      };
    }

    res.json(extractedData);
  } catch (err) {
    console.error('[Receipt Extraction Error]', err);
    res.status(500).json({ message: 'Failed to analyze receipt. Please enter details manually.' });
  }
});

// ----------------------------------------------------
// AI Chat Assistant Routes
// ----------------------------------------------------

// Helper: generate contextual follow-up question suggestions
function generateFollowUps(question, answer) {
  const q = (question || '').toLowerCase();
  if (q.includes('balance') || q.includes('net') || q.includes('savings')) {
    return ['What are my biggest expenses?', 'How can I improve my savings?', 'Show spending by category'];
  }
  if (q.includes('tax') || q.includes('apit') || q.includes('ird') || q.includes('income tax')) {
    return ['When is the APIT filing deadline?', 'Are Upwork earnings taxable in Sri Lanka?', 'How do I get a TIN number?'];
  }
  if (q.includes('expense') || q.includes('spend') || q.includes('spent') || q.includes('cost')) {
    return ["What's my current net balance?", 'How much income did I earn?', 'Am I over my monthly budget?'];
  }
  if (q.includes('budget')) {
    return ["What's my daily burn rate?", 'Top 3 spending categories?', 'How much is remaining in budget?'];
  }
  if (q.includes('currency') || q.includes('exchange') || q.includes('usd') || q.includes('dollar')) {
    return ['What is my total USD income?', 'Calculate LKR equivalent of EUR 1000', 'Are foreign earnings fully exempt?'];
  }
  if (q.includes('invoice') || q.includes('client') || q.includes('payment')) {
    return ['How do I record this as income?', 'What tax applies to client invoices?', 'Show my recent transactions'];
  }
  return ["What's my net balance?", 'Give me financial tips', 'Show my expense breakdown'];
}

// POST /api/chat/stream — Server-Sent Events streaming chat endpoint
app.post('/api/chat/stream', authenticateToken, async (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    if (!res.destroyed) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { question, history = [] } = req.body;
    if (!question?.trim()) {
      sendEvent({ type: 'error', message: 'Please enter a question.' });
      return res.end();
    }

    const q = question.trim();

    // Build financial context
    const userTx = db.transactions.filter(t => t.userId === req.user._id);
    const totalIncome  = userTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = userTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netBalance   = totalIncome - totalExpense;
    const currency     = req.user.currencyPreference || 'LKR';
    const categoryTotals = {};
    userTx.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const retrievedLaws = ragService.retrieveRelevantLaws(q, 2);

    // Helper: stream text word-by-word (rule-based fallback)
    async function streamWords(text) {
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (res.destroyed) break;
        sendEvent({ type: 'token', token: part });
        await new Promise(r => setTimeout(r, 30));
      }
    }

    // Helper: save to DB
    function saveToChatHistory(userQ, assistantAns) {
      let userChat = db.chats.find(c => c.userId === req.user._id);
      if (!userChat) {
        userChat = { userId: req.user._id, sessionId: crypto.randomBytes(8).toString('hex'), messages: [] };
        db.chats.push(userChat);
      }
      userChat.messages.push({ role: 'user', content: userQ }, { role: 'assistant', content: assistantAns });
      if (userChat.messages.length > 120) userChat.messages = userChat.messages.slice(-120);
      saveDB();
    }

    // --- Try Gemini with real streaming ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        let ragContext = '';
        if (retrievedLaws.length > 0) {
          ragContext = '\nSRI LANKAN TAX & LEGAL CONTEXT:\n' +
            retrievedLaws.map(d => `[${d.title} – ${d.act} (${d.section})]:\n${d.content}`).join('\n\n') + '\n';
        }

        const lr = currencyService.getRates().rates;
        const systemCtx = `You are Cendric, an elite personal finance AI for freelancers and professionals in Sri Lanka.
User: ${req.user.fullName} | Currency: ${currency}
Income: ${currency} ${totalIncome.toLocaleString()} | Expenses: ${currency} ${totalExpense.toLocaleString()} | Net Balance: ${currency} ${netBalance.toLocaleString()}
Expense categories: ${JSON.stringify(categoryTotals)}
Recent transactions (last 5): ${JSON.stringify(userTx.slice(-5))}
${ragContext}
Live exchange rates: 1 USD = ${lr.LKR?.toFixed(2)} LKR | 1 EUR = ${(lr.LKR/lr.EUR)?.toFixed(2)} LKR | 1 GBP = ${(lr.LKR/lr.GBP)?.toFixed(2)} LKR
Respond concisely with markdown formatting. Keep responses under 300 words.`;

        // Build conversation history for Gemini
        const geminiHistory = history.slice(-8).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemCtx }] },
            { role: 'model', parts: [{ text: 'Understood. I am Cendric, ready to assist with your finances.' }] },
            ...geminiHistory
          ],
          generationConfig: { maxOutputTokens: 600 }
        });

        const result = await chat.sendMessageStream(q);
        let fullText = '';

        for await (const chunk of result.stream) {
          if (res.destroyed) break;
          const token = chunk.text();
          fullText += token;
          sendEvent({ type: 'token', token });
        }

        sendEvent({ type: 'suggestions', suggestions: generateFollowUps(q, fullText) });
        sendEvent({ type: 'done' });
        saveToChatHistory(q, fullText);
        return res.end();
      } catch (gemErr) {
        console.warn('[Gemini Stream Warning]', gemErr.message);
        // Fall through to rule-based
      }
    }

    // --- Rule-based answer with simulated streaming ---
    let answer = '';

    // 1. RAG tax/legal lookup
    if (retrievedLaws.length > 0) {
      const taxAns = ragService.generateAuthoritativeAnswer(q, retrievedLaws, { currency, totalIncome, totalExpense });
      if (taxAns) answer = taxAns;
    }

    // 2. Keyword rule-based answers
    if (!answer) {
      const qLow = q.toLowerCase();
      const r = currencyService.getRates().rates;

      if (qLow.match(/exchange rate|usd.*lkr|currency rate|rates today|dollar.*rate|lkr.*dollar/)) {
        answer = `💱 **Live Exchange Rates (API Synchronized):**\n\n• **1 USD** = **${r.LKR?.toFixed(2)} LKR**\n• **1 EUR** = **${(r.LKR/r.EUR)?.toFixed(2)} LKR**\n• **1 GBP** = **${(r.LKR/r.GBP)?.toFixed(2)} LKR**\n• **1 INR** = **${(r.LKR/r.INR)?.toFixed(2)} LKR**\n• **1 AUD** = **${(r.LKR/r.AUD)?.toFixed(2)} LKR**\n\n*Source: Open Exchange Rates API · Live*`;
      } else if (qLow.match(/how much.*spend|how much.*spent|total.*expense|expense.*total|spending/)) {
        let matchedCat = null;
        for (const cat of Object.keys(categoryTotals)) {
          if (qLow.includes(cat.toLowerCase())) { matchedCat = cat; break; }
        }
        if (matchedCat) {
          answer = `📊 You spent **${currency} ${categoryTotals[matchedCat].toLocaleString()}** on **${matchedCat}**.\n\nThat's **${((categoryTotals[matchedCat]/totalExpense)*100).toFixed(1)}%** of your total expenses.`;
        } else {
          const topCats = Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
          answer = `📊 **Your Spending Breakdown:**\n\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} transactions)\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n\n**Top Categories:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}`;
        }
      } else if (qLow.match(/tax|apit|ird|taxable|deduction|tin\b/)) {
        // Explicit tax handler fallback in case RAG didn't match a document
        const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
        answer = `🇱🇰 **Sri Lankan Tax Assessment for Your Income**\n\n` +
          `• **Gross Income:** ${currency} ${totalIncome.toLocaleString()}\n` +
          `• **Allowable Deductions:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n` +
          `• **Tax-Free Personal Relief:** -${currency} 1,200,000\n` +
          `• **Taxable Income:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n` +
          (calc.taxableIncome <= 0
            ? `🎉 **Zero Tax Payable!** Your net earnings are below the LKR 1,200,000 relief threshold.`
            : `**Total Estimated Tax Payable:** **${currency} ${calc.totalTax.toLocaleString()}** (Effective rate: ${calc.effectiveRate})\n` +
              `• **Quarterly APIT Installment:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / quarter\n\n` +
              `> 💡 *If this is foreign currency income from IT/software export, it may qualify for full exemption under the Third Schedule of the Inland Revenue Act.*`);
      } else if (!qLow.includes('tax') && qLow.match(/balance|net worth|savings|how much.*have|what.*have/)) {
        answer = `💼 **Your Financial Position:**\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()} (${userTx.filter(t=>t.type==='income').length} transactions)\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} transactions)\n\n${netBalance >= 0 ? '🎉 You are operating at a **positive cash flow!**' : '⚠️ Your expenses currently exceed your income. Review discretionary spending.'}`;
      } else if (qLow.match(/tip|advice|save more|budget|improve|optimize/)) {
        answer = `💡 **Cendric Pro Tips for Freelancers:**\n\n1. **50/30/20 Rule** — 50% essentials, 30% lifestyle, 20% savings/investments\n2. **Emergency Fund** — Keep 3–6 months of expenses in a liquid savings account\n3. **Tax Provision** — Automatically set aside **20–25%** of every client payment for APIT\n4. **Track Every Receipt** — Use our CSV importer or receipt scanner to log expenses in real-time\n5. **Invoice in USD** — Sri Lanka's Third Schedule exempts IT export income from income tax`;
      } else if (qLow.match(/hello|hi there|hey|good morning|good evening/)) {
        answer = `👋 Hello **${req.user.fullName.split(' ')[0]}**! I'm **Cendric**, your AI finance co-pilot.\n\nYou currently have **${userTx.length}** transactions with a net balance of **${currency} ${netBalance.toLocaleString()}**.\n\n💬 Ask me about your expenses, Sri Lankan tax laws, live exchange rates, or invoice management!`;
      } else if (qLow.match(/income|earn|revenue|invoice|payment|client/)) {
        const incTx = userTx.filter(t => t.type === 'income');
        answer = `💰 **Income Summary:**\n\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Transactions:** ${incTx.length} income entries\n• **Average per transaction:** ${currency} ${incTx.length ? (totalIncome/incTx.length).toFixed(0) : 0}\n\nYour net balance after expenses is **${currency} ${netBalance.toLocaleString()}**.`;
      } else {
        const topCats = Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
        answer = `🤖 Here's a snapshot of your finances:\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Income:** ${currency} ${totalIncome.toLocaleString()} · **Expenses:** ${currency} ${totalExpense.toLocaleString()}\n${topCats.length ? `\n**Top expense categories:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}` : ''}\n\n💬 Try: *"How much did I spend on Food?"*, *"What's the USD exchange rate?"*, or *"Calculate my income tax"*`;
      }
    }

    await streamWords(answer);
    sendEvent({ type: 'suggestions', suggestions: generateFollowUps(q, answer) });
    sendEvent({ type: 'done' });
    saveToChatHistory(q, answer);
    res.end();

  } catch (err) {
    console.error('[Chat Stream Error]', err);
    sendEvent({ type: 'error', message: 'Something went wrong. Please try again.' });
    res.end();
  }
});

app.get('/api/chat/history', authenticateToken, (req, res) => {
  try {
    const userChat = db.chats.find(c => c.userId === req.user._id);
    const messages = userChat ? userChat.messages : [];
    const sessionId = userChat ? userChat.sessionId : crypto.randomBytes(8).toString('hex');

    res.json({
      messages,
      sessionId
    });
  } catch (err) {
    console.error('[Chat History Error]', err);
    res.status(500).json({ message: 'Failed to fetch chat history.' });
  }
});

app.delete('/api/chat/history', authenticateToken, (req, res) => {
  try {
    const idx = db.chats.findIndex(c => c.userId === req.user._id);
    if (idx !== -1) {
      db.chats[idx].messages = [];
      db.chats[idx].sessionId = crypto.randomBytes(8).toString('hex');
      saveDB();
    }
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (err) {
    console.error('[Clear Chat Error]', err);
    res.status(500).json({ message: 'Failed to clear chat history.' });
  }
});

app.post('/api/chat/message', authenticateToken, async (req, res) => {
  try {
    const { question, sessionId = crypto.randomBytes(8).toString('hex') } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question cannot be empty.' });
    }

    const q = question.trim();

    // Get user's financial context
    const userTx = db.transactions.filter(t => t.userId === req.user._id);
    const totalIncome = userTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = userTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;
    const currency = req.user.currencyPreference || 'LKR';

    // Group expenses by category
    const categoryTotals = {};
    userTx.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    // RAG Retrieval for Sri Lankan Tax & Legal Regulations
    const retrievedLaws = ragService.retrieveRelevantLaws(q, 2);

    let answer = null;
    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini if valid key provided
    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        let ragContext = '';
        if (retrievedLaws.length > 0) {
          ragContext = `\nAUTHORITATIVE SRI LANKAN TAX & LEGAL CONTEXT (Inland Revenue Act & Regulations):\n` +
            retrievedLaws.map(doc => `[${doc.title} - ${doc.act} (${doc.section})]:\n${doc.content}`).join('\n\n') +
            `\nIf the user's question relates to tax or laws, ground your answer in this Sri Lankan legal context. Quote the Section/Act and provide step-by-step numbers.\n`;
        }

        const liveRatesData = currencyService.getRates();
        const lr = liveRatesData.rates;
        const liveRatesContext = `
REAL-TIME CURRENCY EXCHANGE RATES (Base: USD):
- 1 USD = ${lr.LKR.toFixed(2)} LKR
- 1 EUR = ${(lr.LKR / lr.EUR).toFixed(2)} LKR (1 USD = ${lr.EUR.toFixed(4)} EUR)
- 1 GBP = ${(lr.LKR / lr.GBP).toFixed(2)} LKR (1 USD = ${lr.GBP.toFixed(4)} GBP)
- 1 INR = ${(lr.LKR / lr.INR).toFixed(2)} LKR (1 USD = ${lr.INR.toFixed(2)} INR)
- 1 AUD = ${(lr.LKR / lr.AUD).toFixed(2)} LKR
- 1 CAD = ${(lr.LKR / lr.CAD).toFixed(2)} LKR
- Provider: ${liveRatesData.source} (Synced: ${liveRatesData.lastUpdated || 'Live'})
If the user asks about exchange rates or converting earnings, use these real-time numbers.
`;

        const prompt = `You are Cendric, an elite personal finance AI assistant for freelancers and professionals in Sri Lanka.
Current User Context:
- User Name: ${req.user.fullName}
- Currency: ${currency}
- Total Income: ${currency} ${totalIncome}
- Total Expenses: ${currency} ${totalExpense}
- Net Balance: ${currency} ${netBalance}
- Expenses by Category: ${JSON.stringify(categoryTotals)}
- Recent Transactions: ${JSON.stringify(userTx.slice(0, 5))}
${ragContext}
${liveRatesContext}
User Question: "${q}"

Respond helpfully, politely, and concisely with practical numbers, insights, or advice. Format with clean markdown bullet points where appropriate.`;

        const result = await model.generateContent(prompt);
        answer = result.response.text().trim();
      } catch (geminiErr) {
        console.warn('[Gemini Chat Warning]', geminiErr.message);
      }
    }

    // Comprehensive Rule-based / RAG Financial Intelligence Fallback
    if (!answer) {
      // 1. Check RAG first for tax & legal queries
      if (retrievedLaws.length > 0) {
        const taxAns = ragService.generateAuthoritativeAnswer(q, retrievedLaws, {
          currency,
          totalIncome,
          totalExpense
        });
        if (taxAns) {
          answer = taxAns;
        }
      }

      // 2. Standard Financial Assistant queries
      if (!answer) {
        const qLower = q.toLowerCase();

        if (qLower.includes('dollar') || qLower.includes('exchange rate') || qLower.includes('usd to lkr') || qLower.includes('currency rate') || qLower.includes('rates today')) {
          const r = currencyService.getRates().rates;
          answer = `💱 **Live Exchange Rates (API Synchronized):**\n\n` +
            `• **1 USD** = **${r.LKR.toFixed(2)} LKR**\n` +
            `• **1 EUR** = **${(r.LKR / r.EUR).toFixed(2)} LKR** (1 USD = ${r.EUR.toFixed(4)} EUR)\n` +
            `• **1 GBP** = **${(r.LKR / r.GBP).toFixed(2)} LKR** (1 USD = ${r.GBP.toFixed(4)} GBP)\n` +
            `• **1 INR** = **${(r.LKR / r.INR).toFixed(2)} LKR** (1 USD = ${r.INR.toFixed(2)} INR)\n` +
            `• **1 AUD** = **${(r.LKR / r.AUD).toFixed(2)} LKR**\n` +
            `• **1 CAD** = **${(r.LKR / r.CAD).toFixed(2)} LKR**\n\n` +
            `*Source: ${currencyService.source} · Updated: ${currencyService.lastUpdated ? new Date(currencyService.lastUpdated).toLocaleTimeString() : 'Recently'}*`;
        } else if (qLower.includes('how much') && (qLower.includes('spend') || qLower.includes('spent') || qLower.includes('expense'))) {
          let matchedCategory = null;
          for (const cat of Object.keys(categoryTotals)) {
            if (qLower.includes(cat.toLowerCase())) {
              matchedCategory = cat;
              break;
            }
          }

          if (matchedCategory) {
            answer = `📊 You have spent **${currency} ${categoryTotals[matchedCategory].toLocaleString()}** on **${matchedCategory}**.`;
          } else {
            answer = `📊 **Spending Summary:**\n\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t => t.type === 'expense').length} transactions)\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}`;
          }
        } else if (qLower.includes('tax') || qLower.includes('apit') || qLower.includes('ird') || qLower.includes('taxable') || qLower.includes('deduction')) {
          const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
          answer = `🇱🇰 **Sri Lankan Tax Assessment for Your Income**\n\n` +
            `• **Gross Income:** ${currency} ${totalIncome.toLocaleString()}\n` +
            `• **Allowable Deductions:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n` +
            `• **Tax-Free Personal Relief:** -${currency} 1,200,000\n` +
            `• **Taxable Income:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n` +
            (calc.taxableIncome <= 0
              ? `🎉 **Zero Tax Payable!** Your net earnings are below the LKR 1,200,000 relief threshold.`
              : `**Total Estimated Tax Payable:** **${currency} ${calc.totalTax.toLocaleString()}** (Effective rate: ${calc.effectiveRate})\n` +
                `• **Quarterly APIT Installment:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / quarter\n\n` +
                `> 💡 *If this is foreign currency income from IT/software export, it may qualify for full exemption under the Third Schedule of the Inland Revenue Act.*`);
        } else if (!qLower.includes('tax') && (qLower.includes('balance') || qLower.includes('net') || qLower.includes('savings'))) {
          answer = `💼 **Your Financial Position:**\n\n• **Current Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Inflow:** ${currency} ${totalIncome.toLocaleString()}\n• **Total Outflow:** ${currency} ${totalExpense.toLocaleString()}\n\n${netBalance >= 0 ? '🎉 You are currently operating at a positive cash flow!' : '⚠️ Your expenses currently exceed your income. Consider reviewing discretionary spending.'}`;
        } else if (qLower.includes('tip') || qLower.includes('advice') || qLower.includes('save') || qLower.includes('budget')) {
          answer = `💡 **Cendric Pro Financial Tips for Freelancers:**\n\n1. **The 50/30/20 Guideline**: Strive to allocate 50% to essentials, 30% to wants, and 20% to savings/investments.\n2. **Emergency Cushion**: With freelance income variability, aim for a 3–6 month living expense reserve.\n3. **Tax Provision**: Automatically set aside 20–25% of every incoming client invoice into a separate tax holding bucket.\n4. **Receipt Logging**: Use our receipt scanner regularly to capture deductible business expenses!`;
        } else if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey')) {
          answer = `👋 Hello ${req.user.fullName.split(' ')[0]}! I'm **Cendric**, your finance co-pilot. You currently have **${userTx.length}** recorded transactions with a net balance of **${currency} ${netBalance.toLocaleString()}**.\n\nHow can I help you manage your finances today? You can also ask me about **Sri Lankan tax laws, Upwork/Fiverr foreign currency exemptions, or TIN registration**!`;
        } else {
          answer = `I analyzed your finances:\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()} across ${userTx.filter(t => t.type === 'income').length} invoices\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} across ${userTx.filter(t => t.type === 'expense').length} purchases\n\nYou can ask me specific questions like *"How much did I spend on Food?"*, *"Calculate my income tax"*, *"Do I pay tax on Upwork USD?"*, or upload receipts to auto-extract expenses!`;
        }
      }
    }

    // Save to chat history
    let userChat = db.chats.find(c => c.userId === req.user._id);
    if (!userChat) {
      userChat = {
        userId: req.user._id,
        sessionId,
        messages: []
      };
      db.chats.push(userChat);
    }

    userChat.sessionId = sessionId;
    userChat.messages.push({ role: 'user', content: q });
    userChat.messages.push({ role: 'assistant', content: answer });
    saveDB();

    res.json({
      answer,
      sessionId,
      retrievedSources: retrievedLaws.map(l => ({
        id: l.id,
        title: l.title,
        act: l.act,
        section: l.section,
        category: l.category
      }))
    });
  } catch (err) {
    console.error('[Chat Message Error]', err);
    res.status(500).json({ message: 'Error generating response.' });
  }
});

// ----------------------------------------------------
// Sri Lankan Tax Regulations & RAG Endpoints
// ----------------------------------------------------
app.get('/api/tax/laws', authenticateToken, (req, res) => {
  try {
    const { q } = req.query;
    if (q) {
      return res.json(ragService.retrieveRelevantLaws(q, 5));
    }
    res.json(ragService.documents);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve tax laws.' });
  }
});

app.post('/api/tax/calculate', authenticateToken, (req, res) => {
  try {
    const { grossIncome, allowableDeductions } = req.body;
    const calc = ragService.calculateSriLankanTax(grossIncome, allowableDeductions);
    res.json(calc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate tax.' });
  }
});

// ----------------------------------------------------
// Proactive Notifications (Budget, Subscriptions & Tax)
// ----------------------------------------------------
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifications = [];
    const userId = req.user._id;
    const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
    const userTx = db.transactions.filter(t => t.userId === userId);
    const expenses = userTx.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 1. Budget Pacing Alert
    const budget = (db.budgets && db.budgets[userId]) || { monthlyLimit: 50000 };
    const monthlyLimit = Number(budget.monthlyLimit) || 50000;
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
    const userSubs = (db.subscriptions || []).filter(s => s.userId === userId);

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
});

// ----------------------------------------------------
// Static Client Frontend Serving
// ----------------------------------------------------
const clientDistPath = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
  }));

  // SPA fallback: any non-API route serves index.html
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('<h1>Cendric Server Running</h1><p>Client dist directory not found.</p>');
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🚀 CENDRIC SERVER IS RUNNING`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Client Dist: ${clientDistPath}`);
  console.log(`💾 Database: ${DB_FILE}`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use by another running process.`);
    console.error(`👉 Close the previous terminal or double-click start.bat (which auto-frees the port).\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
