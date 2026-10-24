// Entry point: connect to MongoDB and Redis, then start HTTP + voice WebSocket server.
const { env, assertRequiredEnv } = require('./config/env');
const connectDB = require('./config/db');
const redisClient = require('./config/redis');
const app = require('./app');
const { attachVoiceServer } = require('./services/ai/voiceProxy');

const start = async () => {
  try {
    assertRequiredEnv();
    await Promise.all([connectDB(), redisClient.connect()]);
    console.log('DB connected');

    const server = app.listen(env.port, () => console.log(`Server listening on port ${env.port}`));
    attachVoiceServer(server); // ws://<host>/ai/live

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
};

start();
