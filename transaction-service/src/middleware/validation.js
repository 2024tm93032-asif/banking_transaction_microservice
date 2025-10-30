const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Validation middleware factory
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }));

      const response = ApiResponse.validationError(errorMessages);
      return res.status(response.statusCode).json(response);
    }

    next();
  };
};

/**
 * Common validation rules
 */
const validationRules = {
  // Account ID validation
  accountId: param('accountId')
    .isInt({ min: 1 })
    .withMessage('Account ID must be a positive integer'),

  // Transaction ID validation
  transactionId: param('txnId')
    .isInt({ min: 1 })
    .withMessage('Transaction ID must be a positive integer'),

  // Amount validation
  amount: body('amount')
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between 0.01 and 10,000,000'),

  // Deposit validation
  depositValidation: [
    body('account_id')
      .isInt({ min: 1 })
      .withMessage('Account ID must be a positive integer'),
    body('amount')
      .isFloat({ min: 0.01, max: 10000000 })
      .withMessage('Amount must be between 0.01 and 10,000,000'),
    body('counterparty')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Counterparty must be less than 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters')
  ],

  // Withdrawal validation
  withdrawalValidation: [
    body('account_id')
      .isInt({ min: 1 })
      .withMessage('Account ID must be a positive integer'),
    body('amount')
      .isFloat({ min: 0.01, max: 10000000 })
      .withMessage('Amount must be between 0.01 and 10,000,000'),
    body('counterparty')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Counterparty must be less than 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters')
  ],

  // Transfer validation
  transferValidation: [
    body('from_account_id')
      .isInt({ min: 1 })
      .withMessage('Source account ID must be a positive integer'),
    body('to_account_id')
      .isInt({ min: 1 })
      .withMessage('Destination account ID must be a positive integer'),
    body('amount')
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage('Transfer amount must be between 0.01 and 1,000,000'),
    body('description')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Description must be less than 255 characters'),
    body('from_account_id')
      .custom((value, { req }) => {
        if (value === req.body.to_account_id) {
          throw new Error('Source and destination accounts cannot be the same');
        }
        return true;
      })
  ],

  // Idempotency key validation
  idempotencyKey: body('idempotency_key')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Idempotency key must be between 1 and 255 characters'),

  // Pagination validation
  paginationValidation: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('from_date')
      .optional()
      .isISO8601()
      .withMessage('From date must be a valid ISO 8601 date'),
    query('to_date')
      .optional()
      .isISO8601()
      .withMessage('To date must be a valid ISO 8601 date')
  ]
};

module.exports = {
  validate,
  validationRules
};