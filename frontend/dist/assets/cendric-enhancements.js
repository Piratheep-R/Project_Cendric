/**
 * CENDRIC FREELANCER FEATURE SUITE (ENHANCEMENTS MODULE)
 * Provides:
 * - Interactive Category Spending Donut Chart
 * - Monthly Budget Progress & Burn Rate Alerts
 * - One-Click Tax & Expense CSV Export
 * - Recurring Subscriptions Tracker
 * - AI Chat Prompt Suggestion Chips
 * - Global Command Palette (Ctrl + K / Cmd + K & Shortcut N)
 * - Multi-Currency Live Estimator
 * - PWA Service Worker Registration
 */

(function () {
  'use strict';

  // ----------------------------------------------------
  // 1. PWA Service Worker Registration
  // ----------------------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  // ----------------------------------------------------
  // State & Helpers
  // ----------------------------------------------------
  function getToken() {
    return localStorage.getItem('cendric_token') || '';
  }

  function getUser() {
    try {
      const u = localStorage.getItem('cendric_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  function normalizeCurrency(c) {
    if (!c) return 'LKR';
    const clean = String(c).trim();
    const map = {
      'Rs.': 'LKR',
      'Rs': 'LKR',
      '₹': 'INR',
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      'A$': 'AUD',
      'C$': 'CAD'
    };
    return map[clean] || clean.toUpperCase();
  }

  function getCurrency() {
    const u = getUser();
    return normalizeCurrency(u?.currencyPreference || 'LKR');
  }

  function getCurrencySymbol(c) {
    const symbols = {
      LKR: 'Rs.',
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
      AUD: 'A$',
      CAD: 'C$'
    };
    return symbols[c] || c || 'Rs.';
  }

  function formatMoney(amount, curr) {
    const c = curr || getCurrency();
    const sym = getCurrencySymbol(c);
    const space = (sym.length > 1 && !sym.endsWith(' ')) ? ' ' : '';
    return `${sym}${space}${Number(amount || 0).toLocaleString()}`;
  }

  function showToast(msg, type = 'success') {
    const existing = document.getElementById('cendric-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'cendric-toast';
    toast.className = 'cendric-glass-toast';
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 16px;">${type === 'success' ? '✓' : 'ℹ'}</span>
        <span>${msg}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ----------------------------------------------------
  // Sri Lankan Trilingual Localization Engine (en, ta, si)
  // ----------------------------------------------------
  const I18N = {
    ta: {
      langName: 'Tamil',
      nativeName: 'தமிழ்',
      flag: '🇱🇰',
      navChat: 'AI அரட்டை',
      navTransactions: 'பரிவர்த்தனைகள்',
      navProfile: 'சுயவிவரம்',
      navSettings: 'அமைப்புகள்',
      navTaxEstimator: 'வரி மதிப்பீட்டாளர்',
      navInvoices: 'விலைப்பட்டியல்கள்',
      navReceiptOcr: 'ரசீது OCR',
      navSnapScanBill: 'பில் ஸ்கேனர்',
      financialTools: 'நிதி கருவிகள்',
      preferences: 'விருப்பத்தேர்வுகள்',
      activeWallet: 'சுயாதீன பணப்பை',
      monthlyBudget: 'மாதாந்திர பட்ஜெட்',
      taxSaved: 'சேமிக்கப்பட்ட வரி',
      used: 'பயன்படுத்தப்பட்டது',
      txTitle: 'பரிவர்த்தனைகள்',
      txSubtitle: 'உங்கள் வருமானம், செலவுகள் மற்றும் விலைப்பட்டியல்களை நிர்வகிக்கவும் கண்காணிக்கவும்',
      addTransaction: 'பரிவர்த்தனை சேர்',
      snapScanBill: 'பில் ஸ்கேன் செய்',
      importCsv: 'வங்கி CSV இறக்குமதி',
      exportCsv: 'CSV ஏற்றுமதி',
      totalIncome: 'மொத்த வருமானம்',
      totalExpenses: 'மொத்த செலவுகள்',
      netBalance: 'நிகர இருப்பு',
      filterAll: 'அனைத்தும்',
      filterIncome: 'வருமானம்',
      filterExpense: 'செலவு',
      searchPlaceholder: 'பரிவர்த்தனைகளைத் தேடுங்கள்…',
      thDate: 'திகதி',
      thDescription: 'விபரம்',
      thCategory: 'வகை',
      thAmount: 'தொகை',
      thType: 'வகை',
      thActions: 'செயல்கள்',
      chatTitle: 'Cendric AI நிதி உதவியாளர்',
      chatStatus: 'ஆன்லைன் · சூழல் விழிப்புணர்வு',
      newChat: 'புதிய அரட்டை',
      clearChat: 'அழி',
      chatPlaceholder: 'உங்கள் நிதி பற்றி எதையும் கேளுங்கள்…',
      chatHint: 'அனுப்ப Enter · புதிய வரிக்கு Shift+Enter · 🎤 குரல் உள்ளீடு',
      voiceTooltip: 'குரல் உள்ளீடு (பேச அழுத்தவும்)',
      thinking: 'சிந்திக்கிறது…',
      welcomeTitle: '👋 வணக்கம்! நான் <strong>Cendric</strong>, உங்கள் நேரடி AI நிதி ஆலோசகர்.',
      welcomeSub: 'உங்கள் பரிவர்த்தனைகள், பட்ஜெட் மற்றும் நேரடி மாற்று விகிதங்கள் எனக்குத் தெரியும். எதையும் கேளுங்கள்!',
      chipNetBalance: '💼 நிகர இருப்பு',
      chipSpending: '📊 செலவு பகுப்பாய்வு',
      chipRates: '💱 மாற்று விகிதங்கள்',
      chipTaxDeadlines: '📅 வரி காலக்கெடு',
      chipTips: '💡 நிதி குறிப்புகள்',
      pillUpwork: '🇱🇰 Upwork வரி',
      pillApit: '🧮 APIT கணக்கீடு',
      pillDeductions: '📋 வரி விலக்குகள்',
      pillTin: '🆔 TIN பதிவு',
      pillBurnRate: '🔥 செலவு வேகம்',
      newChatToast: '✨ புதிய அரட்டை அமர்வு தொடங்கியது',
      clearedChatToast: '🗑️ அரட்டை வரலாறு அழிக்கப்பட்டது',
      billScannerTitle: 'பில் & ரசீது ஸ்கேனர்',
      billScannerSubtitle: 'இலங்கை சுயாதீனர்களுக்கான உடனடி AI பில் & ரசீது ஸ்கேனர்',
      centerBill: 'பில் அல்லது ரசீதை சட்டகத்திற்குள் மையப்படுத்தவும்',
      captureBill: 'படம் எடு',
      uploadBill: 'படம் பதிவேற்று',
      analyzingBill: 'AI மூலம் பில் விபரங்கள் பகுப்பாய்வு செய்யப்படுகின்றன...',
      billDetails: 'பகுப்பாய்வு செய்யப்பட்ட பில் விபரங்கள்',
      amount: 'தொகை',
      vendor: 'விற்பனையாளர் / விபரம்',
      category: 'வகை',
      date: 'திகதி',
      type: 'பரிவர்த்தனை வகை',
      expense: 'செலவு',
      income: 'வருமானம்',
      saveTransaction: 'உறுதி செய்து சேமிக்கவும்',
      retakePhoto: 'மீண்டும் படம் எடு',
      scanSuccess: 'பில் வெற்றிகரமாக பதிவு செய்யப்பட்டது!',
      langSettingsTitle: 'மொழி விருப்பம்',
      langSettingsSubtitle: 'உங்கள் விருப்பமான இடைமுக மொழியைத் தேர்ந்தெடுக்கவும் (தமிழ், සිංහල, அல்லது English)',
      saveLangToast: 'மொழி மாற்றப்பட்டது:'
    },
    si: {
      langName: 'Sinhala',
      nativeName: 'සිංහල',
      flag: '🇱🇰',
      navChat: 'AI සංවාදය',
      navTransactions: 'ගනුදෙනු',
      navProfile: 'පැතිකඩ',
      navSettings: 'සැකසුම්',
      navTaxEstimator: 'බදු ඇස්තමේන්තුව',
      navInvoices: 'ඉන්වොයිසි',
      navReceiptOcr: 'රිසිට්පත් OCR',
      navSnapScanBill: 'බිල්පත් ස්කෑනරය',
      financialTools: 'මූල්‍ය මෙවලම්',
      preferences: 'මනාපයන්',
      activeWallet: 'නිදහස් මුදල් පසුම්බිය',
      monthlyBudget: 'මාසික අයවැය',
      taxSaved: 'ඉතිරි කළ බදු',
      used: 'භාවිතා විය',
      txTitle: 'ගනුදෙනු',
      txSubtitle: 'ඔබගේ ආදායම, වියදම් සහ ඉන්වොයිසි කළමනාකරණය සහ නිරීක්ෂණය කරන්න',
      addTransaction: 'ගනුදෙනුවක් එක් කරන්න',
      snapScanBill: 'බිල්පත ස්කෑන් කරන්න',
      importCsv: 'බැංකු CSV ආයාත කරන්න',
      exportCsv: 'CSV අපනයනය',
      totalIncome: 'මුළු ආදායම',
      totalExpenses: 'මුළු වියදම',
      netBalance: 'ශුද්ධ ශේෂය',
      filterAll: 'සියල්ල',
      filterIncome: 'ආදායම',
      filterExpense: 'වියදම',
      searchPlaceholder: 'ගනුදෙනු සොයන්න…',
      thDate: 'දිනය',
      thDescription: 'විස්තරය',
      thCategory: 'ප්‍රවර්ගය',
      thAmount: 'මුදල',
      thType: 'වර්ගය',
      thActions: 'ක්‍රියා',
      chatTitle: 'Cendric AI මූල්‍ය සහායක',
      chatStatus: 'සක්‍රියයි · පූර්ණ සන්දර්භය සහිතයි',
      newChat: 'නව සංවාදය',
      clearChat: 'මකන්න',
      chatPlaceholder: 'ඔබගේ මූල්‍ය පිළිබඳ ඕනෑම දෙයක් අසන්න…',
      chatHint: 'යැවීමට Enter · නව පේළියකට Shift+Enter · 🎤 හඬ ආදානය',
      voiceTooltip: 'හඬ ආදානය (කතා කිරීමට ඔබන්න)',
      thinking: 'සිතමින් පවතී…',
      welcomeTitle: '👋 ආයුබෝවන්! මම <strong>Cendric</strong>, ඔබගේ ක්ෂණික AI මූල්‍ය උපදේශක.',
      welcomeSub: 'ඔබගේ ගනුදෙනු, අයවැය සහ සජීවී විනිමය අනුපාත මා සතුව ඇත. ඕනෑම දෙයක් අසන්න!',
      chipNetBalance: '💼 ශුද්ධ ශේෂය',
      chipSpending: '📊 වියදම් විස්තරය',
      chipRates: '💱 විනිමය අනුපාත',
      chipTaxDeadlines: '📅 බදු දිනයන්',
      chipTips: '💡 මූල්‍ය උපදෙස්',
      pillUpwork: '🇱🇰 Upwork බදු',
      pillApit: '🧮 APIT ගණනය',
      pillDeductions: '📋 බදු සහන',
      pillTin: '🆔 TIN ලියාපදිංචිය',
      pillBurnRate: '🔥 වියදම් වේගය',
      newChatToast: '✨ නව සංවාදයක් ආරම්භ විය',
      clearedChatToast: '🗑️ සංවාද ඉතිහාසය මකා දමන ලදී',
      billScannerTitle: 'බිල්පත් සහ රිසිට්පත් ස්කෑනරය',
      billScannerSubtitle: 'ශ්‍රී ලාංකික නිදහස් වෘත්තිකයන් සඳහා ක්ෂණික AI බිල්පත් ස්කෑනරය',
      centerBill: 'බිල්පත හෝ රිසිට්පත කැමරා රාමුව මැද තබන්න',
      captureBill: 'ඡායාරූපය ගන්න',
      uploadBill: 'ඡායාරූපයක් උඩුගත කරන්න',
      analyzingBill: 'AI මඟින් බිල්පත් තොරතුරු විශ්ලේෂණය කරයි...',
      billDetails: 'විශ්ලේෂණය කළ බිල්පත් විස්තර',
      amount: 'මුදල',
      vendor: 'විකුණුම්කරු / විස්තරය',
      category: 'ප්‍රවර්ගය',
      date: 'දිනය',
      type: 'ගනුදෙනු වර්ගය',
      expense: 'වියදම',
      income: 'ආදායම',
      saveTransaction: 'තහවුරු කර සුරකින්න',
      retakePhoto: 'නැවත ඡායාරූපය ගන්න',
      scanSuccess: 'බිල්පත සාර්ථකව සටහන් විය!',
      langSettingsTitle: 'භාෂා මනාපය',
      langSettingsSubtitle: 'ඔබ කැමති අතුරුමුහුණත් භාෂාව තෝරන්න (தமிழ், සිංහල, හෝ English)',
      saveLangToast: 'භාෂාව යාවත්කාලීන විය:'
    },
    en: {
      langName: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
      navChat: 'Chat Assistant',
      navTransactions: 'Transactions',
      navProfile: 'Profile',
      navSettings: 'Settings',
      navTaxEstimator: 'Tax Estimator',
      navInvoices: 'Invoices',
      navReceiptOcr: 'Receipt OCR',
      navSnapScanBill: 'Snap & Scan Bill',
      financialTools: 'Financial Tools',
      preferences: 'Preferences',
      activeWallet: 'Freelance Wallet',
      monthlyBudget: 'Monthly Budget',
      taxSaved: 'Tax Saved',
      used: 'used',
      txTitle: 'Transactions',
      txSubtitle: 'Manage and track your income, expenses, and invoices',
      addTransaction: 'Add Transaction',
      snapScanBill: 'Snap & Scan Bill',
      importCsv: 'Import Bank CSV',
      exportCsv: 'Export CSV',
      totalIncome: 'Total Income',
      totalExpenses: 'Total Expenses',
      netBalance: 'Net Balance',
      filterAll: 'All',
      filterIncome: 'Income',
      filterExpense: 'Expense',
      searchPlaceholder: 'Search transactions…',
      thDate: 'Date',
      thDescription: 'Description',
      thCategory: 'Category',
      thAmount: 'Amount',
      thType: 'Type',
      thActions: 'Actions',
      chatTitle: 'Cendric AI Finance Assistant',
      chatStatus: 'Online · Context aware',
      newChat: 'New Chat',
      clearChat: 'Clear',
      chatPlaceholder: 'Ask anything about your finances…',
      chatHint: 'Enter to send · Shift+Enter for new line · 🎤 for voice',
      voiceTooltip: 'Voice input (hold to speak)',
      thinking: 'Thinking…',
      welcomeTitle: '👋 Hi! I\'m <strong>Cendric</strong>, your real-time finance AI.',
      welcomeSub: 'I have full context of your transactions, budgets, and live exchange rates. Ask me anything!',
      chipNetBalance: '💼 Net balance',
      chipSpending: '📊 Spending breakdown',
      chipRates: '💱 Exchange rates',
      chipTaxDeadlines: '📅 Tax deadlines',
      chipTips: '💡 Finance tips',
      pillUpwork: '🇱🇰 Upwork tax',
      pillApit: '🧮 APIT calculator',
      pillDeductions: '📋 Deductions',
      pillTin: '🆔 TIN registration',
      pillBurnRate: '🔥 Burn rate',
      newChatToast: '✨ Started a new chat session',
      clearedChatToast: '🗑️ Chat history cleared',
      billScannerTitle: 'Snap & Scan Bill / Receipt',
      billScannerSubtitle: 'Instant AI bill & receipt scanner for Sri Lankan freelancers',
      centerBill: 'Center bill or receipt within viewfinder frame',
      captureBill: 'Capture Bill',
      uploadBill: 'Upload Photo',
      analyzingBill: 'Analyzing bill details with Cendric AI...',
      billDetails: 'Extracted Bill Details',
      amount: 'Amount',
      vendor: 'Vendor / Description',
      category: 'Category',
      date: 'Date',
      type: 'Transaction Type',
      expense: 'Expense',
      income: 'Income',
      saveTransaction: 'Confirm & Save Transaction',
      retakePhoto: 'Retake Photo',
      scanSuccess: 'Bill successfully recorded!',
      langSettingsTitle: 'Language Preference',
      langSettingsSubtitle: 'Select your preferred interface language for Sri Lanka (Tamil, Sinhala, or English)',
      saveLangToast: 'Language updated to:'
    }
  };

  function getCurrentLang() {
    return localStorage.getItem('cendric_lang') || getUser()?.languagePreference || 'en';
  }

  function t(key) {
    const lang = getCurrentLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  async function setLanguage(lang) {
    if (!['ta', 'si', 'en'].includes(lang)) return;
    localStorage.setItem('cendric_lang', lang);
    const user = getUser();
    if (user) {
      user.languagePreference = lang;
      localStorage.setItem('cendric_user', JSON.stringify(user));
    }
    const token = getToken();
    if (token) {
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ languagePreference: lang })
        });
      } catch (e) {
        console.warn('Sync lang pref error:', e);
      }
    }
    applyLanguage(lang);
    showToast(`${t('saveLangToast')} ${I18N[lang].nativeName}`);
  }

  function applyLanguage(lang) {
    const l = I18N[lang] || I18N.en;

    // 0. Top Dock Header Language Switcher
    const headerLangText = document.getElementById('cendric-header-lang-text');
    if (headerLangText) {
      headerLangText.textContent = `${l.flag} ${l.nativeName}`;
    }
    document.querySelectorAll('.cendric-header-lang-opt').forEach(opt => {
      if (opt.getAttribute('data-code') === lang) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    // 1. Sidebar Nav
    const aside = document.querySelector('aside');
    if (aside) {
      const navLinks = aside.querySelectorAll('nav a');
      navLinks.forEach(a => {
        const href = a.getAttribute('href') || '';
        const labelSpan = a.querySelector('span:not(.cendric-nav-badge)');
        if (!labelSpan) return;
        if (href === '/chat' || href === '/') labelSpan.textContent = l.navChat;
        else if (href === '/transactions') labelSpan.textContent = l.navTransactions;
        else if (href === '/profile') labelSpan.textContent = l.navProfile;
        else if (href === '/settings') labelSpan.textContent = l.navSettings;
      });

      const taxLink = document.querySelector('#cendric-nav-tax span');
      if (taxLink) taxLink.textContent = l.navTaxEstimator;
      const invLink = document.querySelector('#cendric-nav-invoice span');
      if (invLink) invLink.textContent = l.navInvoices;
      const ocrLink = document.querySelector('#cendric-nav-ocr span');
      if (ocrLink) ocrLink.textContent = l.navReceiptOcr;
      const scanLink = document.querySelector('#cendric-nav-camera-bill span');
      if (scanLink) scanLink.textContent = l.navSnapScanBill;

      const dividers = aside.querySelectorAll('.cendric-sidebar-section-divider span');
      if (dividers[0]) dividers[0].textContent = l.financialTools;
      if (dividers[1]) dividers[1].textContent = l.preferences;

      const walletName = document.querySelector('.cendric-wallet-name');
      if (walletName) walletName.textContent = l.activeWallet;

      const budgetTitle = document.querySelector('.cendric-widget-title');
      if (budgetTitle) budgetTitle.textContent = l.monthlyBudget;
      const taxSavedLabel = document.querySelector('.cendric-widget-stat-label');
      if (taxSavedLabel) taxSavedLabel.textContent = l.taxSaved;
    }

    // 2. Chat Assistant Page
    if (location.pathname.includes('/chat') || location.pathname === '/') {
      const chatTitle = document.querySelector('.cc-title');
      if (chatTitle) chatTitle.textContent = l.chatTitle;

      const chatStatus = document.getElementById('cc-status');
      if (chatStatus && typeof _chatStreaming !== 'undefined' && !_chatStreaming) {
        chatStatus.innerHTML = `<span class="cc-status-dot"></span> ${l.chatStatus}`;
      }

      const newChatSpan = document.querySelector('#cc-new-chat-btn span');
      if (newChatSpan) newChatSpan.textContent = l.newChat;

      const clearSpan = document.querySelector('#cc-clear-btn span');
      if (clearSpan) clearSpan.textContent = l.clearChat;

      const chatInput = document.getElementById('cc-input');
      if (chatInput) chatInput.placeholder = l.chatPlaceholder;

      const chatHint = document.querySelector('.cc-input-hint');
      if (chatHint) chatHint.textContent = l.chatHint;

      const voiceBtn = document.getElementById('cc-voice-btn');
      if (voiceBtn) voiceBtn.title = l.voiceTooltip;

      // Localize welcome bubble if still shown
      const welcomeBubble = document.querySelector('#cc-welcome .cc-bubble');
      if (welcomeBubble) {
        welcomeBubble.innerHTML = `
          <p>${l.welcomeTitle}</p>
          <p style="margin-top:8px; font-size:12.5px; opacity:0.8;">${l.welcomeSub}</p>
        `;
      }

      const welcomeChips = document.getElementById('cc-welcome-chips');
      if (welcomeChips) {
        const qNet = lang === 'ta' ? 'எனது தற்போதைய நிகர இருப்பு என்ன?' : lang === 'si' ? 'මගේ වත්මන් ශුද්ධ ශේෂය කුමක්ද?' : "What's my current net balance?";
        const qSpend = lang === 'ta' ? 'எனது முக்கிய செலவு வகைகளைக் காட்டு' : lang === 'si' ? 'මගේ ප්‍රධාන වියදම් ප්‍රවර්ග පෙන්වන්න' : 'Show my top spending categories';
        const qRates = lang === 'ta' ? 'இன்றைய USD முதல் LKR மாற்று விகிதம் என்ன?' : lang === 'si' ? 'අද USD සිට LKR විනිමය අනුපාතය කුමක්ද?' : "What's the USD to LKR rate today?";
        const qTax = lang === 'ta' ? 'IRD வரி தாக்கல் செய்வதற்கான காலக்கெடு என்ன?' : lang === 'si' ? 'IRD බදු ගොනු කිරීමේ අවසන් දිනය කුමක්ද?' : 'What are the IRD tax filing deadlines?';
        const qTips = lang === 'ta' ? 'சுயாதீனர்களுக்கான நிதி ஆலோசனைகளை வழங்கவும்' : lang === 'si' ? 'නිදහස් වෘත්තිකයන් සඳහා මූල්‍ය උපදෙස් ලබා දෙන්න' : 'Give me financial tips for freelancers';

        welcomeChips.innerHTML = `
          <button class="cc-chip" data-q="${qNet}">${l.chipNetBalance}</button>
          <button class="cc-chip" data-q="${qSpend}">${l.chipSpending}</button>
          <button class="cc-chip" data-q="${qRates}">${l.chipRates}</button>
          <button class="cc-chip" data-q="${qTax}">${l.chipTaxDeadlines}</button>
          <button class="cc-chip" data-q="${qTips}">${l.chipTips}</button>
        `;
        if (typeof _wireChips === 'function') _wireChips(welcomeChips);
      }

      const promptBar = document.getElementById('cc-prompt-bar');
      if (promptBar) {
        const qUpwork = lang === 'ta' ? 'இலங்கையில் Upwork USD வருமானத்திற்கு வரி செலுத்த வேண்டுமா?' : lang === 'si' ? 'ශ්‍රී ලංකාවේ Upwork USD ආදායමට බදු ගෙවිය යුතුද?' : 'Do I pay tax on Upwork USD in Sri Lanka?';
        const qApit = lang === 'ta' ? 'LKR 3,600,000 வருமானத்திற்கான எனது APIT ஐ கணக்கிடுங்கள்' : lang === 'si' ? 'LKR 3,600,000 ආදායම සඳහා මගේ APIT ගණනය කරන්න' : 'Calculate my APIT on LKR 3,600,000 income';
        const qDeduct = lang === 'ta' ? 'சுயாதீன தொழிலாளியாக நான் என்னென்ன செலவுகளைக் கழிக்க முடியும்?' : lang === 'si' ? 'නිදහස් වෘත්තිකයෙකු ලෙස මට අඩු කළ හැකි වියදම් මොනවාද?' : 'What freelance expenses can I deduct?';
        const qTin = lang === 'ta' ? 'TIN எண்ணை எவ்வாறு பதிவு செய்வது?' : lang === 'si' ? 'TIN අංකයක් ලියාපදිංචි කරන්නේ කෙසේද?' : 'How do I register for TIN?';
        const qBurn = lang === 'ta' ? 'இந்த மாதத்தில் எனது செலவு வேகம் என்ன?' : lang === 'si' ? 'මේ මාසයේ මගේ වියදම් වේගය කොපමණද?' : "What's my burn rate this month?";

        promptBar.innerHTML = `
          <button class="cc-prompt-pill" data-q="${qUpwork}">${l.pillUpwork}</button>
          <button class="cc-prompt-pill" data-q="${qApit}">${l.pillApit}</button>
          <button class="cc-prompt-pill" data-q="${qDeduct}">${l.pillDeductions}</button>
          <button class="cc-prompt-pill" data-q="${qTin}">${l.pillTin}</button>
          <button class="cc-prompt-pill" data-q="${qBurn}">${l.pillBurnRate}</button>
        `;
        if (typeof _wireChips === 'function') _wireChips(promptBar);
      }
    }

    // 3. Transactions Page
    if (location.pathname.includes('/transactions')) {
      const txH1 = document.querySelector('main h1');
      if (txH1) txH1.textContent = l.txTitle;

      const txSub = document.querySelector('main h1 + p');
      if (txSub) txSub.textContent = l.txSubtitle;

      const addBtn = document.querySelector('#add-transaction-btn') || document.querySelector('.cendric-primary-action-btn');
      if (addBtn) {
        addBtn.innerHTML = `<span>+</span> ${l.addTransaction}`;
      }
      const scanBtn = document.getElementById('cendric-scan-bill-btn');
      if (scanBtn) scanBtn.innerHTML = `<span>📸</span> ${l.snapScanBill}`;
      const taxBtn = document.getElementById('cendric-tax-calc-btn');
      if (taxBtn) taxBtn.innerHTML = `<span>🧮</span> ${l.navTaxEstimator}`;
      const invBtn = document.getElementById('cendric-create-invoice-btn');
      if (invBtn) invBtn.innerHTML = `<span>🧾</span> ${l.navInvoices}`;
      const csvBtn = document.getElementById('cendric-import-csv-btn');
      if (csvBtn) csvBtn.innerHTML = `<span>📥</span> ${l.importCsv}`;
      const exportBtn = document.getElementById('cendric-export-btn');
      if (exportBtn) {
        exportBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${l.exportCsv}`;
      }

      document.querySelectorAll('main p').forEach(p => {
        const text = p.textContent.trim();
        if (['Total Income', I18N.ta.totalIncome, I18N.si.totalIncome, I18N.en.totalIncome].includes(text)) {
          p.textContent = l.totalIncome;
        } else if (['Total Expenses', I18N.ta.totalExpenses, I18N.si.totalExpenses, I18N.en.totalExpenses].includes(text)) {
          p.textContent = l.totalExpenses;
        } else if (['Net Balance', I18N.ta.netBalance, I18N.si.netBalance, I18N.en.netBalance].includes(text)) {
          p.textContent = l.netBalance;
        }
      });

      // Filter tabs
      document.querySelectorAll('main button').forEach(btn => {
        const txt = btn.textContent.trim();
        if (['All', 'அனைத்தும்', 'සියල්ල'].includes(txt)) btn.textContent = l.filterAll;
        else if (['Income', 'வருமானம்', 'ආදායම'].includes(txt) && !btn.id?.includes('transaction')) btn.textContent = l.filterIncome;
        else if (['Expense', 'செலவு', 'වියදම', 'Expenses'].includes(txt) && !btn.id?.includes('transaction') && !btn.closest('.cendric-stat-card')) btn.textContent = l.filterExpense;
      });

      const searchInput = document.querySelector('main input[placeholder*="Search"], main input[placeholder*="தேடு"], main input[placeholder*="සොය"]');
      if (searchInput) searchInput.placeholder = l.searchPlaceholder;

      // Table headers
      document.querySelectorAll('table th').forEach(th => {
        const txt = th.textContent.trim();
        if (['Date', 'திகதி', 'දිනය'].includes(txt)) th.textContent = l.thDate;
        else if (['Description', 'விபரம்', 'විස්තරය'].includes(txt)) th.textContent = l.thDescription;
        else if (['Category', 'வகை', 'ප්‍රවර්ගය'].includes(txt)) th.textContent = l.thCategory;
        else if (['Amount', 'தொகை', 'මුදල'].includes(txt)) th.textContent = l.thAmount;
        else if (['Type', 'வகை', 'වර්ගය'].includes(txt)) th.textContent = l.thType;
        else if (['Actions', 'செயல்கள்', 'ක්‍රියා'].includes(txt)) th.textContent = l.thActions;
      });
    }

    // 4. Settings Page
    if (location.pathname.includes('/settings')) {
      const langCardTitle = document.getElementById('cendric-lang-card-title');
      if (langCardTitle) langCardTitle.textContent = l.langSettingsTitle;
      const langCardSub = document.getElementById('cendric-lang-card-sub');
      if (langCardSub) langCardSub.textContent = l.langSettingsSubtitle;

      document.querySelectorAll('.cendric-lang-card').forEach(tile => {
        const code = tile.getAttribute('data-lang');
        if (code === lang) {
          tile.classList.add('active');
          const chk = tile.querySelector('.cendric-lang-check');
          if (chk) chk.textContent = '✓';
        } else {
          tile.classList.remove('active');
          const chk = tile.querySelector('.cendric-lang-check');
          if (chk) chk.textContent = '';
        }
      });
    }
  }

  // ----------------------------------------------------
  // 2. Export CSV (Tax Report)
  // ----------------------------------------------------
  async function triggerCsvExport() {
    const token = getToken();
    if (!token) {
      showToast('Please sign in to export your tax report.', 'info');
      return;
    }

    showToast('Generating your tax report CSV...', 'info');
    try {
      const res = await fetch('/api/export/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cendric_tax_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Tax report CSV exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate CSV export.', 'info');
    }
  }

  // ----------------------------------------------------
  // 3. Transactions Page Enhancements
  //    (Donut Chart, Budget Bar, CSV Button, Subscriptions)
  // ----------------------------------------------------
  async function enhanceTransactionsPage() {
    if (!location.pathname.includes('/transactions')) return;

    // Check if the page header exists
    const titleEl = Array.from(document.querySelectorAll('h1')).find(h => h.textContent.trim() === 'Transactions');
    if (!titleEl) return;

    const token = getToken();
    if (!token) return;

    // A. Build a 2-row header layout: Add Transaction always visible + scrollable tools row
    const headerRow = titleEl.closest('.flex.items-center.justify-between') || titleEl.parentElement?.parentElement;
    if (headerRow && !document.getElementById('cendric-header-wrapper')) {
      const addBtn = headerRow.querySelector('button#add-transaction-btn') || headerRow.querySelector('button');

      // Wrap entire header in a vertical stack container
      const wrapper = document.createElement('div');
      wrapper.id = 'cendric-header-wrapper';
      wrapper.className = 'cendric-header-wrapper';

      // Row 1: Title + Add Transaction (always visible)
      const row1 = document.createElement('div');
      row1.className = 'cendric-header-row1';
      const titleClone = titleEl.closest('h1') || titleEl;
      row1.appendChild(titleClone.closest('h1') || titleClone);
      if (addBtn) {
        addBtn.classList.add('cendric-primary-action-btn');
        row1.appendChild(addBtn);
      }

      // Row 2: Horizontally scrollable secondary tools
      const row2 = document.createElement('div');
      row2.className = 'cendric-header-tools-row';

      if (!document.getElementById('cendric-scan-bill-btn')) {
        const scanBtn = document.createElement('button');
        scanBtn.id = 'cendric-scan-bill-btn';
        scanBtn.className = 'cendric-glass-action-btn';
        scanBtn.innerHTML = `<span>📸</span> ${t('snapScanBill')}`;
        scanBtn.onclick = () => openBillScannerModal();
        row2.appendChild(scanBtn);

        const taxBtn = document.createElement('button');
        taxBtn.id = 'cendric-tax-calc-btn';
        taxBtn.className = 'cendric-glass-action-btn';
        taxBtn.innerHTML = `<span>🧮</span> Tax Estimator`;
        taxBtn.onclick = () => openTaxCalculatorModal();
        row2.appendChild(taxBtn);

        const invBtn = document.createElement('button');
        invBtn.id = 'cendric-create-invoice-btn';
        invBtn.className = 'cendric-glass-action-btn';
        invBtn.innerHTML = `<span>🧾</span> Create Invoice`;
        invBtn.onclick = () => openInvoiceModal();
        row2.appendChild(invBtn);

        const csvBtn = document.createElement('button');
        csvBtn.id = 'cendric-import-csv-btn';
        csvBtn.className = 'cendric-glass-action-btn';
        csvBtn.innerHTML = `<span>📥</span> Import Bank CSV`;
        csvBtn.onclick = () => openCsvImporterModal();
        row2.appendChild(csvBtn);

        const exportBtn = document.createElement('button');
        exportBtn.id = 'cendric-export-btn';
        exportBtn.className = 'cendric-glass-action-btn';
        exportBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export CSV`;
        exportBtn.onclick = triggerCsvExport;
        row2.appendChild(exportBtn);
      }

      wrapper.appendChild(row1);
      wrapper.appendChild(row2);
      headerRow.replaceWith(wrapper);
    }

    // B. Inject Analytics & Budget Card (Donut Chart + Progress)
    if (document.getElementById('cendric-analytics-card')) return;

    const metricCardsGrid = document.querySelector('main .grid-cols-3');
    if (!metricCardsGrid) return;

    // Fetch transactions & budget
    try {
      const [txRes, budgetRes, subsRes] = await Promise.all([
        fetch('/api/transactions?limit=200', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/budgets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const txData = txRes.ok ? await txRes.json() : { transactions: [] };
      const budgetData = budgetRes.ok ? await budgetRes.json() : { monthlyLimit: 50000 };
      const subsData = subsRes.ok ? await subsRes.json() : [];

      const transactions = txData.transactions || [];
      renderAnalyticsCard(metricCardsGrid, transactions, budgetData);
      renderSubscriptionsCard(metricCardsGrid, subsData);
    } catch (err) {
      console.error('[Cendric] Error fetching analytics data:', err);
    }
    applyLanguage(getCurrentLang());
  }

  function renderAnalyticsCard(targetSibling, transactions, budget) {
    if (document.getElementById('cendric-analytics-card')) return;

    const card = document.createElement('div');
    card.id = 'cendric-analytics-card';
    card.className = 'cendric-glass-card';

    const curr = getCurrency();
    const currSym = getCurrencySymbol(curr);

    // Compute expenses by category
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const categoryTotals = {};

    expenses.forEach(t => {
      const cat = t.category || 'General';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
    });

    const categoryList = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Palette for donut slices
    const colors = ['#6d5ae6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'];

    // Generate SVG Donut
    let cumulativePercent = 0;
    const slices = categoryList.map((cat, i) => {
      const sliceColor = colors[i % colors.length];
      const startPct = cumulativePercent;
      cumulativePercent += cat.pct;
      const strokeDasharray = `${cat.pct} ${100 - cat.pct}`;
      const strokeDashoffset = 100 - startPct + 25; // 25 is quarter-turn offset

      return `
        <circle r="15.9155" cx="18" cy="18"
          fill="transparent"
          stroke="${sliceColor}"
          stroke-width="2.8"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          class="cendric-donut-segment"
          data-category="${cat.name}"
          data-amount="${formatMoney(cat.amount)}"
          data-amount-val="${cat.amount.toLocaleString()}"
          data-pct="${cat.pct}%"
        />
      `;
    }).join('');

    // Budget Calculations
    const monthlyLimit = Number(budget.monthlyLimit) || 50000;
    const budgetPct = Math.min(100, Math.round((totalExpense / monthlyLimit) * 100));
    const budgetRemaining = Math.max(0, monthlyLimit - totalExpense);

    let budgetColor = '#10b981';
    let budgetStatus = 'Healthy Pace';
    if (budgetPct >= 90) {
      budgetColor = '#f43f5e';
      budgetStatus = 'Near Limit';
    } else if (budgetPct >= 70) {
      budgetColor = '#f59e0b';
      budgetStatus = 'Caution';
    }

    card.innerHTML = `
      <div class="cendric-analytics-header">
        <div>
          <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>📊</span> Category Spending & Budget Intelligence
          </h2>
          <p style="font-size: 13px; color: var(--text-muted); margin: 3px 0 0;">
            Visual expense breakdown & budget threshold pacing
          </p>
        </div>
        <div class="cendric-currency-pill">
          <span>Global Currency:</span>
          <strong>${curr} (${currSym})</strong>
        </div>
      </div>

      <div class="cendric-analytics-body">
        <!-- Donut Chart & Category Breakdown Column -->
        <div class="cendric-chart-column">
          <div class="cendric-donut-wrapper">
            <svg viewBox="0 0 36 36" class="cendric-donut-svg">
              <defs>
                <linearGradient id="cendric-empty-donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6d5ae6" stop-opacity="0.9" />
                  <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.9" />
                </linearGradient>
                <linearGradient id="cendric-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#6d5ae6" />
                  <stop offset="50%" stop-color="#a78bfa" />
                  <stop offset="100%" stop-color="#06b6d4" />
                </linearGradient>
              </defs>
              <circle r="15.9155" cx="18" cy="18" fill="none" stroke="rgba(109,90,230,0.1)" stroke-width="2.4"></circle>
              ${slices || `
                <!-- Professional arc gauge: subtle track + glowing gradient sweep -->
                <!-- Track ring -->
                <circle r="15.9155" cx="18" cy="18" fill="none"
                  stroke="rgba(109,90,230,0.10)"
                  stroke-width="2.6"/>
                <!-- Gradient sweep arc (~270° open arc) -->
                <circle r="15.9155" cx="18" cy="18" fill="none"
                  stroke="url(#cendric-gauge-grad)"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-dasharray="75 25"
                  stroke-dashoffset="12.5"
                  opacity="0.9"/>
                <!-- Soft inner glow ring -->
                <circle r="13.5" cx="18" cy="18" fill="none"
                  stroke="rgba(109,90,230,0.06)"
                  stroke-width="1.2"/>
              `}
            </svg>
            <div class="cendric-donut-center" id="cendric-donut-center-text">
              <span class="cendric-donut-label">TOTAL SPENT</span>
              <div class="cendric-donut-amount-row">
                <span class="cendric-donut-curr">${currSym}</span>
                <span class="cendric-donut-val ${
                  totalExpense >= 1000000 ? 'cendric-donut-val--xl' :
                  totalExpense >= 100000  ? 'cendric-donut-val--lg' :
                  totalExpense >= 10000   ? 'cendric-donut-val--md' : ''
                }"
                  id="cendric-donut-val-span"
                  data-compact="${
                    totalExpense >= 1000000 ? (totalExpense / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' :
                    totalExpense >= 10000   ? (totalExpense / 1000).toFixed(1).replace(/\.0$/, '') + 'K' :
                    totalExpense.toLocaleString()
                  }"
                  data-full="${totalExpense.toLocaleString()}"
                >${
                  totalExpense >= 1000000 ? (totalExpense / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' :
                  totalExpense >= 10000   ? (totalExpense / 1000).toFixed(1).replace(/\.0$/, '') + 'K' :
                  totalExpense.toLocaleString()
                }</span>
              </div>
              <span class="cendric-donut-count">${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}</span>
            </div>
          </div>

          <!-- Category Legend or Empty State -->
          <div class="cendric-category-legend">
            ${categoryList.length > 0 ? categoryList.slice(0, 5).map((cat, i) => `
              <div class="cendric-legend-item">
                <span class="cendric-legend-dot" style="background: ${colors[i % colors.length]};"></span>
                <span class="cendric-legend-name">${cat.name}</span>
                <span class="cendric-legend-pct">${cat.pct}%</span>
                <strong class="cendric-legend-amount">${formatMoney(cat.amount)}</strong>
              </div>
            `).join('') : `
              <div class="cendric-empty-category-box">
                <div class="cendric-empty-badge">
                  <span class="cendric-empty-sparkle">✨</span>
                  <span>Spending Radar</span>
                </div>
                <h4 class="cendric-empty-heading">No expenses recorded yet</h4>
                <p class="cendric-empty-subtext">
                  Log transactions or scan receipts to unlock automated spending distribution & pacing.
                </p>
                <div class="cendric-empty-cat-chips">
                  <span class="cendric-empty-chip"><span style="background:#6d5ae6;"></span>Software</span>
                  <span class="cendric-empty-chip"><span style="background:#10b981;"></span>Gear</span>
                  <span class="cendric-empty-chip"><span style="background:#f59e0b;"></span>Office</span>
                  <span class="cendric-empty-chip"><span style="background:#06b6d4;"></span>Travel</span>
                </div>
                <div class="cendric-empty-actions">
                  <button id="cendric-empty-add-btn" class="cendric-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add First Expense
                  </button>
                  <button id="cendric-empty-scan-btn" class="cendric-btn-secondary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 7V4h3"></path>
                      <path d="M20 7V4h-3"></path>
                      <path d="M4 17v3h3"></path>
                      <path d="M20 17v3h-3"></path>
                      <line x1="4" y1="12" x2="20" y2="12"></line>
                    </svg>
                    Scan Receipt
                  </button>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- Budget & Burn Rate Column -->
        <div class="cendric-budget-column">
          <div class="cendric-budget-header">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Monthly Spending Budget</span>
              <button id="cendric-edit-budget-btn" class="cendric-pill-btn">Edit Goal</button>
            </div>
            <div style="margin-top: 12px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span style="font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">${formatMoney(totalExpense)}</span>
                <span style="font-size: 14px; font-weight: 600; color: var(--text-muted);">/ ${formatMoney(monthlyLimit)}</span>
              </div>
              <span class="cendric-badge" style="background: ${budgetColor}18; color: ${budgetColor}; border: 1px solid ${budgetColor}38; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700;">
                ● ${budgetStatus} (${budgetPct}%)
              </span>
            </div>
          </div>

          <!-- Frosted Glass Progress Meter -->
          <div class="cendric-progress-track">
            <div class="cendric-progress-bar" style="width: ${budgetPct}%; background: linear-gradient(90deg, #6d5ae6 0%, ${budgetColor} 100%);"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); margin-top: 10px;">
            <span>Remaining: <strong style="color: var(--text-primary); font-weight: 700;">${formatMoney(budgetRemaining)}</strong></span>
            <span>Est. Burn Rate: <strong style="color: var(--text-primary); font-weight: 700;">${formatMoney(Math.round(totalExpense / Math.max(1, new Date().getDate())))}/day</strong></span>
          </div>

          <div class="cendric-tax-tip-box">
            <span>💡 <strong>Tax Tip for Freelancers:</strong> Business-related software, hosting, and client lunches are tax deductible. Keep digital receipts saved!</span>
          </div>
        </div>
      </div>
    `;

    // Insert directly below metric cards grid
    targetSibling.parentNode.insertBefore(card, targetSibling.nextSibling);

    // Empty state Add button
    const emptyAddBtn = document.getElementById('cendric-empty-add-btn');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => {
        const btns = Array.from(document.querySelectorAll('button'));
        const txBtn = btns.find(b => b.textContent.includes('Add Transaction'));
        if (txBtn) txBtn.click();
      });
    }

    // Empty state Scan button
    const emptyScanBtn = document.getElementById('cendric-empty-scan-btn');
    if (emptyScanBtn) {
      emptyScanBtn.addEventListener('click', () => {
        window.location.href = '/chat';
      });
    }

    // ─── Donut Wrapper: hover reveals full amount ─────────────────────────────
    const donutWrapper = card.querySelector('.cendric-donut-wrapper');
    if (donutWrapper) {
      donutWrapper.style.cursor = 'default';
      donutWrapper.addEventListener('mouseenter', () => {
        const valEl = document.getElementById('cendric-donut-val-span');
        if (valEl && valEl.dataset.full) {
          valEl.classList.add('cendric-donut-val--revealing');
          valEl.textContent = valEl.dataset.full;
        }
      });
      donutWrapper.addEventListener('mouseleave', () => {
        const valEl = document.getElementById('cendric-donut-val-span');
        if (valEl && valEl.dataset.compact) {
          valEl.textContent = valEl.dataset.compact;
          valEl.classList.remove('cendric-donut-val--revealing');
        }
      });
    }

    // ─── Interactive Donut Slice Hover: show category breakdown ───────────────
    card.querySelectorAll('.cendric-donut-segment').forEach(seg => {
      seg.addEventListener('mouseenter', () => {
        const cat = seg.getAttribute('data-category');
        const amtVal = seg.getAttribute('data-amount-val') || '';
        const pct = seg.getAttribute('data-pct');
        const center = document.getElementById('cendric-donut-center-text');
        if (center) {
          center.innerHTML = `
            <span class="cendric-donut-label" style="color: var(--accent);">${cat} (${pct})</span>
            <div class="cendric-donut-amount-row">
              <span class="cendric-donut-curr">${currSym}</span>
              <span class="cendric-donut-val cendric-donut-val--revealing">${amtVal}</span>
            </div>
            <span class="cendric-donut-count" style="background: rgba(109,90,230,0.18); color: var(--accent); border-color: rgba(109,90,230,0.3);">Category Total</span>
          `;
        }
      });
      seg.addEventListener('mouseleave', () => {
        const center = document.getElementById('cendric-donut-center-text');
        if (center) {
          // Restore compact value, not raw number
          const compactVal = totalExpense >= 1000000 ? (totalExpense / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
                           : totalExpense >= 10000   ? (totalExpense / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                           : totalExpense.toLocaleString();
          const sizeClass = totalExpense >= 1000000 ? 'cendric-donut-val--xl'
                          : totalExpense >= 100000  ? 'cendric-donut-val--lg'
                          : totalExpense >= 10000   ? 'cendric-donut-val--md' : '';
          center.innerHTML = `
            <span class="cendric-donut-label">TOTAL SPENT</span>
            <div class="cendric-donut-amount-row">
              <span class="cendric-donut-curr">${currSym}</span>
              <span class="cendric-donut-val ${sizeClass}"
                id="cendric-donut-val-span"
                data-compact="${compactVal}"
                data-full="${totalExpense.toLocaleString()}"
              >${compactVal}</span>
            </div>
            <span class="cendric-donut-count">${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}</span>
          `;
        }
      });
    });

    // Edit Budget Listener
    const editBtn = document.getElementById('cendric-edit-budget-btn');
    if (editBtn) {
      editBtn.addEventListener('click', async () => {
        const input = prompt('Enter your target monthly spending budget:', monthlyLimit);
        if (input && !isNaN(input)) {
          const newLimit = Number(input);
          const token = getToken();
          await fetch('/api/budgets', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ monthlyLimit: newLimit })
          });
          showToast(`Monthly budget updated to ${formatMoney(newLimit)}`);
          card.remove();
          enhanceTransactionsPage();
        }
      });
    }
  }

  function renderSubscriptionsCard(targetSibling, subs) {
    if (document.getElementById('cendric-subs-card')) return;

    const curr = getCurrency();
    const currSym = getCurrencySymbol(curr);

    const card = document.createElement('div');
    card.id = 'cendric-subs-card';
    card.className = 'cendric-glass-card';

    const totalSub = subs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    card.innerHTML = `
      <div class="cendric-analytics-header">
        <div>
          <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🔄</span> Recurring Freelance Subscriptions & Tools
          </h2>
          <p style="font-size: 13px; color: var(--text-muted); margin: 3px 0 0;">
            Track active SaaS software & monthly tool licenses
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
            Burn Rate: <strong style="color: var(--accent); font-weight: 800;">${formatMoney(totalSub)}/mo</strong>
          </span>
          <button id="cendric-add-sub-btn" class="cendric-pill-btn">+ Add Tool</button>
        </div>
      </div>

      <div class="cendric-subs-grid">
        ${subs.map(s => `
          <div class="cendric-sub-tile">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
              <div class="cendric-sub-icon">⚡</div>
              <div style="min-width: 0; flex: 1;">
                <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</p>
                <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.category} · Next: ${s.renewalDate || 'Upcoming'}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: 12px;">
              <span class="cendric-sub-price">${formatMoney(s.amount)}<span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">/mo</span></span>
              <button class="cendric-sub-del-btn" data-id="${s._id}" title="Remove subscription">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const analyticsCard = document.getElementById('cendric-analytics-card') || targetSibling;
    analyticsCard.parentNode.insertBefore(card, analyticsCard.nextSibling);

    // Delete sub handler
    card.querySelectorAll('.cendric-sub-del-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const token = getToken();
        if (confirm('Remove this recurring subscription?')) {
          await fetch(`/api/subscriptions/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          showToast('Subscription removed');
          card.remove();
          enhanceTransactionsPage();
        }
      });
    });

    // Add sub handler
    const addSubBtn = document.getElementById('cendric-add-sub-btn');
    if (addSubBtn) {
      addSubBtn.addEventListener('click', async () => {
        const name = prompt('Enter tool/service name (e.g. Adobe Creative Cloud, Hosting):');
        if (!name) return;
        const amount = prompt('Enter monthly cost:');
        if (!amount || isNaN(amount)) return;

        const token = getToken();
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, amount: Number(amount), category: 'Software & Tools' })
        });
        showToast(`Added ${name} to recurring subscriptions!`);
        card.remove();
        enhanceTransactionsPage();
      });
    }
  }

  // ----------------------------------------------------
  // 4. AI Chat — Full Real-Time Streaming Interface
  // ----------------------------------------------------
  let _chatHistory = [];           // in-memory conversation history
  let _chatStreaming = false;       // prevent double-sends
  let _voiceRecognition = null;

  // Lightweight Markdown renderer (no external lib)
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text
      // Code blocks
      .replace(/```[\s\S]*?```/g, m => `<pre><code>${m.slice(3, -3).replace(/^[^\n]*\n/, '')}</code></pre>`)
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Bullet points (•, -, *)
      .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
      // Numbered list
      .replace(/^\d+\. (.+)$/gm, '<li class="cendric-ordered">$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li.*?>.*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Line breaks → paragraphs (double newline)
      .replace(/\n\n+/g, '</p><p>')
      // Single line breaks
      .replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  function enhanceChatPage() {
    if (!location.pathname.includes('/chat')) return;
    if (document.getElementById('cendric-chat-overlay')) return;

    // Need main content area to inject into
    const main = document.querySelector('main');
    if (!main) return;

    // Build the overlay
    const curLang = getCurrentLang();
    const curL = I18N[curLang] || I18N.ta;

    const overlay = document.createElement('div');
    overlay.id = 'cendric-chat-overlay';
    overlay.innerHTML = `
      <div class="cendric-chat-header">
        <div class="cendric-chat-title-group">
          <div class="cendric-chat-avatar-icon">🤖</div>
          <div>
            <div class="cendric-chat-name">${curL.chatTitle}</div>
            <div class="cendric-chat-status" id="cc-status">
              <span class="cc-status-dot"></span> ${curL.chatStatus}
            </div>
          </div>
        </div>
        <div class="cendric-chat-header-actions">
          <button class="cc-header-btn cc-btn-new" id="cc-new-chat-btn" title="Start a fresh conversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>${curL.newChat}</span>
          </button>
          <button class="cc-header-btn cc-btn-clear" id="cc-clear-btn" title="Clear conversation history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            <span>${curL.clearChat}</span>
          </button>
        </div>
      </div>

      <div class="cendric-chat-messages" id="cc-messages">
        <div class="cc-msg cc-msg-assistant cc-welcome" id="cc-welcome">
          <div class="cc-bubble">
            <p>${curL.welcomeTitle}</p>
            <p style="margin-top:8px; font-size:12.5px; opacity:0.8;">${curL.welcomeSub}</p>
          </div>
          <div class="cc-followups" id="cc-welcome-chips">
            <button class="cc-chip" data-q="${curLang === 'ta' ? 'எனது தற்போதைய நிகர இருப்பு என்ன?' : curLang === 'si' ? 'මගේ වත්මන් ශුද්ධ ශේෂය කුමක්ද?' : "What's my current net balance?"}">${curL.chipNetBalance}</button>
            <button class="cc-chip" data-q="${curLang === 'ta' ? 'எனது முக்கிய செலவு வகைகளைக் காட்டு' : curLang === 'si' ? 'මගේ ප්‍රධාන වියදම් ප්‍රවර්ග පෙන්වන්න' : 'Show my top spending categories'}">${curL.chipSpending}</button>
            <button class="cc-chip" data-q="${curLang === 'ta' ? 'இன்றைய USD முதல் LKR மாற்று விகிதம் என்ன?' : curLang === 'si' ? 'අද USD සිට LKR විනිමය අනුපාතය කුමක්ද?' : "What's the USD to LKR rate today?"}">${curL.chipRates}</button>
            <button class="cc-chip" data-q="${curLang === 'ta' ? 'IRD வரி தாக்கல் செய்வதற்கான காலக்கெடு என்ன?' : curLang === 'si' ? 'IRD බදු ගොනු කිරීමේ අවසන් දිනය කුමක්ද?' : 'What are the IRD tax filing deadlines?'}">${curL.chipTaxDeadlines}</button>
            <button class="cc-chip" data-q="${curLang === 'ta' ? 'சுயாதீனர்களுக்கான நிதி ஆலோசனைகளை வழங்கவும்' : curLang === 'si' ? 'නිදහස් වෘත්තිකයන් සඳහා මූල්‍ය උපදෙස් ලබා දෙන්න' : 'Give me financial tips for freelancers'}">${curL.chipTips}</button>
          </div>
        </div>
      </div>

      <div class="cendric-chat-input-area">
        <div class="cc-prompt-chips-bar" id="cc-prompt-bar">
          <button class="cc-prompt-pill" data-q="${curLang === 'ta' ? 'இலங்கையில் Upwork USD வருமானத்திற்கு வரி செலுத்த வேண்டுமா?' : curLang === 'si' ? 'ශ්‍රී ලංකාවේ Upwork USD ආදායමට බදු ගෙවිය යුතුද?' : 'Do I pay tax on Upwork USD in Sri Lanka?'}">${curL.pillUpwork}</button>
          <button class="cc-prompt-pill" data-q="${curLang === 'ta' ? 'LKR 3,600,000 வருமானத்திற்கான எனது APIT ஐ கணக்கிடுங்கள்' : curLang === 'si' ? 'LKR 3,600,000 ආදායම සඳහා මගේ APIT ගණනය කරන්න' : 'Calculate my APIT on LKR 3,600,000 income'}">${curL.pillApit}</button>
          <button class="cc-prompt-pill" data-q="${curLang === 'ta' ? 'சுயாதீன தொழிலாளியாக நான் என்னென்ன செலவுகளைக் கழிக்க முடியும்?' : curLang === 'si' ? 'නිදහස් වෘත්තිකයෙකු ලෙස මට අඩු කළ හැකි වියදම් මොනවාද?' : 'What freelance expenses can I deduct?'}">${curL.pillDeductions}</button>
          <button class="cc-prompt-pill" data-q="${curLang === 'ta' ? 'TIN எண்ணை எவ்வாறு பதிவு செய்வது?' : curLang === 'si' ? 'TIN අංකයක් ලියාපදිංචි කරන්නේ කෙසේද?' : 'How do I register for TIN?'}">${curL.pillTin}</button>
          <button class="cc-prompt-pill" data-q="${curLang === 'ta' ? 'இந்த மாதத்தில் எனது செலவு வேகம் என்ன?' : curLang === 'si' ? 'මේ මාසයේ මගේ වියදම් වේගය කොපමණද?' : "What's my burn rate this month?"}">${curL.pillBurnRate}</button>
        </div>
        <div class="cc-input-row">
          <button class="cc-voice-btn" id="cc-voice-btn" title="${curL.voiceTooltip}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <textarea id="cc-input" placeholder="${curL.chatPlaceholder}" rows="1" maxlength="2000"></textarea>
          <button class="cc-send-btn" id="cc-send-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="cc-input-hint">${curL.chatHint}</div>
      </div>
    `;

    // Position overlay on top of React's chat
    main.style.position = 'relative';
    // Mark and hide React's own chat children safely
    Array.from(main.children).forEach(el => {
      if (!el.id?.startsWith('cendric')) {
        el.setAttribute('data-cendric-hidden', 'true');
        el.style.display = 'none';
      }
    });
    main.appendChild(overlay);

    // Load persisted history from sessionStorage
    try {
      const saved = sessionStorage.getItem('cendric_chat_hist');
      if (saved) _chatHistory = JSON.parse(saved);
    } catch {}

    // Restore previous messages into UI
    if (_chatHistory.length > 0) {
      const welcome = document.getElementById('cc-welcome');
      if (welcome) welcome.remove();
      _chatHistory.slice(-20).forEach(m => _appendMessage(m.role, m.content, false));
    }

    // Wire up events
    const input      = document.getElementById('cc-input');
    const sendBtn    = document.getElementById('cc-send-btn');
    const clearBtn   = document.getElementById('cc-clear-btn');
    const newChatBtn = document.getElementById('cc-new-chat-btn');
    const voiceBtn   = document.getElementById('cc-voice-btn');

    // Auto-grow textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      sendBtn.disabled = !input.value.trim() || _chatStreaming;
    });

    // Enter to send, Shift+Enter for newline
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) _sendMessage();
      }
    });

    sendBtn.addEventListener('click', _sendMessage);

    function resetToWelcome(msgText = null) {
      _chatHistory = [];
      sessionStorage.removeItem('cendric_chat_hist');
      const msgs = document.getElementById('cc-messages');
      if (!msgs) return;
      const lang = getCurrentLang();
      const l = I18N[lang] || I18N.ta;
      msgs.innerHTML = `
        <div class="cc-msg cc-msg-assistant cc-welcome" id="cc-welcome">
          <div class="cc-bubble">
            <p>${msgText || `${l.welcomeTitle} ${l.welcomeSub}`}</p>
          </div>
          <div class="cc-followups" id="cc-welcome-chips">
            <button class="cc-chip" data-q="${lang === 'ta' ? 'எனது தற்போதைய நிகர இருப்பு என்ன?' : lang === 'si' ? 'මගේ වත්මන් ශුද්ධ ශේෂය කුමක්ද?' : "What's my current net balance?"}">${l.chipNetBalance}</button>
            <button class="cc-chip" data-q="${lang === 'ta' ? 'எனது முக்கிய செலவு வகைகளைக் காட்டு' : lang === 'si' ? 'මගේ ප්‍රධාන වියදම් ප්‍රවර්ග පෙන්වන්න' : 'Show my top spending categories'}">${l.chipSpending}</button>
            <button class="cc-chip" data-q="${lang === 'ta' ? 'இன்றைய USD முதல் LKR மாற்று விகிதம் என்ன?' : lang === 'si' ? 'අද USD සිට LKR විනිමය අනුපාතය කුමක්ද?' : "What's the USD to LKR rate today?"}">${l.chipRates}</button>
            <button class="cc-chip" data-q="${lang === 'ta' ? 'IRD வரி தாக்கல் செய்வதற்கான காலக்கெடு என்ன?' : lang === 'si' ? 'IRD බදු ගොනු කිරීමේ අවසන් දිනය කුමක්ද?' : 'What are the IRD tax filing deadlines?'}">${l.chipTaxDeadlines}</button>
            <button class="cc-chip" data-q="${lang === 'ta' ? 'சுயாதீனர்களுக்கான நிதி ஆலோசனைகளை வழங்கவும்' : lang === 'si' ? 'නිදහස් වෘත්තිකයන් සඳහා මූල්‍ය උපදෙස් ලබා දෙන්න' : 'Give me financial tips for freelancers'}">${l.chipTips}</button>
          </div>
        </div>
      `;
      _wireChips(msgs);
      if (input) {
        input.value = '';
        input.style.height = 'auto';
        input.focus();
      }
    }

    // + New Chat button: starts a fresh session
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        const lang = getCurrentLang();
        const l = I18N[lang] || I18N.ta;
        resetToWelcome(`✨ <strong>${lang === 'ta' ? 'புதிய உரையாடல் தொடங்கியது.' : lang === 'si' ? 'නව සංවාදයක් ආරම්භ විය.' : 'New conversation started.'}</strong>`);
        showToast(l.newChatToast);
      });
    }

    // Clear Chat button: clears conversation from UI and database
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const token = getToken();
        if (token) {
          fetch('/api/chat/history', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
        const lang = getCurrentLang();
        const l = I18N[lang] || I18N.ta;
        resetToWelcome(`🗑️ <strong>${l.clearedChatToast}</strong>`);
        showToast(l.clearedChatToast);
      });
    }

    // Suggestion chips in welcome and prompt bar
    _wireChips(overlay);

    // Voice input (Web Speech API)
    _setupVoiceInput(voiceBtn, input, sendBtn);
  }

  function _wireChips(container) {
    container.querySelectorAll('[data-q]').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('cc-input');
        if (input && !_chatStreaming) {
          input.value = chip.getAttribute('data-q');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          _sendMessage();
        }
      });
    });
  }

  function _appendMessage(role, content, animate = true) {
    const msgs = document.getElementById('cc-messages');
    if (!msgs) return null;

    const div = document.createElement('div');
    div.className = `cc-msg cc-msg-${role}${animate ? ' cc-msg-new' : ''}`;
    div.innerHTML = role === 'user'
      ? `<div class="cc-bubble cc-bubble-user">${content.replace(/</g,'&lt;')}</div>`
      : `<div class="cc-bubble cc-bubble-assistant">${renderMarkdown(content)}</div>`;

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function _showTyping() {
    const msgs = document.getElementById('cc-messages');
    if (!msgs || document.getElementById('cc-typing')) return;
    const div = document.createElement('div');
    div.id = 'cc-typing';
    div.className = 'cc-msg cc-msg-assistant';
    div.innerHTML = `<div class="cc-bubble cc-bubble-assistant"><div class="cc-typing-dots"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _hideTyping() {
    document.getElementById('cc-typing')?.remove();
  }

  function _showFollowUps(suggestions) {
    const msgs = document.getElementById('cc-messages');
    if (!msgs || !suggestions?.length) return;
    const div = document.createElement('div');
    div.className = 'cc-followup-row';
    div.innerHTML = suggestions.map(s =>
      `<button class="cc-chip" data-q="${s.replace(/"/g,'&quot;')}">${s}</button>`
    ).join('');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    _wireChips(div);
  }

  async function _sendMessage() {
    const input = document.getElementById('cc-input');
    const sendBtn = document.getElementById('cc-send-btn');
    if (!input || _chatStreaming) return;

    const question = input.value.trim();
    if (!question) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    _chatStreaming = true;

    // Update status
    const status = document.getElementById('cc-status');
    if (status) status.innerHTML = `<span class="cc-status-dot cc-status-thinking"></span> ${t('thinking')}`;

    // Add user message
    _appendMessage('user', question);

    // Remove welcome block if still present
    document.getElementById('cc-welcome')?.remove();
    // Remove last follow-ups row (new question starts fresh)
    document.querySelector('.cc-followup-row:last-child')?.remove();

    // Show typing indicator
    _showTyping();

    // Call streaming endpoint
    const token = getToken();
    let assistantMsgEl = null;
    let fullText = '';

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question,
          languagePreference: getCurrentLang(),
          history: _chatHistory.slice(-12)
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      _hideTyping();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let evt;
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.type === 'token') {
            fullText += evt.token;
            if (!assistantMsgEl) {
              // Create the assistant message bubble on first token
              assistantMsgEl = _appendMessage('assistant', '', false);
            }
            const bubble = assistantMsgEl.querySelector('.cc-bubble-assistant');
            if (bubble) bubble.innerHTML = renderMarkdown(fullText);
            const msgs = document.getElementById('cc-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;

          } else if (evt.type === 'suggestions') {
            _showFollowUps(evt.suggestions);

          } else if (evt.type === 'error') {
            _hideTyping();
            _appendMessage('assistant', `⚠️ ${evt.message}\n\n[**Retry**](#retry)`, false);

          } else if (evt.type === 'done') {
            break;
          }
        }
      }

      // Save to conversation history
      if (fullText) {
        _chatHistory.push({ role: 'user', content: question });
        _chatHistory.push({ role: 'assistant', content: fullText });
        if (_chatHistory.length > 40) _chatHistory = _chatHistory.slice(-40);
        try { sessionStorage.setItem('cendric_chat_hist', JSON.stringify(_chatHistory)); } catch {}
      }

    } catch (err) {
      _hideTyping();
      console.warn('[Cendric Chat Error]', err);
      const errDiv = _appendMessage('assistant', '', false);
      if (errDiv) {
        errDiv.querySelector('.cc-bubble-assistant').innerHTML = `
          <p>⚠️ Connection error. Please check your network and try again.</p>
          <button class="cc-retry-btn" onclick="(function(){document.getElementById('cc-input').value=${JSON.stringify(question)};document.getElementById('cc-input').dispatchEvent(new Event('input',{bubbles:true}));})()">↻ Retry</button>
        `;
      }
    }

    // Reset state
    _chatStreaming = false;
    sendBtn.disabled = false;
    if (status) status.innerHTML = `<span class="cc-status-dot"></span> ${t('chatStatus')}`;
    input.focus();
  }

  function _setupVoiceInput(voiceBtn, input, sendBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceBtn.title = 'Voice input not supported in this browser';
      voiceBtn.style.opacity = '0.4';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    const curL = getCurrentLang();
    recognition.lang = curL === 'ta' ? 'ta-LK' : curL === 'si' ? 'si-LK' : 'en-US';
    _voiceRecognition = recognition;

    let isListening = false;

    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add('cc-voice-active');
      voiceBtn.title = 'Listening… click to stop';
    };

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      input.value = transcript;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('cc-voice-active');
      voiceBtn.title = 'Voice input';
      // Auto-send if something was captured
      if (input.value.trim() && !_chatStreaming) {
        setTimeout(() => _sendMessage(), 400);
      }
    };

    recognition.onerror = () => {
      isListening = false;
      voiceBtn.classList.remove('cc-voice-active');
    };

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        try { recognition.start(); } catch {}
      }
    });
  }

  // ----------------------------------------------------
  // 5. Global Command Palette (Ctrl + K / Cmd + K)
  // ----------------------------------------------------
  function setupCommandPalette() {
    let modal = document.getElementById('cendric-command-palette');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'cendric-command-palette';
    modal.className = 'cendric-palette-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="cendric-palette-modal">
        <div class="cendric-palette-search-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="cendric-palette-input" placeholder="Type a command or search transactions... (ESC to close)" />
          <button id="cendric-palette-close-btn" class="cendric-palette-kbd" style="cursor: pointer; border: 1px solid var(--glass-border-subtle); display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--glass-inner-bg);" title="Close Palette (ESC)">
            <span>ESC</span>
            <span style="font-size: 13px; font-weight: 800; line-height: 1; margin-left: 2px;">✕</span>
          </button>
        </div>

        <div class="cendric-palette-results" id="cendric-palette-results">
          <div class="cendric-palette-section">Quick Navigation</div>
          <div class="cendric-palette-item" data-action="nav" data-href="/transactions">
            <span>📊</span> Go to Transactions & Analytics
          </div>
          <div class="cendric-palette-item" data-action="nav" data-href="/chat">
            <span>🤖</span> Open AI Finance Assistant
          </div>
          <div class="cendric-palette-item" data-action="nav" data-href="/settings">
            <span>⚙️</span> Settings & Currency
          </div>
          <div class="cendric-palette-item" data-action="nav" data-href="/profile">
            <span>👤</span> View Profile & Statistics
          </div>

          <div class="cendric-palette-section">Actions & Tools</div>
          <div class="cendric-palette-item" data-action="new-tx">
            <span>➕</span> Add New Transaction <span class="cendric-palette-kbd">N</span>
          </div>
          <div class="cendric-palette-item" data-action="tax-calc">
            <span>🧮</span> Sri Lankan Tax & PIT Estimator
          </div>
          <div class="cendric-palette-item" data-action="bill-scan">
            <span>📸</span> Snap & Scan Bill / Receipt
          </div>
          <div class="cendric-palette-item" data-action="invoice-gen">
            <span>🧾</span> Create Freelance Export Invoice (PDF)
          </div>
          <div class="cendric-palette-item" data-action="bank-csv">
            <span>📥</span> Import Bank Statement CSV
          </div>
          <div class="cendric-palette-item" data-action="notifs">
            <span>🔔</span> View Alerts & Tax Deadlines
          </div>
          <div class="cendric-palette-item" data-action="export-csv">
            <span>📑</span> Download Tax Report CSV
          </div>
          <div class="cendric-palette-item" data-action="toggle-theme">
            <span>🌓</span> Toggle Warm White / Dark Theme
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('cendric-palette-input');
    const closeBtn = document.getElementById('cendric-palette-close-btn');

    function openPalette() {
      modal.classList.add('cendric-active');
      modal.style.setProperty('display', 'flex', 'important');
      input.value = '';
      setTimeout(() => input.focus(), 40);
    }

    function closePalette() {
      modal.classList.remove('cendric-active');
      modal.style.setProperty('display', 'none', 'important');
      input.blur();
    }

    // Explicitly initialize closed
    closePalette();

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closePalette();
      });
    }

    // Click outside modal box to close
    modal.addEventListener('click', (e) => {
      const modalBox = modal.querySelector('.cendric-palette-modal');
      if (modalBox && !modalBox.contains(e.target)) {
        closePalette();
      }
    });

    // Input-level Escape listener
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        closePalette();
      }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Escape to close
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        if (modal.classList.contains('cendric-active') || modal.style.display === 'flex') {
          e.preventDefault();
          e.stopPropagation();
          closePalette();
          return;
        }
      }

      // Ctrl + K or Cmd + K to toggle
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.keyCode === 75)) {
        e.preventDefault();
        e.stopPropagation();
        if (modal.classList.contains('cendric-active') || modal.style.display === 'flex') {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      // Shortcut N for New Transaction (only when not typing in an input/textarea)
      if (e.key.toLowerCase() === 'n' && !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) {
        if (!modal.classList.contains('cendric-active')) {
          const btns = Array.from(document.querySelectorAll('button'));
          const txBtn = btns.find(b => b.textContent.includes('Add Transaction'));
          if (txBtn) {
            e.preventDefault();
            txBtn.click();
          }
        }
      }
    }, true);

    // Action clicks
    modal.querySelectorAll('.cendric-palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        closePalette();

        if (action === 'nav') {
          const href = item.getAttribute('data-href');
          window.location.href = href;
        } else if (action === 'export-csv') {
          triggerCsvExport();
        } else if (action === 'new-tx') {
          const btns = Array.from(document.querySelectorAll('button'));
          const txBtn = btns.find(b => b.textContent.includes('Add Transaction'));
          if (txBtn) txBtn.click();
          else window.location.href = '/transactions';
        } else if (action === 'tax-calc') {
          openTaxCalculatorModal();
        } else if (action === 'bill-scan') {
          openBillScannerModal();
        } else if (action === 'invoice-gen') {
          openInvoiceModal();
        } else if (action === 'bank-csv') {
          openCsvImporterModal();
        } else if (action === 'notifs') {
          toggleNotificationPanel();
        } else if (action === 'toggle-theme') {
          const currTheme = document.documentElement.getAttribute('data-theme') || 'light';
          const newTheme = currTheme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          localStorage.setItem('cendric_theme', newTheme);
          showToast(`Theme switched to ${newTheme === 'dark' ? 'Deep Space Dark' : 'Kind Warm White'}`);
        }
      });
    });

    // Live search within command palette
    input.addEventListener('input', async () => {
      const q = input.value.trim().toLowerCase();
      if (!q) return;

      const token = getToken();
      if (!token) return;

      try {
        const res = await fetch('/api/transactions?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const matches = (data.transactions || []).filter(t => 
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q)
        ).slice(0, 5);

        const resultsContainer = document.getElementById('cendric-palette-results');
        if (matches.length > 0 && resultsContainer) {
          const currSym = getCurrencySymbol(getCurrency());
          const matchHtml = matches.map(m => `
            <div class="cendric-palette-item" style="border-left: 3px solid var(--accent);" onclick="window.location.href='/transactions'">
              <span>💳</span>
              <div style="flex: 1;">
                <p style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-primary);">${m.description || 'Transaction'}</p>
                <p style="margin: 0; font-size: 11px; color: var(--text-muted);">${m.category} · ${m.date}</p>
              </div>
              <strong style="color: ${m.type === 'income' ? 'var(--success)' : 'var(--danger)'};">${currSym} ${m.amount}</strong>
            </div>
          `).join('');

          // Append to palette results
          const existingMatches = document.getElementById('cendric-palette-search-matches');
          if (existingMatches) existingMatches.remove();

          const section = document.createElement('div');
          section.id = 'cendric-palette-search-matches';
          section.innerHTML = `
            <div class="cendric-palette-section">Matching Transactions</div>
            ${matchHtml}
          `;
          resultsContainer.insertBefore(section, resultsContainer.firstChild);
        }

        // Live Sri Lankan Tax Law RAG Search in Command Palette
        const taxKeywords = ['tax', 'tin', 'vat', 'wht', 'upwork', 'law', 'ird', 'deduct', 'slab', 'dollar', 'usd', 'freelance', 'relief'];
        if (taxKeywords.some(k => q.includes(k))) {
          try {
            const taxRes = await fetch(`/api/tax/laws?q=${encodeURIComponent(q)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (taxRes.ok) {
              const taxLaws = await taxRes.json();
              if (taxLaws.length > 0 && resultsContainer) {
                const taxMatchesHtml = taxLaws.slice(0, 2).map(law => `
                  <div class="cendric-palette-item" style="border-left: 3px solid #10b981;" onclick="window.location.href='/chat'">
                    <span style="font-size: 16px;">🇱🇰</span>
                    <div style="flex: 1; min-width: 0;">
                      <p style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${law.title}</p>
                      <p style="margin: 0; font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${law.act} (${law.section})</p>
                    </div>
                    <span style="font-size: 10px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.12); padding: 3px 8px; border-radius: 6px; white-space: nowrap;">Ask in Chat →</span>
                  </div>
                `).join('');

                const existingTax = document.getElementById('cendric-palette-tax-matches');
                if (existingTax) existingTax.remove();

                const taxSection = document.createElement('div');
                taxSection.id = 'cendric-palette-tax-matches';
                taxSection.innerHTML = `
                  <div class="cendric-palette-section" style="color: #10b981;">Sri Lankan Tax Law (RAG)</div>
                  ${taxMatchesHtml}
                `;
                resultsContainer.insertBefore(taxSection, resultsContainer.firstChild);
              }
            }
          } catch {}
        }

        // Real-Time Currency Rates in Command Palette
        const currKeywords = ['rate', 'exchange', 'dollar', 'usd', 'lkr', 'eur', 'gbp', 'inr', 'currency', 'forex'];
        if (currKeywords.some(k => q.includes(k))) {
          try {
            const rData = await fetchLiveRates();
            if (rData && rData.rates && resultsContainer) {
              const r = rData.rates;
              const lkr = r.LKR || 331.27;
              const existingCurr = document.getElementById('cendric-palette-curr-matches');
              if (existingCurr) existingCurr.remove();

              const currSection = document.createElement('div');
              currSection.id = 'cendric-palette-curr-matches';
              currSection.innerHTML = `
                <div class="cendric-palette-section" style="color: #6d5ae6;">Real-Time Exchange Rates (API)</div>
                <div class="cendric-palette-item" style="border-left: 3px solid #6d5ae6;" onclick="window.location.href='/settings'">
                  <span style="font-size: 16px;">💵</span>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-primary);">1 USD = ${lkr.toFixed(2)} LKR</p>
                    <p style="margin: 0; font-size: 11px; color: var(--text-muted);">1 EUR = ${(lkr / r.EUR).toFixed(2)} LKR · 1 GBP = ${(lkr / r.GBP).toFixed(2)} LKR · 1 INR = ${(lkr / r.INR).toFixed(2)} LKR</p>
                  </div>
                  <span style="font-size: 10px; font-weight: 700; color: #6d5ae6; background: rgba(109,90,230,0.12); padding: 3px 8px; border-radius: 6px;">Settings →</span>
                </div>
              `;
              resultsContainer.insertBefore(currSection, resultsContainer.firstChild);
            }
          } catch {}
        }
      } catch {}
    });
  }

  // ----------------------------------------------------
  // 6. Modern Fintech Sidebar Redesign Engine
  // ----------------------------------------------------
  let cachedSidebarTxCount = null;
  let isFetchingSidebarStats = false;

  async function fetchSidebarStats() {
    if (isFetchingSidebarStats) return;
    isFetchingSidebarStats = true;
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('/api/transactions?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const txs = await res.json();
        if (Array.isArray(txs)) {
          cachedSidebarTxCount = txs.length;
          const countBadge = document.getElementById('cendric-tx-nav-count');
          if (countBadge) {
            countBadge.textContent = String(cachedSidebarTxCount);
          }
        }
      }
    } catch (err) {
      console.warn('[Cendric] Sidebar stats fetch error:', err);
    } finally {
      isFetchingSidebarStats = false;
    }
  }

  function enhanceNavTooltips() {
    const navLinks = document.querySelectorAll('aside nav a');
    const titles = {
      '/chat': 'Chat Assistant',
      '/transactions': 'Transactions',
      '/profile': 'Profile',
      '/settings': 'Settings'
    };
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || link.pathname;
      for (const [path, title] of Object.entries(titles)) {
        if (href && href.includes(path)) {
          if (link.getAttribute('title') !== title) {
            link.setAttribute('title', title);
          }
        }
      }
    });
  }

  function enhanceSidebar() {
    const aside = document.querySelector('aside');
    if (!aside) return;

    const curr = getCurrency();
    const currSym = getCurrencySymbol(curr);
    const user = getUser();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // 1. Tooltips
    enhanceNavTooltips();

    // 2. Header Brand Enhancement & Wallet Switcher
    const headerEl = aside.firstElementChild;
    if (headerEl && !document.getElementById('cendric-sidebar-wallet-slot')) {
      // Update subtitle if still default
      const subTitle = headerEl.querySelector('p.tracking-widest.uppercase');
      if (subTitle && subTitle.textContent !== 'AI FINANCE PRO') {
        subTitle.textContent = 'AI FINANCE PRO';
      }

      headerEl.style.flexDirection = 'column';
      headerEl.style.alignItems = 'stretch';

      const walletSlot = document.createElement('div');
      walletSlot.id = 'cendric-sidebar-wallet-slot';
      walletSlot.className = 'cendric-wallet-pill-wrapper';
      walletSlot.innerHTML = `
        <button class="cendric-wallet-switcher-btn" id="cendric-wallet-btn" type="button" title="Switch active freelance wallet / currency">
          <div class="cendric-wallet-left">
            <span class="cendric-wallet-dot"></span>
            <span class="cendric-wallet-name">Freelance Wallet</span>
          </div>
          <span class="cendric-wallet-curr-tag">${curr} <span style="font-size: 9px;">▾</span></span>
        </button>
        <div class="cendric-wallet-dropdown" id="cendric-wallet-dropdown" style="display: none;">
          <div class="cendric-wallet-opt ${curr === 'USD' ? 'active' : ''}" data-code="USD">
            <span>🇺🇸 USD - Freelance USD</span>
            <strong>$</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'LKR' ? 'active' : ''}" data-code="LKR">
            <span>🇱🇰 LKR - Local Account</span>
            <strong>Rs.</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'EUR' ? 'active' : ''}" data-code="EUR">
            <span>🇪🇺 EUR - Euro Invoicing</span>
            <strong>€</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'GBP' ? 'active' : ''}" data-code="GBP">
            <span>🇬🇧 GBP - British Pound</span>
            <strong>£</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'AUD' ? 'active' : ''}" data-code="AUD">
            <span>🇦🇺 AUD - Australian Dollar</span>
            <strong>A$</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'CAD' ? 'active' : ''}" data-code="CAD">
            <span>🇨🇦 CAD - Canadian Dollar</span>
            <strong>C$</strong>
          </div>
          <div class="cendric-wallet-opt ${curr === 'INR' ? 'active' : ''}" data-code="INR">
            <span>🇮🇳 INR - Indian Rupee</span>
            <strong>₹</strong>
          </div>
        </div>
      `;

      headerEl.appendChild(walletSlot);

      const walletBtn = walletSlot.querySelector('#cendric-wallet-btn');
      const dropdown = walletSlot.querySelector('#cendric-wallet-dropdown');

      walletBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });

      walletSlot.querySelectorAll('.cendric-wallet-opt').forEach(opt => {
        opt.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetCurr = opt.getAttribute('data-code');
          dropdown.style.display = 'none';
          if (targetCurr === curr) return;

          showToast(`Switching active wallet to ${targetCurr}...`);
          try {
            const token = getToken();
            const res = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ currencyPreference: targetCurr })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                localStorage.setItem('cendric_user', JSON.stringify(data.user));
              }
              showToast(`Active wallet switched to ${targetCurr} (${getCurrencySymbol(targetCurr)})`);
              setTimeout(() => location.reload(), 300);
            }
          } catch (err) {
            console.error('Wallet currency switch failed:', err);
          }
        });
      });

      document.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
      });
    }

    // 3. Navigation Badges & Extra Tools
    const navEl = aside.querySelector('nav');
    if (navEl) {
      // A. Chat Link Badge (LIVE pulsing)
      const chatLink = navEl.querySelector('a[href="/chat"]');
      if (chatLink && !chatLink.querySelector('.cendric-badge-live')) {
        const defaultDot = chatLink.querySelector('span[style*="border-radius: 50%"]');
        if (defaultDot) defaultDot.style.display = 'none';

        const liveBadge = document.createElement('span');
        liveBadge.className = 'cendric-nav-badge cendric-badge-live';
        liveBadge.innerHTML = '<span class="cendric-pulse-dot"></span> LIVE';
        chatLink.appendChild(liveBadge);
      }

      // B. Transactions Link Badge (Count)
      const txLink = navEl.querySelector('a[href="/transactions"]');
      if (txLink && !txLink.querySelector('.cendric-badge-count')) {
        const defaultDot = txLink.querySelector('span[style*="border-radius: 50%"]');
        if (defaultDot) defaultDot.style.display = 'none';

        const countBadge = document.createElement('span');
        countBadge.className = 'cendric-nav-badge cendric-badge-count';
        countBadge.id = 'cendric-tx-nav-count';
        countBadge.textContent = cachedSidebarTxCount !== null ? String(cachedSidebarTxCount) : '24';
        txLink.appendChild(countBadge);

        if (cachedSidebarTxCount === null) {
          fetchSidebarStats();
        }
      }

      // C. Extra Financial Tools Links
      if (!document.getElementById('cendric-sidebar-extra-tools')) {
        const profileLink = navEl.querySelector('a[href="/profile"]');
        const toolsContainer = document.createElement('div');
        toolsContainer.id = 'cendric-sidebar-extra-tools';
        toolsContainer.style.display = 'contents';
        toolsContainer.innerHTML = `
          <div class="cendric-sidebar-section-divider">
            <span>Financial Tools</span>
          </div>
          <a class="cendric-custom-nav-link" id="cendric-nav-tax" href="javascript:void(0)" role="button" title="Sri Lankan IRD Freelance Tax Calculator" data-cendric-tool="tax">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"></rect>
              <line x1="8" y1="6" x2="16" y2="6"></line>
              <line x1="16" y1="14" x2="16" y2="14.01"></line>
              <line x1="12" y1="14" x2="12" y2="14.01"></line>
              <line x1="8" y1="14" x2="8" y2="14.01"></line>
              <line x1="16" y1="18" x2="16" y2="18.01"></line>
              <line x1="12" y1="18" x2="12" y2="18.01"></line>
              <line x1="8" y1="18" x2="8" y2="18.01"></line>
            </svg>
            <span>Tax Estimator</span>
            <span class="cendric-nav-badge cendric-badge-tax">IRD SL</span>
          </a>
          <a class="cendric-custom-nav-link" id="cendric-nav-invoice" href="javascript:void(0)" role="button" title="Generate Freelance PDF Invoice" data-cendric-tool="invoice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Invoices</span>
            <span class="cendric-nav-badge cendric-badge-neutral">PDF</span>
          </a>
          <a class="cendric-custom-nav-link" id="cendric-nav-camera-bill" href="javascript:void(0)" role="button" title="Snap & Scan Bill / Receipt" data-cendric-tool="scanner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>Snap & Scan Bill</span>
            <span class="cendric-nav-badge cendric-badge-ai">AI</span>
          </a>
          <a class="cendric-custom-nav-link" id="cendric-nav-ocr" href="javascript:void(0)" role="button" title="AI Receipt OCR & Statement Importer" data-cendric-tool="ocr">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Receipt OCR</span>
            <span class="cendric-nav-badge cendric-badge-neutral">CSV</span>
          </a>
          <a class="cendric-custom-nav-link ${location.pathname === '/admin' ? 'active' : ''}" id="cendric-nav-admin" href="/admin" title="System Administrator Dashboard" style="${getUser()?.isAdmin ? 'display: flex !important;' : 'display: none !important;'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Admin Panel</span>
            <span class="cendric-nav-badge cendric-badge-role-admin">ADMIN</span>
          </a>
          <div class="cendric-sidebar-section-divider">
            <span>Preferences</span>
          </div>
        `;

        if (profileLink) {
          navEl.insertBefore(toolsContainer, profileLink);
        } else {
          navEl.appendChild(toolsContainer);
        }

        document.getElementById('cendric-nav-tax')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTaxCalculatorModal();
        });
        document.getElementById('cendric-nav-invoice')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openInvoiceModal();
        });
        document.getElementById('cendric-nav-ocr')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openCsvImporterModal();
        });
        document.getElementById('cendric-nav-camera-bill')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openBillScannerModal();
        });
        document.getElementById('cendric-nav-admin')?.addEventListener('click', (e) => {
          e.preventDefault();
          history.pushState({}, '', '/admin');
          handleRouteChange();
        });
      }
    }

    // 4. Mid-Section Financial Health Widget (Fills empty space)
    if (!document.getElementById('cendric-sidebar-budget-widget')) {
      const footerEl = aside.lastElementChild;
      const budgetWidget = document.createElement('div');
      budgetWidget.id = 'cendric-sidebar-budget-widget';
      budgetWidget.className = 'cendric-sidebar-budget-widget';
      budgetWidget.title = 'Click to calculate tax deductions & optimize budget';

      const taxSavedAmount = curr === 'LKR' ? 'Rs. 125,400' : `${currSym}3,712.50`;

      budgetWidget.innerHTML = `
        <div class="cendric-widget-header">
          <span class="cendric-widget-title">Monthly Budget</span>
          <span class="cendric-widget-pct" id="cendric-sidebar-budget-pct">68% used</span>
        </div>
        <div class="cendric-widget-bar-bg">
          <div class="cendric-widget-bar-fill" id="cendric-sidebar-budget-fill" style="width: 68%;"></div>
        </div>
        <div class="cendric-widget-footer">
          <div class="cendric-widget-stat">
            <span class="cendric-widget-stat-label">Tax Saved</span>
            <span class="cendric-widget-stat-val" id="cendric-sidebar-tax-saved">${taxSavedAmount}</span>
          </div>
          <span class="cendric-widget-stat-tag">+14% IRD</span>
        </div>
      `;

      budgetWidget.addEventListener('click', () => {
        openTaxCalculatorModal();
      });

      if (footerEl) {
        aside.insertBefore(budgetWidget, footerEl);
      } else {
        aside.appendChild(budgetWidget);
      }
    }

    // 5. User Profile Card, Integrated Theme Switcher & Trilingual Switcher
    const footerEl = aside.lastElementChild;
    if (footerEl) {
      // Status Pill on user name
      const nameP = footerEl.querySelector('p.font-semibold, p.text-white');
      if (nameP && !nameP.querySelector('.cendric-user-pro-badge')) {
        const proBadge = document.createElement('span');
        proBadge.className = 'cendric-user-pro-badge';
        proBadge.textContent = 'PRO';
        nameP.appendChild(proBadge);
      }

      // Ensure obsolete floating sidebar language button is cleaned up
      document.getElementById('cendric-sidebar-lang-btn')?.remove();
      document.getElementById('cendric-sidebar-lang-menu')?.remove();

      // Theme Switcher Toggle Button
      if (!document.getElementById('cendric-sidebar-theme-btn')) {
        const themeBtn = document.createElement('button');
        themeBtn.id = 'cendric-sidebar-theme-btn';
        themeBtn.className = 'cendric-sidebar-theme-btn';
        themeBtn.type = 'button';
        themeBtn.title = `Switch to ${isDark ? 'Light' : 'Dark'} Mode`;
        themeBtn.innerHTML = `<span id="cendric-sidebar-theme-icon">${isDark ? '☀️' : '🌙'}</span>`;

        themeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('cendric_theme') || 'light';
          const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

          document.documentElement.setAttribute('data-theme', nextTheme);
          localStorage.setItem('cendric_theme', nextTheme);

          const iconEl = document.getElementById('cendric-sidebar-theme-icon');
          if (iconEl) {
            iconEl.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
          }
          themeBtn.title = `Switch to ${nextTheme === 'dark' ? 'Light' : 'Dark'} Mode`;

          // If settings appearance toggle button exists on page, click it to keep React state in sync
          const settingsToggle = document.querySelector('button[style*="border-radius: 99px"]');
          if (settingsToggle) {
            settingsToggle.click();
          }

          showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
        });

        const logoutBtn = footerEl.querySelector('button[title="Logout"]') || footerEl.querySelector('button');
        if (logoutBtn) {
          footerEl.insertBefore(themeBtn, logoutBtn);
        } else {
          footerEl.appendChild(themeBtn);
        }
      } else {
        const iconEl = document.getElementById('cendric-sidebar-theme-icon');
        if (iconEl) {
          iconEl.textContent = isDark ? '☀️' : '🌙';
        }
      }
    }
  }

  // ----------------------------------------------------
  // 7. Settings Page Real-Time Currency Enhancer
  // ----------------------------------------------------
  let cachedLiveRates = null;
  let isFetchingLiveRates = false;

  async function fetchLiveRates(force = false) {
    if (!force && cachedLiveRates) return cachedLiveRates;
    if (isFetchingLiveRates) return cachedLiveRates;
    isFetchingLiveRates = true;
    try {
      const url = force ? '/api/currency/refresh' : '/api/currency/rates';
      const method = force ? 'POST' : 'GET';
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { method, headers });
      if (res.ok) {
        cachedLiveRates = await res.json();
        return cachedLiveRates;
      }
    } catch (err) {
      console.warn('[Cendric] Error fetching live currency rates:', err);
    } finally {
      isFetchingLiveRates = false;
    }
    return cachedLiveRates;
  }

  function getRateBadgeText(code, ratesData) {
    if (!ratesData || !ratesData.rates) {
      const fallback = {
        LKR: '1 USD ≈ 300 LKR (Base)',
        USD: '1 USD ≈ 300 LKR',
        EUR: '1 EUR ≈ 326 LKR',
        GBP: '1 GBP ≈ 390 LKR',
        INR: '1 INR ≈ 3.49 LKR',
        AUD: '1 AUD ≈ 195 LKR',
        CAD: '1 CAD ≈ 217 LKR'
      };
      return fallback[code] || '';
    }
    const r = ratesData.rates;
    const lkr = r.LKR || 331.27;
    if (code === 'USD') return `1 USD = ${lkr.toFixed(2)} LKR (Live API)`;
    if (code === 'LKR') return `1 USD = ${lkr.toFixed(2)} LKR (Base)`;
    if (r[code]) {
      const toLkr = (lkr / r[code]).toFixed(2);
      return `1 ${code} = ${toLkr} LKR (Live API)`;
    }
    return '';
  }

  async function enhanceSettingsPage() {
    if (!location.pathname.includes('/settings')) return;

    const currencyGrid = document.querySelector('main .grid.grid-cols-1.md\\:grid-cols-2') ||
                         document.querySelector('main .grid-cols-1');
    if (!currencyGrid) return;

    // Inject Language Preference Card if not present
    const currencyCard = currencyGrid.closest('div[style*="border-radius: 20px"]') || currencyGrid.parentElement;
    if (currencyCard && !document.getElementById('cendric-language-settings-card')) {
      const curLang = getCurrentLang();
      const langCard = document.createElement('div');
      langCard.id = 'cendric-language-settings-card';
      langCard.style.cssText = 'background: var(--card-bg); border-radius: 20px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); border: 1px solid var(--border); margin-bottom: 20px;';
      langCard.innerHTML = `
        <div class="flex items-center gap-4 mb-5">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--accent-light); display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🌐
          </div>
          <div>
            <h2 id="cendric-lang-card-title" style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">${curInfo.langSettingsTitle}</h2>
            <p id="cendric-lang-card-sub" style="color: var(--text-muted); font-size: 13px; margin-top: 2px; margin-bottom: 0;">${curInfo.langSettingsSubtitle}</p>
          </div>
        </div>
        <div class="cendric-lang-grid">
          <div class="cendric-lang-card ${curLang === 'ta' ? 'active' : ''}" data-lang="ta">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">🇱🇰</span>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">தமிழ் (Tamil)</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">இலங்கை தமிழ் இடைமுகம்</div>
              </div>
            </div>
            <div class="cendric-lang-check" style="color: var(--accent); font-weight: 800; font-size: 16px;">${curLang === 'ta' ? '✓' : ''}</div>
          </div>
          <div class="cendric-lang-card ${curLang === 'si' ? 'active' : ''}" data-lang="si">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">🇱🇰</span>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">සිංහල (Sinhala)</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">ශ්‍රී ලංකා සිංහල අතුරුමුහුණත</div>
              </div>
            </div>
            <div class="cendric-lang-check" style="color: var(--accent); font-weight: 800; font-size: 16px;">${curLang === 'si' ? '✓' : ''}</div>
          </div>
          <div class="cendric-lang-card ${curLang === 'en' ? 'active' : ''}" data-lang="en">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 22px;">🇬🇧</span>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">English</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">Standard Business English</div>
              </div>
            </div>
            <div class="cendric-lang-check" style="color: var(--accent); font-weight: 800; font-size: 16px;">${curLang === 'en' ? '✓' : ''}</div>
          </div>
        </div>
      `;

      langCard.querySelectorAll('.cendric-lang-card').forEach(tile => {
        tile.addEventListener('click', () => {
          const code = tile.getAttribute('data-lang');
          langCard.querySelectorAll('.cendric-lang-card').forEach(t => {
            t.classList.remove('active');
            const chk = t.querySelector('.cendric-lang-check');
            if (chk) chk.textContent = '';
          });
          tile.classList.add('active');
          const chk = tile.querySelector('.cendric-lang-check');
          if (chk) chk.textContent = '✓';
          setLanguage(code);
        });
      });

      currencyCard.parentElement.insertBefore(langCard, currencyCard);
    }

    // Load live rates silently (for tile badges only)
    const ratesData = await fetchLiveRates();

    // Update each currency tile with live rate badge (no extra banners)
    updateTileBadges(currencyGrid, ratesData);

    // Apply translations
    applyLanguage(getCurrentLang());
  }

  function updateTileBadges(currencyGrid, ratesData) {
    const tiles = currencyGrid.children;
    const supported = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
    for (let tile of tiles) {
      const pElements = tile.querySelectorAll('p');
      if (!pElements || pElements.length === 0) continue;

      let code = '';
      for (let p of pElements) {
        const text = p.textContent.trim().toUpperCase();
        if (supported.includes(text)) {
          code = text;
          break;
        }
      }
      if (!code) continue;

      let rateBadge = tile.querySelector('.cendric-rate-hint');
      const newText = getRateBadgeText(code, ratesData);

      if (!rateBadge) {
        rateBadge = document.createElement('span');
        rateBadge.className = 'cendric-rate-hint';
        rateBadge.style.fontSize = '11px';
        rateBadge.style.fontWeight = '600';
        rateBadge.style.color = '#10b981';
        rateBadge.style.display = 'block';
        rateBadge.style.marginTop = '2px';
        rateBadge.textContent = newText;

        const textDiv = pElements[0].parentElement;
        if (textDiv) {
          textDiv.appendChild(rateBadge);
        }
      } else if (rateBadge.textContent !== newText) {
        rateBadge.textContent = newText;
      }

      if (!tile.dataset.cendricBound) {
        tile.dataset.cendricBound = 'true';
        tile.addEventListener('click', () => {
          document.getElementById('cendric-analytics-card')?.remove();
          document.getElementById('cendric-subs-card')?.remove();
          showToast(`Switched currency to ${code}! All amounts converted with live rates.`);
          setTimeout(() => location.reload(), 450);
        });
      }
    }
  }

  // ----------------------------------------------------
  // 8. Sri Lankan Tax & PIT Estimator Modal (RAG Grounded)
  // ----------------------------------------------------
  function openTaxCalculatorModal(initialGross) {
    setupTaxCalculatorModal();
    const modal = document.getElementById('cendric-tax-modal');
    if (!modal) return;
    if (initialGross && !isNaN(initialGross)) {
      const gInput = document.getElementById('cendric-tax-gross-input');
      const gSlider = document.getElementById('cendric-tax-gross-slider');
      if (gInput) gInput.value = initialGross;
      if (gSlider) gSlider.value = initialGross;
    }
    modal.classList.add('cendric-active');
    modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999 !important; background: rgba(10, 15, 30, 0.75) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; align-items: center !important; justify-content: center !important; padding: 20px; box-sizing: border-box;';
    updateTaxCalc();
  }

  function setupTaxCalculatorModal() {
    let modal = document.getElementById('cendric-tax-modal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'cendric-tax-modal';
    modal.className = 'cendric-modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="cendric-modal-dialog" style="max-width: 660px;">
        <div class="cendric-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🇱🇰</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">Sri Lankan Tax & PIT Estimator</h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">Inland Revenue Act No. 24 of 2017 & Statutory Amendments</p>
            </div>
          </div>
          <button class="cendric-modal-close-btn" id="cendric-tax-close-btn" title="Close">✕</button>
        </div>

        <div class="cendric-modal-body" style="padding: 20px 24px;">
          <!-- Income Type Selector -->
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Income Type / Sri Lanka Tax Status</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="cendric-tax-type-group">
              <label class="cendric-tax-type-card active" data-type="export">
                <input type="radio" name="cendric_tax_type" value="export" checked style="display: none;" />
                <div style="font-size: 13px; font-weight: 700; color: #10b981;">🌐 Freelance & IT Services (Export)</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">Foreign inward remittance (Third Schedule 100% Tax Exempt)</div>
              </label>
              <label class="cendric-tax-type-card" data-type="resident">
                <input type="radio" name="cendric_tax_type" value="resident" style="display: none;" />
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">💼 Resident Employment / Business</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">Local income subject to standard progressive slabs (6% – 36%)</div>
              </label>
            </div>
          </div>

          <!-- Income & Deduction Inputs -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Annual Gross Inflow</label>
                <span id="cendric-tax-gross-display" style="font-size: 12px; color: var(--accent); font-weight: 800;">Rs. 3,600,000</span>
              </div>
              <input type="number" id="cendric-tax-gross-input" value="3600000" step="50000" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 14px; font-weight: 700; box-sizing: border-box;" />
              <input type="range" id="cendric-tax-gross-slider" min="600000" max="15000000" step="100000" value="3600000" style="width: 100%; margin-top: 8px; accent-color: var(--accent); cursor: pointer;" />
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Allowable Expenses (Sec 11)</label>
                <span id="cendric-tax-deduct-display" style="font-size: 12px; color: var(--text-muted); font-weight: 700;">Rs. 240,000</span>
              </div>
              <input type="number" id="cendric-tax-deduct-input" value="240000" step="10000" placeholder="Office, internet, hosting" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 14px; font-weight: 700; box-sizing: border-box;" />
              <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 8px;">Deductible: workspace, equipment, telecom</span>
            </div>
          </div>

          <!-- Dynamic Results Card -->
          <div id="cendric-tax-result-card" style="padding: 16px; border-radius: 14px; margin-bottom: 16px; transition: all 0.2s;"></div>

          <!-- Slabs Detail Container -->
          <div id="cendric-tax-slabs-container" style="display: none; margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Progressive Tax Slab Breakdown:</div>
            <div id="cendric-tax-slabs-list" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;"></div>
          </div>

          <!-- Modal Footer -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--glass-border-subtle); padding-top: 14px;">
            <button id="cendric-tax-ask-chat-btn" class="cendric-pill-btn" style="padding: 8px 14px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
              <span>🤖</span> Ask AI Assistant for Tax Tips
            </button>
            <button id="cendric-tax-done-btn" class="cendric-btn-secondary" style="padding: 8px 18px; font-size: 12px; border-radius: 9px;">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('cendric-tax-close-btn');
    const doneBtn = document.getElementById('cendric-tax-done-btn');
    const grossInput = document.getElementById('cendric-tax-gross-input');
    const grossSlider = document.getElementById('cendric-tax-gross-slider');
    const deductInput = document.getElementById('cendric-tax-deduct-input');
    const askChatBtn = document.getElementById('cendric-tax-ask-chat-btn');
    const typeCards = modal.querySelectorAll('.cendric-tax-type-card');

    function closeModal() {
      modal.classList.remove('cendric-active');
      modal.style.setProperty('display', 'none', 'important');
    }

    [closeBtn, doneBtn].forEach(b => b?.addEventListener('click', closeModal));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    typeCards.forEach(card => {
      card.addEventListener('click', () => {
        typeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        updateTaxCalc();
      });
    });

    grossInput?.addEventListener('input', () => {
      if (grossSlider) grossSlider.value = grossInput.value;
      updateTaxCalc();
    });

    grossSlider?.addEventListener('input', () => {
      if (grossInput) grossInput.value = grossSlider.value;
      updateTaxCalc();
    });

    deductInput?.addEventListener('input', updateTaxCalc);

    askChatBtn?.addEventListener('click', () => {
      closeModal();
      window.location.href = '/chat';
    });

    updateTaxCalc();
  }

  function updateTaxCalc() {
    const activeTypeCard = document.querySelector('.cendric-tax-type-card.active');
    const incomeType = activeTypeCard ? activeTypeCard.getAttribute('data-type') : 'export';

    const grossVal = Number(document.getElementById('cendric-tax-gross-input')?.value) || 0;
    const deductVal = Number(document.getElementById('cendric-tax-deduct-input')?.value) || 0;

    const grossDisplay = document.getElementById('cendric-tax-gross-display');
    const deductDisplay = document.getElementById('cendric-tax-deduct-display');
    const resultCard = document.getElementById('cendric-tax-result-card');
    const slabsContainer = document.getElementById('cendric-tax-slabs-container');
    const slabsList = document.getElementById('cendric-tax-slabs-list');

    if (grossDisplay) grossDisplay.textContent = formatMoney(grossVal);
    if (deductDisplay) deductDisplay.textContent = formatMoney(deductVal);

    if (!resultCard) return;

    if (incomeType === 'export') {
      if (slabsContainer) slabsContainer.style.display = 'none';
      resultCard.style.background = 'rgba(16, 185, 129, 0.08)';
      resultCard.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      resultCard.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="font-size: 28px; line-height: 1;">🛡️</span>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 15px; font-weight: 800; color: #10b981;">100% Tax Exemption Applies!</span>
              <span style="font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.15); padding: 3px 10px; border-radius: 99px;">0% Effective Tax</span>
            </div>
            <p style="margin: 6px 0 0; font-size: 12.5px; color: var(--text-primary); line-height: 1.5;">
              Under <strong>Third Schedule (Exempt Amounts), Section 7</strong> of the <strong>Inland Revenue Act No. 24 of 2017</strong>, any service rendered to a person outside Sri Lanka for which payment is received in convertible foreign currency via official banking channels is <strong>fully exempt from Income Tax</strong>.
            </p>
            <div style="margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(16,185,129,0.1); font-size: 11.5px; color: var(--text-primary);">
              💡 <strong>Compliance Rule:</strong> Retain your inward bank remittance advices (BRAs) and foreign inward swift receipts for your IRD RAMIS annual return.
            </div>
          </div>
        </div>
      `;
    } else {
      // Resident progressive slabs
      const personalRelief = 1200000;
      const netTaxableIncome = Math.max(0, grossVal - deductVal - personalRelief);

      let taxPayable = 0;
      let remaining = netTaxableIncome;
      const slabRates = [0.06, 0.12, 0.18, 0.24, 0.30];
      const slabSize = 500000;
      const slabRows = [];

      slabRows.push({
        label: 'Tax-Free Personal Relief (First Schedule)',
        amount: Math.min(grossVal, personalRelief),
        rate: '0%',
        tax: 0
      });

      for (let i = 0; i < slabRates.length; i++) {
        if (remaining > 0) {
          const taxableInSlab = Math.min(remaining, slabSize);
          const slabTax = taxableInSlab * slabRates[i];
          taxPayable += slabTax;
          remaining -= taxableInSlab;
          slabRows.push({
            label: `Slab ${i + 1} (Next ${formatMoney(slabSize)})`,
            amount: taxableInSlab,
            rate: `${(slabRates[i] * 100).toFixed(0)}%`,
            tax: slabTax
          });
        }
      }

      if (remaining > 0) {
        const slabTax = remaining * 0.36;
        taxPayable += slabTax;
        slabRows.push({
          label: 'Top Slab (Balance above 3.7M)',
          amount: remaining,
          rate: '36%',
          tax: slabTax
        });
      }

      const effectiveRate = grossVal > 0 ? ((taxPayable / grossVal) * 100).toFixed(1) : 0;
      const monthlyTax = Math.round(taxPayable / 12);

      resultCard.style.background = 'rgba(109, 90, 230, 0.08)';
      resultCard.style.border = '1px solid rgba(109, 90, 230, 0.25)';
      resultCard.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center;">
          <div style="padding: 10px; border-radius: 10px; background: var(--glass-inner-bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Annual Tax Payable</div>
            <div style="font-size: 18px; font-weight: 800; color: #ef4444; margin-top: 3px;">${formatMoney(taxPayable)}</div>
          </div>
          <div style="padding: 10px; border-radius: 10px; background: var(--glass-inner-bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Monthly Withholding</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: 3px;">${formatMoney(monthlyTax)}</div>
          </div>
          <div style="padding: 10px; border-radius: 10px; background: var(--glass-inner-bg);">
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Effective Rate</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent); margin-top: 3px;">${effectiveRate}%</div>
          </div>
        </div>
      `;

      if (slabsContainer && slabsList) {
        slabsContainer.style.display = 'block';
        slabsList.innerHTML = slabRows.map(row => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 8px; background: var(--glass-inner-bg); border: 1px solid var(--glass-border-subtle);">
            <span style="color: var(--text-primary);">${row.label} (${row.rate})</span>
            <span style="font-weight: 700; color: ${row.tax > 0 ? '#ef4444' : '#10b981'};">${row.tax > 0 ? formatMoney(row.tax) : 'LKR 0'}</span>
          </div>
        `).join('');
      }
    }
  }

  // ----------------------------------------------------
  // 9. Freelance Invoicing & Inward Remittance Generator
  // ----------------------------------------------------
  let invoiceItems = [
    { description: 'Full-Stack Web Development & API Architecture', hours: 40, rate: 45 }
  ];

  function openInvoiceModal() {
    setupInvoiceModal();
    const modal = document.getElementById('cendric-invoice-modal');
    if (!modal) return;
    modal.classList.add('cendric-active');
    modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999 !important; background: rgba(10, 15, 30, 0.75) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; align-items: center !important; justify-content: center !important; padding: 20px; box-sizing: border-box;';
    updateInvoicePreview();
  }

  function setupInvoiceModal() {
    let modal = document.getElementById('cendric-invoice-modal');
    if (modal) return;

    const user = getUser() || {};
    const userFullName = user.fullName || 'Freelance Professional';
    const userEmail = user.email || 'freelancer@example.com';
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    modal = document.createElement('div');
    modal.id = 'cendric-invoice-modal';
    modal.className = 'cendric-modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="cendric-modal-dialog" style="max-width: 880px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="cendric-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🧾</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">Freelance Export Invoice & Remittance Slip</h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">Third Schedule Legal Inward Remittance Compliant · Print to PDF</p>
            </div>
          </div>
          <button class="cendric-modal-close-btn" id="cendric-inv-close-btn">✕</button>
        </div>

        <div class="cendric-modal-body" style="padding: 16px 20px; overflow-y: auto; flex: 1;">
          <!-- Action bar with toggle between Edit and Preview -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--glass-border-subtle);">
            <div style="display: flex; gap: 8px;">
              <button id="cendric-inv-tab-edit" class="cendric-pill-btn active" style="padding: 6px 14px; font-size: 12px;">✏️ Edit Details</button>
              <button id="cendric-inv-tab-preview" class="cendric-pill-btn" style="padding: 6px 14px; font-size: 12px;">👁️ Printable Preview</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="cendric-inv-save-tx-btn" class="cendric-btn-secondary" style="padding: 7px 14px; font-size: 12px; border-radius: 9px;" title="Record this invoice amount in Cendric transactions">
                📥 Save to Transactions
              </button>
              <button id="cendric-inv-print-btn" class="cendric-btn-primary" style="padding: 7px 16px; font-size: 12px; border-radius: 9px; display: inline-flex; align-items: center; gap: 6px;">
                <span>🖨️</span> Print / Save PDF
              </button>
            </div>
          </div>

          <!-- EDIT FORM VIEW -->
          <div id="cendric-inv-edit-view">
            <!-- Row 1: Freelancer & Client Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px;">
              <div style="padding: 12px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--glass-border-subtle);">
                <span style="font-size: 12px; font-weight: 700; color: var(--accent); display: block; margin-bottom: 8px;">Freelancer Details (Payee)</span>
                <input type="text" id="cendric-inv-from-name" value="${userFullName}" placeholder="Your Full Name" style="width: 100%; margin-bottom: 6px; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-from-tin" value="TIN-894210341" placeholder="Sri Lankan Taxpayer ID (TIN)" style="width: 100%; margin-bottom: 6px; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-from-email" value="${userEmail}" placeholder="Email Address" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>

              <div style="padding: 12px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--glass-border-subtle);">
                <span style="font-size: 12px; font-weight: 700; color: var(--accent); display: block; margin-bottom: 8px;">Client Details (Billed To)</span>
                <input type="text" id="cendric-inv-to-client" value="Acme Digital Media Inc." placeholder="Client / Company Name" style="width: 100%; margin-bottom: 6px; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-to-country" value="United States (Overseas Client)" placeholder="Client Country" style="width: 100%; margin-bottom: 6px; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-to-email" value="finance@acmedigital.com" placeholder="Client Billing Email" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>
            </div>

            <!-- Row 2: Invoice Metadata & Currency -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Invoice #</label>
                <input type="text" id="cendric-inv-number" value="INV-${new Date().getFullYear()}-001" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Invoice Date</label>
                <input type="date" id="cendric-inv-date" value="${today}" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Due Date</label>
                <input type="date" id="cendric-inv-due-date" value="${dueDate}" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px;">Currency</label>
                <select id="cendric-inv-currency" style="width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 12px; box-sizing: border-box;">
                  <option value="USD" selected>USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="LKR">LKR (Rs.)</option>
                </select>
              </div>
            </div>

            <!-- Line Items Table -->
            <div style="margin-bottom: 14px; padding: 12px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--glass-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Service Line Items</span>
                <button id="cendric-inv-add-item-btn" class="cendric-pill-btn" style="padding: 4px 10px; font-size: 11px;">+ Add Line Item</button>
              </div>
              <div id="cendric-inv-items-table" style="display: flex; flex-direction: column; gap: 8px;"></div>
              <div style="display: flex; justify-content: flex-end; align-items: baseline; gap: 10px; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--glass-border-subtle);">
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Total Invoice Amount:</span>
                <span id="cendric-inv-total-display" style="font-size: 18px; font-weight: 800; color: var(--accent);">$1,800.00</span>
              </div>
            </div>

            <!-- Inward Remittance Banking Details -->
            <div style="padding: 12px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--glass-border-subtle); margin-bottom: 14px;">
              <span style="font-size: 12px; font-weight: 700; color: #10b981; display: block; margin-bottom: 8px;">🇱🇰 Sri Lankan Bank Remittance Details (For Direct SWIFT Transfer)</span>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <input type="text" id="cendric-inv-bank-name" value="Commercial Bank of Ceylon PLC" placeholder="Bank Name" style="padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-bank-swift" value="CCEYLKFX" placeholder="SWIFT / BIC Code" style="padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
                <input type="text" id="cendric-inv-bank-account" value="8010049281 (USD Foreign Account)" placeholder="Account Number" style="padding: 7px 10px; border-radius: 7px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px; box-sizing: border-box;" />
              </div>
            </div>

            <!-- Statutory Footnote Checkbox -->
            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; color: var(--text-muted); cursor: pointer;">
              <input type="checkbox" id="cendric-inv-cert-check" checked style="margin-top: 2px;" />
              <span>Include statutory declaration under Third Schedule, Section 7 of Inland Revenue Act No. 24 of 2017 certifying services rendered outside Sri Lanka for convertible foreign inward remittance.</span>
            </label>
          </div>

          <!-- PRINTABLE PREVIEW VIEW -->
          <div id="cendric-inv-preview-view" style="display: none;">
            <div id="cendric-invoice-printable" class="cendric-invoice-sheet">
              <!-- Live Invoice Preview renders here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const tabEdit = document.getElementById('cendric-inv-tab-edit');
    const tabPreview = document.getElementById('cendric-inv-tab-preview');
    const editView = document.getElementById('cendric-inv-edit-view');
    const previewView = document.getElementById('cendric-inv-preview-view');
    const closeBtn = document.getElementById('cendric-inv-close-btn');
    const addItemBtn = document.getElementById('cendric-inv-add-item-btn');
    const printBtn = document.getElementById('cendric-inv-print-btn');
    const saveTxBtn = document.getElementById('cendric-inv-save-tx-btn');

    function closeModal() {
      modal.classList.remove('cendric-active');
      modal.style.setProperty('display', 'none', 'important');
    }

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    tabEdit?.addEventListener('click', () => {
      tabEdit.classList.add('active');
      tabPreview.classList.remove('active');
      editView.style.display = 'block';
      previewView.style.display = 'none';
    });

    tabPreview?.addEventListener('click', () => {
      tabPreview.classList.add('active');
      tabEdit.classList.remove('active');
      editView.style.display = 'none';
      previewView.style.display = 'block';
      updateInvoicePreview();
    });

    addItemBtn?.addEventListener('click', () => {
      invoiceItems.push({ description: 'Professional Consulting / Development', hours: 10, rate: 45 });
      renderInvoiceItems();
      updateInvoicePreview();
    });

    modal.querySelectorAll('input, select').forEach(inp => {
      inp.addEventListener('input', updateInvoicePreview);
    });

    printBtn?.addEventListener('click', () => {
      updateInvoicePreview();
      window.print();
    });

    saveTxBtn?.addEventListener('click', async () => {
      const token = getToken();
      if (!token) {
        showToast('Please sign in to record transactions', 'info');
        return;
      }
      const client = document.getElementById('cendric-inv-to-client')?.value || 'Client';
      const invNum = document.getElementById('cendric-inv-number')?.value || 'INV';
      const curr = document.getElementById('cendric-inv-currency')?.value || 'USD';
      const total = computeInvoiceTotal();

      const userCurr = getCurrency();
      const rates = cachedLiveRates?.rates || {};
      let convAmount = total;
      if (curr === 'USD' && userCurr === 'LKR') {
        convAmount = total * (rates.LKR || 331.27);
      }

      saveTxBtn.disabled = true;
      saveTxBtn.textContent = 'Saving...';
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: 'income',
            amount: Math.round(convAmount),
            category: 'Freelance',
            description: `Invoice ${invNum} (${curr} ${total.toLocaleString()}) - ${client}`,
            source: 'freelance_invoice'
          })
        });
        if (res.ok) {
          showToast(`Invoice recorded! Added ${formatMoney(Math.round(convAmount))} income.`);
          closeModal();
          enhanceTransactionsPage();
        } else {
          showToast('Could not save invoice transaction.', 'info');
        }
      } catch {
        showToast('Error saving invoice transaction.', 'info');
      } finally {
        saveTxBtn.disabled = false;
        saveTxBtn.textContent = '📥 Save to Transactions';
      }
    });

    renderInvoiceItems();
    updateInvoicePreview();
  }

  function computeInvoiceTotal() {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.hours || 0) * Number(item.rate || 0)), 0);
  }

  function renderInvoiceItems() {
    const container = document.getElementById('cendric-inv-items-table');
    if (!container) return;

    container.innerHTML = invoiceItems.map((item, idx) => `
      <div style="display: grid; grid-template-columns: 3fr 1fr 1fr 1fr auto; gap: 8px; align-items: center;">
        <input type="text" class="cendric-inv-item-desc" data-idx="${idx}" value="${item.description}" placeholder="Description" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px;" />
        <input type="number" class="cendric-inv-item-hours" data-idx="${idx}" value="${item.hours}" placeholder="Hours/Qty" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px;" />
        <input type="number" class="cendric-inv-item-rate" data-idx="${idx}" value="${item.rate}" placeholder="Rate" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--glass-border-subtle); background: var(--bg-primary); color: var(--text-primary); font-size: 12px;" />
        <span style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-align: right;">${(Number(item.hours || 0) * Number(item.rate || 0)).toFixed(2)}</span>
        <button class="cendric-inv-item-del" data-idx="${idx}" style="background: none; border: none; color: #ef4444; font-size: 14px; cursor: pointer; padding: 4px;" title="Remove row">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.cendric-inv-item-desc').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        invoiceItems[idx].description = e.target.value;
        updateInvoicePreview();
      });
    });

    container.querySelectorAll('.cendric-inv-item-hours').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        invoiceItems[idx].hours = Number(e.target.value) || 0;
        renderInvoiceItems();
        updateInvoicePreview();
      });
    });

    container.querySelectorAll('.cendric-inv-item-rate').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        invoiceItems[idx].rate = Number(e.target.value) || 0;
        renderInvoiceItems();
        updateInvoicePreview();
      });
    });

    container.querySelectorAll('.cendric-inv-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        if (invoiceItems.length > 1) {
          invoiceItems.splice(idx, 1);
          renderInvoiceItems();
          updateInvoicePreview();
        } else {
          showToast('Invoice must have at least one item.', 'info');
        }
      });
    });
  }

  function updateInvoicePreview() {
    const curr = document.getElementById('cendric-inv-currency')?.value || 'USD';
    const total = computeInvoiceTotal();
    const currSym = getCurrencySymbol(curr);

    const totalDisplay = document.getElementById('cendric-inv-total-display');
    if (totalDisplay) {
      totalDisplay.textContent = `${currSym} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const preview = document.getElementById('cendric-invoice-printable');
    if (!preview) return;

    const fromName = document.getElementById('cendric-inv-from-name')?.value || 'Freelancer';
    const fromTin = document.getElementById('cendric-inv-from-tin')?.value || '';
    const fromEmail = document.getElementById('cendric-inv-from-email')?.value || '';
    const toClient = document.getElementById('cendric-inv-to-client')?.value || 'Client';
    const toCountry = document.getElementById('cendric-inv-to-country')?.value || '';
    const toEmail = document.getElementById('cendric-inv-to-email')?.value || '';
    const invNum = document.getElementById('cendric-inv-number')?.value || 'INV-001';
    const invDate = document.getElementById('cendric-inv-date')?.value || '';
    const dueDate = document.getElementById('cendric-inv-due-date')?.value || '';
    const bankName = document.getElementById('cendric-inv-bank-name')?.value || '';
    const bankSwift = document.getElementById('cendric-inv-bank-swift')?.value || '';
    const bankAcc = document.getElementById('cendric-inv-bank-account')?.value || '';
    const incCert = document.getElementById('cendric-inv-cert-check')?.checked;

    preview.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.5px;">INVOICE</h1>
          <p style="margin: 4px 0 0; font-size: 13px; font-weight: 700; color: #6d5ae6;">#${invNum}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 800; color: #1e1b4b;">${fromName}</div>
          ${fromTin ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">TIN: ${fromTin}</div>` : ''}
          <div style="font-size: 11px; color: #64748b;">${fromEmail}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Billed To:</div>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 3px;">${toClient}</div>
          <div style="font-size: 12px; color: #64748b;">${toCountry}</div>
          <div style="font-size: 12px; color: #64748b;">${toEmail}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: #64748b;">Invoice Date: <strong style="color: #1e293b;">${invDate}</strong></div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Payment Due: <strong style="color: #1e293b;">${dueDate}</strong></div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
            <th style="padding: 8px 0; font-size: 12px; font-weight: 700; color: #64748b;">Description</th>
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-align: center;">Hours/Qty</th>
            <th style="padding: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-align: right;">Rate</th>
            <th style="padding: 8px 0; font-size: 12px; font-weight: 700; color: #64748b; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceItems.map(item => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-size: 13px; color: #1e293b; font-weight: 600;">${item.description}</td>
              <td style="padding: 10px; font-size: 13px; color: #64748b; text-align: center;">${item.hours}</td>
              <td style="padding: 10px; font-size: 13px; color: #64748b; text-align: right;">${currSym} ${Number(item.rate).toFixed(2)}</td>
              <td style="padding: 10px 0; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right;">${currSym} ${(item.hours * item.rate).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 240px; padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #1e1b4b;">
            <span>Total Due:</span>
            <span>${currSym} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div style="padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; margin-bottom: 6px;">Wire Transfer / Direct Banking Details:</div>
        <div style="font-size: 12px; color: #334155; line-height: 1.6;">
          • <strong>Beneficiary:</strong> ${fromName}<br/>
          • <strong>Bank:</strong> ${bankName}<br/>
          • <strong>SWIFT / BIC Code:</strong> ${bankSwift}<br/>
          • <strong>Account Number:</strong> ${bankAcc}
        </div>
      </div>

      ${incCert ? `
        <div style="padding: 10px 12px; border-radius: 6px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 10.5px; color: #166534; line-height: 1.4;">
          <strong>Legal Certification:</strong> I hereby certify that the professional services detailed herein were rendered to a non-resident client outside Sri Lanka. Payment is requested in convertible foreign currency via authorized banking channels as qualifying inward remittance under the Third Schedule of the Inland Revenue Act No. 24 of 2017.
        </div>
      ` : ''}
    `;
  }

  // ----------------------------------------------------
  // 10. Bank Statement CSV Bulk Importer
  // ----------------------------------------------------
  let parsedCsvRows = [];

  function openCsvImporterModal() {
    setupCsvImporterModal();
    const modal = document.getElementById('cendric-csv-modal');
    if (!modal) return;
    modal.classList.add('cendric-active');
    modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999 !important; background: rgba(10, 15, 30, 0.75) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; align-items: center !important; justify-content: center !important; padding: 20px; box-sizing: border-box;';
  }

  function setupCsvImporterModal() {
    let modal = document.getElementById('cendric-csv-modal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'cendric-csv-modal';
    modal.className = 'cendric-modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="cendric-modal-dialog" style="max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="cendric-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">📥</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">Bank Statement CSV Bulk Importer</h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">Commercial Bank, Sampath, HNB, Wise & Generic Statements with Auto-Categorization</p>
            </div>
          </div>
          <button class="cendric-modal-close-btn" id="cendric-csv-close-btn">✕</button>
        </div>

        <div class="cendric-modal-body" style="padding: 18px 22px; overflow-y: auto; flex: 1;">
          <!-- Dropzone -->
          <div id="cendric-csv-dropzone" class="cendric-dropzone" style="border: 2px dashed var(--accent); border-radius: 14px; padding: 24px 16px; text-align: center; cursor: pointer; background: rgba(109, 90, 230, 0.04); transition: all 0.2s; margin-bottom: 16px;">
            <input type="file" id="cendric-csv-file-input" accept=".csv,text/csv" style="display: none;" />
            <div style="font-size: 32px; margin-bottom: 8px;">📑</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Click or Drag & Drop your Bank CSV here</div>
            <div style="font-size: 12px; color: var(--text-muted);">Supports Sri Lankan bank export formats (ComBank, Sampath, HNB, Nations Trust, Wise)</div>
            <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 10px;">
              <span class="cendric-badge" style="font-size: 10px; background: rgba(109,90,230,0.1); color: var(--accent);">Commercial Bank</span>
              <span class="cendric-badge" style="font-size: 10px; background: rgba(16,185,129,0.1); color: #10b981;">Sampath Bank</span>
              <span class="cendric-badge" style="font-size: 10px; background: rgba(245,158,11,0.1); color: #f59e0b;">Hatton National Bank</span>
              <span class="cendric-badge" style="font-size: 10px; background: rgba(59,130,246,0.1); color: #3b82f6;">Wise / Payoneer</span>
            </div>
          </div>

          <!-- Preview & Action Container -->
          <div id="cendric-csv-preview-container" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span id="cendric-csv-count-badge" style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Found 0 transactions</span>
              <div style="display: flex; gap: 8px;">
                <button id="cendric-csv-toggle-all-btn" class="cendric-pill-btn" style="padding: 4px 10px; font-size: 11px;">Deselect All</button>
              </div>
            </div>

            <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--glass-border-subtle); border-radius: 10px; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <thead style="background: var(--glass-inner-bg); position: sticky; top: 0; z-index: 2;">
                  <tr>
                    <th style="padding: 8px 10px; width: 30px;"></th>
                    <th style="padding: 8px 10px;">Date</th>
                    <th style="padding: 8px 10px;">Description</th>
                    <th style="padding: 8px 10px;">Category</th>
                    <th style="padding: 8px 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody id="cendric-csv-table-body"></tbody>
              </table>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--glass-border-subtle);">
              <button id="cendric-csv-cancel-btn" class="cendric-btn-secondary" style="padding: 8px 16px; font-size: 12px; border-radius: 9px;">Cancel</button>
              <button id="cendric-csv-confirm-btn" class="cendric-btn-primary" style="padding: 8px 20px; font-size: 12px; border-radius: 9px; display: inline-flex; align-items: center; gap: 6px;">
                <span>✓</span> Confirm & Import Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('cendric-csv-close-btn');
    const dropzone = document.getElementById('cendric-csv-dropzone');
    const fileInput = document.getElementById('cendric-csv-file-input');
    const cancelBtn = document.getElementById('cendric-csv-cancel-btn');
    const confirmBtn = document.getElementById('cendric-csv-confirm-btn');
    const toggleAllBtn = document.getElementById('cendric-csv-toggle-all-btn');

    function closeModal() {
      modal.classList.remove('cendric-active');
      modal.style.setProperty('display', 'none', 'important');
    }

    [closeBtn, cancelBtn].forEach(b => b?.addEventListener('click', closeModal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(109, 90, 230, 0.12)';
    });
    dropzone?.addEventListener('dragleave', () => {
      dropzone.style.background = 'rgba(109, 90, 230, 0.04)';
    });
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = 'rgba(109, 90, 230, 0.04)';
      const file = e.dataTransfer?.files?.[0];
      if (file) handleCsvFile(file);
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleCsvFile(file);
    });

    toggleAllBtn?.addEventListener('click', () => {
      const allSelected = parsedCsvRows.every(r => r.selected);
      parsedCsvRows.forEach(r => r.selected = !allSelected);
      toggleAllBtn.textContent = allSelected ? 'Select All' : 'Deselect All';
      renderCsvRows();
    });

    confirmBtn?.addEventListener('click', async () => {
      const selected = parsedCsvRows.filter(r => r.selected);
      if (selected.length === 0) {
        showToast('Please select at least one transaction to import.', 'info');
        return;
      }

      const token = getToken();
      if (!token) {
        showToast('Please sign in to import transactions.', 'info');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>⏳</span> Importing...';

      try {
        const res = await fetch('/api/transactions/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transactions: selected })
        });

        if (res.ok) {
          const result = await res.json();
          showToast(`Successfully imported ${result.count || selected.length} transactions!`);
          closeModal();
          parsedCsvRows = [];
          document.getElementById('cendric-analytics-card')?.remove();
          document.getElementById('cendric-subs-card')?.remove();
          enhanceTransactionsPage();
        } else {
          showToast('Failed to import transactions.', 'info');
        }
      } catch (err) {
        showToast('Network error during import.', 'info');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>✓</span> Confirm & Import Transactions';
      }
    });
  }

  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCsvText(text);
    };
    reader.readAsText(file);
  }

  function parseCsvText(csv) {
    const lines = csv.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      showToast('CSV file appears empty or invalid.', 'info');
      return;
    }

    const rawHeaders = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    
    let dateIdx = rawHeaders.findIndex(h => h.includes('date') || h.includes('txn date'));
    let descIdx = rawHeaders.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('remark') || h.includes('particular'));
    let debitIdx = rawHeaders.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'));
    let creditIdx = rawHeaders.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'));
    let amountIdx = rawHeaders.findIndex(h => h.includes('amount') || h.includes('value'));

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = 1;

    parsedCsvRows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (cols.length < 2) continue;

      const rawDate = cols[dateIdx] || new Date().toISOString().slice(0, 10);
      const cleanDate = normalizeCsvDate(rawDate);
      const desc = cols[descIdx] || 'Bank Transaction';

      let amount = 0;
      let type = 'expense';

      if (debitIdx !== -1 && creditIdx !== -1) {
        const debit = parseFloat(String(cols[debitIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const credit = parseFloat(String(cols[creditIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        if (credit > 0) {
          amount = credit;
          type = 'income';
        } else if (debit > 0) {
          amount = debit;
          type = 'expense';
        }
      } else if (amountIdx !== -1) {
        const val = parseFloat(String(cols[amountIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        if (val < 0) {
          amount = Math.abs(val);
          type = 'expense';
        } else {
          amount = val;
          type = 'income';
        }
      }

      if (amount > 0) {
        const category = classifyMerchant(desc, type);
        parsedCsvRows.push({
          selected: true,
          date: cleanDate,
          description: desc,
          amount,
          type,
          category,
          source: 'bank_csv'
        });
      }
    }

    if (parsedCsvRows.length === 0) {
      showToast('Could not find valid transactions in this CSV.', 'info');
      return;
    }

    const previewContainer = document.getElementById('cendric-csv-preview-container');
    const dropzone = document.getElementById('cendric-csv-dropzone');
    if (previewContainer && dropzone) {
      dropzone.style.display = 'none';
      previewContainer.style.display = 'block';
    }

    renderCsvRows();
  }

  function splitCsvLine(line) {
    const res = [];
    let insideQuotes = false;
    let curr = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        insideQuotes = !insideQuotes;
      } else if (ch === ',' && !insideQuotes) {
        res.push(curr.trim().replace(/^"+|"+$/g, ''));
        curr = '';
      } else {
        curr += ch;
      }
    }
    res.push(curr.trim().replace(/^"+|"+$/g, ''));
    return res;
  }

  function normalizeCsvDate(str) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      const parts = str.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } catch {}
    return new Date().toISOString().slice(0, 10);
  }

  function classifyMerchant(desc, type) {
    const s = desc.toLowerCase();
    if (type === 'income') {
      if (s.includes('salary') || s.includes('payroll')) return 'Salary';
      if (s.includes('upwork') || s.includes('fiverr') || s.includes('inward') || s.includes('freelance') || s.includes('remittance')) return 'Freelance';
      if (s.includes('dividend') || s.includes('interest') || s.includes('yield')) return 'Investments';
      return 'Income';
    }

    if (s.includes('dialog') || s.includes('mobitel') || s.includes('slt') || s.includes('ceb') || s.includes('leco') || s.includes('water') || s.includes('telecom')) return 'Bills & Utilities';
    if (s.includes('keells') || s.includes('cargills') || s.includes('spar') || s.includes('uber eats') || s.includes('pickme food') || s.includes('restaurant') || s.includes('cafe') || s.includes('bakery')) return 'Food & Dining';
    if (s.includes('uber') || s.includes('pickme') || s.includes('ceypetco') || s.includes('ioc') || s.includes('fuel') || s.includes('petrol') || s.includes('expressway') || s.includes('train')) return 'Transportation';
    if (s.includes('aws') || s.includes('digitalocean') || s.includes('github') || s.includes('jetbrains') || s.includes('adobe') || s.includes('figma') || s.includes('chatgpt') || s.includes('canva') || s.includes('google cloud') || s.includes('domain') || s.includes('hosting')) return 'Software & Tools';
    if (s.includes('daraz') || s.includes('amazon') || s.includes('ebay') || s.includes('fashion') || s.includes('clothing') || s.includes('store')) return 'Shopping';
    if (s.includes('netflix') || s.includes('spotify') || s.includes('cinema') || s.includes('steam')) return 'Entertainment';
    return 'General';
  }

  function renderCsvRows() {
    const tbody = document.getElementById('cendric-csv-table-body');
    const badge = document.getElementById('cendric-csv-count-badge');
    if (!tbody) return;

    const selectedCount = parsedCsvRows.filter(r => r.selected).length;
    if (badge) badge.textContent = `Selected ${selectedCount} of ${parsedCsvRows.length} transactions`;

    const categories = ['Food & Dining', 'Transportation', 'Software & Tools', 'Bills & Utilities', 'Shopping', 'Entertainment', 'Salary', 'Freelance', 'General'];

    tbody.innerHTML = parsedCsvRows.map((r, idx) => `
      <tr style="border-bottom: 1px solid var(--glass-border-subtle); background: ${r.selected ? 'transparent' : 'rgba(0,0,0,0.03)'}; opacity: ${r.selected ? '1' : '0.5'};">
        <td style="padding: 8px 10px;">
          <input type="checkbox" class="cendric-csv-row-check" data-idx="${idx}" ${r.selected ? 'checked' : ''} />
        </td>
        <td style="padding: 8px 10px; color: var(--text-muted); font-size: 11px;">${r.date}</td>
        <td style="padding: 8px 10px; font-weight: 600; color: var(--text-primary); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.description}">${r.description}</td>
        <td style="padding: 8px 10px;">
          <select class="cendric-csv-row-cat" data-idx="${idx}" style="padding: 3px 6px; border-radius: 6px; border: 1px solid var(--glass-border-subtle); background: var(--glass-inner-bg); color: var(--text-primary); font-size: 11px;">
            ${categories.map(c => `<option value="${c}" ${c === r.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: ${r.type === 'income' ? '#10b981' : '#ef4444'};">
          ${r.type === 'income' ? '+' : '-'}${formatMoney(r.amount)}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.cendric-csv-row-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        parsedCsvRows[idx].selected = e.target.checked;
        renderCsvRows();
      });
    });

    tbody.querySelectorAll('.cendric-csv-row-cat').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        parsedCsvRows[idx].category = e.target.value;
      });
    });
  }

  // ----------------------------------------------------
  // 10b. Live Camera Bill & Receipt Scanner
  // ----------------------------------------------------
  let cameraStream = null;
  let cameraFacingMode = 'environment';
  let activeBillType = 'expense';
  let activeBillData = null;

  function openBillScannerModal() {
    setupBillScannerModal();
    const modal = document.getElementById('cendric-bill-modal');
    if (!modal) return;
    modal.classList.add('cendric-active');
    modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999999 !important; background: rgba(10, 15, 30, 0.75) !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; align-items: center !important; justify-content: center !important; padding: 20px; box-sizing: border-box;';
    resetBillScannerViews();
    startCamera();
  }

  function closeBillScannerModal() {
    stopCamera();
    const modal = document.getElementById('cendric-bill-modal');
    if (modal) {
      modal.classList.remove('cendric-active');
      modal.style.setProperty('display', 'none', 'important');
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  async function startCamera() {
    stopCamera();
    const video = document.getElementById('cendric-camera-video');
    const feedBox = document.getElementById('cendric-camera-feed-box');
    const fallbackBox = document.getElementById('cendric-camera-denied-box');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (feedBox) feedBox.style.display = 'none';
      if (fallbackBox) fallbackBox.style.display = 'block';
      return;
    }

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      if (video) {
        video.srcObject = cameraStream;
        await video.play();
      }
      if (feedBox) feedBox.style.display = 'block';
      if (fallbackBox) fallbackBox.style.display = 'none';
    } catch (err) {
      console.warn('[Cendric] Camera access failed or denied:', err);
      if (feedBox) feedBox.style.display = 'none';
      if (fallbackBox) fallbackBox.style.display = 'block';
    }
  }

  function resetBillScannerViews() {
    const viewCapture = document.getElementById('cendric-bill-capture-view');
    const viewLoading = document.getElementById('cendric-bill-loading-view');
    const viewConfirm = document.getElementById('cendric-bill-confirm-view');
    if (viewCapture) viewCapture.style.display = 'block';
    if (viewLoading) viewLoading.style.display = 'none';
    if (viewConfirm) viewConfirm.style.display = 'none';
    activeBillData = null;
  }

  function capturePhotoFromCamera() {
    const video = document.getElementById('cendric-camera-video');
    const canvas = document.getElementById('cendric-camera-canvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    processScannedImage(base64);
  }

  async function processScannedImage(base64Image) {
    const viewCapture = document.getElementById('cendric-bill-capture-view');
    const viewLoading = document.getElementById('cendric-bill-loading-view');
    const viewConfirm = document.getElementById('cendric-bill-confirm-view');

    if (viewCapture) viewCapture.style.display = 'none';
    if (viewLoading) viewLoading.style.display = 'flex';
    if (viewConfirm) viewConfirm.style.display = 'none';

    const loadingThumb = document.getElementById('cendric-bill-loading-thumb');
    if (loadingThumb) loadingThumb.src = base64Image;

    try {
      const token = getToken();
      const res = await fetch('/api/transactions/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ imageBase64: base64Image })
      });

      const json = await res.json();
      if (json.success && json.data) {
        showBillConfirmationForm(json.data, base64Image);
      } else {
        showToast('Could not automatically parse bill. You can enter details manually.', 'info');
        showBillConfirmationForm({
          amount: 0,
          vendor: 'Scanned Bill',
          category: 'Other',
          date: new Date().toISOString().slice(0, 10),
          description: 'Receipt photo',
          type: 'expense'
        }, base64Image);
      }
    } catch (err) {
      console.error('[Cendric] Error analyzing bill:', err);
      showToast('Network error analyzing bill. You can edit details manually.', 'info');
      showBillConfirmationForm({
        amount: 0,
        vendor: 'Scanned Bill',
        category: 'Other',
        date: new Date().toISOString().slice(0, 10),
        description: 'Receipt photo',
        type: 'expense'
      }, base64Image);
    }
  }

  function setBillType(type) {
    activeBillType = type;
    const btnExpense = document.getElementById('cendric-bill-type-expense');
    const btnIncome = document.getElementById('cendric-bill-type-income');
    if (type === 'expense') {
      btnExpense?.classList.add('active-expense');
      btnIncome?.classList.remove('active-income');
    } else {
      btnIncome?.classList.add('active-income');
      btnExpense?.classList.remove('active-expense');
    }
  }

  function showBillConfirmationForm(data, imageThumb) {
    const viewLoading = document.getElementById('cendric-bill-loading-view');
    const viewConfirm = document.getElementById('cendric-bill-confirm-view');
    if (viewLoading) viewLoading.style.display = 'none';
    if (viewConfirm) viewConfirm.style.display = 'block';

    activeBillData = { ...data, imageThumb };

    const thumbImg = document.getElementById('cendric-bill-confirm-thumb');
    if (thumbImg) thumbImg.src = imageThumb;

    // Detect initial type
    const isExpense = (data.type || 'expense').toLowerCase() !== 'income';
    setBillType(isExpense ? 'expense' : 'income');

    const amtInp = document.getElementById('cendric-bill-amt-inp');
    if (amtInp) amtInp.value = data.amount || '';

    const vendorInp = document.getElementById('cendric-bill-vendor-inp');
    if (vendorInp) vendorInp.value = data.vendor || '';

    const dateInp = document.getElementById('cendric-bill-date-inp');
    if (dateInp) dateInp.value = data.date || new Date().toISOString().slice(0, 10);

    const descInp = document.getElementById('cendric-bill-desc-inp');
    if (descInp) descInp.value = data.description || (data.vendor ? `Bill from ${data.vendor}` : 'Scanned receipt');

    const catSelect = document.getElementById('cendric-bill-cat-select');
    if (catSelect && data.category) {
      const options = Array.from(catSelect.options);
      const match = options.find(o => o.value.toLowerCase() === data.category.toLowerCase() || o.text.toLowerCase().includes(data.category.toLowerCase()));
      if (match) {
        catSelect.value = match.value;
      } else {
        catSelect.value = 'Other';
      }
    }
  }

  function setupBillScannerModal() {
    let modal = document.getElementById('cendric-bill-modal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'cendric-bill-modal';
    modal.className = 'cendric-modal-overlay';
    modal.style.display = 'none';

    const curr = getCurrency();
    const currSym = getCurrencySymbol(curr);

    modal.innerHTML = `
      <div class="cendric-modal-dialog">
        <!-- Header -->
        <div class="cendric-modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">📸</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">${t('billScannerTitle')}</h3>
              <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted);">${t('billScannerSubtitle')}</p>
            </div>
          </div>
          <button class="cendric-modal-close-btn" id="cendric-bill-close-btn">✕</button>
        </div>

        <div class="cendric-modal-body" style="padding: 18px 22px;">
          <!-- 1. Live Camera Capture View -->
          <div id="cendric-bill-capture-view">
            <!-- Feed Box -->
            <div id="cendric-camera-feed-box" class="cendric-camera-viewfinder">
              <video id="cendric-camera-video" class="cendric-camera-video" autoplay playsinline muted></video>
              <div class="cendric-camera-frame-reticle"></div>
              <div class="cendric-camera-laser"></div>
              <canvas id="cendric-camera-canvas" style="display: none;"></canvas>
            </div>

            <!-- Fallback Box if camera not available or denied -->
            <div id="cendric-camera-denied-box" style="display: none; border: 2px dashed var(--accent); border-radius: 16px; padding: 36px 20px; text-align: center; background: rgba(109, 90, 230, 0.04); margin-bottom: 12px;">
              <div style="font-size: 38px; margin-bottom: 8px;">📷</div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Camera access not enabled</div>
              <div style="font-size: 12px; color: var(--text-muted); max-width: 400px; margin: 0 auto 16px;">Take a photo using your mobile device or upload an existing receipt/bill picture.</div>
              <button id="cendric-camera-retry-btn" class="cendric-btn-secondary" style="padding: 6px 14px; font-size: 12px; margin-right: 8px;">Retry Camera</button>
              <button id="cendric-camera-manual-upload-btn" class="cendric-btn-primary" style="padding: 6px 16px; font-size: 12px;">Choose Photo File</button>
            </div>

            <!-- Instructions -->
            <div style="text-align: center; margin: 12px 0; font-size: 12px; color: var(--text-muted);">
              ${t('centerBill')}
            </div>

            <!-- Shutter & Tool Controls -->
            <div class="cendric-shutter-bar">
              <button id="cendric-camera-flip-btn" class="cendric-btn-secondary" style="width: 44px; height: 44px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px;" title="Flip Camera">
                🔄
              </button>

              <button id="cendric-camera-shutter-btn" class="cendric-shutter-btn" title="Snap Bill Photo">
                <div class="cendric-shutter-inner">📸</div>
              </button>

              <button id="cendric-camera-upload-trigger" class="cendric-btn-secondary" style="width: 44px; height: 44px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 18px;" title="Upload bill image">
                📁
              </button>
              <input type="file" id="cendric-bill-file-input" accept="image/*" capture="environment" style="display: none;" />
            </div>
          </div>

          <!-- 2. Loading / Analyzing View -->
          <div id="cendric-bill-loading-view" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px;">
            <div style="position: relative; width: 140px; height: 180px; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 2px solid var(--accent);">
              <img id="cendric-bill-loading-thumb" src="" alt="Captured Bill" style="width: 100%; height: 100%; object-fit: cover;" />
              <div class="cendric-camera-laser" style="left: 0; right: 0;"></div>
            </div>
            <div class="cendric-spinner" style="width: 32px; height: 32px; border: 3px solid rgba(16,185,129,0.2); border-top-color: #10b981; border-radius: 50%; animation: cendricSpin 0.8s linear infinite; margin-bottom: 12px;"></div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${t('analyzingBill')}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Extracting vendor, totals, tax slabs, and income/expense classification</div>
          </div>

          <!-- 3. Confirmation & Verification View -->
          <div id="cendric-bill-confirm-view" style="display: none;">
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 18px; margin-bottom: 18px;">
              <!-- Thumbnail & Retake -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="width: 140px; height: 180px; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                  <img id="cendric-bill-confirm-thumb" src="" alt="Scanned Bill" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <button id="cendric-bill-retake-btn" class="cendric-btn-secondary" style="width: 100%; padding: 6px; font-size: 11px; border-radius: 8px;">
                  ${t('retakePhoto')}
                </button>
              </div>

              <!-- Form Fields -->
              <div>
                <!-- Type Toggle: Expense vs Income -->
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${t('type')}</label>
                  <div class="cendric-type-pill-group">
                    <button type="button" id="cendric-bill-type-expense" class="cendric-type-pill active-expense">
                      <span>🔴</span> ${t('expense')}
                    </button>
                    <button type="button" id="cendric-bill-type-income" class="cendric-type-pill">
                      <span>🟢</span> ${t('income')}
                    </button>
                  </div>
                </div>

                <!-- Amount -->
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${t('amount')} (${currSym})</label>
                  <div style="display: flex; align-items: center; background: var(--bg-primary, #ffffff); border: 1.5px solid var(--border); border-radius: 10px; padding: 6px 12px;">
                    <span style="font-weight: 800; color: var(--accent); margin-right: 6px;">${currSym}</span>
                    <input type="number" step="0.01" id="cendric-bill-amt-inp" placeholder="0.00" style="border: none; outline: none; background: transparent; width: 100%; font-size: 16px; font-weight: 800; color: var(--text-primary);" />
                  </div>
                </div>

                <!-- Vendor / Title -->
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${t('vendor')}</label>
                  <input type="text" id="cendric-bill-vendor-inp" placeholder="e.g. Keells Super / Dialog" style="width: 100%; padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-primary, #ffffff); font-size: 13px; color: var(--text-primary); outline: none;" />
                </div>

                <!-- Category & Date Row -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${t('category')}</label>
                    <select id="cendric-bill-cat-select" style="width: 100%; padding: 8px 10px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-primary, #ffffff); font-size: 12px; color: var(--text-primary); outline: none;">
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Bills & Utilities">Bills & Utilities</option>
                      <option value="Software & Tools">Software & Tools</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Freelance">Freelance Inflow</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${t('date')}</label>
                    <input type="date" id="cendric-bill-date-inp" style="width: 100%; padding: 8px 10px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-primary, #ffffff); font-size: 12px; color: var(--text-primary); outline: none;" />
                  </div>
                </div>

                <!-- Notes / Description -->
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Notes / Memo</label>
                  <input type="text" id="cendric-bill-desc-inp" placeholder="Optional notes" style="width: 100%; padding: 8px 12px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--bg-primary, #ffffff); font-size: 12px; color: var(--text-primary); outline: none;" />
                </div>
              </div>
            </div>

            <!-- Footer Save Bar -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border);">
              <button id="cendric-bill-cancel-btn" class="cendric-btn-secondary" style="padding: 8px 16px; font-size: 12px; border-radius: 10px;">Cancel</button>
              <button id="cendric-bill-save-btn" class="cendric-btn-primary" style="padding: 8px 22px; font-size: 12.5px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px;">
                <span>✓</span> ${t('saveTransaction')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    const closeBtn = document.getElementById('cendric-bill-close-btn');
    const cancelBtn = document.getElementById('cendric-bill-cancel-btn');
    [closeBtn, cancelBtn].forEach(b => b?.addEventListener('click', closeBillScannerModal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBillScannerModal();
    });

    // Shutter button
    document.getElementById('cendric-camera-shutter-btn')?.addEventListener('click', capturePhotoFromCamera);

    // Flip camera
    document.getElementById('cendric-camera-flip-btn')?.addEventListener('click', () => {
      cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
      startCamera();
    });

    // Upload / Mobile shutter input
    const fileInput = document.getElementById('cendric-bill-file-input');
    const uploadTrigger = document.getElementById('cendric-camera-upload-trigger');
    const manualUploadBtn = document.getElementById('cendric-camera-manual-upload-btn');
    const retryBtn = document.getElementById('cendric-camera-retry-btn');

    [uploadTrigger, manualUploadBtn].forEach(b => b?.addEventListener('click', () => fileInput?.click()));
    retryBtn?.addEventListener('click', startCamera);

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      stopCamera();
      const reader = new FileReader();
      reader.onload = (ev) => {
        processScannedImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    });

    // Retake button
    document.getElementById('cendric-bill-retake-btn')?.addEventListener('click', () => {
      resetBillScannerViews();
      startCamera();
    });

    // Type toggles
    document.getElementById('cendric-bill-type-expense')?.addEventListener('click', () => setBillType('expense'));
    document.getElementById('cendric-bill-type-income')?.addEventListener('click', () => setBillType('income'));

    // Save transaction
    document.getElementById('cendric-bill-save-btn')?.addEventListener('click', async () => {
      const amtVal = parseFloat(document.getElementById('cendric-bill-amt-inp')?.value);
      if (isNaN(amtVal) || amtVal <= 0) {
        showToast('Please specify a valid amount.', 'info');
        return;
      }

      const vendor = document.getElementById('cendric-bill-vendor-inp')?.value || 'Scanned Bill';
      const category = document.getElementById('cendric-bill-cat-select')?.value || 'Other';
      const date = document.getElementById('cendric-bill-date-inp')?.value || new Date().toISOString().slice(0, 10);
      const desc = document.getElementById('cendric-bill-desc-inp')?.value || vendor;

      const saveBtn = document.getElementById('cendric-bill-save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> Saving...';
      }

      try {
        const token = getToken();
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            type: activeBillType,
            amount: amtVal,
            category,
            date,
            description: desc,
            source: 'receipt_scanner'
          })
        });

        if (res.ok) {
          showToast(t('scanSuccess'), 'success');
          closeBillScannerModal();
          document.getElementById('cendric-analytics-card')?.remove();
          document.getElementById('cendric-subs-card')?.remove();
          if (location.pathname.includes('/transactions')) {
            setTimeout(() => location.reload(), 400);
          }
        } else {
          showToast('Failed to save transaction.', 'info');
        }
      } catch (err) {
        console.error('Error saving scanned bill:', err);
        showToast('Network error while saving transaction.', 'info');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span>✓</span> ${t('saveTransaction')}`;
        }
      }
    });
  }

  // ----------------------------------------------------
  // 11. Top Header Dock (Language Selector & Notification Center)
  // ----------------------------------------------------
  let cachedNotifications = [];

  function setupTopHeaderDock() {
    let dock = document.getElementById('cendric-top-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'cendric-top-dock';
      dock.className = 'cendric-top-dock';
      document.body.appendChild(dock);
    }

    // Clean up any legacy flying elements
    document.getElementById('cendric-sidebar-lang-btn')?.remove();
    document.getElementById('cendric-sidebar-lang-menu')?.remove();

    // 1. Language Dropdown Button & Flyout Menu
    let langContainer = document.getElementById('cendric-header-lang-container');
    if (!langContainer) {
      langContainer = document.createElement('div');
      langContainer.id = 'cendric-header-lang-container';
      langContainer.className = 'cendric-header-lang-container';

      const curLang = getCurrentLang();
      const curInfo = I18N[curLang] || I18N.ta;

      langContainer.innerHTML = `
        <button id="cendric-header-lang-btn" class="cendric-header-lang-btn" type="button" title="Select Language / மொழியைத் தேர்ந்தெடுக்கவும் / භාෂාව තෝරන්න">
          <span id="cendric-header-lang-text">${curInfo.flag} ${curInfo.nativeName}</span>
          <span style="font-size: 9px; opacity: 0.8;">▾</span>
        </button>
        <div id="cendric-header-lang-menu" class="cendric-header-lang-menu" style="display: none;">
          <div class="cendric-header-lang-opt ${curLang === 'ta' ? 'active' : ''}" data-code="ta">
            <span style="font-weight: 700;">🇱🇰 தமிழ்</span>
            <span style="font-size: 11px; opacity: 0.7;">Tamil</span>
          </div>
          <div class="cendric-header-lang-opt ${curLang === 'si' ? 'active' : ''}" data-code="si">
            <span style="font-weight: 700;">🇱🇰 සිංහල</span>
            <span style="font-size: 11px; opacity: 0.7;">Sinhala</span>
          </div>
          <div class="cendric-header-lang-opt ${curLang === 'en' ? 'active' : ''}" data-code="en">
            <span style="font-weight: 700;">🇬🇧 English</span>
            <span style="font-size: 11px; opacity: 0.7;">English</span>
          </div>
        </div>
      `;

      // Insert before notification bell if bell already exists, or append
      const bell = document.getElementById('cendric-notif-bell');
      if (bell && bell.parentElement === dock) {
        dock.insertBefore(langContainer, bell);
      } else {
        dock.appendChild(langContainer);
      }

      const langBtn = langContainer.querySelector('#cendric-header-lang-btn');
      const langMenu = langContainer.querySelector('#cendric-header-lang-menu');

      const closeMenu = () => {
        if (langMenu) {
          langMenu.classList.remove('open');
          langMenu.style.setProperty('display', 'none', 'important');
        }
      };

      const openMenu = () => {
        if (langMenu) {
          langMenu.classList.add('open');
          langMenu.style.setProperty('display', 'flex', 'important');
          const panel = document.getElementById('cendric-notif-panel');
          if (panel) panel.style.display = 'none';
        }
      };

      const toggleMenu = () => {
        if (langMenu.classList.contains('open') || langMenu.style.display === 'flex') {
          closeMenu();
        } else {
          openMenu();
        }
      };

      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
      });

      langMenu.querySelectorAll('.cendric-header-lang-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = opt.getAttribute('data-code');
          closeMenu();
          langMenu.querySelectorAll('.cendric-header-lang-opt').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          setLanguage(code);
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('pointerdown', (e) => {
        if (langMenu && !langContainer.contains(e.target)) {
          closeMenu();
        }
      });
      document.addEventListener('click', (e) => {
        if (langMenu && !langContainer.contains(e.target)) {
          closeMenu();
        }
      });

      // Close dropdown on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeMenu();
        }
      });
    }

    // 2. Proactive Notification Center Bell & Flyout
    setupNotificationCenter(dock);
  }

  function setupNotificationCenter(parentDock = null) {
    const dock = parentDock || document.getElementById('cendric-top-dock') || document.body;

    if (document.getElementById('cendric-notif-bell')) return;

    // Fixed Top-Right Bell
    const bellBtn = document.createElement('button');
    bellBtn.id = 'cendric-notif-bell';
    bellBtn.className = 'cendric-notif-bell-btn';
    bellBtn.title = 'Notifications & Tax Deadlines';
    bellBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span id="cendric-notif-badge" class="cendric-notif-badge" style="display: none;">0</span>
    `;

    dock.appendChild(bellBtn);

    // Floating Flyout Panel
    const panel = document.createElement('div');
    panel.id = 'cendric-notif-panel';
    panel.className = 'cendric-notif-panel';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--glass-border-subtle);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🔔</span>
          <span style="font-size: 13px; font-weight: 800; color: var(--text-primary);">Notifications & Alerts</span>
        </div>
        <button id="cendric-notif-refresh-btn" style="background: none; border: none; font-size: 12px; color: var(--text-muted); cursor: pointer; padding: 2px 6px; border-radius: 4px;" title="Refresh alerts">↻</button>
      </div>

      <div id="cendric-notif-list" style="max-height: 380px; overflow-y: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 8px;">
        <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 12px;">Loading alerts...</div>
      </div>

      <div style="padding: 10px 14px; border-top: 1px solid var(--glass-border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted);">
        <span>Proactive Assistant</span>
        <button id="cendric-notif-close-panel-btn" style="background: none; border: none; color: var(--accent); font-weight: 700; cursor: pointer;">Close</button>
      </div>
    `;

    dock.appendChild(panel);

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const langMenu = document.getElementById('cendric-header-lang-menu');
      if (langMenu) {
        langMenu.classList.remove('open');
        langMenu.style.setProperty('display', 'none', 'important');
      }
      toggleNotificationPanel();
    });

    document.getElementById('cendric-notif-refresh-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      loadNotifications(true);
    });

    document.getElementById('cendric-notif-close-panel-btn')?.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

    loadNotifications();
  }

  function toggleNotificationPanel() {
    setupNotificationCenter();
    const panel = document.getElementById('cendric-notif-panel');
    if (!panel) return;
    if (panel.style.display === 'flex' || panel.style.display === 'block') {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'block';
      loadNotifications();
    }
  }

  async function loadNotifications(force = false) {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;
      const data = await res.json();
      cachedNotifications = data.notifications || [];

      const badge = document.getElementById('cendric-notif-badge');
      const list = document.getElementById('cendric-notif-list');

      if (badge) {
        if (cachedNotifications.length > 0) {
          badge.textContent = cachedNotifications.length;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }

      if (list) {
        if (cachedNotifications.length === 0) {
          list.innerHTML = `
            <div style="text-align: center; padding: 28px 12px; color: var(--text-muted); font-size: 12px;">
              <span style="font-size: 24px; display: block; margin-bottom: 6px;">🎉</span>
              No pending alerts. All budgets and tax deadlines are in order!
            </div>
          `;
        } else {
          list.innerHTML = cachedNotifications.map(n => {
            let icon = '🔔';
            let borderColor = 'rgba(109, 90, 230, 0.3)';
            if (n.type === 'budget') {
              icon = n.severity === 'danger' ? '🚨' : '⚠️';
              borderColor = n.severity === 'danger' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';
            } else if (n.type === 'tax') {
              icon = '🇱🇰';
              borderColor = 'rgba(16, 185, 129, 0.4)';
            } else if (n.type === 'subscription') {
              icon = '🔄';
              borderColor = 'rgba(59, 130, 246, 0.4)';
            }

            return `
              <div class="cendric-notif-item" data-url="${n.actionUrl || ''}" data-type="${n.type}" style="padding: 10px 12px; border-radius: 10px; background: var(--glass-inner-bg); border: 1px solid ${borderColor}; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                  <span style="font-size: 16px; line-height: 1; margin-top: 2px;">${icon}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${n.title}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; line-height: 1.4;">${n.message}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          list.querySelectorAll('.cendric-notif-item').forEach(item => {
            item.addEventListener('click', () => {
              const url = item.getAttribute('data-url');
              const type = item.getAttribute('data-type');
              const panel = document.getElementById('cendric-notif-panel');
              if (panel) panel.style.display = 'none';

              if (type === 'tax') {
                openTaxCalculatorModal();
              } else if (url) {
                window.location.href = url;
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('[Cendric] Error loading notifications:', err);
    }
  }

  // ----------------------------------------------------
  // Auth (SignIn / Register) Page Enhancement
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Direct High-Reliability Auth Engine
  // ----------------------------------------------------
  let isSubmittingAuth = false;

  async function handleDirectAuthSubmit(e) {
    if (e) e.preventDefault();
    if (isSubmittingAuth) return;

    const tabRegister = document.getElementById('pay-tab-register');
    const isRegister = tabRegister && tabRegister.classList.contains('active');
    const emailInput = document.getElementById('cendric-auth-email');
    const passInput = document.getElementById('cendric-auth-password');
    const nameInput = document.getElementById('cendric-auth-name');
    const submitBtn = document.getElementById('cendric-pay-submit-btn');
    const alertBox = document.getElementById('cendric-auth-alert');

    const email = emailInput?.value?.trim() || '';
    const password = passInput?.value || '';
    const fullName = nameInput?.value?.trim() || '';

    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }

    if (!email || !password) {
      if (alertBox) {
        alertBox.textContent = 'Please enter both your email and password.';
        alertBox.style.display = 'block';
      }
      showToast('Please enter both email and password.', 'warning');
      return;
    }

    if (isRegister && !fullName) {
      if (alertBox) {
        alertBox.textContent = 'Please enter your full name to create an account.';
        alertBox.style.display = 'block';
      }
      showToast('Please enter your full name.', 'warning');
      return;
    }

    isSubmittingAuth = true;
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Please wait...</span>';
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { fullName, email, password } : { email, password };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = data.message || (isRegister ? 'Registration failed. Try again.' : 'Invalid email or password.');
        if (alertBox) {
          alertBox.textContent = msg;
          alertBox.style.display = 'block';
        }
        showToast(msg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        isSubmittingAuth = false;
        return;
      }

      // Store credentials in localStorage for Cendric AuthContext
      localStorage.setItem('cendric_token', data.token);
      localStorage.setItem('cendric_user', JSON.stringify(data.user));

      showToast(isRegister ? 'Account created! Welcome to Cendric.' : 'Signed in successfully! Redirecting...', 'success');

      // Clean up custom Payoobel DOM & class
      document.getElementById('cendric-pay-container')?.remove();
      document.body.classList.remove('cendric-auth-active');

      // Navigate to chat
      window.location.href = '/chat';
    } catch (err) {
      console.error('[Cendric Auth Error]', err);
      const netMsg = 'Connection error. Please check your network and try again.';
      if (alertBox) {
        alertBox.textContent = netMsg;
        alertBox.style.display = 'block';
      }
      showToast(netMsg, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
      isSubmittingAuth = false;
    }
  }

  function setAuthMode(isReg) {
    const tabSignin = document.getElementById('pay-tab-signin');
    const tabRegister = document.getElementById('pay-tab-register');
    const nameGroup = document.getElementById('cendric-group-name');
    const submitBtn = document.getElementById('cendric-pay-submit-btn');
    const alertBox = document.getElementById('cendric-auth-alert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }

    if (isReg) {
      tabSignin?.classList.remove('active');
      tabRegister?.classList.add('active');
      if (nameGroup) nameGroup.style.display = 'block';
      if (submitBtn) submitBtn.innerHTML = '<span>Create Account Now →</span>';
    } else {
      tabSignin?.classList.add('active');
      tabRegister?.classList.remove('active');
      if (nameGroup) nameGroup.style.display = 'none';
      if (submitBtn) submitBtn.innerHTML = '<span>Sign In Now →</span>';
    }
  }

  function triggerDemoFill() {
    setAuthMode(false);
    const emailInput = document.getElementById('cendric-auth-email');
    const passInput = document.getElementById('cendric-auth-password');
    if (emailInput && passInput) {
      emailInput.value = 'piratheep@example.com';
      passInput.value = 'password123';
      showToast('Demo credentials entered! Signing in...', 'info');
      setTimeout(() => {
        handleDirectAuthSubmit();
      }, 350);
    }
  }

  function enhanceAuthPage() {
    const isAuthRoute = window.location.pathname === '/login' || window.location.pathname === '/register';
    const hasExistingToken = !!localStorage.getItem('cendric_token');
    const reactAuthFound = !!document.getElementById('toggle-auth-mode');

    if (hasExistingToken || (!isAuthRoute && !reactAuthFound)) {
      if (document.body.classList.contains('cendric-auth-active')) {
        document.body.classList.remove('cendric-auth-active');
        document.getElementById('cendric-pay-container')?.remove();
      }
      return;
    }

    if (!document.body.classList.contains('cendric-auth-active')) {
      document.body.classList.add('cendric-auth-active');
    }

    let payContainer = document.getElementById('cendric-pay-container');
    if (!payContainer) {
      payContainer = document.createElement('div');
      payContainer.id = 'cendric-pay-container';
      payContainer.innerHTML = `
        <!-- Top Announcement Banner -->
        <div class="cendric-pay-banner">
          <span class="cendric-pay-banner-pill">NEW</span>
          <span>Cendric AI 2.0: Automated tax forecasting, instant receipt scanning & multi-currency freelance tracking</span>
          <button type="button" class="cendric-pay-banner-close" onclick="this.parentElement.remove()">✕</button>
        </div>

        <!-- Top Navigation -->
        <nav class="cendric-pay-nav">
          <div class="cendric-nav-left">
            <div class="cendric-nav-logo-mark">C</div>
            <span class="cendric-nav-brand">Cendric</span>
          </div>
          <div class="cendric-nav-links">
            <span>Features ▾</span>
            <span>Multi-Currency</span>
            <span>Tax Estimator</span>
            <span>Receipt OCR</span>
            <span>AI Assistant</span>
          </div>
          <div class="cendric-nav-right">
            <button type="button" class="cendric-nav-login" id="pay-nav-login-btn">Log In</button>
            <button type="button" class="cendric-nav-cta" id="pay-nav-cta-btn">Get Started</button>
          </div>
        </nav>

        <!-- Hero Section -->
        <div class="cendric-pay-hero">
          <!-- Left Column -->
          <div class="cendric-pay-left">
            <h1 class="cendric-pay-headline">
              Intelligent Finance &<br>
              Tax Assistant for<br>
              <span class="cendric-pay-highlight">Modern Freelancers</span>
            </h1>
            <p class="cendric-pay-sub">
              Manage income from international clients, track business expenses, automate tax deductions, and receive real-time financial insights powered by AI.
            </p>

            <!-- Form Container Slot -->
            <div class="cendric-pay-form-wrap" id="cendric-pay-form-slot">
              <div class="cendric-pay-tabs">
                <button type="button" class="cendric-pay-tab active" id="pay-tab-signin">Sign In</button>
                <button type="button" class="cendric-pay-tab" id="pay-tab-register">Create Account</button>
              </div>

              <!-- Live alert box for invalid credentials or errors -->
              <div id="cendric-auth-alert" style="display:none; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:14px; font-weight:500;"></div>

              <form id="cendric-auth-form" style="display:flex; flex-direction:column; gap:14px;">
                <!-- Full Name (Shown only in Create Account mode) -->
                <div id="cendric-group-name" style="display:none;">
                  <label for="cendric-auth-name">Full Name</label>
                  <input type="text" id="cendric-auth-name" placeholder="Piratheep Raj" autocomplete="name" />
                </div>

                <!-- Email Address -->
                <div>
                  <label for="cendric-auth-email">Email Address</label>
                  <input type="email" id="cendric-auth-email" placeholder="piratheep@example.com" autocomplete="email" required />
                </div>

                <!-- Password -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <label for="cendric-auth-password" style="margin-bottom:0;">Password</label>
                    <span style="font-size:12px; color:#115e59; font-weight:500; cursor:pointer;" id="cendric-pw-hint">Demo: password123</span>
                  </div>
                  <div style="position:relative;">
                    <input type="password" id="cendric-auth-password" placeholder="••••••••" autocomplete="current-password" required style="padding-right:40px;" />
                    <button type="button" id="cendric-pw-toggle" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#6b7280; cursor:pointer; font-size:14px; line-height:1;" title="Show/Hide Password">👁️</button>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="cendric-pay-btn-row">
                  <button type="submit" class="cendric-pay-submit-btn" id="cendric-pay-submit-btn">
                    <span>Sign In Now →</span>
                  </button>
                  <button type="button" class="cendric-pay-demo-btn" id="pay-demo-fill-btn">⚡ Live Demo</button>
                </div>
              </form>
            </div>

            <!-- Social Proof Row -->
            <div class="cendric-pay-trust">
              <div class="cendric-avatar-stack">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces" class="cendric-pay-avatar" alt="Avatar 1" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces" class="cendric-pay-avatar" alt="Avatar 2" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces" class="cendric-pay-avatar" alt="Avatar 3" />
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces" class="cendric-pay-avatar" alt="Avatar 4" />
              </div>
              <div class="cendric-trust-info">
                <div class="cendric-pay-stars">★★★★★</div>
                <div class="cendric-pay-trust-label">Trusted by 2K+ Freelancers & Creators</div>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="cendric-pay-right">
            <div class="cendric-pay-mint-shape"></div>
            <img src="/assets/cendric-hero-person.jpg" alt="Freelance Finance" class="cendric-pay-person-img" />

            <!-- Floating Card 1: Multi-Currency -->
            <div class="cendric-float-card cendric-card-currencies">
              <div class="cendric-curr-header">Multi-Currency Global Income</div>
              <div class="cendric-curr-grid">
                <div class="cendric-curr-badge"><span>🇺🇸</span> USD</div>
                <div class="cendric-curr-badge"><span>🇪🇺</span> EUR</div>
                <div class="cendric-curr-badge"><span>🇬🇧</span> GBP</div>
                <div class="cendric-curr-badge"><span>🇦🇺</span> AUD</div>
              </div>
            </div>

            <!-- Floating Card 2: Total Balance -->
            <div class="cendric-float-card cendric-card-balance">
              <div class="cendric-bal-header">
                <span class="cendric-bal-label">Freelance Net Income</span>
                <span class="cendric-bal-link">This Quarter</span>
              </div>
              <div class="cendric-bal-amt">$14,850.00</div>
              <div class="cendric-bal-meta">
                <span>Tax Saved: $3,712.50</span>
                <span>Cendric Vault</span>
              </div>
            </div>

            <!-- Floating Card 3: Emerald Debit Card -->
            <div class="cendric-float-card cendric-card-debit">
              <div class="cendric-debit-top">
                <div class="cendric-debit-chip"></div>
                <div class="cendric-debit-brand">FREELANCE PRO</div>
              </div>
              <div class="cendric-debit-num">2466 4982 7710 3607</div>
              <div class="cendric-debit-foot">
                <span>CENDRIC PLATINUM</span>
                <div class="cendric-debit-circles">
                  <span class="cendric-debit-c1"></span>
                  <span class="cendric-debit-c2"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertBefore(payContainer, document.body.firstChild);

      // Event listeners for tabs & buttons
      document.getElementById('pay-tab-signin')?.addEventListener('click', () => setAuthMode(false));
      document.getElementById('pay-tab-register')?.addEventListener('click', () => setAuthMode(true));
      document.getElementById('pay-nav-login-btn')?.addEventListener('click', () => setAuthMode(false));
      document.getElementById('pay-nav-cta-btn')?.addEventListener('click', () => setAuthMode(true));
      document.getElementById('pay-demo-fill-btn')?.addEventListener('click', triggerDemoFill);
      document.getElementById('cendric-pw-hint')?.addEventListener('click', triggerDemoFill);

      // Show/Hide password toggle
      document.getElementById('cendric-pw-toggle')?.addEventListener('click', () => {
        const pw = document.getElementById('cendric-auth-password');
        if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
      });

      // Direct form submit handler
      document.getElementById('cendric-auth-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleDirectAuthSubmit(e);
      });
    }
  }

  // ----------------------------------------------------
  // 13. System Administrator Control Center & Dashboard (/admin)
  // ----------------------------------------------------
  let cachedAdminOverview = null;
  let cachedAdminUsers = [];
  let isAdminLoading = false;
  let adminSearchQuery = '';

  async function enhanceAdminPage() {
    const isUrlAdmin = location.pathname.startsWith('/admin') || location.hash === '#admin';
    if (!isUrlAdmin) {
      document.getElementById('cendric-admin-container')?.remove();
      document.getElementById('cendric-admin-denied')?.remove();
      return;
    }

    const main = document.querySelector('main');
    if (!main) return;

    const u = getUser();
    if (!u) {
      location.href = '/login';
      return;
    }

    // Hide original main children
    Array.from(main.children).forEach(el => {
      if (!el.id?.startsWith('cendric')) {
        el.setAttribute('data-cendric-hidden', 'true');
        el.style.display = 'none';
      }
    });

    if (!u.isAdmin) {
      if (!document.getElementById('cendric-admin-denied')) {
        const deniedDiv = document.createElement('div');
        deniedDiv.id = 'cendric-admin-denied';
        deniedDiv.className = 'cendric-admin-container';
        deniedDiv.innerHTML = `
          <div class="cendric-admin-card" style="max-width: 520px; margin: 80px auto; padding: 48px 32px; text-align: center;">
            <div style="font-size: 54px; margin-bottom: 16px;">🛡️</div>
            <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0 0 8px;">Access Restricted</h2>
            <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Administrator credentials are required to access this control center. Your account (${u.email}) is currently assigned the Standard User role.</p>
            <div style="display: flex; justify-content: center; gap: 12px;">
              <button id="cendric-admin-return-btn" class="cendric-btn-primary" style="padding: 10px 24px; border-radius: 99px; cursor: pointer;">
                ← Return to Dashboard
              </button>
            </div>
          </div>
        `;
        main.appendChild(deniedDiv);
        document.getElementById('cendric-admin-return-btn')?.addEventListener('click', () => {
          history.pushState({}, '', '/');
          handleRouteChange();
        });
      }
      return;
    }

    document.getElementById('cendric-admin-denied')?.remove();

    let container = document.getElementById('cendric-admin-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cendric-admin-container';
      container.className = 'cendric-admin-container';
      main.appendChild(container);
    }

    if (!cachedAdminOverview && !isAdminLoading) {
      await loadAdminData();
    }
    renderAdminDashboard(container);
  }

  async function loadAdminData() {
    isAdminLoading = true;
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [resOverview, resUsers] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/users', { headers })
      ]);

      if (resOverview.ok) {
        cachedAdminOverview = await resOverview.json();
      }
      if (resUsers.ok) {
        const uJson = await resUsers.json();
        cachedAdminUsers = uJson.users || [];
      }
    } catch (err) {
      console.warn('[Admin] Failed to load admin telemetry:', err);
    } finally {
      isAdminLoading = false;
    }
  }

  function renderAdminDashboard(container) {
    if (!container) return;

    if (isAdminLoading && !cachedAdminOverview) {
      container.innerHTML = `
        <div style="text-align: center; padding: 100px 20px;">
          <div class="cendric-spinner" style="width: 40px; height: 40px; border: 3px solid rgba(109,90,230,0.2); border-top-color: var(--accent); border-radius: 50%; animation: cendricSpin 0.8s linear infinite; margin: 0 auto 16px;"></div>
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px;">Loading Platform Telemetry...</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Aggregating MongoDB collections, AI observability, and financial metrics</p>
        </div>
      `;
      return;
    }

    const ov = cachedAdminOverview || {
      users: { total: 0, active: 0, deactivated: 0, admins: 0, new7d: 0 },
      finances: { totalTransactions: 0, totalVolumeLKR: 0, totalIncomeLKR: 0, totalExpenseLKR: 0, netCashFlowLKR: 0, categoryBreakdown: {} },
      ai: { activeModel: 'gemini-3.8-flash', totalAiMessages: 0, totalBillScans: 0, ragDocumentsIndexed: 8 },
      system: { database: 'MongoDB Atlas', uptimeSeconds: 120 }
    };

    const users = cachedAdminUsers.filter(u => {
      if (!adminSearchQuery) return true;
      const q = adminSearchQuery.toLowerCase();
      return (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });

    const incomeVal = ov.finances.totalIncomeLKR || 0;
    const expenseVal = ov.finances.totalExpenseLKR || 0;
    const totalFlow = (incomeVal + expenseVal) || 1;
    const incomePct = Math.round((incomeVal / totalFlow) * 100);
    const expensePct = 100 - incomePct;

    const uptimeHrs = Math.floor((ov.system.uptimeSeconds || 0) / 3600);
    const uptimeMins = Math.floor(((ov.system.uptimeSeconds || 0) % 3600) / 60);

    container.innerHTML = `
      <!-- Header -->
      <div class="cendric-admin-header">
        <div>
          <div class="cendric-admin-badge-hdr">
            <span>🛡️</span> SYSTEM ADMINISTRATOR CONTROL CENTER
          </div>
          <h1 class="cendric-admin-title">Platform Intelligence & User Management</h1>
          <p class="cendric-admin-sub">Real-time MERN telemetry, AI RAG observability, and user access control</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); font-size: 12px; font-weight: 700; color: #10b981;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            ${ov.system.database.includes('MongoDB') ? 'MongoDB Atlas Online' : 'Local DB Online'}
          </div>
          <button id="cendric-admin-refresh-btn" class="cendric-admin-action-btn" style="padding: 8px 14px; font-size: 12px;">
            ↻ Refresh Metrics
          </button>
          <button id="cendric-admin-exit-btn" class="cendric-admin-action-btn" style="padding: 8px 14px; font-size: 12px;">
            ← Dashboard
          </button>
        </div>
      </div>

      <!-- 4 Primary KPI Cards -->
      <div class="cendric-admin-kpi-grid">
        <!-- 1. User Base -->
        <div class="cendric-admin-card">
          <div class="cendric-kpi-label">
            <span>User Accounts</span>
            <span style="font-size: 16px;">👥</span>
          </div>
          <div class="cendric-kpi-val">${ov.users.total}</div>
          <div class="cendric-kpi-sub" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
            <span style="color: #10b981; font-weight: 700;">● ${ov.users.active} Active</span>
            <span style="color: #f43f5e; font-weight: 700;">● ${ov.users.deactivated} Inactive</span>
            <span style="color: #6d5ae6; font-weight: 700;">👑 ${ov.users.admins} Admins</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 8px;">
            +${ov.users.new7d} registered in last 7 days
          </div>
        </div>

        <!-- 2. Financial Volume -->
        <div class="cendric-admin-card">
          <div class="cendric-kpi-label">
            <span>Financial Volume</span>
            <span style="font-size: 16px;">💳</span>
          </div>
          <div class="cendric-kpi-val">LKR ${(ov.finances.totalVolumeLKR / 1000).toFixed(1)}k</div>
          <div class="cendric-kpi-sub" style="margin-bottom: 8px;">
            <span style="color: #10b981; font-weight: 700;">+LKR ${(incomeVal/1000).toFixed(1)}k</span> in · 
            <span style="color: #f43f5e; font-weight: 700;">-LKR ${(expenseVal/1000).toFixed(1)}k</span> out
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 8px;">
            ${ov.finances.totalTransactions} total transactions recorded
          </div>
        </div>

        <!-- 3. AI & RAG Observability -->
        <div class="cendric-admin-card">
          <div class="cendric-kpi-label">
            <span>AI Model & RAG</span>
            <span style="font-size: 16px;">⚡</span>
          </div>
          <div class="cendric-kpi-val" style="font-size: 20px; line-height: 1.3;">${ov.ai.activeModel}</div>
          <div class="cendric-kpi-sub" style="margin-bottom: 8px;">
            <span>${ov.ai.totalAiMessages} AI responses streamed</span> · 
            <span>${ov.ai.totalBillScans} receipts OCR parsed</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 8px;">
            ${ov.ai.ragDocumentsIndexed} Sri Lankan legal sections indexed
          </div>
        </div>

        <!-- 4. System Uptime & Stack -->
        <div class="cendric-admin-card">
          <div class="cendric-kpi-label">
            <span>Architecture & Stack</span>
            <span style="font-size: 16px;">🏗️</span>
          </div>
          <div class="cendric-kpi-val" style="font-size: 22px;">MERN Stack</div>
          <div class="cendric-kpi-sub" style="margin-bottom: 8px;">
            <span>${ov.system.database}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 8px;">
            Server uptime: ${uptimeHrs}h ${uptimeMins}m · Node.js runtime
          </div>
        </div>
      </div>

      <!-- Mid-Section Analytics: Platform Flow & AI Architecture -->
      <div class="cendric-admin-split-grid">
        <!-- Cash Flow Bar & Top Categories -->
        <div class="cendric-admin-table-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px;">Platform Cash Flow Dynamics</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Aggregate income vs expenses across all users</p>
            </div>
            <span style="font-size: 14px; font-weight: 800; color: ${ov.finances.netCashFlowLKR >= 0 ? '#10b981' : '#f43f5e'};">
              Net: LKR ${ov.finances.netCashFlowLKR.toLocaleString()}
            </span>
          </div>

          <!-- Flow Ratio Progress Bar -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; margin-bottom: 6px;">
              <span style="color: #10b981;">Income Inflow (${incomePct}%)</span>
              <span style="color: #f43f5e;">Expense Outflow (${expensePct}%)</span>
            </div>
            <div style="height: 10px; border-radius: 99px; overflow: hidden; display: flex; background: rgba(0,0,0,0.06);">
              <div style="width: ${incomePct}%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.5s ease;"></div>
              <div style="width: ${expensePct}%; background: linear-gradient(90deg, #f43f5e, #e11d48); transition: width 0.5s ease;"></div>
            </div>
          </div>

          <!-- Top Category Chips -->
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 8px;">Top Platform Expense Categories</span>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${Object.entries(ov.finances.categoryBreakdown || {}).sort((a,b)=>b[1].totalLKR - a[1].totalLKR).slice(0, 6).map(([cat, info]) => `
                <div style="padding: 6px 10px; border-radius: 8px; background: var(--glass-inner-bg); border: 1px solid var(--border); font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 700; color: var(--text-primary);">${cat}</span>
                  <span style="color: var(--accent); font-weight: 800;">LKR ${Math.round(info.totalLKR).toLocaleString()}</span>
                  <span style="font-size: 10px; color: var(--text-muted);">(${info.count})</span>
                </div>
              `).join('') || '<div style="color: var(--text-muted); font-size: 12px;">No transactions recorded yet</div>'}
            </div>
          </div>
        </div>

        <!-- AI Observability & Legal Intelligence -->
        <div class="cendric-admin-table-card">
          <div style="margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px;">AI Observability & Legal Grounding</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Inspection of Gemini 3.8 Flash RAG pipeline and integrations</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="padding: 10px 14px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Core Generative Model</div>
                <div style="font-size: 11px; color: var(--text-muted);">High-performance DeepMind model for code, reasoning & chat</div>
              </div>
              <span class="cendric-badge-role-admin" style="background: rgba(109,90,230,0.15); color: var(--accent); border-color: rgba(109,90,230,0.3); font-size: 11px;">
                ${ov.ai.activeModel}
              </span>
            </div>

            <div style="padding: 10px 14px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">RAG Legal Knowledge Corpus</div>
                <div style="font-size: 11px; color: var(--text-muted);">${ov.ai.sriLankaTaxCorpus || 'Inland Revenue Act No. 24 of 2017'}</div>
              </div>
              <span class="cendric-badge-status-active" style="font-size: 11px;">
                ${ov.ai.ragDocumentsIndexed} Sections Live
              </span>
            </div>

            <div style="padding: 10px 14px; border-radius: 12px; background: var(--glass-inner-bg); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Forex Real-Time Rates Provider</div>
                <div style="font-size: 11px; color: var(--text-muted);">${ov.ai.exchangeRateProvider}</div>
              </div>
              <span class="cendric-badge-status-active" style="font-size: 11px;">
                Auto-Synced
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- User Registry Table Card -->
      <div class="cendric-admin-table-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px;">User Access & Role Administration</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0;">${cachedAdminUsers.length} total registered accounts · View, deactivate, or assign administrative roles</p>
          </div>
          <div class="cendric-admin-search-wrap">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--text-muted);">🔍</span>
            <input type="text" id="cendric-admin-search" class="cendric-admin-search-input" placeholder="Search by name or email..." value="${adminSearchQuery}" />
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="cendric-admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Currency / Lang</th>
                <th>Status</th>
                <th>Activity</th>
                <th>Registered</th>
                <th style="text-align: right;">Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 36px 14px; color: var(--text-muted);">
                    No users matching "${adminSearchQuery}"
                  </td>
                </tr>
              ` : users.map(u => {
                const initial = (u.fullName || 'U').charAt(0).toUpperCase();
                const isCurrent = String(u._id) === String(getUser()?._id);
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6d5ae6, #06b6d4); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px;">
                          ${initial}
                        </div>
                        <div>
                          <div style="font-weight: 700; color: var(--text-primary);">${u.fullName} ${isCurrent ? '<span style="font-size: 10px; color: var(--accent); font-weight: 800;">(You)</span>' : ''}</div>
                          <div style="font-size: 11px; color: var(--text-muted);">${u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="${u.isAdmin ? 'cendric-badge-role-admin' : 'cendric-badge-role-user'}">
                        ${u.isAdmin ? '🛡️ Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>
                      <span style="font-weight: 700; font-size: 12px; color: var(--text-primary);">${u.currencyPreference || 'LKR'}</span>
                      <span style="font-size: 11px; color: var(--text-muted);">· ${(u.languagePreference || 'en').toUpperCase()}</span>
                    </td>
                    <td>
                      <span class="${u.isActive ? 'cendric-badge-status-active' : 'cendric-badge-status-deactivated'}">
                        ${u.isActive ? '● Active' : '● Deactivated'}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--text-primary);">${u.transactionCount} transactions</div>
                      <div style="font-size: 11px; color: var(--text-muted);">Spent: LKR ${(u.totalSpentLKR || 0).toLocaleString()}</div>
                    </td>
                    <td style="font-size: 12px; color: var(--text-muted);">
                      ${new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 6px;">
                        ${!isCurrent ? `
                          <button class="cendric-admin-action-btn ${u.isActive ? 'btn-danger' : ''}" data-act="status" data-id="${u._id}" title="${u.isActive ? 'Deactivate Account' : 'Activate Account'}">
                            ${u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button class="cendric-admin-action-btn" data-act="role" data-id="${u._id}" title="${u.isAdmin ? 'Demote to User' : 'Promote to Admin'}">
                            ${u.isAdmin ? 'Demote' : 'Make Admin'}
                          </button>
                        ` : `
                          <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Current Session</span>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Wire up events
    document.getElementById('cendric-admin-refresh-btn')?.addEventListener('click', async () => {
      await loadAdminData();
      renderAdminDashboard(container);
      showToast('Administrative metrics refreshed', 'success');
    });

    document.getElementById('cendric-admin-exit-btn')?.addEventListener('click', () => {
      history.pushState({}, '', '/');
      handleRouteChange();
    });

    const searchInp = document.getElementById('cendric-admin-search');
    searchInp?.addEventListener('input', (e) => {
      adminSearchQuery = e.target.value.trim();
      renderAdminDashboard(container);
      const newInp = document.getElementById('cendric-admin-search');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    });

    // Wire up table buttons
    container.querySelectorAll('button[data-act="status"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = '...';
        try {
          const token = getToken();
          const res = await fetch(`/api/admin/users/${id}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          const json = await res.json();
          if (res.ok) {
            showToast(json.message || 'Status updated', 'success');
            await loadAdminData();
            renderAdminDashboard(container);
          } else {
            showToast(json.message || 'Failed to update status', 'info');
          }
        } catch (err) {
          showToast('Network error updating user', 'info');
        }
      });
    });

    container.querySelectorAll('button[data-act="role"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = '...';
        try {
          const token = getToken();
          const res = await fetch(`/api/admin/users/${id}/toggle-admin`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          const json = await res.json();
          if (res.ok) {
            showToast(json.message || 'Role updated', 'success');
            await loadAdminData();
            renderAdminDashboard(container);
          } else {
            showToast(json.message || 'Failed to update role', 'info');
          }
        } catch (err) {
          showToast('Network error updating role', 'info');
        }
      });
    });
  }

  // ----------------------------------------------------
  // Safe Debounced Enhancement Orchestrator
  // ----------------------------------------------------
  let isEnhancing = false;
  let enhanceDebounceTimer = null;

  async function checkAndEnhance() {
    if (isEnhancing) return;
    isEnhancing = true;
    try {
      enhanceAuthPage();
      enhanceSidebar();
      enhanceNavTooltips();
      await enhanceTransactionsPage();
      enhanceChatPage();
      await enhanceSettingsPage();
      await enhanceAdminPage();
      setupCommandPalette();
      setupTaxCalculatorModal();
      setupInvoiceModal();
      setupCsvImporterModal();
      setupBillScannerModal();
      setupTopHeaderDock();
      setupMobileDrawer();
      applyLanguage(getCurrentLang());
    } catch (err) {
      console.warn('[Cendric] Enhancement error:', err);
    } finally {
      isEnhancing = false;
    }
  }

  function scheduleCheckAndEnhance() {
    if (enhanceDebounceTimer) clearTimeout(enhanceDebounceTimer);
    enhanceDebounceTimer = setTimeout(() => {
      checkAndEnhance();
    }, 150);
  }

  // Observe URL changes & DOM mutations safely (ignoring our own widgets)
  let lastUrl = location.href;
  new MutationObserver((mutations) => {
    // If currently running an enhancement batch, don't recurse
    if (isEnhancing) return;

    // Check if mutations are purely internal to our own injected widgets
    let hasExternalMutation = false;
    for (const m of mutations) {
      const target = m.target;
      const id = target?.id || '';
      const cls = typeof target?.className === 'string' ? target.className : '';
      if (!id.startsWith('cendric-') && !cls.includes('cendric-')) {
        hasExternalMutation = true;
        break;
      }
    }
    if (!hasExternalMutation) return;

    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Clean stale injected elements if navigating away
      if (!url.includes('/admin')) {
        document.getElementById('cendric-admin-container')?.remove();
        document.getElementById('cendric-admin-denied')?.remove();
      }
      if (!url.includes('/transactions')) {
        document.getElementById('cendric-analytics-card')?.remove();
        document.getElementById('cendric-subs-card')?.remove();
        document.getElementById('cendric-export-btn')?.remove();
        document.getElementById('cendric-header-wrapper')?.remove();
      }
      if (!url.includes('/chat')) {
        document.getElementById('cendric-chat-prompt-chips')?.remove();
        const chatOverlay = document.getElementById('cendric-chat-overlay');
        if (chatOverlay) {
          chatOverlay.remove();
        }
        // Restore any hidden children on main
        const main = document.querySelector('main');
        if (main) {
          Array.from(main.children).forEach(el => {
            if (el.getAttribute('data-cendric-hidden') === 'true') {
              el.removeAttribute('data-cendric-hidden');
              el.style.display = '';
            }
          });
        }
      }
      if (!url.includes('/settings')) {
        document.getElementById('cendric-currency-conversion-banner')?.remove();
        document.getElementById('cendric-live-rates-bar')?.remove();
      }
      if (!url.includes('/login')) {
        document.body.classList.remove('cendric-auth-active');
        document.getElementById('cendric-form-badge')?.remove();
        document.getElementById('cendric-card-header-bar')?.remove();
        document.getElementById('cendric-demo-helper')?.remove();
        document.getElementById('cendric-auth-hero-badge')?.remove();
        document.getElementById('cendric-hero-img-box')?.remove();
        document.getElementById('cendric-auth-security-strip')?.remove();
      }
    }
    scheduleCheckAndEnhance();
  }).observe(document.body, { childList: true, subtree: true });

  // Hook pushState & replaceState so SPA route changes trigger immediate cleanup & enhancement
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    const ret = origPushState.apply(this, args);
    handleRouteChange();
    return ret;
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const ret = origReplaceState.apply(this, args);
    handleRouteChange();
    return ret;
  };

  function handleRouteChange() {
    const url = location.href;
    lastUrl = url;
    if (!url.includes('/admin')) {
      document.getElementById('cendric-admin-container')?.remove();
      document.getElementById('cendric-admin-denied')?.remove();
      const main = document.querySelector('main');
      if (main && !url.includes('/chat')) {
        Array.from(main.children).forEach(el => {
          if (el.getAttribute('data-cendric-hidden') === 'true') {
            el.removeAttribute('data-cendric-hidden');
            el.style.display = '';
          }
        });
      }
    }
    if (!url.includes('/chat')) {
      document.getElementById('cendric-chat-overlay')?.remove();
      document.getElementById('cendric-chat-prompt-chips')?.remove();
      const main = document.querySelector('main');
      if (main) {
        Array.from(main.children).forEach(el => {
          if (el.getAttribute('data-cendric-hidden') === 'true') {
            el.removeAttribute('data-cendric-hidden');
            el.style.display = '';
          }
        });
      }
    }
    if (!url.includes('/transactions')) {
      document.getElementById('cendric-analytics-card')?.remove();
      document.getElementById('cendric-subs-card')?.remove();
      document.getElementById('cendric-export-btn')?.remove();
      document.getElementById('cendric-header-wrapper')?.remove();
    }
    if (!url.includes('/settings')) {
      document.getElementById('cendric-currency-conversion-banner')?.remove();
      document.getElementById('cendric-live-rates-bar')?.remove();
    }
    if (!url.includes('/login')) {
      document.body.classList.remove('cendric-auth-active');
      document.getElementById('cendric-form-badge')?.remove();
      document.getElementById('cendric-card-header-bar')?.remove();
      document.getElementById('cendric-demo-helper')?.remove();
      document.getElementById('cendric-auth-hero-badge')?.remove();
      document.getElementById('cendric-hero-img-box')?.remove();
      document.getElementById('cendric-auth-security-strip')?.remove();
    }
    scheduleCheckAndEnhance();
  }

  // ----------------------------------------------------
  // 13. Mobile Navigation & Responsive Drawer Controller
  // ----------------------------------------------------
  function setupMobileDrawer() {
    const aside = document.querySelector('aside');
    if (!aside) return;

    // 1. Create or ensure Fullscreen Backdrop
    let backdrop = document.getElementById('cendric-sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'cendric-sidebar-backdrop';
      backdrop.className = 'cendric-sidebar-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', () => {
        closeMobileSidebar();
      });
      backdrop.addEventListener('touchstart', () => {
        closeMobileSidebar();
      }, { passive: true });
    }

    // 2. Create or ensure Mobile Hamburger Toggle Button (Top-Left on Mobile)
    let toggleBtn = document.getElementById('cendric-mobile-toggle-btn');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'cendric-mobile-toggle-btn';
      toggleBtn.className = 'cendric-mobile-toggle-btn';
      toggleBtn.type = 'button';
      toggleBtn.setAttribute('aria-label', 'Toggle Navigation Menu');
      toggleBtn.title = 'Open Menu / வழிசெலுத்தல் / මෙනුව';
      toggleBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
      document.body.appendChild(toggleBtn);
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMobileSidebar();
      });
    }

    // 3. Create or ensure Mobile Close Button inside Sidebar Header
    let closeBtn = document.getElementById('cendric-sidebar-close-btn');
    const sidebarHeader = aside.firstElementChild;
    if (sidebarHeader && !closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.id = 'cendric-sidebar-close-btn';
      closeBtn.className = 'cendric-sidebar-close-btn';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close Menu');
      closeBtn.title = 'Close Menu';
      closeBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      sidebarHeader.style.position = 'relative';
      sidebarHeader.appendChild(closeBtn);
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileSidebar();
      });
    }
  }

  function openMobileSidebar() {
    const aside = document.querySelector('aside');
    const backdrop = document.getElementById('cendric-sidebar-backdrop');
    const toggleBtn = document.getElementById('cendric-mobile-toggle-btn');
    if (aside) aside.classList.add('cendric-sidebar-open');
    if (backdrop) backdrop.classList.add('cendric-backdrop-active');
    if (toggleBtn) toggleBtn.classList.add('active');
    document.body.classList.add('cendric-drawer-open');
  }

  function closeMobileSidebar() {
    const aside = document.querySelector('aside');
    const backdrop = document.getElementById('cendric-sidebar-backdrop');
    const toggleBtn = document.getElementById('cendric-mobile-toggle-btn');
    if (aside) aside.classList.remove('cendric-sidebar-open');
    if (backdrop) backdrop.classList.remove('cendric-backdrop-active');
    if (toggleBtn) toggleBtn.classList.remove('active');
    document.body.classList.remove('cendric-drawer-open');
  }

  function toggleMobileSidebar() {
    const aside = document.querySelector('aside');
    if (aside && aside.classList.contains('cendric-sidebar-open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  }

  // Global click delegator for sidebar nav links & financial tools to guarantee 100% reliable opening
  document.addEventListener('click', (e) => {
    // Automatically close mobile drawer when any link or tool is selected
    if (window.innerWidth <= 900) {
      if (e.target.closest('aside nav a, aside .cendric-custom-nav-link, aside button:not(#cendric-wallet-btn)')) {
        closeMobileSidebar();
      }
    }

    // 1. Financial Tools & Admin Modal triggers
    const taxBtn = e.target.closest('#cendric-nav-tax, [data-cendric-tool="tax"]');
    if (taxBtn) {
      e.preventDefault();
      e.stopPropagation();
      openTaxCalculatorModal();
      return;
    }

    const invBtn = e.target.closest('#cendric-nav-invoice, [data-cendric-tool="invoice"]');
    if (invBtn) {
      e.preventDefault();
      e.stopPropagation();
      openInvoiceModal();
      return;
    }

    const billBtn = e.target.closest('#cendric-nav-camera-bill, [data-cendric-tool="scanner"]');
    if (billBtn) {
      e.preventDefault();
      e.stopPropagation();
      openBillScannerModal();
      return;
    }

    const ocrBtn = e.target.closest('#cendric-nav-ocr, [data-cendric-tool="ocr"]');
    if (ocrBtn) {
      e.preventDefault();
      e.stopPropagation();
      openCsvImporterModal();
      return;
    }

    const adminBtn = e.target.closest('#cendric-nav-admin');
    if (adminBtn) {
      e.preventDefault();
      e.stopPropagation();
      history.pushState({}, '', '/admin');
      handleRouteChange();
      return;
    }

    // 2. Standard SPA navigation
    const link = e.target.closest('aside a[href], aside nav a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && href !== location.pathname) {
        // Clean up chat overlay immediately on sidebar link click
        if (!href.includes('/chat')) {
          document.getElementById('cendric-chat-overlay')?.remove();
          document.getElementById('cendric-chat-prompt-chips')?.remove();
          const main = document.querySelector('main');
          if (main) {
            Array.from(main.children).forEach(el => {
              if (el.getAttribute('data-cendric-hidden') === 'true') {
                el.removeAttribute('data-cendric-hidden');
                el.style.display = '';
              }
            });
          }
        }
      }
    }
  }, true);

  // Close modals & mobile drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileSidebar();
      ['cendric-tax-modal', 'cendric-invoice-modal', 'cendric-csv-modal', 'cendric-bill-modal'].forEach(id => {
        const m = document.getElementById(id);
        if (m) {
          m.classList.remove('cendric-active');
          m.style.setProperty('display', 'none', 'important');
        }
      });
      stopCamera();
    }
  });

  // Automatically dismiss mobile drawer when screen is resized to desktop width
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      closeMobileSidebar();
    }
  });

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('DOMContentLoaded', scheduleCheckAndEnhance);
  scheduleCheckAndEnhance();

})();
