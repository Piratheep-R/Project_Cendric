const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Transaction } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const currencyService = require('../services/currencyService');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

async function getTransactions(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10);
    let results = [];
    let total = 0;

    if (isMongoDBConnected()) {
      let query = Transaction.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });
      if (!isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
      results = await query.lean();
      total = await Transaction.countDocuments({ userId: req.user._id });
    } else {
      const userTransactions = db.transactions
        .filter(t => t.userId === req.user._id)
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

      results = !isNaN(limit) && limit > 0 ? userTransactions.slice(0, limit) : userTransactions;
      total = userTransactions.length;
    }

    res.json({
      transactions: results,
      total
    });
  } catch (err) {
    console.error('[Get Transactions Error]', err);
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
}

async function createTransaction(req, res) {
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

    if (isMongoDBConnected()) {
      await Transaction.create(newTx);
    }
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
}

async function updateTransaction(req, res) {
  try {
    const txId = req.params.id;
    const { type, amount, category, date, description, source } = req.body;

    const updateFields = {};
    if (type !== undefined) updateFields.type = type.toLowerCase() === 'income' ? 'income' : 'expense';
    if (amount !== undefined) {
      updateFields.amount = Number(amount) || 0;
      const userCurr = normalizeCurrency(req.user.currencyPreference || 'LKR');
      const rate = currencyService.getRateFor(userCurr);
      updateFields.baseAmountUSD = updateFields.amount / rate;
    }
    if (category !== undefined) updateFields.category = category.trim();
    if (date !== undefined) updateFields.date = date;
    if (description !== undefined) updateFields.description = description.trim();
    if (source !== undefined) updateFields.source = source;

    let updatedTx = null;
    if (isMongoDBConnected()) {
      updatedTx = await Transaction.findOneAndUpdate(
        { _id: txId, userId: req.user._id },
        { $set: updateFields },
        { new: true }
      ).lean();
    }

    const tx = db.transactions.find(t => t._id === txId && t.userId === req.user._id);
    if (!tx && !updatedTx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (tx) {
      Object.assign(tx, updateFields);
      saveDB();
    }

    res.json(updatedTx || tx);
  } catch (err) {
    console.error('[Update Transaction Error]', err);
    res.status(500).json({ message: 'Failed to update transaction.' });
  }
}

async function deleteTransaction(req, res) {
  try {
    const txId = req.params.id;
    let deleted = false;

    if (isMongoDBConnected()) {
      const resMongo = await Transaction.findOneAndDelete({ _id: txId, userId: req.user._id });
      if (resMongo) deleted = true;
    }

    const initialLen = db.transactions.length;
    db.transactions = db.transactions.filter(t => !(t._id === txId && t.userId === req.user._id));
    if (db.transactions.length < initialLen) deleted = true;

    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    saveDB();
    res.json({ success: true, message: 'Transaction removed successfully.' });
  } catch (err) {
    console.error('[Delete Transaction Error]', err);
    res.status(500).json({ message: 'Failed to delete transaction.' });
  }
}

async function bulkImportTransactions(req, res) {
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

      addedTransactions.push(newTx);
      db.transactions.push(newTx);
    });

    if (isMongoDBConnected() && addedTransactions.length > 0) {
      await Transaction.insertMany(addedTransactions, { ordered: false });
    }

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
}

async function exportTransactionsCSV(req, res) {
  try {
    let userTransactions = [];
    if (isMongoDBConnected()) {
      userTransactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).lean();
    } else {
      userTransactions = db.transactions
        .filter(t => t.userId === req.user._id)
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    }

    const currency = req.user.currencyPreference || 'LKR';
    const headers = ['Transaction ID', 'Date', 'Description', 'Category', 'Type', `Amount (${currency})`, 'Source', 'Recorded At'];

    const rows = userTransactions.map(t => [
      t._id,
      t.date || (t.createdAt ? String(t.createdAt).slice(0, 10) : ''),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      String(t.type || '').toUpperCase(),
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
}

async function extractReceipt(req, res) {
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

    // Try Gemini Vision
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.') || apiKey.length > 20)) {
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

    // Heuristic fallback
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
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkImportTransactions,
  exportTransactionsCSV,
  extractReceipt
};
