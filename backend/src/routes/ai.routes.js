const express = require('express');
const { chat } = require('../controllers/ai.controller');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', requireUser, chat);
// The real-time voice tutor is a WebSocket at /ai/live (see services/ai/voiceProxy.js).

module.exports = router;
