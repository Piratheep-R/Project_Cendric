# 🎓 Cendric AI — Viva Voce Defense Guide

## 1. Quick Project Summary (Elevator Pitch)
"Cendric AI is a full-stack personal finance and tax intelligence platform built on the MERN stack (MongoDB, Express, React, Node.js). It is tailored for Sri Lankan freelancers and professionals earning in foreign currencies (USD, EUR, GBP) and LKR. Its flagship innovation is an AI-powered financial advisor using RAG (Retrieval-Augmented Generation) powered by Google's Gemini 3.8 Flash, grounding AI advice in Sri Lanka's Inland Revenue Act No. 24 of 2017. It features live OCR receipt scanning, real-time currency conversion, complete trilingual localization (Tamil, Sinhala, English), and a resilient zero-downtime architecture with offline fallbacks."

---

## 2. Directory Structure

- **`frontend/`**: Contains the React 19 single-page application, custom SVG assets, trilingual runtime engine (`cendric-enhancements.js`), and frosted glass stylesheet.
- **`backend/`**: Contains the Express.js server, modular MVC controllers, Mongoose schemas, RAG legal retrieval engine, and live currency services.
- **`docs/`**: Complete system architecture and viva examination defense notes.

---

## 3. High-Scoring Viva Questions & Answers

### Q1: "Why did you implement your own RAG instead of just asking Gemini directly?"
> **Answer**:
> "General LLMs have knowledge cutoffs and are prone to hallucinations when asked about specific regional laws. Sri Lanka's tax laws (Inland Revenue Act No. 24 of 2017) underwent major amendment changes regarding APIT slabs and IT export exemptions.
> 
> By using RAG, our system first retrieves the exact verified legal sections from our local knowledge base using TF-IDF cosine similarity and injects them into the prompt. This guarantees that Gemini's answers cite real statutory sections (e.g., Section 11, Schedule 3) and prevents financial hallucinations."

### Q2: "How does Server-Sent Events (SSE) differ from WebSockets in your chat assistant?"
> **Answer**:
> "WebSockets provide bidirectional communication, which is heavier and requires dedicated socket server management. For an AI chat assistant, the user sends a standard HTTP POST request, but the server response needs to stream back token-by-token.
> 
> Server-Sent Events (SSE) operate over standard HTTP, support automatic reconnection, work through corporate firewalls, and have much lower overhead. That makes SSE the ideal industry standard for LLM streaming (used by OpenAI and Gemini)."

### Q3: "How is user password security handled in the database?"
> **Answer**:
> "Passwords are never stored in plain text. When a user registers (`authController.js`), we use `bcryptjs` with 10 salt rounds to hash the password. The salt protects against rainbow table attacks.
> 
> During login, `bcrypt.compare()` hashes the incoming password with the stored salt and verifies equality in constant time, preventing timing attacks."

### Q4: "What happens if MongoDB Atlas goes down or the server loses internet?"
> **Answer**:
> "We designed a hybrid resilience layer. In `db.js`, if Mongoose fails to connect to the cloud URI, `isMongoDBConnected()` returns `false`. All our controllers are instrumented to check this status.
> 
> If offline, the controllers automatically route CRUD operations through `localDB.js` to `backend/data/cendric_db.json`. When MongoDB comes back online, the system switches back to Mongoose without any application downtime."

### Q5: "How does multi-currency conversion work when a user records expenses in foreign currencies?"
> **Answer**:
> "In `currencyService.js`, the server regularly syncs live exchange rates from the Open Exchange Rates API (with local file-based rate caching to respect rate limits).
> 
> When a transaction is saved in USD or EUR, it stores the original amount and currency code. When calculating analytics or tax in LKR, the service computes the dynamic converted values using the latest cached mid-market exchange rate."

### Q6: "Why is your order of languages Tamil, Sinhala, English?"
> **Answer**:
> "The order was designed to prioritize Sri Lanka's two official national languages (Tamil and Sinhala) for local freelancers, followed by English as the international business language. The language switcher and entire UI hierarchy strictly follow this sequence: 1. தமிழ், 2. සිංහල, 3. English."

### Q7: "How is authorization and system security handled in your Admin Panel?"
> **Answer**:
> "We implemented Role-Based Access Control (RBAC). In the Mongoose `User` schema, each user document contains boolean flags: `isAdmin` and `isActive`.
> 
> All administrative endpoints (`/api/admin/*`) and the `/admin` view are guarded by two chained Express middleware: `authenticateToken` (verifies Bearer JWT signature) and `requireAdmin` (verifies `req.user.isAdmin === true`). If a regular user attempts to access `/admin` or invoke administrative endpoints, the server immediately returns `403 Forbidden`.
> 
> Furthermore, the admin controller implements self-protection constraints: an administrator cannot deactivate their own account or remove their own admin privileges, preventing accidental lockout. Deactivated accounts are automatically denied access at both the login stage and token verification stage."

