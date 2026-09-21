# 🎨 Cendric Client (Frontend)

This directory contains the production-ready frontend interface for **Cendric AI Finance & Tax Platform**.

---

## 📁 Directory Structure

```
client/
├── dist/                          # Production-ready web assets
│   ├── index.html                 # Main single-page application entry point
│   ├── favicon.svg                # Application branding icon
│   ├── manifest.json              # Web app manifest for PWA installation
│   ├── sw.js                      # Service worker for offline caching
│   └── assets/                    # Optimized stylesheets, scripts & media
│       ├── cendric-enhancements.js# Client enhancement engine (analytics, modals, tax tools)
│       ├── index-Dr3oI3zo.css     # Unified precision design system (Dark & Light frosted glass)
│       ├── index-k68ZFBuM.js      # React application core bundle
│       ├── cendric-auth-hero.jpg  # Auth page illustration
│       ├── cendric-prism.jpg      # Floating luxury card artwork
│       └── cendric-hero-person.jpg# Landing hero visual
└── package.json                   # Client metadata and dependency definitions
```

---

## 🚀 How It Works

1. **Direct Serving**: The Node.js Express server (`server/server.js`) directly serves all static assets from `client/dist`.
2. **Zero-Build Testing**: Team members do not need to run a separate frontend build command to test or use Cendric. Everything is pre-compiled and served directly on `http://localhost:5000`.
3. **Dual Theme Engine**: Both **Kind Warm White Glass** and **Deep Space Dark Glass** styles are fully implemented in `index-Dr3oI3zo.css` and dynamically toggled via the `data-theme` attribute on `<html>`.
