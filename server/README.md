# ⚡ Cendric Server (Backend)

The Node.js and Express.js backend engine powering **Cendric AI Finance Assistant & Tax Intelligence**.

---

## 📁 Directory Structure

```
server/
├── data/                          # Data store & knowledge bases
│   ├── cendric_db.json            # Persistent embedded JSON database (users, transactions, budgets)
│   ├── sri_lanka_tax_kb.json      # Inland Revenue Act No. 24 of 2017 tax knowledge documents
│   └── cached_exchange_rates.json # Auto-refreshing live currency exchange cache (USD, EUR, etc. to LKR)
├── services/                      # Modular backend domain services
│   ├── ragService.js              # Sri Lankan PIT tax retrieval-augmented generation engine
│   └── currencyService.js         # Real-time exchange rate sync & scheduled background updater
├── .env.example                   # Template environment variables
├── package.json                   # Server dependencies & scripts
└── server.js                      # Main Express server, REST endpoints & SSE streaming handler
```

---

## 🔑 Key Backend Components

### 1. `server.js` (Core Application Server)
- **REST APIs**: Authentication (`/api/auth`), Transactions (`/api/transactions`), Invoices, Budgets, and Profile.
- **AI Streaming**: Real-time token-by-token Server-Sent Events (SSE) streaming for Gemini AI Chat (`/api/chat/message`).
- **Static Hosting**: Automatically serves the frontend single-page application from `../client/dist`.

### 2. `services/ragService.js` (Sri Lankan Tax RAG Engine)
- Indexes official Sri Lankan tax statutes from `data/sri_lanka_tax_kb.json`.
- Implements hybrid search combining TF-IDF lexical matching and semantic scoring.
- Calculates tax slabs (`6%` to `36%`), Section 11 deductions, and Third Schedule export exemptions without hallucination.

### 3. `services/currencyService.js` (Live Forex Synchronizer)
- Automatically fetches and caches live foreign currency conversion rates against LKR from open exchange APIs.
- Periodically refreshes rates in the background to ensure all conversions are instant and resilient.

### 4. `data/cendric_db.json` (Dual-Layer Database)
- High-performance, zero-configuration persistent local JSON database.
- Provides automatic fallback if MongoDB Atlas is not configured or network connectivity is unavailable.

---

## 🛠️ Running the Server

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional)
cp .env.example .env

# 3. Start the server
node server.js
```
The server will start listening at **`http://localhost:5000`**.
