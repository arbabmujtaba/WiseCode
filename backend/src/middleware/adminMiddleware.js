const createAuthMiddleware = require('./authMiddleware');

module.exports = createAuthMiddleware({ requireAdmin: true });
