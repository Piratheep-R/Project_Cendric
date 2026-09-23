# Cendric AI — System Architecture & Technical Specifications

Cendric AI is a personal finance, tax intelligence, and freelance cash-flow optimization platform tailored for Sri Lankan professionals earning in foreign and local currencies.

---

## 1. Directory & Component Organization

```
project-Cendric/
├── frontend/                     # React 19 Frontend (Single Page Application)
│   ├── dist/                    # Production-ready compiled assets
│   │   ├── assets/              # Vite JS bundle, CSS stylesheets, images
│   │   │   ├── cendric-enhancements.js  # Trilingual i18n, live bill scanner, dynamic DOM
│   │   │   ├── index-Dr3oI3zo.css       # Complete luxury frosted glassmorphic styles
│   │   │   └── index-k68ZFBuM.js        # React 19 core application bundle
│   │   ├── favicon.svg          # Application vector brand icon
│   │   ├── icons.svg            # UI SVG sprite assets
│   │   ├── index.html           # Main HTML document with cache-busted assets
│   │   ├── manifest.json        # Progressive Web App (PWA) manifest
│   │   └── sw.js                # Service Worker for offline capability
│   ├── package.json             # Frontend dependencies (React 19, Lucide, Tailwind, Vite)
│   └── README.md                # Frontend documentation
│
├── backend/                      # Node.js & Express.js REST API & AI Services
│   ├── config/
│   │   └── db.js                # MongoDB Atlas connection via Mongoose with offline fallback
│   ├── controllers/             # Business Logic & Request Handlers (MVC)
│   │   ├── authController.js    # Registration, bcrypt hashing, JWT issuance & verification
│   │   ├── budgetController.js  # Category spending limits & alert calculations
│   │   ├── chatController.js    # Real-time SSE streaming & Gemini 3.8 Flash AI with RAG
│   │   ├── currencyController.js# Real-time FX exchange rate conversions
│   │   ├── notificationController.js # Proactive deadline & threshold alerts
│   │   ├── subscriptionController.js # Recurring subscription tracker
│   │   ├── taxController.js     # Sri Lankan Inland Revenue Act PIT calculations
│   │   └── transactionController.js # Transaction CRUD & Gemini 3.8 Flash Bill Scanner OCR
│   ├── data/
│   │   ├── cached_exchange_rates.json # Cached live Forex rates (Open Exchange Rates)
│   │   ├── cendric_db.json      # Offline fallback database
│   │   └── sri_lanka_tax_kb.json# Sri Lankan Tax Law Knowledge Base (Inland Revenue Act)
│   ├── middleware/
│   │   ├── auth.js              # Bearer JWT verification middleware
│   │   └── upload.js            # Multer in-memory receipt upload handler
│   ├── models/                  # Mongoose Document Schemas
│   │   ├── Budget.js            # Monthly budget schema
│   │   ├── Chat.js              # Conversation history schema
│   │   ├── Subscription.js      # Recurring subscription schema
│   │   ├── Transaction.js       # Income & Expense transaction schema
│   │   ├── User.js              # User authentication & preference schema
│   │   └── index.js             # Unified model exports
│   ├── routes/                  # Express REST Route Handlers
│   │   ├── authRoutes.js        # /api/auth
│   │   ├── budgetRoutes.js      # /api/budgets
│   │   ├── chatRoutes.js        # /api/chat
│   │   ├── currencyRoutes.js    # /api/currency
│   │   ├── exportRoutes.js      # /api/export
│   │   ├── notificationRoutes.js# /api/notifications
│   │   ├── subscriptionRoutes.js# /api/subscriptions
│   │   ├── taxRoutes.js         # /api/tax
│   │   ├── transactionRoutes.js # /api/transactions
│   │   └── index.js             # Aggregated router & system health endpoint
│   ├── scripts/
│   │   └── testMern.js          # Automated end-to-end MERN verification test suite
│   ├── services/                # Specialized Engines
│   │   ├── currencyService.js   # Live multi-currency synchronization service
│   │   └── ragService.js        # TF-IDF Cosine Similarity legal retrieval engine
│   ├── utils/
│   │   ├── dbHelper.js          # Dual ObjectId / string identifier resolver
│   │   └── localDB.js           # Zero-downtime local JSON fallback manager
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies (Express, Mongoose, Gemini, JWT, Multer)
│   ├── README.md                # Backend architecture guide
│   └── server.js                # Server entry point & static SPA server
│
├── docs/                        # Project Documentation & Academic Artifacts
│   ├── ARCHITECTURE.md          # Complete system architecture specification
│   └── VIVA_GUIDE.md            # Comprehensive viva preparation & Q&A defense guide
│
├── .env.example                 # Root environment variable template
├── .gitignore                   # Version control exclusion rules
├── package.json                 # Monorepo root scripts & entry point configuration
├── README.md                    # Project README & getting started guide
└── start.bat                    # One-click Windows development startup script
```

---

## 2. Key Architecture Decisions

1. **Clean Separation of Concerns (Frontend vs Backend)**:
   - Frontend is decoupled in `frontend/`, containing all client-side rendering assets.
   - Backend is encapsulated in `backend/`, following the Model-View-Controller (MVC) architecture.
2. **Hybrid Database Resilience**:
   - Primary: Cloud MongoDB Atlas via Mongoose.
   - Secondary: Seamless fallback to `backend/data/cendric_db.json` when running in offline or demo environments.
3. **Retrieval-Augmented Generation (RAG)**:
   - Queries are processed through a local TF-IDF cosine-similarity legal index before hitting Gemini 3.8 Flash, guaranteeing answers cite accurate Sri Lankan statutory provisions without hallucinations.
