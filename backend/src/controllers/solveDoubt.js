const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');
const Problem = require('../models/problem');

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 8000;

let client;
const getClient = () => {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
  return client;
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

    const response = await getClient().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: messages,
      config: {
        systemInstruction: buildSystemInstruction({
          ...context,
          userCode: typeof code === 'string' ? code.slice(0, 20000) : '',
          language,
        }),
      },
    });

    res.status(200).json({ message: response.text || 'No response from the tutor. Try rephrasing.' });
  } catch (err) {
    const raw = String(err?.message || '');
    console.error('AI chat error:', raw.slice(0, 300));
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw)) {
      return res.status(503).json({ message: 'AI tutor is unavailable: the server Gemini API key is invalid.' });
    }
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(raw)) {
      return res.status(429).json({ message: 'AI tutor is busy (rate limit). Try again in a moment.' });
    }
    res.status(500).json({ message: 'AI tutor failed to respond. Please try again.' });
  }
};

module.exports = solveDoubt;
