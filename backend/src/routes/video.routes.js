const express = require('express');
const { generateUploadSignature, saveVideoMetadata, deleteVideo } = require('../controllers/video.controller');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/create/:problemId', requireAdmin, generateUploadSignature);
router.post('/save', requireAdmin, saveVideoMetadata);
router.delete('/delete/:problemId', requireAdmin, deleteVideo);

module.exports = router;
