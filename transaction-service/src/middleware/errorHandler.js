const { logError } = require('../utils/logger');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip
  });

  // Default error response
  let response = ApiResponse.error('Internal server error', 500);

  // Handle known error types
  if (err.message.includes('not found')) {
    response = ApiResponse.notFound(err.message);
  } else if (err.message.includes('Validation failed')) {
    response = ApiResponse.validationError([err.message]);
  } else if (err.message.includes('already exists')) {
    response = ApiResponse.conflict(err.message);
  } else if (err.message.includes('Insufficient balance') || 
             err.message.includes('not active') ||
             err.message.includes('Transfer failed')) {
    response = ApiResponse.error(err.message, 400);
  } else if (err.message.includes('Unauthorized')) {
    response = ApiResponse.unauthorized(err.message);
  } else if (err.message.includes('Forbidden')) {
    response = ApiResponse.forbidden(err.message);
  }

  // Database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        response = ApiResponse.conflict('Resource already exists');
        break;
      case '23503': // Foreign key violation
        response = ApiResponse.error('Referenced resource not found', 400);
        break;
      case '23514': // Check constraint violation
        response = ApiResponse.error('Data validation failed', 400);
        break;
      case 'ECONNREFUSED':
        response = ApiResponse.error('Database connection failed', 503);
        break;
      default:
        response = ApiResponse.error('Database error occurred', 500);
    }
  }

  res.status(response.statusCode).json(response);
};

module.exports = errorHandler;