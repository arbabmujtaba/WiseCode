const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const { env } = require('../config/env');
const { generate, sanitizeMessages, describeGeminiError } = require('../services/ai/gemini');
const { buildChatPrompt } = require('../services/ai/chatPrompt');

// POST /ai/chat — problem-aware text tutor.
const chat = async (req, res) => {
  try {
    if (!env.gemini.key) {
      return res.status(503).json({ message: 'AI tutor is not configured on the server (GEMINI_KEY missing).' });
    }

    const { problemId, code, language } = req.body || {};
    if (!mongoose.isValidObjectId(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    // Problem context always comes from the database, never from the client.
    const problem = await Problem.findById(problemId).select('title description visibleTestCases startCode').lean();
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const messages = sanitizeMessages(req.body?.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ message: 'Send a question to the tutor' });
    }

    const systemInstruction = buildChatPrompt({
      title: problem.title,
      description: problem.description,
      testCases: problem.visibleTestCases.map(({ input, output, explanation }) => ({ input, output, explanation })),
      startCode: problem.startCode.map(({ language: l, initialCode }) => ({ language: l, initialCode })),
      userCode: typeof code === 'string' ? code.slice(0, 20000) : '',
      language,
    });

    const text = await generate(messages, systemInstruction);
    res.status(200).json({ message: text || 'No response from the tutor. Try rephrasing.' });
  } catch (err) {
    console.error('AI chat error:', String(err?.message || '').slice(0, 300));
    const [status, message] = describeGeminiError(err);
    res.status(status).json({ message });
  }
};

module.exports = { chat };
