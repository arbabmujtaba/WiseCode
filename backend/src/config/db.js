const mongoose = require('mongoose');
const { env } = require('./env');

const connectDB = () => mongoose.connect(env.mongoUri);

module.exports = connectDB;
