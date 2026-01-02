const mongoose = require('mongoose');
const { logger } = require('../utils/logger');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // bufferMaxEntries: 0,
      maxPoolSize: 10,
    });
    logger.info('MongoDB connected successfully.');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    throw err;
  }
};

module.exports = connectDB;
