const currencyService = require('../services/currencyService');

function normalizeCurrency(c) {
  return currencyService.normalizeCurrency(c);
}

function convertAmount(amount, fromCurr, toCurr, baseUSD = null) {
  return currencyService.convert(amount, fromCurr, toCurr, baseUSD);
}

function getRates(req, res) {
  res.json(currencyService.getRates());
}

async function refreshRates(req, res) {
  try {
    const updated = await currencyService.fetchLiveRates();
    res.json({ success: true, ...updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to refresh live exchange rates: ' + err.message });
  }
}

function convertCurrency(req, res) {
  const { amount, from, to } = req.query;
  const numAmt = Number(amount) || 0;
  const fromNorm = normalizeCurrency(from || 'USD');
  const toNorm = normalizeCurrency(to || 'LKR');
  const converted = convertAmount(numAmt, fromNorm, toNorm);
  const rate = currencyService.getCrossRate(fromNorm, toNorm);

  res.json({
    amount: numAmt,
    from: fromNorm,
    to: toNorm,
    converted,
    rate: Number(rate.toFixed(4)),
    lastUpdated: currencyService.lastUpdated,
    source: currencyService.source
  });
}

module.exports = {
  getRates,
  refreshRates,
  convertCurrency
};
