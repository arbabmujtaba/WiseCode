const express = require('express');

const authRouter = express.Router();
const { register, login, logout, adminRegister, deleteProfile, checkAuth } = require('../controllers/userAuthent');
const userMiddleware = require('../middleware/userMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', userMiddleware, logout);
authRouter.post('/admin/register', adminMiddleware, adminRegister);
authRouter.delete('/deleteProfile', userMiddleware, deleteProfile);
authRouter.get('/check', userMiddleware, checkAuth);

module.exports = authRouter;
