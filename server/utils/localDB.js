const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cendric_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = {
  users: [],
  transactions: [],
  chats: [],
  budgets: {},
  subscriptions: []
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

// Initial load
loadDB();

module.exports = {
  db,
  loadDB,
  saveDB,
  DB_FILE
};
