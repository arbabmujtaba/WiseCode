const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const validate = require('./utils/validator');

const PORT = process.env.PORT || 3000;
const JWT_KEY = 'demo-jwt-secret-not-for-production';
const PASSWORD_SALT = 'demo-password-salt';
const TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

const blockedTokens = new Set();
const store = {
  users: [],
  problems: [],
  submissions: [],
  videos: [],
};

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicUser(user) {
  return {
    firstName: user.firstName,
    emailId: user.emailId,
    _id: user._id,
    role: user.role,
  };
}

function hashPassword(password) {
  return crypto.scryptSync(password, PASSWORD_SALT, 32).toString('hex');
}

function passwordMatches(password, storedHash) {
  return hashPassword(password) === storedHash;
}

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      _id: user._id,
      emailId: user.emailId,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    })
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', JWT_KEY).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', JWT_KEY).update(`${header}.${payload}`).digest('base64url');
  if (expected !== signature) throw new Error('Invalid token');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return data;
}

function setAuthCookie(res, token) {
  res.cookie('token', token, { maxAge: TOKEN_MAX_AGE_MS });
}

function starterFor(language, problemId) {
  if (language === 'JavaScript') {
    return `function solve(/* args */) {
  // ${problemId}: write your solution
  return null;
}`;
  }
  if (language === 'Java') {
    return `class Solution {
  public Object solve() {
    return null;
  }
}`;
  }
  return `#include <bits/stdc++.h>
using namespace std;

auto solve() {
  return 0;
}`;
}

