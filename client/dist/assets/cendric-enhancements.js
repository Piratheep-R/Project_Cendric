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

      if (!document.getElementById('cendric-tax-calc-btn')) {
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
    const overlay = document.createElement('div');
    overlay.id = 'cendric-chat-overlay';
    overlay.innerHTML = `
      <div class="cendric-chat-header">
        <div class="cendric-chat-title-group">
          <div class="cendric-chat-avatar-icon">🤖</div>
          <div>
            <div class="cendric-chat-name">Cendric AI</div>
            <div class="cendric-chat-status" id="cc-status">
              <span class="cc-status-dot"></span> Online · Real-time streaming
            </div>
          </div>
        </div>
        <div class="cendric-chat-header-actions">
          <button class="cc-header-btn cc-btn-new" id="cc-new-chat-btn" title="Start a fresh conversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>New Chat</span>
          </button>
          <button class="cc-header-btn cc-btn-clear" id="cc-clear-btn" title="Clear conversation history">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div class="cendric-chat-messages" id="cc-messages">
        <div class="cc-msg cc-msg-assistant cc-welcome" id="cc-welcome">
          <div class="cc-bubble">
            <p>👋 Hi! I'm <strong>Cendric</strong>, your real-time finance AI. I have full context of your transactions, budgets, and live exchange rates.</p>
            <p style="margin-top:8px; font-size:12.5px; opacity:0.8;">Ask me anything — I'll respond word by word as I think.</p>
          </div>
          <div class="cc-followups" id="cc-welcome-chips">
            <button class="cc-chip" data-q="What's my current net balance?">💼 Net balance</button>
            <button class="cc-chip" data-q="Show my top spending categories">📊 Spending breakdown</button>
            <button class="cc-chip" data-q="What's the USD to LKR rate today?">💱 Exchange rates</button>
            <button class="cc-chip" data-q="What are the IRD tax filing deadlines?">📅 Tax deadlines</button>
            <button class="cc-chip" data-q="Give me financial tips for freelancers">💡 Finance tips</button>
          </div>
        </div>
      </div>

      <div class="cendric-chat-input-area">
        <div class="cc-prompt-chips-bar" id="cc-prompt-bar">
          <button class="cc-prompt-pill" data-q="Do I pay tax on Upwork USD in Sri Lanka?">🇱🇰 Upwork tax</button>
          <button class="cc-prompt-pill" data-q="Calculate my APIT on LKR 3,600,000 income">🧮 APIT calculator</button>
          <button class="cc-prompt-pill" data-q="What freelance expenses can I deduct?">📋 Deductions</button>
          <button class="cc-prompt-pill" data-q="How do I register for TIN?">🆔 TIN registration</button>
          <button class="cc-prompt-pill" data-q="What's my burn rate this month?">🔥 Burn rate</button>
        </div>
        <div class="cc-input-row">
          <button class="cc-voice-btn" id="cc-voice-btn" title="Voice input (hold to speak)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <textarea id="cc-input" placeholder="Ask anything about your finances…" rows="1" maxlength="2000"></textarea>
          <button class="cc-send-btn" id="cc-send-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="cc-input-hint">Enter to send · Shift+Enter for new line · 🎤 for voice</div>
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
      msgs.innerHTML = `
        <div class="cc-msg cc-msg-assistant cc-welcome" id="cc-welcome">
          <div class="cc-bubble">
            <p>${msgText || `👋 Hi! I'm <strong>Cendric</strong>, your real-time finance AI. I have full context of your transactions, budgets, and live exchange rates.`}</p>
            <p style="margin-top:8px; font-size:12.5px; opacity:0.8;">Ask me anything — I'll respond word by word as I think.</p>
          </div>
          <div class="cc-followups" id="cc-welcome-chips">
            <button class="cc-chip" data-q="What's my current net balance?">💼 Net balance</button>
            <button class="cc-chip" data-q="Show my top spending categories">📊 Spending breakdown</button>
            <button class="cc-chip" data-q="What's the USD to LKR rate today?">💱 Exchange rates</button>
            <button class="cc-chip" data-q="What are the IRD tax filing deadlines?">📅 Tax deadlines</button>
            <button class="cc-chip" data-q="Give me financial tips for freelancers">💡 Finance tips</button>
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
        resetToWelcome(`✨ <strong>New conversation started.</strong> How can I assist you with your finances today?`);
        showToast('✨ Started a new chat session');
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
        resetToWelcome(`🗑️ <strong>Chat history cleared.</strong> Ready for your next question!`);
        showToast('🗑️ Chat history cleared');
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
    if (status) status.innerHTML = '<span class="cc-status-dot cc-status-thinking"></span> Thinking…';

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
        body: JSON.stringify({ question, history: _chatHistory.slice(-12) })
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
    if (status) status.innerHTML = '<span class="cc-status-dot"></span> Online · Real-time streaming';
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
    recognition.lang = 'en-US';
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
  // 6. Navigation Tooltips & Responsive Observers
  // ----------------------------------------------------
  // 6. Navigation Tooltips & Responsive Observers
  // ----------------------------------------------------
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

    // Load live rates silently (for tile badges only)
    const ratesData = await fetchLiveRates();

    // Update each currency tile with live rate badge (no extra banners)
    updateTileBadges(currencyGrid, ratesData);
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
    modal.style.setProperty('display', 'flex', 'important');
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
    modal.style.setProperty('display', 'flex', 'important');
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
    modal.style.setProperty('display', 'flex', 'important');
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
  // 11. Proactive Notification Center
  // ----------------------------------------------------
  let cachedNotifications = [];

  function setupNotificationCenter() {
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

    document.body.appendChild(bellBtn);

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

    document.body.appendChild(panel);

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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
  // Safe Debounced Enhancement Orchestrator
  // ----------------------------------------------------
  let isEnhancing = false;
  let enhanceDebounceTimer = null;

  async function checkAndEnhance() {
    if (isEnhancing) return;
    isEnhancing = true;
    try {
      enhanceNavTooltips();
      await enhanceTransactionsPage();
      enhanceChatPage();
      await enhanceSettingsPage();
      setupCommandPalette();
      setupTaxCalculatorModal();
      setupInvoiceModal();
      setupCsvImporterModal();
      setupNotificationCenter();
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
    scheduleCheckAndEnhance();
  }

  // Global click delegator for sidebar nav links to guarantee routing
  document.addEventListener('click', (e) => {
    const link = e.target.closest('aside a[href], aside nav a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href !== location.pathname) {
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

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('DOMContentLoaded', scheduleCheckAndEnhance);
  scheduleCheckAndEnhance();

})();
