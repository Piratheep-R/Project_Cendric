/**
 * REAL-TIME CURRENCY EXCHANGE RATE SERVICE
 * For Cendric Personal Finance Assistant
 * 
 * Features:
 * - Real-time exchange rate sync for USD, LKR, EUR, GBP, INR, AUD, CAD
 * - Dual API redundancy: open.er-api.com (primary) & api.exchangerate-api.com (fallback)
 * - Auto-refresh interval (every 30 minutes) + on-demand manual sync
 * - Persistent disk caching to withstand network downtime
 * - Drift-free proportional value conversion
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/cached_exchange_rates.json');

// Default fallback matrix if offline on initial cold start
const DEFAULT_RATES = {
  USD: 1.0,
  LKR: 300.0,
  EUR: 0.92,
  GBP: 0.77,
  INR: 86.0,
  AUD: 1.54,
  CAD: 1.38
};

const SUPPORTED_CURRENCIES = ['USD', 'LKR', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

class CurrencyService {
  constructor() {
    this.rates = { ...DEFAULT_RATES };
    this.lastUpdated = null;
    this.source = 'Default Fallback';
    this.isLive = false;
    this.timer = null;

    // Load any previously cached rates from disk
    this.loadFromCache();
  }

  normalizeCurrency(c) {
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

  loadFromCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        if (data && data.rates) {
          this.rates = { ...DEFAULT_RATES, ...data.rates };
          this.lastUpdated = data.lastUpdated || null;
          this.source = data.source || 'Disk Cache';
          this.isLive = true;
          console.log(`[Currency Service] Loaded cached exchange rates (Updated: ${this.lastUpdated}).`);
        }
      }
    } catch (err) {
      console.warn('[Currency Service] Could not load rate cache:', err.message);
    }
  }

  saveToCache() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        rates: this.rates,
        lastUpdated: this.lastUpdated,
        source: this.source
      }, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Currency Service] Could not write rate cache:', err.message);
    }
  }

  fetchJson(url, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP status ${res.statusCode} from ${url}`));
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`Timeout connecting to ${url}`));
      });
    });
  }

  async fetchLiveRates() {
    console.log('[Currency Service] Fetching real-time foreign exchange rates...');

    // Try Primary: open.er-api.com
    try {
      const data = await this.fetchJson('https://open.er-api.com/v6/latest/USD');
      if (data && data.rates) {
        this.applyApiRates(data.rates, 'Open Exchange Rates API (open.er-api.com)');
        return this.getRates();
      }
    } catch (primaryErr) {
      console.warn('[Currency Service] Primary API failed, trying fallback:', primaryErr.message);
    }

    // Try Fallback: api.exchangerate-api.com
    try {
      const data = await this.fetchJson('https://api.exchangerate-api.com/v4/latest/USD');
      if (data && data.rates) {
        this.applyApiRates(data.rates, 'ExchangeRate-API (api.exchangerate-api.com)');
        return this.getRates();
      }
    } catch (fallbackErr) {
      console.error('[Currency Service] Both currency APIs failed:', fallbackErr.message);
    }

    // Retain current rates if network fetch fails
    return this.getRates();
  }

  applyApiRates(rawRates, sourceName) {
    const updated = { USD: 1.0 };
    SUPPORTED_CURRENCIES.forEach(code => {
      if (rawRates[code] && !isNaN(rawRates[code])) {
        updated[code] = Number(rawRates[code]);
      } else {
        updated[code] = this.rates[code] || DEFAULT_RATES[code];
      }
    });

    this.rates = updated;
    this.lastUpdated = new Date().toISOString();
    this.source = sourceName;
    this.isLive = true;

    this.saveToCache();
    console.log(`[Currency Service] Live exchange rates synchronized from ${sourceName}. (1 USD = ${this.rates.LKR.toFixed(2)} LKR)`);
  }

  startAutoRefresh(intervalMs = 30 * 60 * 1000) {
    // Initial fetch on start
    this.fetchLiveRates().catch(() => {});

    // Recurring sync interval (default 30 mins)
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.fetchLiveRates().catch(err => console.warn('[Currency Service] Periodic refresh error:', err.message));
    }, intervalMs);
  }

  stopAutoRefresh() {
    if (this.timer) clearInterval(this.timer);
  }

  getRates() {
    return {
      base: 'USD',
      rates: { ...this.rates },
      lastUpdated: this.lastUpdated,
      isLive: this.isLive,
      source: this.source,
      supported: [...SUPPORTED_CURRENCIES]
    };
  }

  getRateFor(currency) {
    const norm = this.normalizeCurrency(currency);
    return this.rates[norm] || 1.0;
  }

  convert(amount, fromCurr, toCurr, baseUSD = null) {
    const fromNorm = this.normalizeCurrency(fromCurr);
    const toNorm = this.normalizeCurrency(toCurr);
    const num = Number(amount);
    if (isNaN(num) || num === 0) return 0;
    if (fromNorm === toNorm) return num;

    const rateFrom = this.rates[fromNorm] || 1.0;
    const rateTo = this.rates[toNorm] || 1.0;

    // If baseUSD is provided and positive, use it directly to eliminate multi-hop rounding drift
    const validBaseUSD = (baseUSD !== null && baseUSD !== undefined && !isNaN(baseUSD) && Number(baseUSD) > 0)
      ? Number(baseUSD)
      : (num / rateFrom);
    const converted = validBaseUSD * rateTo;

    // Formatting / rounding:
    // Whole numbers for LKR and INR
    if (toNorm === 'LKR' || toNorm === 'INR') {
      return Math.round(converted);
    }
    // 2 decimals for USD, EUR, GBP, AUD, CAD
    return Math.round(converted * 100) / 100;
  }

  getCrossRate(fromCurr, toCurr) {
    const fromNorm = this.normalizeCurrency(fromCurr);
    const toNorm = this.normalizeCurrency(toCurr);
    if (fromNorm === toNorm) return 1.0;
    const rateFrom = this.rates[fromNorm] || 1.0;
    const rateTo = this.rates[toNorm] || 1.0;
    return rateTo / rateFrom;
  }
}

module.exports = new CurrencyService();
