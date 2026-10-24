const express = require('express');

const router = express.Router();

router.use('/user', require('./auth.routes'));
router.use('/problem', require('./problem.routes'));
router.use('/submission', require('./submission.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/video', require('./video.routes'));

module.exports = router;
