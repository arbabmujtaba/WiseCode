require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const main = require('./config/db');
const redisClient = require('./config/redis');
const authRouter = require('./routes/userAuth');
const problemRouter = require('./routes/problemCreator');
const submitRouter = require('./routes/submit');
const aiRouter = require('./routes/aiChatting');
const videoRouter = require('./routes/videoCreator');
const { isAllowedOrigin } = require('./config/origins');
const { attachLiveServer } = require('./live/liveProxy');

const app = express();

app.use(
  cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1 && redisClient.isReady,
    mongo: mongoose.connection.readyState === 1,
    redis: redisClient.isReady,
  });
});

app.use('/user', authRouter);
app.use('/problem', problemRouter);
app.use('/submission', submitRouter);
app.use('/ai', aiRouter);
app.use('/video', videoRouter);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Malformed JSON and any uncaught route error.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  console.error(err);
  res.status(err.status || 500).json({ message: 'Internal Server Error' });
});

redisClient.on('error', (err) => console.error('Redis error:', err.message));

const start = async () => {
  try {
    await Promise.all([main(), redisClient.connect()]);
    console.log('DB connected');
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => console.log(`Server listening on port ${port}`));
    attachLiveServer(server); // ws://<host>/ai/live voice tutor
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
};

start();
