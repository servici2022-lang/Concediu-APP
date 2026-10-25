process.env.TZ = 'Europe/Bucharest';

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

const app = express();

// În producție API-ul stă în spatele nginx (vezi nginx.conf). Fără asta, toate cererile
// par să vină de la 127.0.0.1, iar limita de login se aplica tuturor utilizatorilor odată.
app.set('trust proxy', 'loopback');

// Security middleware
app.use(helmet());
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// Start server
const start = async () => {
  config.assertSecureJwtSecrets();
  await connectDB();
  app.listen(config.port, '0.0.0.0', (error) => {
    if (error) {
      logger.error(`Server could not start on port ${config.port}: ${error.message}`);
      process.exit(1);
    }
    logger.info(`Server running on port ${config.port} in ${config.env} mode`);
  });
};

start().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});

module.exports = app;
