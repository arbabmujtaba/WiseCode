const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { STATUS, getLanguageId, normalizeLanguage, runAgainstTestCases } = require('../services/judge0');
const { sendError } = require('../utils/httpError');

const MAX_CODE_LENGTH = 100000;

const parseRequest = (req) => {
  const problemId = req.params.id;
  const { code } = req.body || {};
  const language = normalizeLanguage(req.body?.language);

  if (!mongoose.isValidObjectId(problemId)) return { error: 'Invalid problem id' };
  if (!code || typeof code !== 'string' || !code.trim()) return { error: 'Code is required' };
  if (code.length > MAX_CODE_LENGTH) return { error: 'Code is too long' };
  if (!language) return { error: 'Unsupported language' };
  return { problemId, code, language };
};

// Summarises Judge0 results into totals and the first failure message.
const summarise = (testResult) => {
  let passed = 0;
  let runtime = 0;
  let memory = 0;
  let status = 'accepted';
  let errorMessage = '';

  for (const test of testResult) {
    runtime += parseFloat(test.time) || 0;
    memory = Math.max(memory, test.memory || 0);
    if (test.status_id === STATUS.ACCEPTED) {
      passed++;
      continue;
    }
    if (status === 'accepted') {
      // 4 = Wrong Answer; anything else (compile error, runtime error, TLE) is an error.
      status = test.status_id === STATUS.WRONG_ANSWER ? 'wrong' : 'error';
      errorMessage =
        test.compile_output || test.stderr || test.message || test.status?.description || 'Wrong answer';
    }
  }
  return { passed, runtime: Number(runtime.toFixed(3)), memory, status, errorMessage };
};

const submitCode = async (req, res) => {
  const parsed = parseRequest(req);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  const { problemId, code, language } = parsed;

  try {
    const problem = await Problem.findById(problemId).select('hiddenTestCases');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    if (!problem.hiddenTestCases.length) {
      return res.status(422).json({ message: 'This problem has no hidden test cases yet' });
    }

    const submission = await Submission.create({
      userId: req.result._id,
      problemId,
      code,
      language,
      status: 'pending',
      testCasesTotal: problem.hiddenTestCases.length,
    });

    let summary;
    try {
      const testResult = await runAgainstTestCases(code, getLanguageId(language), problem.hiddenTestCases);
      summary = summarise(testResult);
    } catch (err) {
      submission.status = 'error';
      submission.errorMessage = err.message;
      await submission.save();
      throw err;
    }

    submission.status = summary.status;
    submission.testCasesPassed = summary.passed;
    submission.errorMessage = summary.errorMessage;
    submission.runtime = summary.runtime;
    submission.memory = summary.memory;
    await submission.save();

    const accepted = summary.status === 'accepted';
    if (accepted && !req.result.problemSolved.some((id) => id.equals(problemId))) {
      req.result.problemSolved.push(problemId);
      await req.result.save();
    }

    res.status(201).json({
      accepted,
      status: summary.status,
      totalTestCases: submission.testCasesTotal,
      passedTestCases: summary.passed,
      runtime: summary.runtime,
      memory: summary.memory,
      errorMessage: summary.errorMessage,
      submissionId: submission._id,
    });
  } catch (err) {
    sendError(res, err);
  }
};

const runCode = async (req, res) => {
  const parsed = parseRequest(req);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  const { problemId, code, language } = parsed;

  try {
    const problem = await Problem.findById(problemId).select('visibleTestCases');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const testResult = await runAgainstTestCases(code, getLanguageId(language), problem.visibleTestCases);
    const summary = summarise(testResult);

    res.status(201).json({
      success: summary.status === 'accepted',
      status: summary.status,
      errorMessage: summary.errorMessage,
      runtime: summary.runtime,
      memory: summary.memory,
      passedTestCases: summary.passed,
      totalTestCases: testResult.length,
      testCases: testResult.map((t) => ({
        stdin: t.stdin,
        expected_output: t.expected_output,
        stdout: t.stdout,
        stderr: t.stderr,
        compile_output: t.compile_output,
        status_id: t.status_id,
        status: t.status?.description,
        time: t.time,
        memory: t.memory,
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
};

// Recent submissions across all problems for the current user (dashboard).
const submissionHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const submissions = await Submission.find({ userId: req.result._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-code')
      .populate({ path: 'problemId', select: '_id title difficulty tags' })
      .lean();
    res.status(200).json(submissions);
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = { submitCode, runCode, submissionHistory };
