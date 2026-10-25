const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/** URI-ul de afișat în mesaje, fără parolă. */
const safeUri = (uri) => uri.replace(/\/\/([^:/@]+):([^@/]+)@/, '//$1:****@');

const UNAUTHORIZED = 13;

const connectDB = async () => {
  const uri = safeUri(config.mongo.uri);
  try {
    // 10 secunde până la eroare (implicit 30), ca o adresă greșită să fie raportată repede.
    await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    throw new Error(
      `MongoDB connection error (${uri}): ${error.message}. ` +
        `Check that MongoDB is running and MONGO_URI in ${config.configFile}.`
    );
  }

  // Conectarea reușește și fără parolă; lipsa drepturilor apărea abia la prima cerere,
  // ca eroare 500. Se verifică acum, la pornire, cu un mesaj care spune ce lipsește.
  try {
    await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  } catch (error) {
    if (error.code !== UNAUTHORIZED) throw error;
    throw new Error(
      `MongoDB requires a user with access to database "${mongoose.connection.name}" (${uri}): ${error.message}. ` +
        `Put the user and password in MONGO_URI in ${config.configFile}, ` +
        `e.g. mongodb://concediu:PASSWORD@127.0.0.1:27017/concediu`
    );
  }
  logger.info(`MongoDB connected: ${uri}`);
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = connectDB;
