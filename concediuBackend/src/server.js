process.env.TZ = 'Europe/Bucharest';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const connectDB = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { User } = require('./models');
const { seedDatabase, ensureMovableHolidays } = require('./seeds/seed');

const app = express();

// În producție API-ul stă în spatele nginx (vezi nginx.conf). Fără asta, toate cererile
// par să vină de la 127.0.0.1, iar limita de login se aplica tuturor utilizatorilor odată.
app.set('trust proxy', 'loopback');

// Security middleware. Fără upgrade-insecure-requests: interfața servită de acest server
// (varianta .exe) merge pe http în rețeaua locală, iar directiva ar muta resursele pe https.
app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }));
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});
app.use(['/api/auth/login', '/api/auth/refresh-token', '/api/users/change-password'], limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Interfața compilată, când e împachetată împreună cu serverul (varianta .exe, vezi
// scripts/build-exe.js). Pe server o servește nginx, iar folderul public/ nu există.
const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = path.join(publicDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  // Rutele interfeței (/leaves, /calendar...) se încarcă tot din index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(indexHtml);
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

/** Adresele la care se poate deschide aplicația: localhost și IP-urile din rețea. */
const appUrls = () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${config.port}`);
  return [`http://localhost:${config.port}`, ...lan];
};

/**
 * Oprire cu eroare. În varianta .exe fereastra rămâne deschisă până la Enter,
 * altfel s-ar închide imediat și mesajul n-ar putea fi citit.
 */
const fail = (message) => {
  logger.error(message);
  if (!config.desktop) process.exit(1);
  console.log('\nApasă Enter pentru a închide fereastra...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
  process.stdin.once('end', () => process.exit(1)); // fără tastatură (ex. pornit din alt program)
};

// Start server
const start = async () => {
  config.assertSecureJwtSecrets();
  await connectDB();

  // `Concediu-APP.exe --seed` (sau `node src/server.js --seed`): doar completează datele inițiale.
  if (process.argv.includes('--seed')) {
    await seedDatabase(logger);
    logger.info('Seed completed successfully');
    process.exit(0);
  }

  if (config.desktop) {
    if ((await User.estimatedDocumentCount()) === 0) {
      logger.info('Empty database: creating the admin account, leave types and public holidays');
      await seedDatabase(logger);
    } else {
      await ensureMovableHolidays(logger);
    }
  }

  app.listen(config.port, '0.0.0.0', (error) => {
    if (error) {
      const hint = error.code === 'EADDRINUSE' ? ` Port ${config.port} is used by another program; change PORT in ${config.configFile}.` : '';
      fail(`Server could not start on port ${config.port}: ${error.message}.${hint}`);
      return;
    }
    logger.info(`Server running on port ${config.port} in ${config.env} mode`);

    if (config.desktop) {
      console.log('\n  Concediu APP rulează. Deschide în browser:');
      for (const url of appUrls()) console.log(`    ${url}`);
      console.log(`\n  Configurare: ${config.configFile}`);
      console.log('  Pentru oprire, închide această fereastră.\n');
      if (config.openBrowser && process.platform === 'win32') {
        exec(`start "" "http://localhost:${config.port}"`);
      }
    }
  });
};

start().catch((error) => fail(error.message));

module.exports = app;
