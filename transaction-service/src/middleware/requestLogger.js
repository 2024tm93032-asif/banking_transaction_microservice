const { logRequest } = require('../utils/logger');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log the request
    logRequest(req, res, responseTime);
    
    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = requestLogger;