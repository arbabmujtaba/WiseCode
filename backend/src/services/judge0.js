const axios = require('axios');

const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';
const JUDGE0_URL = `https://${JUDGE0_HOST}/submissions/batch`;
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 30;

const LANGUAGE_IDS = {
  'c++': 54,
  cpp: 54,
  java: 62,
  javascript: 63,
};

// Accepts "C++", "cpp", "Java", "JavaScript", etc.
const getLanguageById = (lang) => LANGUAGE_IDS[String(lang || '').toLowerCase()];

// Normalises any accepted language label to the value stored on submissions.
const normalizeLanguage = (lang) => {
  const value = String(lang || '').toLowerCase();
  if (value === 'cpp' || value === 'c++') return 'c++';
  if (value === 'java' || value === 'javascript') return value;
  return null;
};

const judgeHeaders = () => ({
  'x-rapidapi-key': process.env.JUDGE0_KEY,
  'x-rapidapi-host': JUDGE0_HOST,
});

const judgeError = (error) => {
  const status = error.response?.status;
  const detail = error.response?.data?.message || error.message;
  const err = new Error(`Code runner unavailable${status ? ` (${status})` : ''}: ${detail}`);
  err.statusCode = 502;
  return err;
};

const submitBatch = async (submissions) => {
  try {
    const response = await axios.post(
      JUDGE0_URL,
      { submissions },
      {
        params: { base64_encoded: 'false' },
        headers: { ...judgeHeaders(), 'Content-Type': 'application/json' },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    throw judgeError(error);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls Judge0 until every submission has finished (status_id > 2).
const submitToken = async (resultToken) => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    let data;
    try {
      const response = await axios.get(JUDGE0_URL, {
        params: { tokens: resultToken.join(','), base64_encoded: 'false', fields: '*' },
        headers: judgeHeaders(),
        timeout: 20000,
      });
      data = response.data;
    } catch (error) {
      throw judgeError(error);
    }

    const finished = data?.submissions?.every((r) => r && r.status_id > 2);
    if (finished) return data.submissions;

    await sleep(POLL_INTERVAL_MS);
  }
  const err = new Error('Code execution timed out. Please try again.');
  err.statusCode = 504;
  throw err;
};

// Runs source code against test cases and returns Judge0 results.
const runAgainstTestCases = async (code, languageId, testCases) => {
  const submissions = testCases.map((testcase) => ({
    source_code: code,
    language_id: languageId,
    stdin: testcase.input,
    expected_output: testcase.output,
  }));
  const submitResult = await submitBatch(submissions);
  if (!Array.isArray(submitResult) || submitResult.some((s) => !s.token)) {
    const err = new Error('Code runner rejected the submission.');
    err.statusCode = 502;
    throw err;
  }
  return submitToken(submitResult.map((value) => value.token));
};

module.exports = { getLanguageById, normalizeLanguage, submitBatch, submitToken, runAgainstTestCases };
