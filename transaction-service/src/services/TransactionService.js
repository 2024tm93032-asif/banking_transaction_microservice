const transactionRepository = require('../repositories/TransactionRepository');
const accountProjectionRepository = require('../repositories/AccountProjectionRepository');
const idempotencyKeyRepository = require('../repositories/IdempotencyKeyRepository');
const { generateReference } = require('../utils/referenceGenerator');
const db = require('../database/connection');

/**
 * Transaction Service
 * Handles business logic for transaction operations
 */
class TransactionService {
  /**
   * Process a deposit transaction
   * @param {Object} depositData - Deposit transaction data
   * @returns {Promise<Object>} Transaction result
   */
  async processDeposit(depositData) {
    const { account_id, amount, counterparty, description } = depositData;

    // Validate account exists and is active
    const account = await accountProjectionRepository.findById(account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.isActive()) {
      throw new Error('Account is not active');
    }

    // Check if account can handle credit
    const creditCheck = account.canCredit(amount);
    if (!creditCheck.allowed) {
      throw new Error(creditCheck.reason);
    }

    // Generate unique reference
    const reference = generateReference();

    // Create transaction
    const transaction = await transactionRepository.create({
      account_id,
      amount,
      txn_type: 'DEPOSIT',
      counterparty,
      reference,
      description
    });

    return {
      success: true,
      transaction: transaction.toJSON(),
      new_balance: creditCheck.newBalance
    };
  }

  /**
   * Process a withdrawal transaction
   * @param {Object} withdrawalData - Withdrawal transaction data
   * @returns {Promise<Object>} Transaction result
   */
  async processWithdrawal(withdrawalData) {
    const { account_id, amount, counterparty, description } = withdrawalData;

    // Validate account exists and is active
    const account = await accountProjectionRepository.findById(account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (!account.isActive()) {
      throw new Error('Account is not active');
    }

    // Check if account can handle debit
    const debitCheck = account.canDebit(amount);
    if (!debitCheck.allowed) {
      throw new Error(debitCheck.reason);
    }

    // Generate unique reference
    const reference = generateReference();

    // Create transaction
    const transaction = await transactionRepository.create({
      account_id,
      amount,
      txn_type: 'WITHDRAWAL',
      counterparty,
      reference,
      description
    });

    return {
      success: true,
      transaction: transaction.toJSON(),
      new_balance: debitCheck.newBalance
    };
  }

  /**
   * Process a transfer transaction with dual entry
   * @param {Object} transferData - Transfer transaction data
   * @param {string} idempotencyKey - Idempotency key for duplicate prevention
   * @returns {Promise<Object>} Transfer result
   */
  async processTransfer(transferData, idempotencyKey = null) {
    const { from_account_id, to_account_id, amount, description } = transferData;

    // Handle idempotency if key provided
    if (idempotencyKey) {
      const keyStatus = await idempotencyKeyRepository.checkKey(idempotencyKey);
      
      if (keyStatus.exists) {
        if (keyStatus.expired) {
          throw new Error('Idempotency key has expired');
        }
        if (keyStatus.processed) {
          // Return existing response
          return keyStatus.response;
        }
      } else {
        // Create new idempotency key
        await idempotencyKeyRepository.create({
          key: idempotencyKey,
          request_body: transferData
        });
      }
    }

    try {
      // Process transfer in database transaction
      const result = await db.transaction(async (client) => {
        // Lock both accounts for update
        const fromAccount = await accountProjectionRepository.lockForUpdate(from_account_id, client);
        const toAccount = await accountProjectionRepository.lockForUpdate(to_account_id, client);

        if (!fromAccount) {
          throw new Error('Source account not found');
        }
        if (!toAccount) {
          throw new Error('Destination account not found');
        }

        if (!fromAccount.isActive()) {
          throw new Error('Source account is not active');
        }
        if (!toAccount.isActive()) {
          throw new Error('Destination account is not active');
        }

        // Check if source account can handle debit
        const debitCheck = fromAccount.canDebit(amount);
        if (!debitCheck.allowed) {
          throw new Error(`Transfer failed: ${debitCheck.reason}`);
        }

        // Check if destination account can handle credit
        const creditCheck = toAccount.canCredit(amount);
        if (!creditCheck.allowed) {
          throw new Error(`Transfer failed: ${creditCheck.reason}`);
        }

        // Generate unique reference for this transfer
        const reference = generateReference();

        // Create both transaction entries
        const debitTransaction = {
          account_id: from_account_id,
          amount,
          txn_type: 'TRANSFER_OUT',
          counterparty: `Transfer to ${toAccount.account_number}`,
          reference: `${reference}-OUT`,
          description
        };

        const creditTransaction = {
          account_id: to_account_id,
          amount,
          txn_type: 'TRANSFER_IN',
          counterparty: `Transfer from ${fromAccount.account_number}`,
          reference: `${reference}-IN`,
          description
        };

        // Execute both transactions
        const transactions = await transactionRepository.createMultiple([
          debitTransaction,
          creditTransaction
        ]);

        return {
          success: true,
          transfer_reference: reference,
          debit_transaction: transactions[0].toJSON(),
          credit_transaction: transactions[1].toJSON(),
          from_account_new_balance: debitCheck.newBalance,
          to_account_new_balance: creditCheck.newBalance
        };
      });

      // Update idempotency key with result if provided
      if (idempotencyKey) {
        await idempotencyKeyRepository.updateWithResult(
          idempotencyKey,
          result.debit_transaction.txn_id,
          result
        );
      }

      return result;

    } catch (error) {
      // If idempotency key was created but transaction failed, clean it up
      if (idempotencyKey) {
        await idempotencyKeyRepository.delete(idempotencyKey);
      }
      throw error;
    }
  }

  /**
   * Get transaction history for an account
   * @param {number} accountId - Account ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Transaction history
   */
  async getTransactionHistory(accountId, options = {}) {
    const { page = 1, limit = 50, from_date, to_date } = options;
    const offset = (page - 1) * limit;

    // Validate account exists
    const account = await accountProjectionRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get transactions
    const transactions = await transactionRepository.findByAccountId(accountId, {
      limit,
      offset,
      fromDate: from_date,
      toDate: to_date
    });

    // Get total count
    const totalCount = await transactionRepository.getTransactionCount(accountId);

    return {
      account_id: accountId,
      current_balance: account.current_balance,
      transactions: transactions.map(txn => txn.toJSON()),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        page_size: limit
      }
    };
  }

