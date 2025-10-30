/**
 * Standard API response formatter
 */
class ApiResponse {
  /**
   * Success response
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode
    };
  }

  /**
   * Error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} errors - Detailed errors
   */
  static error(message = 'An error occurred', statusCode = 500, errors = []) {
    return {
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      statusCode
    };
  }

  /**
   * Validation error response
   * @param {Array} errors - Validation errors
   */
  static validationError(errors = []) {
    return {
      success: false,
      message: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
      statusCode: 400
    };
  }

  /**
   * Not found response
   * @param {string} resource - Resource that was not found
   */
  static notFound(resource = 'Resource') {
    return {
      success: false,
      message: `${resource} not found`,
      timestamp: new Date().toISOString(),
      statusCode: 404
    };
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message = 'Unauthorized') {
    return {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      statusCode: 401
    };
  }

  /**
   * Forbidden response
   */
  static forbidden(message = 'Forbidden') {
    return {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      statusCode: 403
    };
  }

  /**
   * Conflict response
   */
  static conflict(message = 'Conflict') {
    return {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      statusCode: 409
    };
  }
}

module.exports = ApiResponse;