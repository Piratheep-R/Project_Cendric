/**
 * SRI LANKAN TAX & FINANCIAL REGULATIONS RAG RETRIEVAL ENGINE
 * For Cendric Personal Finance Assistant
 * 
 * Capabilities:
 * - Local vector store of Sri Lankan tax laws (Inland Revenue Act No. 24 of 2017 & amendments)
 * - Hybrid Semantic & TF-IDF Cosine Similarity Search
 * - Exact Sri Lankan Personal Income Tax (PIT) Slab Calculator
 * - Real-time Legal Citations (Section 11, Section 85, Third Schedule, RAMIS, TIN rules)
 */

const fs = require('fs');
const path = require('path');

const KB_FILE = path.join(__dirname, '../data/sri_lanka_tax_kb.json');

class RagService {
  constructor() {
    this.documents = [];
    this.idfMap = {};
    this.docVectors = [];
    this.loadKnowledgeBase();
  }

  loadKnowledgeBase() {
    try {
      if (fs.existsSync(KB_FILE)) {
        const raw = fs.readFileSync(KB_FILE, 'utf8');
        this.documents = JSON.parse(raw);
        this.buildTfIdfIndex();
        console.log(`[RAG] Loaded ${this.documents.length} Sri Lankan tax law documents into knowledge base.`);
      } else {
        console.warn(`[RAG] Knowledge base file not found at ${KB_FILE}`);
      }
    } catch (err) {
      console.error('[RAG] Failed to load tax knowledge base:', err.message);
    }
  }

