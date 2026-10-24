// Gemini text generation for the AI tutor chat (REST API, with model fallback).
const axios = require('axios');
const { env } = require('../../config/env');

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 8000;

// Overloaded, rate-limited, timed-out or retired models are worth retrying on another model.
const isRetryable = (err) =>
  /TIMEOUT|UNAVAILABLE|high demand|overloaded|503|500|INTERNAL|RESOURCE_EXHAUSTED|429|no longer available|NOT_FOUND|404/i.test(
    String(err?.message || '')
  );

// Calls the REST API directly so overload errors (503) surface immediately instead of being retried silently.
const generateWithModel = async (model, contents, systemInstruction) => {
  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { contents, systemInstruction: { parts: [{ text: systemInstruction }] } },
      { headers: { 'x-goog-api-key': env.gemini.key }, timeout: env.gemini.textTimeoutMs }
    );
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  } catch (err) {
    if (err.code === 'ECONNABORTED') throw new Error('TIMEOUT: Gemini did not respond in time');
    const e = err.response?.data?.error;
    throw new Error(e ? `${e.status || ''} ${e.code || ''} ${e.message || ''}` : err.message);
  }
};

// Tries the configured models in order and returns the first reply.
const generate = async (contents, systemInstruction) => {
  let lastErr;
  for (const model of env.gemini.textModels) {
    try {
      return await generateWithModel(model, contents, systemInstruction);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      console.warn(`Gemini model ${model} unavailable, trying fallback:`, String(err.message).slice(0, 120));
    }
  }
  throw lastErr;
};

// Keep only well-formed { role, parts: [{ text }] } entries, trimmed to a sane size.
const sanitizeMessages = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'model') && typeof m.parts?.[0]?.text === 'string')
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, parts: [{ text: m.parts[0].text.slice(0, MAX_MESSAGE_CHARS) }] }));

// Maps a Gemini failure to an HTTP status and user-facing message.
const describeGeminiError = (err) => {
  const raw = String(err?.message || '');
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(raw))
    return [503, 'AI tutor is unavailable: the server Gemini API key is invalid.'];
  if (/TIMEOUT|UNAVAILABLE|high demand|overloaded|503/i.test(raw))
    return [503, 'AI tutor is overloaded right now. Please try again in a minute.'];
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(raw)) return [429, 'AI tutor is busy (rate limit). Try again in a moment.'];
  return [500, 'AI tutor failed to respond. Please try again.'];
};

module.exports = { generate, sanitizeMessages, describeGeminiError };
