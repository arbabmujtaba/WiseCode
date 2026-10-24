// Central place for configuration read from the environment.
require('dotenv').config();

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const REQUIRED = ['DB_CONNECT_STRING', 'JWT_KEY', 'REDIS_PASS'];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 3000,
  // Render sets RENDER_EXTERNAL_URL; allow it so the single-service deploy works without extra config.
  frontendOrigins: [
    ...list(process.env.FRONTEND_URLS, 'http://localhost:5173,http://127.0.0.1:5173'),
    ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')] : []),
  ],

  mongoUri: process.env.DB_CONNECT_STRING,
  jwtKey: process.env.JWT_KEY,
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',

  redis: {
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASS,
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },

  judge0Key: process.env.JUDGE0_KEY,

  gemini: {
    key: process.env.GEMINI_KEY,
    textModels: [process.env.GEMINI_MODEL || 'gemini-3.5-flash', ...list(process.env.GEMINI_FALLBACK_MODEL, 'gemini-flash-latest')],
    textTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 45000,
    liveModels: [
      process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview',
      ...list(process.env.GEMINI_LIVE_FALLBACK_MODEL, 'gemini-2.5-flash-native-audio-latest'),
    ],
    voiceMaxMs: (Number(process.env.VOICE_MAX_MINUTES) || 15) * 60 * 1000,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

// De-duplicate model fallbacks while keeping order.
env.gemini.textModels = [...new Set(env.gemini.textModels)];
env.gemini.liveModels = [...new Set(env.gemini.liveModels)];

const assertRequiredEnv = () => {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
};

const isAllowedOrigin = (origin) => !origin || env.frontendOrigins.includes(origin);

module.exports = { env, assertRequiredEnv, isAllowedOrigin };
