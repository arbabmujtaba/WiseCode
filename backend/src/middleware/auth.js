const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { env } = require('../config/env');

// Resolves a session token to a user document, or throws.
// Shared by the HTTP guards below and the voice WebSocket handshake.
const authenticateToken = async (token) => {
  if (!token) throw new Error('Not signed in');

  const payload = jwt.verify(token, env.jwtKey);
  if (!payload?._id) throw new Error('Invalid token');

  if (await redisClient.exists(`token:${token}`)) throw new Error('Session has ended');

  const user = await User.findById(payload._id);
  if (!user) throw new Error("User doesn't exist");
  return user;
};

// Attaches the signed-in user to req.result. Admin role is checked against the database.
const guard =
  ({ admin = false } = {}) =>
  async (req, res, next) => {
    try {
      const user = await authenticateToken(req.cookies.token);
      if (admin && user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      req.result = user;
      next();
    } catch (err) {
      res.status(401).json({ message: err.message || 'Unauthorized' });
    }
  };

module.exports = {
  authenticateToken,
  requireUser: guard(),
  requireAdmin: guard({ admin: true }),
};
