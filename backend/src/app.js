// Express application: middleware and routes (no network listeners here).
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const redisClient = require('./config/redis');
const { isAllowedOrigin } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  res.json({ ok: mongo && redisClient.isReady, mongo, redis: redisClient.isReady });
});

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
