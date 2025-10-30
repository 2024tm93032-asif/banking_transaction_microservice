const express = require('express');
const transactionController = require('../controllers/TransactionController');
const { validate, validationRules } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/v1/transactions/deposit:
 *   post:
 *     summary: Process a deposit transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_id
 *               - amount
 *             properties:
 *               account_id:
 *                 type: integer
 *                 description: Account ID to deposit to
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 10000000
 *                 description: Deposit amount
 *               counterparty:
 *                 type: string
 *                 maxLength: 255
 *                 description: Source of the deposit
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Transaction description
 *     responses:
 *       201:
 *         description: Deposit processed successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Account not found
 */
router.post('/deposit', 
  validate(validationRules.depositValidation),
  transactionController.deposit
);

/**
 * @swagger
 * /api/v1/transactions/withdraw:
 *   post:
 *     summary: Process a withdrawal transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_id
 *               - amount
 *             properties:
 *               account_id:
 *                 type: integer
 *                 description: Account ID to withdraw from
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 10000000
 *                 description: Withdrawal amount
 *               counterparty:
 *                 type: string
 *                 maxLength: 255
 *                 description: Destination of the withdrawal
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Transaction description
 *     responses:
 *       201:
 *         description: Withdrawal processed successfully
 *       400:
 *         description: Invalid request data or insufficient balance
 *       404:
 *         description: Account not found
 */
router.post('/withdraw',
  validate(validationRules.withdrawalValidation),
  transactionController.withdraw
);

/**
 * @swagger
 * /api/v1/transactions/transfer:
 *   post:
 *     summary: Process a transfer transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_account_id
 *               - to_account_id
 *               - amount
 *             properties:
 *               from_account_id:
 *                 type: integer
 *                 description: Source account ID
 *               to_account_id:
 *                 type: integer
 *                 description: Destination account ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 1000000
 *                 description: Transfer amount
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Transaction description
 *               idempotency_key:
 *                 type: string
 *                 maxLength: 255
 *                 description: Idempotency key to prevent duplicate transfers
 *     responses:
 *       201:
 *         description: Transfer processed successfully
 *       400:
 *         description: Invalid request data or insufficient balance
 *       404:
 *         description: Account not found
 *       409:
 *         description: Idempotency key conflict
 */
router.post('/transfer',
  validate([...validationRules.transferValidation, validationRules.idempotencyKey]),
  transactionController.transfer
);

/**
 * @swagger
 * /api/v1/transactions/account/{accountId}:
 *   get:
 *     summary: Get transaction history for an account
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of transactions per page
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter (ISO 8601)
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter (ISO 8601)
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       404:
 *         description: Account not found
 */
router.get('/account/:accountId',
  validate([validationRules.accountId, ...validationRules.paginationValidation]),
  transactionController.getTransactionHistory
);

/**
 * @swagger
 * /api/v1/transactions/{txnId}:
 *   get:
 *     summary: Get transaction details by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: txnId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *       404:
 *         description: Transaction not found
 */
router.get('/:txnId',
  validate([validationRules.transactionId]),
  transactionController.getTransactionById
);

/**
 * @swagger
 * /api/v1/transactions/account/{accountId}/summary:
 *   get:
 *     summary: Get account transaction summary
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter (ISO 8601)
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter (ISO 8601)
 *     responses:
 *       200:
 *         description: Account summary retrieved successfully
 *       404:
 *         description: Account not found
 */
router.get('/account/:accountId/summary',
  validate([validationRules.accountId]),
  transactionController.getAccountSummary
);

module.exports = router;