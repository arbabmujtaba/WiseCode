const jwt = require('jsonwebtoken');
const User = require('../models/user');
const redisClient = require('../config/redis');

// Verifies the session cookie and attaches the user document to req.result.
// When requireAdmin is set, the role is checked against the database (not just the token).
const createAuthMiddleware = ({ requireAdmin = false } = {}) => async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) throw new Error('Not signed in');

    const payload = jwt.verify(token, process.env.JWT_KEY);
    if (!payload?._id) throw new Error('Invalid token');

    if (await redisClient.exists(`token:${token}`)) throw new Error('Session has ended');

    const user = await User.findById(payload._id);
    if (!user) throw new Error("User doesn't exist");

    if (requireAdmin && user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.result = user;
    next();
  } catch (err) {
    res.status(401).json({ message: err.message || 'Unauthorized' });
  }
};

module.exports = createAuthMiddleware;
