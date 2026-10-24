// Judge0 CE (RapidAPI) client: runs source code against test cases.
const axios = require('axios');
const { env } = require('../config/env');
const { httpError } = require('../utils/httpError');

const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';
const BATCH_URL = `https://${JUDGE0_HOST}/submissions/batch`;
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 30;

// Judge0 status_id values.
const STATUS = { ACCEPTED: 3, WRONG_ANSWER: 4 };

const LANGUAGE_IDS = { 'c++': 54, cpp: 54, java: 62, javascript: 63 };

// Accepts "C++", "cpp", "Java", "JavaScript", etc.
const getLanguageId = (lang) => LANGUAGE_IDS[String(lang || '').toLowerCase()];

// Normalises an accepted language label to the value stored on submissions.
const normalizeLanguage = (lang) => {
  const value = String(lang || '').toLowerCase();
  if (value === 'cpp' || value === 'c++') return 'c++';
  if (value === 'java' || value === 'javascript') return value;
  return null;
};

const headers = () => ({ 'x-rapidapi-key': env.judge0Key, 'x-rapidapi-host': JUDGE0_HOST });

const runnerError = (error) => {
  const status = error.response?.status;
  const detail = error.response?.data?.message || error.message;
  return httpError(502, `Code runner unavailable${status ? ` (${status})` : ''}: ${detail}`, { expose: true });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Results are fetched base64-encoded: Judge0 returns HTTP 400 for plain-text results whose
// output is not valid UTF-8 (e.g. gcc diagnostics with curly quotes).
const TEXT_FIELDS = ['stdin', 'expected_output', 'stdout', 'stderr', 'compile_output', 'message', 'source_code'];
const decode = (result) => {
  for (const f of TEXT_FIELDS) {
    if (typeof result[f] === 'string') result[f] = Buffer.from(result[f], 'base64').toString('utf8');
  }
  return result;
};

const submitBatch = async (submissions) => {
  try {
    const { data } = await axios.post(
      BATCH_URL,
      { submissions },
      { params: { base64_encoded: 'false' }, headers: { ...headers(), 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    return data;
  } catch (error) {
    throw runnerError(error);
  }
};

// Polls until every submission has finished (status_id > 2).
const waitForResults = async (tokens) => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    let data;
    try {
      ({ data } = await axios.get(BATCH_URL, {
        params: { tokens: tokens.join(','), base64_encoded: 'true', fields: '*' },
        headers: headers(),
        timeout: 20000,
      }));
    } catch (error) {
      throw runnerError(error);
    }
    if (data?.submissions?.every((r) => r && r.status_id > 2)) return data.submissions.map(decode);
    await sleep(POLL_INTERVAL_MS);
  }
  throw httpError(504, 'Code execution timed out. Please try again.', { expose: true });
};

// Runs source code against test cases and returns the Judge0 results, in order.
const runAgainstTestCases = async (code, languageId, testCases) => {
  const submitted = await submitBatch(
    testCases.map((tc) => ({ source_code: code, language_id: languageId, stdin: tc.input, expected_output: tc.output }))
  );
  if (!Array.isArray(submitted) || submitted.some((s) => !s.token)) {
    throw httpError(502, 'Code runner rejected the submission.', { expose: true });
  }
  return waitForResults(submitted.map((s) => s.token));
};

module.exports = { STATUS, getLanguageId, normalizeLanguage, runAgainstTestCases };
