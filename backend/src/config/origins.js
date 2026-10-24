// Comma-separated list of allowed frontend origins (CORS + WebSocket origin check).
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

module.exports = { allowedOrigins, isAllowedOrigin };
