# 💼 Cendric AI — Personal Finance & Tax Intelligence Platform

Cendric is an AI-powered financial management and real-time tax intelligence platform engineered specifically for freelancers, consultants, and independent professionals in Sri Lanka.

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

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Single Page Application built with React 19, Tailwind CSS, Lucide Icons, and responsive modular styling.
- **Backend**: Node.js & Express.js REST API with Server-Sent Events (SSE) streaming.
- **AI & RAG Service**: TF-IDF and hybrid semantic vector search over Sri Lankan tax knowledge base with optional Google Gemini integration (`gemini-1.5-flash`).
- **Database**: Dual-layer architecture — seamless auto-fallback from MongoDB Atlas to persistent embedded JSON database (`server/data/cendric_db.json`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Installation
Clone the repository:
```bash
git clone https://github.com/Piratheep-R/Project_Cendric.git
cd Project_Cendric
```

Install backend dependencies:
```bash
cd server
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory (refer to `server/.env.example`):
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here # Optional
MONGODB_URI=your_mongodb_uri_here       # Optional
```

### 4. Running the Application
From the `server` directory:
```bash
node server.js
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## ☁️ Deployment

### One-Click Cloud Deployment (Render / Railway / Koyeb)

1. **Root Directory**: Project root
2. **Build Command**: 
   ```bash
   cd server && npm install
   ```
3. **Start Command**: 
   ```bash
   cd server && node server.js
   ```
4. **Environment Variables**:
   - `PORT`: `5000` (or host assigned `PORT`)
   - `JWT_SECRET`: Random 32+ character string
   - `GEMINI_API_KEY`: Google Gemini API Key (optional)
