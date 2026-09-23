const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Chat, Transaction } = require('../models');
const { isMongoDBConnected } = require('../config/db');
const { db, saveDB } = require('../utils/localDB');
const ragService = require('../services/ragService');
const currencyService = require('../services/currencyService');
const { toUserQuery } = require('../utils/dbHelper');

// Helper: generate contextual follow-up question suggestions
function generateFollowUps(question, answer, lang = 'en') {
  if (lang === 'ta') {
    return [
      'எனது நிகர இருப்பு என்ன?',
      'வரி விலக்குகளை எவ்வாறு பெறுவது?',
      'எனது முக்கிய செலவு வகைகளைக் காட்டு'
    ];
  }
  if (lang === 'si') {
    return [
      'මගේ ශුද්ධ ශේෂය කුමක්ද?',
      'බදු සහන ලබා ගන්නේ කෙසේද?',
      'මගේ ප්‍රධාන වියදම් කාණ්ඩ පෙන්වන්න'
    ];
  }
  const q = (question || '').toLowerCase();
  if (q.includes('balance') || q.includes('net') || q.includes('savings')) {
    return ['What are my biggest expenses?', 'How can I improve my savings?', 'Show spending by category'];
  }
  if (q.includes('tax') || q.includes('apit') || q.includes('ird') || q.includes('income tax')) {
    return ['When is the APIT filing deadline?', 'Are Upwork earnings taxable in Sri Lanka?', 'How do I get a TIN number?'];
  }
  if (q.includes('expense') || q.includes('spend') || q.includes('spent') || q.includes('cost')) {
    return ["What's my current net balance?", 'How much income did I earn?', 'Am I over my monthly budget?'];
  }
  if (q.includes('budget')) {
    return ["What's my daily burn rate?", 'Top 3 spending categories?', 'How much is remaining in budget?'];
  }
  if (q.includes('currency') || q.includes('exchange') || q.includes('usd') || q.includes('dollar')) {
    return ['What is my total USD income?', 'Calculate LKR equivalent of EUR 1000', 'Are foreign earnings fully exempt?'];
  }
  if (q.includes('invoice') || q.includes('client') || q.includes('payment')) {
    return ['How do I record this as income?', 'What tax applies to client invoices?', 'Show my recent transactions'];
  }
  return ["What's my net balance?", 'Give me financial tips', 'Show my expense breakdown'];
}

