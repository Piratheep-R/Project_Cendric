# 💼 Cendric AI — Personal Finance & Tax Intelligence Platform

Cendric is an AI-powered financial management and real-time tax intelligence platform engineered specifically for freelancers, consultants, and independent professionals in Sri Lanka.

---

## 📁 Repository & Architecture Layout

```
project-Cendric/
├── client/                        # Frontend Web Application
│   ├── dist/                      # Production-ready web assets
│   │   ├── assets/                # Stylesheets, scripts & branding imagery
│   │   │   ├── cendric-enhancements.js # Client UI enhancements, charts & modals
│   │   │   ├── index-Dr3oI3zo.css      # Precision Frosted Glass Design System (Light & Dark)
│   │   │   └── index-k68ZFBuM.js       # React 19 core application bundle
│   │   ├── favicon.svg            # Browser icon
│   │   ├── icons.svg              # App icons
│   │   ├── index.html             # HTML entry point (served by Express)
│   │   ├── manifest.json          # PWA configuration
│   │   └── sw.js                  # Service worker
│   ├── package.json               # Client dependencies specification
│   └── README.md                  # Frontend documentation
│
├── server/                        # Backend REST API & Intelligence Services
│   ├── data/                      # Persistent database & knowledge bases
│   │   ├── cendric_db.json        # Embedded persistent JSON database
│   │   ├── sri_lanka_tax_kb.json  # Sri Lankan Inland Revenue Act No. 24 of 2017 tax corpus
│   │   └── cached_exchange_rates.json # Auto-updating real-time currency exchange rates
│   ├── services/                  # Modular backend domain services
│   │   ├── ragService.js          # Sri Lankan tax RAG retrieval & deduction calculator
│   │   └── currencyService.js     # Live currency exchange rate sync engine
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies & scripts
│   ├── server.js                  # Express.js REST API & SSE streaming server
│   └── README.md                  # Backend documentation
│
├── .env.example                   # Quick-copy environment configuration
├── .gitignore                     # Git exclusion rules (node_modules, .env, backups)
├── package.json                   # Root package configuration & deployment scripts
├── README.md                      # Comprehensive project guide
└── start.bat                      # Windows one-click local launcher
```

---

## ✨ Key Features

- **📊 Real-time Transactions & Spending Radar**: Category distribution donut chart with interactive slice hover and smart compact amount scaling.
- **🇱🇰 Sri Lankan Tax (PIT) Intelligence Engine**: Built-in RAG (Retrieval-Augmented Generation) based on the Inland Revenue Act No. 24 of 2017 with progressive slab estimations (`6%` to `36%`), Section 11 allowable expense deductions, and Third Schedule export exemptions.
- **🤖 Real-time Streaming AI Chat Assistant**: 
  - Token-by-token streaming output with Server-Sent Events (SSE).
  - Contextual awareness of user transactions, income, and expenses.
  - Quick action chips, Markdown rendering, and Web Speech voice input.
  - "+ New Chat" and "Clear Chat" session management.
- **🧾 Smart Receipt Scanner**: Automatically extracts date, amount, category, and vendor details from receipts.
- **📥 Bank CSV Importer**: Upload bank statements (Commercial Bank, Sampath, HNB, Wise, Payoneer) with auto-category classification and bulk transaction ingestion.
- **📄 Professional PDF Invoice Generator**: Create client invoices with itemized billing, auto-calculated totals, and instant browser print/download.
- **🧮 Freelance Tax & APIT Estimator Modal**: Interactive tax calculator modal estimating personal relief, progressive tax brackets, and quarterly advance tax installments.
- **🔔 Dynamic Financial Notification Center**: Actionable notifications on burn rate, budget thresholds, tax filing deadlines (Nov 30, Aug 15), and subscription renewals.
- **💱 Real-Time Foreign Exchange Rates**: Live synchronizer for USD, EUR, GBP, AUD, CAD to LKR.
- **⌨️ Global Command Palette**: Quick navigation (`Ctrl + K` or `Cmd + K`) across transactions, chat, settings, and modals.
- **🌗 Unified Glassmorphism System**: Ultra-crisp **Kind Warm White Glass** (`data-theme="light"`) and **Deep Space Dark Glass** (`data-theme="dark"`) with real-time sidebar toggle.

---

## 🚀 Quick Start for Team Members

### 1. Clone & Setup
```bash
git clone https://github.com/Piratheep-R/Project_Cendric.git
cd Project_Cendric
```

### 2. Configure Environment (Optional)
Copy the environment template into `server/.env`:
- **Windows**:
  ```cmd
  copy .env.example server\.env
  ```
- **Mac / Linux**:
  ```bash
  cp .env.example server/.env
  ```

*(If you don't provide a Gemini API key or MongoDB URI, Cendric will still run seamlessly with built-in RAG and the persistent local JSON database!)*

### 3. Install & Run
You can launch the app directly from the project root:

```bash
cd server
npm install
node server.js
```
*(On Windows, you can also simply double-click **`start.bat`**)*

Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## ☁️ Production Deployment

The project is pre-configured for zero-config deployments on **Railway**, **Render**, or **Koyeb**:
- **Root Directory**: Project root
- **Build Command**: `cd server && npm install`
- **Start Command**: `node server/server.js` (or `npm start`)
- **Live Production URL**: [https://projectcendric-production.up.railway.app](https://projectcendric-production.up.railway.app)