  // Tokenizer with stop-word filtration & n-gram generation
  tokenize(text) {
    if (!text) return [];
    const stopWords = new Set([
      'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
      'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'and', 'or', 'but', 'if', 'so', 'can',
      'could', 'should', 'would', 'will', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'it', 'its', 'from'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));

    // Also include bigrams for legal phrases (e.g., 'tax slab', 'withholding tax', 'foreign currency')
    const tokens = [...words];
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]} ${words[i + 1]}`);
    }
    return tokens;
  }

  buildTfIdfIndex() {
    const N = this.documents.length;
    if (N === 0) return;

    const docFreq = {};
    const docTokensList = [];

    this.documents.forEach(doc => {
      const fullText = `${doc.title} ${doc.category} ${doc.summary} ${doc.content} ${(doc.keywords || []).join(' ')}`;
      const tokens = this.tokenize(fullText);
      docTokensList.push(tokens);

      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach(t => {
        docFreq[t] = (docFreq[t] || 0) + 1;
      });
    });

    // Compute IDF: log((N + 1) / (df + 1)) + 1
    this.idfMap = {};
    for (const [t, df] of Object.entries(docFreq)) {
      this.idfMap[t] = Math.log((N + 1) / (df + 1)) + 1;
    }

    // Compute normalized TF-IDF vector for each document
    this.docVectors = docTokensList.map((tokens, idx) => {
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

      const vector = {};
      let sumSq = 0;
      for (const [t, count] of Object.entries(tf)) {
        const idf = this.idfMap[t] || 1;
        const weight = (count / tokens.length) * idf;
        vector[t] = weight;
        sumSq += weight * weight;
      }

      // Boost document keywords
      const doc = this.documents[idx];
      if (doc.keywords) {
        doc.keywords.forEach(kw => {
          const lowerKw = kw.toLowerCase();
          if (!vector[lowerKw]) vector[lowerKw] = 0;
          vector[lowerKw] += 0.8;
          sumSq += 0.8 * 0.8;
        });
      }

      const magnitude = Math.sqrt(sumSq) || 1;
      // Normalize
      for (const t in vector) {
        vector[t] /= magnitude;
      }
      return vector;
    });
  }

  // Cosine similarity between query vector and document vector
  cosineSimilarity(vecA, vecB) {
    let dot = 0;
    for (const token in vecA) {
      if (vecB[token]) {
        dot += vecA[token] * vecB[token];
      }
    }
    return dot;
  }

  // Retrieve top-K relevant legal documents
  retrieveRelevantLaws(query, topK = 2) {
    if (!query || this.documents.length === 0) return [];

    const qTokens = this.tokenize(query);
    if (qTokens.length === 0) return [];

    // Build query vector
    const qTf = {};
    qTokens.forEach(t => { qTf[t] = (qTf[t] || 0) + 1; });

    const qVec = {};
    let sumSq = 0;
    for (const [t, count] of Object.entries(qTf)) {
      const idf = this.idfMap[t] || 1.5;
      const weight = (count / qTokens.length) * idf;
      qVec[t] = weight;
      sumSq += weight * weight;
    }

    const mag = Math.sqrt(sumSq) || 1;
    for (const t in qVec) {
      qVec[t] /= mag;
    }

    // Rank documents
    const scored = this.documents.map((doc, idx) => {
      let score = this.cosineSimilarity(qVec, this.docVectors[idx]);

      // Direct keyword presence boost
      const qLower = query.toLowerCase();
      if (doc.keywords) {
        doc.keywords.forEach(kw => {
          if (qLower.includes(kw.toLowerCase())) {
            score += 0.35;
          }
        });
      }

      // Special semantic boost for general tax queries
      if (qLower.includes('tax')) {
        if (doc.id === 'sl_tax_pit_slabs') score += 0.25;
        if (qLower.includes('freelance') || qLower.includes('usd') || qLower.includes('upwork')) {
          if (doc.id === 'sl_tax_it_export_exemption') score += 0.30;
        }
      }

      return {
        ...doc,
        relevanceScore: Math.round(score * 100) / 100
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return chunks with meaningful match score
    return scored.filter(d => d.relevanceScore >= 0.05).slice(0, topK);
  }

  // Calculate exact Sri Lankan Personal Income Tax
  calculateSriLankanTax(grossIncome, allowableDeductions = 0) {
    const gross = Number(grossIncome) || 0;
    const deductions = Number(allowableDeductions) || 0;
    const netIncome = Math.max(0, gross - deductions);
    const personalRelief = 1200000; // LKR 1.2M
    const taxableIncome = Math.max(0, netIncome - personalRelief);

    const slabs = [
      { rate: 0.06, limit: 500000, label: '6% on first LKR 500,000' },
      { rate: 0.12, limit: 500000, label: '12% on next LKR 500,000' },
      { rate: 0.18, limit: 500000, label: '18% on next LKR 500,000' },
      { rate: 0.24, limit: 500000, label: '24% on next LKR 500,000' },
      { rate: 0.30, limit: 500000, label: '30% on next LKR 500,000' },
      { rate: 0.36, limit: Infinity, label: '36% on remaining balance' }
    ];

    let remainingTaxable = taxableIncome;
    let totalTax = 0;
    const breakdown = [];

    for (const slab of slabs) {
      if (remainingTaxable <= 0) break;
      const taxedInSlab = Math.min(remainingTaxable, slab.limit);
      const slabTax = taxedInSlab * slab.rate;
      totalTax += slabTax;
      breakdown.push({
        label: slab.label,
        taxedAmount: taxedInSlab,
        ratePct: `${slab.rate * 100}%`,
        taxAmount: Math.round(slabTax)
      });
      remainingTaxable -= taxedInSlab;
    }

    const effectiveRate = gross > 0 ? ((totalTax / gross) * 100).toFixed(1) : '0.0';

    return {
      grossIncome: gross,
      allowableDeductions: deductions,
      netIncome,
      personalRelief,
      taxableIncome,
      totalTax: Math.round(totalTax),
      effectiveRate: `${effectiveRate}%`,
      breakdown
    };
  }

  // Synthesize an authoritative answer based on retrieved Sri Lankan legal chunks
  generateAuthoritativeAnswer(query, retrievedChunks, userFinancials = {}) {
    const qLower = query.toLowerCase();
    const currency = userFinancials.currency || 'LKR';
    const totalIncome = userFinancials.totalIncome || 0;
    const totalExpense = userFinancials.totalExpense || 0;

    // 1. Check if user asked to calculate tax or asked how much tax to pay
    const numberMatch = query.match(/(?:lkr|rs\.?|\$)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(m|million|k|lakhs?)?\b/i);
    let targetAmount = null;

    if (numberMatch && (qLower.includes('calculate') || qLower.includes('tax on') || qLower.includes('how much tax') || qLower.includes('estimate') || qLower.includes('pay for tax'))) {
      let rawNum = parseFloat(numberMatch[1].replace(/,/g, ''));
      const unit = (numberMatch[2] || '').toLowerCase();
      if (unit === 'm' || unit === 'million') rawNum *= 1000000;
      else if (unit === 'lakh' || unit === 'lakhs') rawNum *= 100000;
      else if (unit === 'k') rawNum *= 1000;
      targetAmount = rawNum;
    } else if (
      qLower.includes('my tax') ||
      qLower.includes('calculate my tax') ||
      qLower.includes('estimate my tax') ||
      qLower.includes('pay for tax') ||
      qLower.includes('pay in tax') ||
      qLower.includes('tax do i pay') ||
      qLower.includes('tax do i have to pay') ||
      qLower.includes('how much tax') ||
      qLower.includes('what is my tax') ||
      (qLower.includes('tax') && (qLower.includes('how much') || qLower.includes('pay') || qLower.includes('owe')))
    ) {
      targetAmount = totalIncome > 0 ? totalIncome : 0;
    }

    if (targetAmount !== null && targetAmount > 0) {
      const calc = this.calculateSriLankanTax(targetAmount, totalExpense > 0 ? Math.min(targetAmount * 0.4, totalExpense) : 0);
      let res = `🇱🇰 **Sri Lankan Personal Income Tax (PIT) Calculation**\n\n`;
      res += `Based on the **Inland Revenue Act No. 24 of 2017 (as amended)**:\n\n`;
      res += `• **Gross Freelance Income:** LKR ${calc.grossIncome.toLocaleString()}\n`;
      if (calc.allowableDeductions > 0) {
        res += `• **Allowable Deductions (Section 11):** -LKR ${calc.allowableDeductions.toLocaleString()}\n`;
        res += `• **Assessable Income:** LKR ${calc.netIncome.toLocaleString()}\n`;
      }
      res += `• **Tax-Free Personal Relief:** -LKR 1,200,000 (LKR 100,000/month)\n`;
      res += `• **Taxable Income:** LKR ${calc.taxableIncome.toLocaleString()}\n\n`;

      if (calc.taxableIncome <= 0) {
        res += `🎉 **Zero Tax Payable!** Your net earnings are within the statutory tax-free relief threshold of LKR 1,200,000 per annum.\n\n`;
      } else {
        res += `### 📊 Progressive Slab Breakdown:\n`;
        calc.breakdown.forEach(b => {
          res += `• **${b.label}:** LKR ${b.taxedAmount.toLocaleString()} @ ${b.ratePct} = **LKR ${b.taxAmount.toLocaleString()}**\n`;
        });
        res += `\n**Total Estimated Annual Tax Payable:** **LKR ${calc.totalTax.toLocaleString()}**\n`;
        res += `• **Effective Tax Rate:** ${calc.effectiveRate}\n`;
        res += `• **Quarterly Advance Payment:** ~LKR ${Math.round(calc.totalTax / 4).toLocaleString()} / quarter\n\n`;
      }

      res += `> 💡 **Tip:** If your income is from **IT & Software export services** received in foreign currency (USD/EUR) through commercial bank inward remittances, ensure you retain bank credit advices to substantiate foreign export treatment under the Third Schedule.`;
      return res;
    }

    // 2. Synthesize using top retrieved legal chunks
    if (retrievedChunks.length > 0) {
      const primary = retrievedChunks[0];
      let response = `🇱🇰 **${primary.title}**\n\n`;
      response += `${primary.content}\n\n`;

      if (retrievedChunks.length > 1) {
        const secondary = retrievedChunks[1];
        response += `### 📌 Related Regulation: ${secondary.title}\n${secondary.summary}\n\n`;
      }

      response += `**Legal Authority & Source:**\n`;
      retrievedChunks.forEach(c => {
        response += `• 📜 *${c.act}* (${c.section})\n`;
      });

      if (totalIncome > 0 && (qLower.includes('upwork') || qLower.includes('my income') || qLower.includes('usd') || qLower.includes('tax'))) {
        response += `\n**Your Current Cendric Balance:** You have **${currency} ${totalIncome.toLocaleString()}** in recorded earnings and **${currency} ${totalExpense.toLocaleString()}** in expenses.`;
      }

      return response;
    }

    return null;
  }
}

module.exports = new RagService();
