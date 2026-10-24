const redisClient = require('../config/redis');
const User = require('../models/user');
const validate = require('../utils/validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SESSION_SECONDS = 24 * 60 * 60;

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_SECONDS * 1000,
});

const publicUser = (user) => ({
  firstName: user.firstName,
  lastName: user.lastName,
  emailId: user.emailId,
  _id: user._id,
  role: user.role,
  createdAt: user.createdAt,
});

const issueSession = (res, user) => {
  const token = jwt.sign({ _id: user._id, emailId: user.emailId, role: user.role }, process.env.JWT_KEY, {
    expiresIn: SESSION_SECONDS,
  });
  res.cookie('token', token, cookieOptions());
};

const duplicateEmail = (err) => err?.code === 11000;

const register = async (req, res) => {
  try {
    validate(req.body);
    const { firstName, lastName, emailId, password } = req.body;

    const user = await User.create({
      firstName: firstName.trim(),
      ...(lastName ? { lastName: lastName.trim() } : {}),
      emailId,
      password: await bcrypt.hash(password, 10),
      role: 'user',
    });

    issueSession(res, user);
    res.status(201).json({ user: publicUser(user), message: 'Registered successfully' });
  } catch (err) {
    const message = duplicateEmail(err) ? 'An account with this email already exists' : err.message;
    res.status(400).json({ message });
  }
};

const login = async (req, res) => {
  try {
    const { emailId, password } = req.body || {};
    if (!emailId || !password) throw new Error('Invalid credentials');

    const user = await User.findOne({ emailId: String(emailId).toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid email or password');
    }

    issueSession(res, user);
    res.status(200).json({ user: publicUser(user), message: 'Logged in successfully' });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const { token } = req.cookies;
    const payload = jwt.decode(token);
    await redisClient.set(`token:${token}`, 'Blocked');
    await redisClient.expireAt(`token:${token}`, payload.exp);

    const { maxAge: _maxAge, ...opts } = cookieOptions();
    res.clearCookie('token', opts);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(503).json({ message: err.message });
  }
};

// Admin-only: create a user or another admin.
const adminRegister = async (req, res) => {
  try {
    validate(req.body);
    const { firstName, lastName, emailId, password, role } = req.body;

    const user = await User.create({
      firstName: firstName.trim(),
      ...(lastName ? { lastName: lastName.trim() } : {}),
      emailId,
      password: await bcrypt.hash(password, 10),
      role: role === 'user' ? 'user' : 'admin',
    });
    res.status(201).json({ user: publicUser(user), message: 'User registered successfully' });
  } catch (err) {
    const message = duplicateEmail(err) ? 'An account with this email already exists' : err.message;
    res.status(400).json({ message });
  }
};

const deleteProfile = async (req, res) => {
  try {
    // findByIdAndDelete triggers the findOneAndDelete hook that removes submissions.
    await User.findByIdAndDelete(req.result._id);
    const { maxAge: _maxAge, ...opts } = cookieOptions();
    res.clearCookie('token', opts);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const checkAuth = (req, res) => {
  res.status(200).json({ user: publicUser(req.result), message: 'Valid user' });
};

module.exports = { register, login, logout, adminRegister, deleteProfile, checkAuth, publicUser };
