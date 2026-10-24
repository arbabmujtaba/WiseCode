const { createClient } = require('redis');
const { env } = require('./env');

// Stores revoked session tokens (logout block list).
const redisClient = createClient({
  username: env.redis.username,
  password: env.redis.password,
  socket: { host: env.redis.host, port: env.redis.port },
});

redisClient.on('error', (err) => console.error('Redis error:', err.message));

module.exports = redisClient;