async function streamChat(req, res) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => {
    if (!res.destroyed) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { question, history = [], languagePreference } = req.body;
    if (!question?.trim()) {
      sendEvent({ type: 'error', message: 'Please enter a question.' });
      return res.end();
    }

    const q = question.trim();
    const userLang = languagePreference || req.user.languagePreference || 'en';

    // Build financial context
    let userTx = [];
    if (isMongoDBConnected()) {
      userTx = await Transaction.find({ userId: toUserQuery(req.user._id) }).lean();
    } else {
      userTx = db.transactions.filter(t => String(t.userId) === String(req.user._id));
    }

    const totalIncome  = userTx.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalExpense = userTx.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const netBalance   = totalIncome - totalExpense;
    const currency     = req.user.currencyPreference || 'LKR';
    const categoryTotals = {};
    userTx.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (Number(t.amount) || 0);
    });

    const retrievedLaws = ragService.retrieveRelevantLaws(q, 2);

    // Helper: stream text word-by-word (rule-based fallback)
    async function streamWords(text) {
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (res.destroyed) break;
        sendEvent({ type: 'token', token: part });
        await new Promise(r => setTimeout(r, 30));
      }
    }

    // Helper: save to DB
    async function saveToChatHistory(userQ, assistantAns) {
      const newMessages = [
        { role: 'user', content: userQ, timestamp: new Date() },
        { role: 'assistant', content: assistantAns, timestamp: new Date() }
      ];

      if (isMongoDBConnected()) {
        await Chat.findOneAndUpdate(
          { userId: toUserQuery(req.user._id) },
          {
            $setOnInsert: { sessionId: crypto.randomBytes(8).toString('hex') },
            $push: { messages: { $each: newMessages, $slice: -120 } }
          },
          { upsert: true }
        );
      }

      let userChat = db.chats.find(c => String(c.userId) === String(req.user._id));
      if (!userChat) {
        userChat = { userId: req.user._id, sessionId: crypto.randomBytes(8).toString('hex'), messages: [] };
        db.chats.push(userChat);
      }
      userChat.messages.push(...newMessages);
      if (userChat.messages.length > 120) userChat.messages = userChat.messages.slice(-120);
      saveDB();
    }

    // --- Try Gemini with real streaming ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.') || apiKey.length > 20)) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const targetModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        const model = genAI.getGenerativeModel({ model: targetModel });

        let ragContext = '';
        if (retrievedLaws.length > 0) {
          ragContext = '\nSRI LANKAN TAX & LEGAL CONTEXT:\n' +
            retrievedLaws.map(d => `[${d.title} – ${d.act} (${d.section})]:\n${d.content}`).join('\n\n') + '\n';
        }

        let langInstruction = '';
        if (userLang === 'ta') {
          langInstruction = '\nCRITICAL REQUIREMENT: The user has selected Sri Lankan Tamil (தமிழ்) as interface language. You MUST respond completely and fluently in Sri Lankan Tamil script (தமிழ்) with natural Tamil financial phrasing (வருமானம், செலவுகள், வரி, விலைப்பட்டியல், பட்ஜெட்), unless the user explicitly wrote the question in English.';
        } else if (userLang === 'si') {
          langInstruction = '\nCRITICAL REQUIREMENT: The user has selected Sri Lankan Sinhala (සිංහල) as interface language. You MUST respond completely and fluently in Sri Lankan Sinhala script (සිංහල) with natural Sinhala financial phrasing (ආදායම, වියදම්, බදු, ඉන්වොයිසි, අයවැය), unless the user explicitly wrote the question in English.';
        }

        const lr = currencyService.getRates().rates;
        const systemCtx = `You are Cendric, an elite personal finance AI for freelancers and professionals in Sri Lanka.
User: ${req.user.fullName} | Currency: ${currency}
Income: ${currency} ${totalIncome.toLocaleString()} | Expenses: ${currency} ${totalExpense.toLocaleString()} | Net Balance: ${currency} ${netBalance.toLocaleString()}
Expense categories: ${JSON.stringify(categoryTotals)}
Recent transactions (last 5): ${JSON.stringify(userTx.slice(-5))}
${ragContext}
Live exchange rates: 1 USD = ${lr.LKR?.toFixed(2)} LKR | 1 EUR = ${(lr.LKR/lr.EUR)?.toFixed(2)} LKR | 1 GBP = ${(lr.LKR/lr.GBP)?.toFixed(2)} LKR
${langInstruction}
Respond concisely with markdown formatting. Keep responses under 300 words.`;

        const geminiHistory = history.slice(-8).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const chat = model.startChat({
          history: [
            { role: 'user', parts: [{ text: systemCtx }] },
            { role: 'model', parts: [{ text: 'Understood. I am Cendric, ready to assist with your finances.' }] },
            ...geminiHistory
          ],
          generationConfig: { maxOutputTokens: 600 }
        });

        const result = await chat.sendMessageStream(q);
        let fullText = '';

        for await (const chunk of result.stream) {
          if (res.destroyed) break;
          const token = chunk.text();
          fullText += token;
          sendEvent({ type: 'token', token });
        }

        sendEvent({ type: 'suggestions', suggestions: generateFollowUps(q, fullText, userLang) });
        sendEvent({ type: 'done' });
        await saveToChatHistory(q, fullText);
        return res.end();
      } catch (gemErr) {
        console.warn('[Gemini Stream Warning]', gemErr.message);
      }
    }

    // --- Rule-based answer with simulated streaming ---
    let answer = '';

    if (retrievedLaws.length > 0) {
      const taxAns = ragService.generateAuthoritativeAnswer(q, retrievedLaws, { currency, totalIncome, totalExpense });
      if (taxAns) answer = taxAns;
    }

    if (!answer) {
      const r = currencyService.getRates().rates;
      const userName = (req.user.fullName || 'User').split(' ')[0];
      const topCats = Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,3);
      const qLow = q.toLowerCase();

      if (userLang === 'ta') {
        if (qLow.match(/மாற்று விகிதம்|rate|usd|exchange|டாலர்/)) {
          answer = `💱 **நேரடி நாணய மாற்று விகிதங்கள் (API நேரலை):**\n\n• **1 USD** = **${r.LKR?.toFixed(2)} LKR**\n• **1 EUR** = **${(r.LKR/r.EUR)?.toFixed(2)} LKR**\n• **1 GBP** = **${(r.LKR/r.GBP)?.toFixed(2)} LKR**\n• **1 INR** = **${(r.LKR/r.INR)?.toFixed(2)} LKR**\n• **1 AUD** = **${(r.LKR/r.AUD)?.toFixed(2)} LKR**\n\n*ஆதாரம்: Open Exchange Rates API · நேரலை*`;
        } else if (qLow.match(/செலவு|spend|expense|எவ்வளவு.*செலவு/)) {
          answer = `📊 **உங்கள் செலவு பகுப்பாய்வு:**\n\n• **மொத்த செலவுகள்:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} பரிவர்த்தனைகள்)\n• **மொத்த வருமானம்:** ${currency} ${totalIncome.toLocaleString()}\n• **நிகர இருப்பு:** ${currency} ${netBalance.toLocaleString()}\n\n**முக்கிய செலவு வகைகள்:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}`;
        } else if (qLow.match(/வரி|tax|apit|ird|வருமான வரி/)) {
          const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
          answer = `🇱🇰 **உங்கள் வருமானத்திற்கான இலங்கை வரி மதிப்பீடு:**\n\n• **மொத்த வருமானம்:** ${currency} ${totalIncome.toLocaleString()}\n• **அனுமதிக்கப்பட்ட கழிவுகள்:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n• **வரி இல்லாத தனிநபர் சலுகை:** -${currency} 1,200,000\n• **வரிக்குட்பட்ட வருமானம்:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n${calc.taxableIncome <= 0 ? '🎉 **வரி செலுத்த தேவையில்லை!** உங்கள் வருமானம் LKR 1,200,000 வரம்பிற்குள் உள்ளது.' : `**மதிப்பிடப்பட்ட வரி:** **${currency} ${calc.totalTax.toLocaleString()}** (செயல்திறன் விகிதம்: ${calc.effectiveRate})\n• **காலாண்டு APIT தவணை:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / காலாண்டு`}\n\n> 💡 *IT/மென்பொருள் ஏற்றுமதி மூலம் பெறப்படும் வெளிநாட்டு நாணய வருமானம் Inland Revenue Act Schedule 3 இன் கீழ் முழு வரி விலக்கு பெறலாம்.*`;
        } else if (qLow.match(/இருப்பு|மீதி|balance|சேமிப்பு/)) {
          answer = `💼 **உங்கள் நிதி நிலைமை:**\n\n• **நிகர இருப்பு:** ${currency} ${netBalance.toLocaleString()}\n• **மொத்த வருமானம்:** ${currency} ${totalIncome.toLocaleString()} (${userTx.filter(t=>t.type==='income').length} பரிவர்த்தனைகள்)\n• **மொத்த செலவுகள்:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} பரிவர்த்தனைகள்)\n\n${netBalance >= 0 ? '🎉 நீங்கள் **நேர்மறை பணப்புழக்கத்தில் (Positive Cash Flow)** உள்ளீர்கள்!' : '⚠️ உங்கள் செலவுகள் வருமானத்தை விட அதிகமாக உள்ளன. கவனமாக திட்டமிடுங்கள்.'}`;
        } else if (qLow.match(/வணக்கம்|ஹலோ|hello|hi/)) {
          answer = `👋 வணக்கம் **${userName}**! நான் **Cendric**, உங்கள் AI நிதி ஆலோசகர்.\n\nஉங்களிடம் தற்போது **${userTx.length}** பரிவர்த்தனைகளும், **${currency} ${netBalance.toLocaleString()}** நிகர இருப்பும் உள்ளது.\n\n💬 உங்கள் செலவுகள், இலங்கை வரிச் சட்டங்கள் அல்லது நேரடி மாற்று விகிதங்கள் பற்றி என்னிடம் கேளுங்கள்!`;
        } else {
          answer = `🤖 **உங்கள் நிதி கண்ணோட்டம்:**\n\n• **நிகர இருப்பு:** ${currency} ${netBalance.toLocaleString()}\n• **மொத்த வருமானம்:** ${currency} ${totalIncome.toLocaleString()} · **மொத்த செலவுகள்:** ${currency} ${totalExpense.toLocaleString()}\n${topCats.length ? `\n**முக்கிய செலவு வகைகள்:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}` : ''}\n\n💬 முயற்சிக்கவும்: *"எனது நிகர இருப்பு என்ன?"*, *"இன்றைய USD மாற்று விகிதம் என்ன?"*, அல்லது *"வரி மதிப்பீடு செய்க"*`;
        }
      } else if (userLang === 'si') {
        if (qLow.match(/විනිමය|rate|usd|exchange|ඩොලර්/)) {
          answer = `💱 **සජීවී විනිමය අනුපාත (API සජීවී):**\n\n• **1 USD** = **${r.LKR?.toFixed(2)} LKR**\n• **1 EUR** = **${(r.LKR/r.EUR)?.toFixed(2)} LKR**\n• **1 GBP** = **${(r.LKR/r.GBP)?.toFixed(2)} LKR**\n• **1 INR** = **${(r.LKR/r.INR)?.toFixed(2)} LKR**\n• **1 AUD** = **${(r.LKR/r.AUD)?.toFixed(2)} LKR**\n\n*මූලාශ්‍රය: Open Exchange Rates API · සජීවී*`;
        } else if (qLow.match(/වියදම|spend|expense|කොපමණ.*වියදම්/)) {
          answer = `📊 **ඔබගේ වියදම් විස්තරය:**\n\n• **මුළු වියදම:** ${currency} ${totalExpense.toLocaleString()} (ගනුදෙනු ${userTx.filter(t=>t.type==='expense').length})\n• **මුළු ආදායම:** ${currency} ${totalIncome.toLocaleString()}\n• **ශුද්ධ ශේෂය:** ${currency} ${netBalance.toLocaleString()}\n\n**ප්‍රධාන වියදම් ප්‍රවර්ග:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}`;
        } else if (qLow.match(/බදු|tax|apit|ird|ආදායම් බදු/)) {
          const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
          answer = `🇱🇰 **ඔබගේ ආදායම සඳහා ශ්‍රී ලංකා බදු තක්සේරුව:**\n\n• **මුළු ආදායම:** ${currency} ${totalIncome.toLocaleString()}\n• **අනුමත අඩුකිරීම්:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n• **බදු රහිත සහනය:** -${currency} 1,200,000\n• **බදු අයවිය හැකි ආදායම:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n${calc.taxableIncome <= 0 ? '🎉 **බදු ගෙවීමට අවශ්‍ය නැත!** ඔබගේ ආදායම LKR 1,200,000 සීමාවට වඩා අඩුය.' : `**ඇස්තමේන්තුගත බද්ද:** **${currency} ${calc.totalTax.toLocaleString()}** (ඵලදායී අනුපාතය: ${calc.effectiveRate})\n• **කාර්තුමය APIT වාරිකය:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / කාර්තුව`}\n\n> 💡 *තොරතුරු තාක්ෂණ හෝ මෘදුකාංග අපනයන සේවා ආදායම දේශීය ආදායම් පනත යටතේ සම්පූර්ණ බදු නිදහස් වේ.*`;
        } else if (qLow.match(/ශේෂය|balance|මුදල්|ඉතිරි/)) {
          answer = `💼 **ඔබගේ මූල්‍ය තත්ත්වය:**\n\n• **ශුද්ධ ශේෂය:** ${currency} ${netBalance.toLocaleString()}\n• **මුළු ආදායම:** ${currency} ${totalIncome.toLocaleString()} (ගනුදෙනු ${userTx.filter(t=>t.type==='income').length})\n• **මුළු වියදම:** ${currency} ${totalExpense.toLocaleString()} (ගනුදෙනු ${userTx.filter(t=>t.type==='expense').length})\n\n${netBalance >= 0 ? '🎉 ඔබ **ධනාත්මක මුදල් ප්‍රවාහයක (Positive Cash Flow)** සිටී!' : '⚠️ ඔබගේ වියදම් ආදායමට වඩා වැඩිය. කරුණාකර සැලකිලිමත් වන්න.'}`;
        } else if (qLow.match(/ආයුබෝවන්|hello|hi/)) {
          answer = `👋 ආයුබෝවන් **${userName}**! මම **Cendric**, ඔබගේ AI මූල්‍ය උපදේශක.\n\nඔබ සතුව මේ වන විට ගනුදෙනු **${userTx.length}** ක් සහ **${currency} ${netBalance.toLocaleString()}** ක ශුද්ධ ශේෂයක් පවතී.\n\n💬 ඔබගේ වියදම්, ශ්‍රී ලංකා බදු නීති හෝ සජීවී විනිමය අනුපාත පිළිබඳව මගෙන් විමසන්න!`;
        } else {
          answer = `🤖 **ඔබගේ මූල්‍ය සාරාංශය:**\n\n• **ශුද්ධ ශේෂය:** ${currency} ${netBalance.toLocaleString()}\n• **මුළු ආදායම:** ${currency} ${totalIncome.toLocaleString()} · **මුළු වියදම:** ${currency} ${totalExpense.toLocaleString()}\n${topCats.length ? `\n**ප්‍රධාන වියදම් ප්‍රවර්ග:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}` : ''}\n\n💬 උත්සාහ කරන්න: *"මගේ ශුද්ධ ශේෂය කොපමණද?"*, *"අද USD විනිමය අනුපාතය කුමක්ද?"*, හෝ *"ආදායම් බදු ගණනය කරන්න"*`;
        }
      } else {
        if (qLow.match(/exchange rate|usd.*lkr|currency rate|rates today|dollar.*rate|lkr.*dollar/)) {
          answer = `💱 **Live Exchange Rates (API Synchronized):**\n\n• **1 USD** = **${r.LKR?.toFixed(2)} LKR**\n• **1 EUR** = **${(r.LKR/r.EUR)?.toFixed(2)} LKR**\n• **1 GBP** = **${(r.LKR/r.GBP)?.toFixed(2)} LKR**\n• **1 INR** = **${(r.LKR/r.INR)?.toFixed(2)} LKR**\n• **1 AUD** = **${(r.LKR/r.AUD)?.toFixed(2)} LKR**\n\n*Source: Open Exchange Rates API · Live*`;
        } else if (qLow.match(/how much.*spend|how much.*spent|total.*expense|expense.*total|spending/)) {
          let matchedCat = null;
          for (const cat of Object.keys(categoryTotals)) {
            if (qLow.includes(cat.toLowerCase())) { matchedCat = cat; break; }
          }
          if (matchedCat) {
            answer = `📊 You spent **${currency} ${categoryTotals[matchedCat].toLocaleString()}** on **${matchedCat}**.\n\nThat's **${((categoryTotals[matchedCat]/totalExpense)*100).toFixed(1)}%** of your total expenses.`;
          } else {
            answer = `📊 **Your Spending Breakdown:**\n\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} transactions)\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n\n**Top Categories:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}`;
          }
        } else if (qLow.match(/tax|apit|ird|taxable|deduction|tin\b/)) {
          const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
          answer = `🇱🇰 **Sri Lankan Tax Assessment for Your Income**\n\n` +
            `• **Gross Income:** ${currency} ${totalIncome.toLocaleString()}\n` +
            `• **Allowable Deductions:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n` +
            `• **Tax-Free Personal Relief:** -${currency} 1,200,000\n` +
            `• **Taxable Income:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n` +
            (calc.taxableIncome <= 0
              ? `🎉 **Zero Tax Payable!** Your net earnings are below the LKR 1,200,000 relief threshold.`
              : `**Total Estimated Tax Payable:** **${currency} ${calc.totalTax.toLocaleString()}** (Effective rate: ${calc.effectiveRate})\n` +
                `• **Quarterly APIT Installment:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / quarter\n\n` +
                `> 💡 *If this is foreign currency income from IT/software export, it may qualify for full exemption under the Third Schedule of the Inland Revenue Act.*`);
        } else if (!qLow.includes('tax') && qLow.match(/balance|net worth|savings|how much.*have|what.*have/)) {
          answer = `💼 **Your Financial Position:**\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()} (${userTx.filter(t=>t.type==='income').length} transactions)\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t=>t.type==='expense').length} transactions)\n\n${netBalance >= 0 ? '🎉 You are operating at a **positive cash flow!**' : '⚠️ Your expenses currently exceed your income. Review discretionary spending.'}`;
        } else if (qLow.match(/tip|advice|save more|budget|improve|optimize/)) {
          answer = `💡 **Cendric Pro Tips for Freelancers:**\n\n1. **50/30/20 Rule** — 50% essentials, 30% lifestyle, 20% savings/investments\n2. **Emergency Fund** — Keep 3–6 months of expenses in a liquid savings account\n3. **Tax Provision** — Automatically set aside **20–25%** of every client payment for APIT\n4. **Track Every Receipt** — Use our CSV importer or receipt scanner to log expenses in real-time\n5. **Invoice in USD** — Sri Lanka's Third Schedule exempts IT export income from income tax`;
        } else if (qLow.match(/hello|hi there|hey|good morning|good evening/)) {
          answer = `👋 Hello **${userName}**! I'm **Cendric**, your AI finance co-pilot.\n\nYou currently have **${userTx.length}** transactions with a net balance of **${currency} ${netBalance.toLocaleString()}**.\n\n💬 Ask me about your expenses, Sri Lankan tax laws, live exchange rates, or invoice management!`;
        } else if (qLow.match(/income|earn|revenue|invoice|payment|client/)) {
          const incTx = userTx.filter(t => t.type === 'income');
          answer = `💰 **Income Summary:**\n\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Transactions:** ${incTx.length} income entries\n• **Average per transaction:** ${currency} ${incTx.length ? (totalIncome/incTx.length).toFixed(0) : 0}\n\nYour net balance after expenses is **${currency} ${netBalance.toLocaleString()}**.`;
        } else {
          answer = `🤖 Here's a snapshot of your finances:\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Income:** ${currency} ${totalIncome.toLocaleString()} · **Expenses:** ${currency} ${totalExpense.toLocaleString()}\n${topCats.length ? `\n**Top expense categories:**\n${topCats.map(([c,v])=>`• ${c}: ${currency} ${v.toLocaleString()}`).join('\n')}` : ''}\n\n💬 Try: *"How much did I spend on Food?"*, *"What's the USD exchange rate?"*, or *"Calculate my income tax"*`;
        }
      }
    }

    await streamWords(answer);
    sendEvent({ type: 'suggestions', suggestions: generateFollowUps(q, answer, userLang) });
    sendEvent({ type: 'done' });
    await saveToChatHistory(q, answer);
    res.end();

  } catch (err) {
    console.error('[Chat Stream Error]', err);
    sendEvent({ type: 'error', message: 'Something went wrong. Please try again.' });
    res.end();
  }
}