function seedProblems(adminId) {
  return [
    {
      _id: 'demo-two-sum',
      title: 'Two Sum',
      description:
        'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.',
      difficulty: 'easy',
      tags: 'array',
      visibleTestCases: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2 + 7 = 9' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: '2 + 4 = 6' },
      ],
      hiddenTestCases: [
        { input: 'nums = [3,3], target = 6', output: '[0,1]' },
        { input: 'nums = [1,5,3,7], target = 8', output: '[0,3]' },
        { input: 'nums = [0,4,3,0], target = 0', output: '[0,3]' },
      ],
      startCode: [
        {
          language: 'C++',
          initialCode: `#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
  return {0, 1};
}`,
        },
        {
          language: 'Java',
          initialCode: `class Solution {
  public int[] twoSum(int[] nums, int target) {
    return new int[] {0, 1};
  }
}`,
        },
        {
          language: 'JavaScript',
          initialCode: `function twoSum(nums, target) {
  // Write your solution here
  return [0, 1];
}`,
        },
      ],
      referenceSolution: [
        {
          language: 'C++',
          completeCode: `vector<int> twoSum(vector<int>& nums, int target) {
  unordered_map<int,int> seen;
  for (int i = 0; i < nums.size(); i++) {
    if (seen.count(target - nums[i])) return {seen[target - nums[i]], i};
    seen[nums[i]] = i;
  }
  return {};
}`,
        },
        {
          language: 'Java',
          completeCode: `public int[] twoSum(int[] nums, int target) {
  Map<Integer,Integer> seen = new HashMap<>();
  for (int i = 0; i < nums.length; i++) {
    if (seen.containsKey(target - nums[i])) return new int[] {seen.get(target - nums[i]), i};
    seen.put(nums[i], i);
  }
  return new int[] {};
}`,
        },
        {
          language: 'JavaScript',
          completeCode: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
        },
      ],
      problemCreator: adminId,
    },
    {
      _id: 'demo-course-schedule',
      title: 'Course Schedule',
      description:
        'There are numCourses labeled from 0 to numCourses - 1. prerequisites[i] = [ai, bi] means you must take course bi before course ai.\n\nReturn true if you can finish all courses.',
      difficulty: 'medium',
      tags: 'graph',
      visibleTestCases: [
        { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Take 0 then 1.' },
        { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false', explanation: 'Cycle.' },
      ],
      hiddenTestCases: [
        { input: 'numCourses = 1, prerequisites = []', output: 'true' },
        { input: 'numCourses = 3, prerequisites = [[1,0],[2,1]]', output: 'true' },
      ],
      startCode: [
        { language: 'C++', initialCode: starterFor('C++', 'course-schedule') },
        { language: 'Java', initialCode: starterFor('Java', 'course-schedule') },
        { language: 'JavaScript', initialCode: starterFor('JavaScript', 'course-schedule') },
      ],
      referenceSolution: [
        { language: 'C++', completeCode: '// Kahn topological sort — return false on cycle' },
        { language: 'Java', completeCode: '// BFS indegree count; true when every course is visited' },
        {
          language: 'JavaScript',
          completeCode: `function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indeg = Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { graph[b].push(a); indeg[a]++; }
  const q = indeg.map((d, i) => d === 0 ? i : -1).filter((i) => i >= 0);
  let seen = 0;
  while (q.length) {
    const u = q.shift(); seen++;
    for (const v of graph[u]) if (--indeg[v] === 0) q.push(v);
  }
  return seen === numCourses;
}`,
        },
      ],
      problemCreator: adminId,
    },
    {
      _id: 'demo-lis',
      title: 'Longest Increasing Subsequence',
      description: 'Return the length of the longest strictly increasing subsequence in nums.',
      difficulty: 'hard',
      tags: 'dp',
      visibleTestCases: [
        { input: 'nums = [10,9,2,5,3,7,101,18]', output: '4', explanation: 'The LIS is [2,3,7,101].' },
      ],
      hiddenTestCases: [
        { input: 'nums = [0,1,0,3,2,3]', output: '4' },
        { input: 'nums = [7,7,7,7]', output: '1' },
      ],
      startCode: [
        { language: 'C++', initialCode: starterFor('C++', 'lis') },
        { language: 'Java', initialCode: starterFor('Java', 'lis') },
        { language: 'JavaScript', initialCode: starterFor('JavaScript', 'lis') },
      ],
      referenceSolution: [
        { language: 'C++', completeCode: '// patience sorting / binary search tails array, O(n log n)' },
        { language: 'Java', completeCode: '// DP O(n^2) or tails binary search O(n log n)' },
        {
          language: 'JavaScript',
          completeCode: `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
        },
      ],
      problemCreator: adminId,
    },
  ];
}

function starterCodeFor(problem, language) {
  const label = language === 'cpp' || language === 'c++' ? 'C++' : language === 'java' ? 'Java' : 'JavaScript';
  return problem.startCode.find((entry) => entry.language === label)?.initialCode || '';
}

function evaluateCases(code, testCases, starter) {
  const trimmed = (code || '').trim();
  const starterTrimmed = (starter || '').trim();
  const modified = trimmed.length > 0 && trimmed !== starterTrimmed;
  const hasReturn = /return\s+/.test(trimmed);

  return testCases.map((testCase, index) => {
    const expected = String(testCase.output ?? testCase.expected_output ?? '').trim();
    const mentionsExpected = expected.length > 0 && trimmed.includes(expected);
    const pass = mentionsExpected || (modified && hasReturn) || (hasReturn && index === 0);
    return {
      stdin: testCase.input,
      expected_output: expected,
      stdout: pass ? expected : '',
      status_id: pass ? 3 : 4,
      stderr: pass ? null : 'Wrong answer (demo judge)',
      time: pass ? '0.012' : '0.008',
      memory: pass ? 1024 : 900,
    };
  });
}

function requireUser(req, res, next) {
  try {
    const { token } = req.cookies;
    if (!token) throw new Error('Token is not persent');
    if (blockedTokens.has(token)) throw new Error('Invalid Token');
    const payload = verifyToken(token);
    const user = store.users.find((entry) => entry._id === payload._id);
    if (!user) throw new Error("User Doesn't Exist");
    req.result = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).send('Error: ' + err.message);
  }
}

function requireAdmin(req, res, next) {
  requireUser(req, res, () => {
    if (req.result.role !== 'admin') {
      return res.status(401).send('Error: Invalid Token');
    }
    next();
  });
}

function seed() {
  const userPassword = hashPassword('DemoUser1!');
  const adminPassword = hashPassword('DemoAdmin1!');

  const admin = {
    _id: 'demo-admin',
    firstName: 'Ada',
    emailId: 'admin@example.com',
    password: adminPassword,
    role: 'admin',
    problemSolved: [],
  };
  const user = {
    _id: 'demo-user',
    firstName: 'Demo',
    emailId: 'demo@example.com',
    password: userPassword,
    role: 'user',
    problemSolved: ['demo-two-sum'],
  };

  store.users = [admin, user];
  store.problems = seedProblems(admin._id);
  store.submissions = [
    {
      _id: 'demo-sub-1',
      userId: user._id,
      problemId: 'demo-two-sum',
      code: 'function twoSum(nums, target) { return [0, 1]; }',
      language: 'javascript',
      status: 'accepted',
      runtime: 0.04,
      memory: 1024,
      errorMessage: '',
      testCasesPassed: 3,
      testCasesTotal: 3,
      createdAt: new Date().toISOString(),
    },
  ];
  store.videos = [
    {
      _id: 'demo-video-1',
      problemId: 'demo-two-sum',
      userId: admin._id,
      cloudinaryPublicId: 'demo/two-sum',
      secureUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
      duration: 8,
      createdAt: new Date().toISOString(),
    },
  ];
}

function createApp() {
  const app = express();
  const allowedOrigins = new Set(
    (process.env.FRONTEND_URLS || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/demo/health', (_req, res) => {
    res.json({
      mode: 'demo',
      message: 'In-memory demo API. No MongoDB, Redis, Judge0, Gemini, or Cloudinary.',
      accounts: [
        { role: 'user', emailId: 'demo@example.com', password: 'DemoUser1!' },
        { role: 'admin', emailId: 'admin@example.com', password: 'DemoAdmin1!' },
      ],
    });
    app.get('/health', (_req, res) => res.json({ mode: 'demo', status: 'ok' }));
  });

  app.post('/user/register', (req, res) => {
    try {
      validate(req.body);
      const { firstName, emailId, password } = req.body;
      if (store.users.some((user) => user.emailId === emailId.toLowerCase())) {
        throw new Error('Email already registered');
      }
      const user = {
        _id: nextId('user'),
        firstName,
        emailId: emailId.toLowerCase(),
        password: hashPassword(password),
        role: 'user',
        problemSolved: [],
      };
      store.users.push(user);
      const token = signToken(user);
      setAuthCookie(res, token);
      res.status(201).json({ user: publicUser(user), message: 'Loggin Successfully' });
    } catch (err) {
      res.status(400).send('Error: ' + err);
    }
  });

  app.post('/user/login', (req, res) => {
    try {
      const { emailId, password } = req.body;
      if (!emailId || !password) throw new Error('Invalid Credentials');
      const user = store.users.find((entry) => entry.emailId === String(emailId).toLowerCase());
      if (!user) throw new Error('Invalid Credentials');
      if (!passwordMatches(password, user.password)) throw new Error('Invalid Credentials');
      const token = signToken(user);
      setAuthCookie(res, token);
      res.status(201).json({ user: publicUser(user), message: 'Loggin Successfully' });
    } catch (err) {
      res.status(401).send('Error: ' + err);
    }
  });

  app.post('/user/logout', requireUser, (req, res) => {
    blockedTokens.add(req.token);
    res.cookie('token', null, { expires: new Date(Date.now()) });
    res.send('Logged Out Succesfully');
  });

  app.get('/user/check', requireUser, (req, res) => {
    res.status(200).json({ user: publicUser(req.result), message: 'Valid User' });
  });

  app.post('/user/admin/register', requireAdmin, (req, res) => {
    try {
      validate(req.body);
      const { firstName, emailId, password } = req.body;
      store.users.push({
        _id: nextId('admin'),
        firstName,
        emailId: emailId.toLowerCase(),
        password: hashPassword(password),
        role: req.body.role === 'admin' ? 'admin' : 'user',
        problemSolved: [],
      });
      res.status(201).send('User Registered Successfully');
    } catch (err) {
      res.status(400).send('Error: ' + err);
    }
  });

  app.delete('/user/deleteProfile', requireUser, (req, res) => {
    store.users = store.users.filter((user) => user._id !== req.result._id);
    store.submissions = store.submissions.filter((item) => item.userId !== req.result._id);
    res.status(200).send('Deleted Successfully');
  });

  app.get('/problem/getAllProblem', requireUser, (_req, res) => {
    const problems = store.problems.map(({ _id, title, difficulty, tags }) => ({
      _id,
      title,
      difficulty,
      tags,
    }));
    if (problems.length === 0) return res.status(404).send('Problem is Missing');
    res.status(200).send(problems);
  });

  app.get('/problem/problemById/:id', requireUser, (req, res) => {
    const problem = store.problems.find((item) => item._id === req.params.id);
    if (!problem) return res.status(404).send('Problem is Missing');
    const video = store.videos.find((item) => item.problemId === problem._id);
    const body = {
      _id: problem._id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      tags: problem.tags,
      visibleTestCases: problem.visibleTestCases,
      startCode: problem.startCode,
      referenceSolution: problem.referenceSolution,
    };
    if (video) {
      body.secureUrl = video.secureUrl;
      body.thumbnailUrl = video.thumbnailUrl;
      body.duration = video.duration;
    }
    res.status(200).send(body);
  });

  app.get('/problem/problemSolvedByUser', requireUser, (req, res) => {
    const solved = store.problems
      .filter((problem) => req.result.problemSolved.includes(problem._id))
      .map(({ _id, title, difficulty, tags }) => ({ _id, title, difficulty, tags }));
    res.status(200).send(solved);
  });

  app.get('/problem/submittedProblem/:pid', requireUser, (req, res) => {
    const ans = store.submissions.filter(
      (item) => item.userId === req.result._id && item.problemId === req.params.pid
    );
    res.status(200).send(ans);
  });

  app.post('/problem/create', requireAdmin, (req, res) => {
    try {
      const problem = {
        ...req.body,
        _id: nextId('problem'),
        problemCreator: req.result._id,
      };
      if (!problem.startCode) {
        problem.startCode = [
          { language: 'C++', initialCode: starterFor('C++', problem.title) },
          { language: 'Java', initialCode: starterFor('Java', problem.title) },
          { language: 'JavaScript', initialCode: starterFor('JavaScript', problem.title) },
        ];
      }
      store.problems.push(problem);
      res.status(201).send('Problem Saved Successfully');
    } catch (err) {
      res.status(400).send('Error: ' + err);
    }
  });

  app.put('/problem/update/:id', requireAdmin, (req, res) => {
    const index = store.problems.findIndex((item) => item._id === req.params.id);
    if (index < 0) return res.status(404).send('ID is not persent in server');
    store.problems[index] = { ...store.problems[index], ...req.body, _id: store.problems[index]._id };
    res.status(200).send(store.problems[index]);
  });

  app.delete('/problem/delete/:id', requireAdmin, (req, res) => {
    const exists = store.problems.some((item) => item._id === req.params.id);
    if (!exists) return res.status(404).send('Problem is Missing');
    store.problems = store.problems.filter((item) => item._id !== req.params.id);
    store.videos = store.videos.filter((item) => item.problemId !== req.params.id);
    res.status(200).send('Successfully Deleted');
  });

  app.post('/submission/run/:id', requireUser, (req, res) => {
    const problem = store.problems.find((item) => item._id === req.params.id);
    if (!problem) return res.status(400).send('Some field missing');
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).send('Some field missing');
    const testCases = evaluateCases(code, problem.visibleTestCases, starterCodeFor(problem, language));
    const passed = testCases.filter((item) => item.status_id === 3).length;
    res.status(201).json({
      success: passed === testCases.length,
      testCases,
      runtime: Number((passed * 0.012).toFixed(3)),
      memory: 1024,
    });
  });

  app.post('/submission/submit/:id', requireUser, (req, res) => {
    const problem = store.problems.find((item) => item._id === req.params.id);
    if (!problem) return res.status(400).send('Some field missing');
    let { code, language } = req.body;
    if (!code || !language) return res.status(400).send('Some field missing');
    if (language === 'cpp') language = 'c++';

    const testCases = evaluateCases(code, problem.hiddenTestCases, starterCodeFor(problem, language));
    const passed = testCases.filter((item) => item.status_id === 3).length;
    const accepted = passed === testCases.length;
    const submission = {
      _id: nextId('sub'),
      userId: req.result._id,
      problemId: problem._id,
      code,
      language: language === 'c++' ? 'c++' : language,
      status: accepted ? 'accepted' : 'wrong',
      runtime: Number((passed * 0.02).toFixed(3)),
      memory: 1100,
      errorMessage: accepted ? '' : 'Wrong answer (demo judge)',
      testCasesPassed: passed,
      testCasesTotal: testCases.length,
      createdAt: new Date().toISOString(),
    };
    store.submissions.unshift(submission);
    if (accepted && !req.result.problemSolved.includes(problem._id)) {
      req.result.problemSolved.push(problem._id);
    }
    res.status(201).json({
      accepted,
      totalTestCases: testCases.length,
      passedTestCases: passed,
      runtime: submission.runtime,
      memory: submission.memory,
    });
  });

  app.post('/ai/chat', requireUser, (req, res) => {
    const { messages = [], title = 'this problem' } = req.body;
    const lastUser = [...messages].reverse().find((msg) => msg.role === 'user');
    const question = lastUser?.parts?.[0]?.text || 'your approach';
    res.status(201).json({
      message:
        `Demo tutor for "${title}". I am not calling Gemini.\n\n` +
        `You asked: "${question}". Try stating the invariant you need, pick a data structure that supports it, then dry-run the visible examples before submitting.`,
    });
  });

  app.get('/video/create/:problemId', requireAdmin, (req, res) => {
    const problem = store.problems.find((item) => item._id === req.params.problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    const timestamp = Math.round(Date.now() / 1000);
    res.json({
      signature: 'demo-signature',
      timestamp,
      public_id: `demo/${req.params.problemId}/${timestamp}`,
      api_key: 'demo',
      cloud_name: 'demo',
      upload_url: `http://localhost:${PORT}/video/demo-upload`,
    });
  });

  app.post('/video/demo-upload', express.raw({ type: '*/*', limit: '120mb' }), (_req, res) => {
    res.json({
      public_id: `demo/local/${Date.now()}`,
      secure_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      duration: 8,
    });
  });

  app.post('/video/save', requireAdmin, (req, res) => {
    const { problemId, cloudinaryPublicId, secureUrl, duration } = req.body;
    const video = {
      _id: nextId('video'),
      problemId,
      userId: req.result._id,
      cloudinaryPublicId,
      secureUrl:
        secureUrl || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg',
      duration: duration || 8,
      createdAt: new Date().toISOString(),
    };
    store.videos = store.videos.filter((item) => item.problemId !== problemId);
    store.videos.push(video);
    res.status(201).json({
      message: 'Video solution saved successfully',
      videoSolution: {
        id: video._id,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        uploadedAt: video.createdAt,
      },
    });
  });

  app.delete('/video/delete/:problemId', requireAdmin, (req, res) => {
    const before = store.videos.length;
    store.videos = store.videos.filter((item) => item.problemId !== req.params.problemId);
    if (store.videos.length === before) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video deleted successfully' });
  });

  return app;
}

function start() {
  seed();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Demo API listening on http://localhost:${PORT}`);
    console.log('In-memory only — no MongoDB, Redis, Judge0, Gemini, or Cloudinary.');
    console.log('User  demo@example.com / DemoUser1!');
    console.log('Admin admin@example.com / DemoAdmin1!');
  });
}

try {
  start();
} catch (err) {
  console.error(err);
  process.exit(1);
}