  /**
   * Get transaction details by ID
   * @param {number} txnId - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransactionById(txnId) {
    const transaction = await transactionRepository.findById(txnId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction.toJSON();
  }

  /**
   * Get account transaction summary
   * @param {number} accountId - Account ID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Transaction summary
   */
  async getAccountSummary(accountId, fromDate, toDate) {
    // Validate account exists
    const account = await accountProjectionRepository.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const summary = await transactionRepository.getAccountSummary(accountId, fromDate, toDate);
    
    return {
      ...summary,
      current_balance: account.current_balance,
      account_details: {
        account_number: account.account_number,
        account_type: account.account_type,
        status: account.status
      }
    };
  }

  /**
   * Validate transfer data
   * @param {Object} transferData - Transfer data to validate
   * @returns {Object} Validation result
   */
  validateTransferData(transferData) {
    const { from_account_id, to_account_id, amount, description } = transferData;
    const errors = [];

    if (!from_account_id || isNaN(from_account_id)) {
      errors.push('Valid source account ID is required');
    }

    if (!to_account_id || isNaN(to_account_id)) {
      errors.push('Valid destination account ID is required');
    }

    if (from_account_id === to_account_id) {
      errors.push('Source and destination accounts cannot be the same');
    }

    if (!amount || amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (amount && amount > 1000000) {
      errors.push('Amount exceeds maximum transfer limit');
    }

    if (description && description.length > 255) {
      errors.push('Description must be less than 255 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if transaction is high value (for notifications)
   * @param {number} amount - Transaction amount
   * @returns {boolean} True if high value
   */
  isHighValueTransaction(amount) {
    return amount >= 100000; // High value threshold: 1 lakh INR
  }
}

module.exports = new TransactionService();