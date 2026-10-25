const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/** URI-ul de afișat în mesaje, fără parolă. */
const safeUri = (uri) => uri.replace(/\/\/([^:/@]+):([^@/]+)@/, '//$1:****@');

const connectDB = async () => {
  try {
    // 10 secunde până la eroare (implicit 30), ca o adresă greșită să fie raportată repede.
    await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 10000 });
    logger.info(`MongoDB connected: ${safeUri(config.mongo.uri)}`);
  } catch (error) {
    throw new Error(
      `MongoDB connection error (${safeUri(config.mongo.uri)}): ${error.message}. ` +
        `Check that MongoDB is running and MONGO_URI in ${config.configFile}.`
    );
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = connectDB;
