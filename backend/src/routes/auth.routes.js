const express = require('express');
const { register, login, logout, adminRegister, deleteProfile, checkAuth } = require('../controllers/auth.controller');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireUser, logout);
router.get('/check', requireUser, checkAuth);
router.delete('/deleteProfile', requireUser, deleteProfile);
router.post('/admin/register', requireAdmin, adminRegister);

module.exports = router;
