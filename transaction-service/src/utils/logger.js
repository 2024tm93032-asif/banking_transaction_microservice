const winston = require('winston');

/**
 * Logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'transaction-service' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log transaction events
 */
const logTransaction = (type, data, metadata = {}) => {
  logger.info('Transaction Event', {
    type,
    data,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log API requests
 */
const logRequest = (req, res, responseTime) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log errors
 */
const logError = (error, context = {}) => {
  logger.error('Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logTransaction,
  logRequest,
  logError
};