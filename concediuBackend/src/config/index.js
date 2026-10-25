const path = require('path');
const dotenv = require('dotenv');
const { prepareDesktopConfig } = require('./desktop');

// Varianta Windows (.exe, împachetată cu pkg) citește setările din config.env de lângă
// executabil și îl creează la prima pornire. Altfel, ca pe server, din .env-ul din folderul curent.
const isDesktop = Boolean(process.pkg);
const configFile =
  process.env.CONCEDIU_CONFIG ||
  (isDesktop ? path.join(path.dirname(process.execPath), 'config.env') : path.resolve('.env'));
if (isDesktop) prepareDesktopConfig(configFile);
dotenv.config({ path: configFile, quiet: isDesktop });

const config = {
  desktop: isDesktop,
  configFile,
  openBrowser: process.env.OPEN_BROWSER !== 'false',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/concediu',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@concediu.ro',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
  },
};

/**
 * Oprește pornirea serverului dacă secretele JWT lipsesc sau sunt slabe. Valorile din
 * .env.example sunt publice în repo: cu ele oricine poate semna un token de admin.
 */
config.assertSecureJwtSecrets = () => {
  const problems = [];
  for (const [name, value] of [
    ['JWT_SECRET', config.jwt.secret],
    ['JWT_REFRESH_SECRET', config.jwt.refreshSecret],
  ]) {
    if (!value) problems.push(`${name} is missing`);
    else if (value.startsWith('change-this') || value.length < 32) {
      problems.push(`${name} is a placeholder or shorter than 32 characters`);
    }
  }
  if (config.jwt.secret && config.jwt.secret === config.jwt.refreshSecret) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
  if (problems.length) {
    throw new Error(
      `Insecure JWT configuration in .env: ${problems.join('; ')}. ` +
        `Generate secrets with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
};

module.exports = config;
