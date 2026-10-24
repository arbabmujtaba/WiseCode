const mongoose = require('mongoose');
const axios = require('axios');
const Problem = require('../models/problem');

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 8000;

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;

// GEMINI_MODEL is tried first, then GEMINI_FALLBACK_MODEL (comma-separated list allowed).
const MODELS = () => [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  ...(process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-latest').split(','),
].map((m) => m.trim()).filter((m, i, all) => m && all.indexOf(m) === i);

// Overloaded, rate-limited, timed-out or retired models are worth retrying on another model.
const isRetryable = (err) =>
  /TIMEOUT|UNAVAILABLE|high demand|overloaded|503|500|INTERNAL|RESOURCE_EXHAUSTED|429|no longer available|NOT_FOUND|404/i.test(
    String(err?.message || '')
  );

// Calls the Gemini REST API directly so overload errors (503) surface immediately
// instead of being retried silently by the SDK.
const generate = async (model, contents, systemInstruction) => {
  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { contents, systemInstruction: { parts: [{ text: systemInstruction }] } },
      { headers: { 'x-goog-api-key': process.env.GEMINI_KEY }, timeout: TIMEOUT_MS }
    );
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return text;
  } catch (err) {
    if (err.code === 'ECONNABORTED') throw new Error('TIMEOUT: Gemini did not respond in time');
    const e = err.response?.data?.error;
    throw new Error(e ? `${e.status || ''} ${e.code || ''} ${e.message || ''}` : err.message);
  }
};

// Keep only well-formed { role, parts: [{ text }] } entries, trimmed to a sane size.
const sanitizeMessages = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'model') && typeof m.parts?.[0]?.text === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, parts: [{ text: m.parts[0].text.slice(0, MAX_MESSAGE_CHARS) }] }));

const buildSystemInstruction = ({ title, description, testCases, startCode, userCode, language }) => `
You are an expert Data Structures and Algorithms (DSA) tutor helping a user solve one coding problem.

## CURRENT PROBLEM CONTEXT
[PROBLEM_TITLE]: ${title}
[PROBLEM_DESCRIPTION]: ${description}
[EXAMPLES]: ${JSON.stringify(testCases ?? [])}
[START_CODE]: ${JSON.stringify(startCode ?? [])}
${userCode ? `[USER_CURRENT_CODE] (${language || 'unknown language'}):\n${userCode}` : ''}

## CAPABILITIES
1. Hints: step-by-step nudges without revealing the full solution unless asked.
2. Code review: find bugs in the user's code and explain fixes.
3. Optimal solution: explain the approach, then give clean, commented code.
4. Complexity analysis: time and space trade-offs.
5. Alternative approaches and edge-case test ideas.

## RESPONSE FORMAT
- Use Markdown. Put code in fenced blocks with a language tag.
- Be concise; break long explanations into short sections.
- Reply in the language the user writes in.

## LIMITS
- Only discuss the current DSA problem. If asked about unrelated topics, reply:
  "I can only help with the current DSA problem. What specific aspect would you like help with?"
`;

const solveDoubt = async (req, res) => {
  try {
    if (!process.env.GEMINI_KEY) {
      return res.status(503).json({ message: 'AI tutor is not configured on the server (GEMINI_KEY missing).' });
    }

    const { problemId, code, language } = req.body || {};
    let context = req.body || {};

    // Prefer trusted problem data from the database when an id is supplied.
    if (problemId && mongoose.isValidObjectId(problemId)) {
      const problem = await Problem.findById(problemId).select('title description visibleTestCases startCode').lean();
      if (!problem) return res.status(404).json({ message: 'Problem not found' });
      context = {
        title: problem.title,
        description: problem.description,
        testCases: problem.visibleTestCases.map(({ input, output, explanation }) => ({ input, output, explanation })),
        startCode: problem.startCode.map(({ language: l, initialCode }) => ({ language: l, initialCode })),
      };
    }

    const messages = sanitizeMessages(req.body?.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ message: 'Send a question to the tutor' });
    }

    const systemInstruction = buildSystemInstruction({
      ...context,
      userCode: typeof code === 'string' ? code.slice(0, 20000) : '',
      language,
    });

    // Primary model first; on overload/timeout fall back to the next one.
    let text = null;
    let lastErr;
    for (const model of MODELS()) {
      try {
        text = await generate(model, messages, systemInstruction);
        break;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) throw err;
        console.warn(`Gemini model ${model} unavailable, trying fallback:`, String(err.message).slice(0, 120));
      }
    }
    if (text === null) throw lastErr;

    res.status(200).json({ message: text || 'No response from the tutor. Try rephrasing.' });
  } catch (err) {
    const raw = String(err?.message || '');
    console.error('AI chat error:', raw.slice(0, 300));
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
      return res.status(503).json({ message: 'AI tutor is unavailable: the server Gemini API key is invalid.' });
    }
    if (/TIMEOUT|UNAVAILABLE|high demand|overloaded|503/i.test(raw)) {
      return res.status(503).json({ message: 'AI tutor is overloaded right now. Please try again in a minute.' });
    }
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(raw)) {
      return res.status(429).json({ message: 'AI tutor is busy (rate limit). Try again in a moment.' });
    }
    res.status(500).json({ message: 'AI tutor failed to respond. Please try again.' });
  }
};

module.exports = solveDoubt;