async function getChatHistory(req, res) {
  try {
    let userChat = null;
    if (isMongoDBConnected()) {
      userChat = await Chat.findOne({ userId: toUserQuery(req.user._id) }).lean();
    }
    if (!userChat) {
      userChat = db.chats.find(c => String(c.userId) === String(req.user._id));
    }

    const messages = userChat ? userChat.messages : [];
    const sessionId = userChat ? userChat.sessionId : crypto.randomBytes(8).toString('hex');

    res.json({
      messages,
      sessionId
    });
  } catch (err) {
    console.error('[Chat History Error]', err);
    res.status(500).json({ message: 'Failed to fetch chat history.' });
  }
}

async function clearChatHistory(req, res) {
  try {
    const newSessionId = crypto.randomBytes(8).toString('hex');
    if (isMongoDBConnected()) {
      await Chat.findOneAndUpdate(
        { userId: toUserQuery(req.user._id) },
        { messages: [], sessionId: newSessionId }
      );
    }

    const idx = db.chats.findIndex(c => String(c.userId) === String(req.user._id));
    if (idx !== -1) {
      db.chats[idx].messages = [];
      db.chats[idx].sessionId = newSessionId;
      saveDB();
    }
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (err) {
    console.error('[Clear Chat Error]', err);
    res.status(500).json({ message: 'Failed to clear chat history.' });
  }
}

async function postChatMessage(req, res) {
  try {
    const { question, sessionId = crypto.randomBytes(8).toString('hex'), languagePreference } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question cannot be empty.' });
    }

    const q = question.trim();
    const userLang = languagePreference || req.user.languagePreference || 'en';

    let userTx = [];
    if (isMongoDBConnected()) {
      userTx = await Transaction.find({ userId: toUserQuery(req.user._id) }).lean();
    } else {
      userTx = db.transactions.filter(t => String(t.userId) === String(req.user._id));
    }

    const totalIncome = userTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalExpense = userTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;
    const currency = req.user.currencyPreference || 'LKR';

    const categoryTotals = {};
    userTx.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (Number(t.amount) || 0);
    });

    const retrievedLaws = ragService.retrieveRelevantLaws(q, 2);
    let answer = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.') || apiKey.length > 20)) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const targetModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        const model = genAI.getGenerativeModel({ model: targetModel });

        let ragContext = '';
        if (retrievedLaws.length > 0) {
          ragContext = `\nAUTHORITATIVE SRI LANKAN TAX & LEGAL CONTEXT (Inland Revenue Act & Regulations):\n` +
            retrievedLaws.map(doc => `[${doc.title} - ${doc.act} (${doc.section})]:\n${doc.content}`).join('\n\n') +
            `\nIf the user's question relates to tax or laws, ground your answer in this Sri Lankan legal context. Quote the Section/Act and provide step-by-step numbers.\n`;
        }

        const liveRatesData = currencyService.getRates();
        const lr = liveRatesData.rates;
        const liveRatesContext = `
REAL-TIME CURRENCY EXCHANGE RATES (Base: USD):
- 1 USD = ${lr.LKR.toFixed(2)} LKR
- 1 EUR = ${(lr.LKR / lr.EUR).toFixed(2)} LKR (1 USD = ${lr.EUR.toFixed(4)} EUR)
- 1 GBP = ${(lr.LKR / lr.GBP).toFixed(2)} LKR (1 USD = ${lr.GBP.toFixed(4)} GBP)
- 1 INR = ${(lr.LKR / lr.INR).toFixed(2)} LKR (1 USD = ${lr.INR.toFixed(2)} INR)
- 1 AUD = ${(lr.LKR / lr.AUD).toFixed(2)} LKR
- 1 CAD = ${(lr.LKR / lr.CAD).toFixed(2)} LKR
- Provider: ${liveRatesData.source} (Synced: ${liveRatesData.lastUpdated || 'Live'})
If the user asks about exchange rates or converting earnings, use these real-time numbers.
`;

        let langInstruction = '';
        if (userLang === 'ta') {
          langInstruction = '\nCRITICAL REQUIREMENT: The user has selected Sri Lankan Tamil (தமிழ்) as interface language. You MUST respond completely and fluently in Sri Lankan Tamil script (தமிழ்) with natural Tamil financial phrasing (வருமானம், செலவுகள், வரி, விலைப்பட்டியல், பட்ஜெட்), unless the user explicitly wrote the question in English.';
        } else if (userLang === 'si') {
          langInstruction = '\nCRITICAL REQUIREMENT: The user has selected Sri Lankan Sinhala (සිංහල) as interface language. You MUST respond completely and fluently in Sri Lankan Sinhala script (සිංහල) with natural Sinhala financial phrasing (ආදායම, වියදම්, බදු, ඉන්වොයිසි, අයවැය), unless the user explicitly wrote the question in English.';
        }

        const prompt = `You are Cendric, an elite personal finance AI assistant for freelancers and professionals in Sri Lanka.
Current User Context:
- User Name: ${req.user.fullName}
- Currency: ${currency}
- Total Income: ${currency} ${totalIncome}
- Total Expenses: ${currency} ${totalExpense}
- Net Balance: ${currency} ${netBalance}
- Expenses by Category: ${JSON.stringify(categoryTotals)}
- Recent Transactions: ${JSON.stringify(userTx.slice(0, 5))}
${ragContext}
${liveRatesContext}
${langInstruction}
User Question: "${q}"

Respond helpfully, politely, and concisely with practical numbers, insights, or advice. Format with clean markdown bullet points where appropriate.`;

        const result = await model.generateContent(prompt);
        answer = result.response.text().trim();
      } catch (geminiErr) {
        console.warn('[Gemini Chat Warning]', geminiErr.message);
      }
    }

    if (!answer) {
      if (retrievedLaws.length > 0) {
        const taxAns = ragService.generateAuthoritativeAnswer(q, retrievedLaws, {
          currency,
          totalIncome,
          totalExpense
        });
        if (taxAns) {
          answer = taxAns;
        }
      }

      if (!answer) {
        const qLower = q.toLowerCase();

        if (qLower.includes('dollar') || qLower.includes('exchange rate') || qLower.includes('usd to lkr') || qLower.includes('currency rate') || qLower.includes('rates today')) {
          const r = currencyService.getRates().rates;
          answer = `💱 **Live Exchange Rates (API Synchronized):**\n\n` +
            `• **1 USD** = **${r.LKR.toFixed(2)} LKR**\n` +
            `• **1 EUR** = **${(r.LKR / r.EUR).toFixed(2)} LKR** (1 USD = ${r.EUR.toFixed(4)} EUR)\n` +
            `• **1 GBP** = **${(r.LKR / r.GBP).toFixed(2)} LKR** (1 USD = ${r.GBP.toFixed(4)} GBP)\n` +
            `• **1 INR** = **${(r.LKR / r.INR).toFixed(2)} LKR** (1 USD = ${r.INR.toFixed(2)} INR)\n` +
            `• **1 AUD** = **${(r.LKR / r.AUD).toFixed(2)} LKR**\n` +
            `• **1 CAD** = **${(r.LKR / r.CAD).toFixed(2)} LKR**\n\n` +
            `*Source: ${currencyService.source} · Updated: ${currencyService.lastUpdated ? new Date(currencyService.lastUpdated).toLocaleTimeString() : 'Recently'}*`;
        } else if (qLower.includes('how much') && (qLower.includes('spend') || qLower.includes('spent') || qLower.includes('expense'))) {
          let matchedCategory = null;
          for (const cat of Object.keys(categoryTotals)) {
            if (qLower.includes(cat.toLowerCase())) {
              matchedCategory = cat;
              break;
            }
          }

          if (matchedCategory) {
            answer = `📊 You have spent **${currency} ${categoryTotals[matchedCategory].toLocaleString()}** on **${matchedCategory}**.`;
          } else {
            answer = `📊 **Spending Summary:**\n\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} (${userTx.filter(t => t.type === 'expense').length} transactions)\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()}\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}`;
          }
        } else if (qLower.includes('tax') || qLower.includes('apit') || qLower.includes('ird') || qLower.includes('taxable') || qLower.includes('deduction')) {
          const calc = ragService.calculateSriLankanTax(totalIncome, Math.min(totalIncome * 0.4, totalExpense));
          answer = `🇱🇰 **Sri Lankan Tax Assessment for Your Income**\n\n` +
            `• **Gross Income:** ${currency} ${totalIncome.toLocaleString()}\n` +
            `• **Allowable Deductions:** -${currency} ${calc.allowableDeductions.toLocaleString()}\n` +
            `• **Tax-Free Personal Relief:** -${currency} 1,200,000\n` +
            `• **Taxable Income:** ${currency} ${calc.taxableIncome.toLocaleString()}\n\n` +
            (calc.taxableIncome <= 0
              ? `🎉 **Zero Tax Payable!** Your net earnings are below the LKR 1,200,000 relief threshold.`
              : `**Total Estimated Tax Payable:** **${currency} ${calc.totalTax.toLocaleString()}** (Effective rate: ${calc.effectiveRate})\n` +
                `• **Quarterly APIT Installment:** ~${currency} ${Math.round(calc.totalTax / 4).toLocaleString()} / quarter\n\n` +
                `> 💡 *If this is foreign currency income from IT/software export, it may qualify for full exemption under the Third Schedule of the Inland Revenue Act.*`);
        } else if (!qLower.includes('tax') && (qLower.includes('balance') || qLower.includes('net') || qLower.includes('savings'))) {
          answer = `💼 **Your Financial Position:**\n\n• **Current Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Inflow:** ${currency} ${totalIncome.toLocaleString()}\n• **Total Outflow:** ${currency} ${totalExpense.toLocaleString()}\n\n${netBalance >= 0 ? '🎉 You are currently operating at a positive cash flow!' : '⚠️ Your expenses currently exceed your income. Consider reviewing discretionary spending.'}`;
        } else if (qLower.includes('tip') || qLower.includes('advice') || qLower.includes('save') || qLower.includes('budget')) {
          answer = `💡 **Cendric Pro Financial Tips for Freelancers:**\n\n1. **The 50/30/20 Guideline**: Strive to allocate 50% to essentials, 30% to wants, and 20% to savings/investments.\n2. **Emergency Cushion**: With freelance income variability, aim for a 3–6 month living expense reserve.\n3. **Tax Provision**: Automatically set aside 20–25% of every incoming client invoice into a separate tax holding bucket.\n4. **Receipt Logging**: Use our receipt scanner regularly to capture deductible business expenses!`;
        } else if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey')) {
          answer = `👋 Hello ${req.user.fullName.split(' ')[0]}! I'm **Cendric**, your finance co-pilot. You currently have **${userTx.length}** recorded transactions with a net balance of **${currency} ${netBalance.toLocaleString()}**.\n\nHow can I help you manage your finances today? You can also ask me about **Sri Lankan tax laws, Upwork/Fiverr foreign currency exemptions, or TIN registration**!`;
        } else {
          answer = `I analyzed your finances:\n\n• **Net Balance:** ${currency} ${netBalance.toLocaleString()}\n• **Total Income:** ${currency} ${totalIncome.toLocaleString()} across ${userTx.filter(t => t.type === 'income').length} invoices\n• **Total Expenses:** ${currency} ${totalExpense.toLocaleString()} across ${userTx.filter(t => t.type === 'expense').length} purchases\n\nYou can ask me specific questions like *"How much did I spend on Food?"*, *"Calculate my income tax"*, *"Do I pay tax on Upwork USD?"*, or upload receipts to auto-extract expenses!`;
        }
      }
    }

    const newChatMessages = [
      { role: 'user', content: q, timestamp: new Date() },
      { role: 'assistant', content: answer, timestamp: new Date() }
    ];

    if (isMongoDBConnected()) {
      await Chat.findOneAndUpdate(
        { userId: toUserQuery(req.user._id) },
        {
          sessionId,
          $push: { messages: { $each: newChatMessages, $slice: -120 } }
        },
        { upsert: true }
      );
    }

    let userChat = db.chats.find(c => String(c.userId) === String(req.user._id));
    if (!userChat) {
      userChat = {
        userId: req.user._id,
        sessionId,
        messages: []
      };
      db.chats.push(userChat);
    }

    userChat.sessionId = sessionId;
    userChat.messages.push(...newChatMessages);
    if (userChat.messages.length > 120) userChat.messages = userChat.messages.slice(-120);
    saveDB();

    res.json({
      answer,
      sessionId,
      retrievedSources: retrievedLaws.map(l => ({
        id: l.id,
        title: l.title,
        act: l.act,
        section: l.section,
        category: l.category
      }))
    });
  } catch (err) {
    console.error('[Chat Message Error]', err);
    res.status(500).json({ message: 'Error generating response.' });
  }
}

module.exports = {
  streamChat,
  postChatMessage,
  getChatHistory,
  clearChatHistory
};
