const transactionService = require('../services/TransactionService');
const ApiResponse = require('../utils/ApiResponse');
const { logTransaction } = require('../utils/logger');

/**
 * Transaction Controller
 * Handles HTTP requests for transaction operations
 */
class TransactionController {
  /**
   * Process deposit transaction
   */
  async deposit(req, res, next) {
    try {
      const depositData = req.body;
      
      logTransaction('DEPOSIT_INITIATED', depositData, { ip: req.ip });
      
      const result = await transactionService.processDeposit(depositData);
      
      logTransaction('DEPOSIT_COMPLETED', result, { ip: req.ip });
      
      const response = ApiResponse.success(result, 'Deposit processed successfully', 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process withdrawal transaction
   */
  async withdraw(req, res, next) {
    try {
      const withdrawalData = req.body;
      
      logTransaction('WITHDRAWAL_INITIATED', withdrawalData, { ip: req.ip });
      
      const result = await transactionService.processWithdrawal(withdrawalData);
      
      logTransaction('WITHDRAWAL_COMPLETED', result, { ip: req.ip });
      
      const response = ApiResponse.success(result, 'Withdrawal processed successfully', 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process transfer transaction
   */
  async transfer(req, res, next) {
    try {
      const transferData = req.body;
      const idempotencyKey = req.body.idempotency_key;
      
      // Validate transfer data
      const validation = transactionService.validateTransferData(transferData);
      if (!validation.isValid) {
        const response = ApiResponse.validationError(validation.errors);
        return res.status(response.statusCode).json(response);
      }
      
      logTransaction('TRANSFER_INITIATED', { ...transferData, idempotencyKey }, { ip: req.ip });
      
      const result = await transactionService.processTransfer(transferData, idempotencyKey);
      
      logTransaction('TRANSFER_COMPLETED', result, { ip: req.ip });
      
      const response = ApiResponse.success(result, 'Transfer processed successfully', 201);
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction history for an account
   */
  async getTransactionHistory(req, res, next) {
    try {
      const accountId = parseInt(req.params.accountId);
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        from_date: req.query.from_date,
        to_date: req.query.to_date
      };

      const result = await transactionService.getTransactionHistory(accountId, options);
      
      const response = ApiResponse.success(result, 'Transaction history retrieved successfully');
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionById(req, res, next) {
    try {
      const txnId = parseInt(req.params.txnId);
      
      const transaction = await transactionService.getTransactionById(txnId);
      
      const response = ApiResponse.success(transaction, 'Transaction details retrieved successfully');
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account transaction summary
   */
  async getAccountSummary(req, res, next) {
    try {
      const accountId = parseInt(req.params.accountId);
      const fromDate = new Date(req.query.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const toDate = new Date(req.query.to_date || new Date());

      const summary = await transactionService.getAccountSummary(accountId, fromDate, toDate);
      
      const response = ApiResponse.success(summary, 'Account summary retrieved successfully');
      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check for transaction service
   */
  async healthCheck(req, res, next) {
    try {
      const db = require('../database/connection');
      const dbHealth = await db.healthCheck();
      
      const health = {
        status: 'healthy',
        service: 'transaction-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        uptime: process.uptime()
      };

      const response = ApiResponse.success(health, 'Service is healthy');
      res.status(response.statusCode).json(response);
    } catch (error) {
      const health = {
        status: 'unhealthy',
        service: 'transaction-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        error: error.message,
        uptime: process.uptime()
      };

      const response = ApiResponse.error('Service is unhealthy', 503, [health]);
      res.status(response.statusCode).json(response);
    }
  }
}

module.exports = new TransactionController();