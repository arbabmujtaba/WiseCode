const mongoose = require('mongoose');
const { STATUS, getLanguageId, runAgainstTestCases } = require('../services/judge0');
const Problem = require('../models/Problem');
const User = require('../models/User');
const Submission = require('../models/Submission');
const SolutionVideo = require('../models/SolutionVideo');
const { httpError, sendError } = require('../utils/httpError');

// Runs every reference solution against the visible test cases; throws if any fails.
const verifyReferenceSolutions = async (referenceSolution, visibleTestCases) => {
  if (!Array.isArray(referenceSolution) || !referenceSolution.length) {
    throw httpError(400, 'At least one reference solution is required');
  }
  if (!Array.isArray(visibleTestCases) || !visibleTestCases.length) {
    throw httpError(400, 'At least one visible test case is required');
  }

  for (const { language, completeCode } of referenceSolution) {
    const languageId = getLanguageId(language);
    if (!languageId) throw httpError(400, `Unsupported language: ${language}`);
    const results = await runAgainstTestCases(completeCode, languageId, visibleTestCases);
    const failed = results.findIndex((t) => t.status_id !== STATUS.ACCEPTED);
    if (failed !== -1) {
      const t = results[failed];
      const detail = t.compile_output || t.stderr;
      throw httpError(
        400,
        `${language} reference solution failed visible test ${failed + 1}: ${t.status?.description || 'Wrong Answer'}${
          detail ? ` - ${detail.slice(0, 300)}` : ''
        }`
      );
    }
  }
};

const EDITABLE_FIELDS = [
  'title',
  'description',
  'difficulty',
  'tags',
  'visibleTestCases',
  'hiddenTestCases',
  'startCode',
  'referenceSolution',
];

const pickEditable = (body = {}) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const createProblem = async (req, res) => {
  try {
    const data = pickEditable(req.body);
    await verifyReferenceSolutions(data.referenceSolution, data.visibleTestCases);
    const problem = await Problem.create({ ...data, problemCreator: req.result._id });
    res.status(201).json({ message: 'Problem saved successfully', _id: problem._id });
  } catch (err) {
    sendError(res, err, 400);
  }
};

const updateProblem = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid problem id' });

    const existing = await Problem.findById(id);
    if (!existing) return res.status(404).json({ message: 'Problem not found' });

    const data = pickEditable(req.body);

    // Only re-run Judge0 verification when the code or the visible cases change.
    if (data.referenceSolution || data.visibleTestCases) {
      await verifyReferenceSolutions(
        data.referenceSolution || existing.referenceSolution,
        data.visibleTestCases || existing.visibleTestCases
      );
    }

    const updated = await Problem.findByIdAndUpdate(id, data, { runValidators: true, new: true });
    res.status(200).json(updated);
  } catch (err) {
    sendError(res, err, 400);
  }
};

const deleteProblem = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid problem id' });

    const deleted = await Problem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Problem not found' });

    await Promise.all([
      Submission.deleteMany({ problemId: id }),
      SolutionVideo.deleteMany({ problemId: id }),
      User.updateMany({ problemSolved: id }, { $pull: { problemSolved: id } }),
    ]);

    res.status(200).json({ message: 'Successfully deleted' });
  } catch (err) {
    sendError(res, err);
  }
};

const getProblemById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid problem id' });

    const problem = await Problem.findById(id)
      .select('_id title description difficulty tags visibleTestCases startCode referenceSolution hiddenTestCases')
      .lean();
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const { hiddenTestCases = [], ...rest } = problem;
    const response = { ...rest, hiddenTestCaseCount: hiddenTestCases.length };

    // Admins get the full document so the editor can modify hidden cases.
    if (req.result?.role === 'admin') response.hiddenTestCases = hiddenTestCases;

    const video = await SolutionVideo.findOne({ problemId: id }).lean();
    if (video) {
      response.secureUrl = video.secureUrl;
      response.thumbnailUrl = video.thumbnailUrl;
      response.duration = video.duration;
    }
    res.status(200).json(response);
  } catch (err) {
    sendError(res, err);
  }
};

const getAllProblem = async (req, res) => {
  try {
    const problems = await Problem.find({}).select('_id title difficulty tags').sort({ _id: 1 }).lean();
    const withVideo = new Set(
      (await SolutionVideo.find({}).select('problemId').lean()).map((v) => String(v.problemId))
    );
    res.status(200).json(problems.map((p) => ({ ...p, hasVideo: withVideo.has(String(p._id)) })));
  } catch (err) {
    sendError(res, err);
  }
};

const solvedAllProblembyUser = async (req, res) => {
  try {
    const user = await User.findById(req.result._id).populate({
      path: 'problemSolved',
      select: '_id title difficulty tags',
    });
    res.status(200).json((user?.problemSolved || []).filter(Boolean));
  } catch (err) {
    sendError(res, err);
  }
};

const submittedProblem = async (req, res) => {
  try {
    const problemId = req.params.pid;
    if (!mongoose.isValidObjectId(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    const submissions = await Submission.find({ userId: req.result._id, problemId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(submissions);
  } catch (err) {
    sendError(res, err);
  }
};

module.exports = {
  createProblem,
  updateProblem,
  deleteProblem,
  getProblemById,
  getAllProblem,
  solvedAllProblembyUser,
  submittedProblem,
};
