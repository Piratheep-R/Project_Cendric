const ragService = require('../services/ragService');

function getTaxLaws(req, res) {
  try {
    const { q } = req.query;
    if (q) {
      return res.json(ragService.retrieveRelevantLaws(q, 5));
    }
    res.json(ragService.documents);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve tax laws.' });
  }
}

function calculateTax(req, res) {
  try {
    const { grossIncome, allowableDeductions } = req.body;
    const calc = ragService.calculateSriLankanTax(grossIncome, allowableDeductions);
    res.json(calc);
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate tax.' });
  }
}

module.exports = {
  getTaxLaws,
  calculateTax
};
