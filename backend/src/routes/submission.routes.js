const express = require('express');
const { submitCode, runCode, submissionHistory } = require('../controllers/submission.controller');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

router.post('/run/:id', requireUser, runCode);
router.post('/submit/:id', requireUser, submitCode);
router.get('/history', requireUser, submissionHistory);

module.exports = router;
