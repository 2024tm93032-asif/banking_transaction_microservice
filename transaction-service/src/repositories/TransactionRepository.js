const db = require('../database/connection');
const Transaction = require('../models/Transaction');

/**
 * Transaction Repository
 * Handles database operations for transactions
 */
class TransactionRepository {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Transaction>} Created transaction
   */
  async create(transactionData) {
    const transaction = new Transaction(transactionData);
    const validation = transaction.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO transactions (account_id, amount, txn_type, counterparty, reference, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      transaction.account_id,
      transaction.amount,
      transaction.txn_type,
      transaction.counterparty,
      transaction.reference,
      transaction.description
    ];

    try {
      const result = await db.query(query, values);
      return new Transaction(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Transaction reference already exists');
      }
      throw error;
    }
  }

  /**
   * Find transaction by ID
   * @param {number} txnId - Transaction ID
   * @returns {Promise<Transaction|null>} Transaction or null
   */
  async findById(txnId) {
    const query = 'SELECT * FROM transactions WHERE txn_id = $1';
    const result = await db.query(query, [txnId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Transaction(result.rows[0]);
  }

  /**
   * Find transaction by reference
   * @param {string} reference - Transaction reference
   * @returns {Promise<Transaction|null>} Transaction or null
   */
  async findByReference(reference) {
    const query = 'SELECT * FROM transactions WHERE reference = $1';
    const result = await db.query(query, [reference]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Transaction(result.rows[0]);
  }

  /**
   * Find transactions by account ID
   * @param {number} accountId - Account ID
   * @param {Object} options - Query options (limit, offset, fromDate, toDate)
   * @returns {Promise<Array<Transaction>>} Array of transactions
   */
  async findByAccountId(accountId, options = {}) {
    const { limit = 50, offset = 0, fromDate, toDate } = options;
    
    let query = 'SELECT * FROM transactions WHERE account_id = $1';
    const values = [accountId];
    let paramCount = 1;

    if (fromDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(fromDate);
    }

    if (toDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(toDate);
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(limit);
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(offset);
    }

    const result = await db.query(query, values);
    return result.rows.map(row => new Transaction(row));
  }

  /**
   * Get account transaction summary
   * @param {number} accountId - Account ID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Transaction summary
   */
  async getAccountSummary(accountId, fromDate, toDate) {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN txn_type IN ('DEPOSIT', 'TRANSFER_IN') THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN txn_type IN ('WITHDRAWAL', 'TRANSFER_OUT') THEN amount ELSE 0 END) as total_debits,
        MAX(created_at) as last_transaction_date,
        MIN(created_at) as first_transaction_date
      FROM transactions 
      WHERE account_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
    `;

    const result = await db.query(query, [accountId, fromDate, toDate]);
    const row = result.rows[0];

    return {
      account_id: accountId,
      period: { from: fromDate, to: toDate },
      total_transactions: parseInt(row.total_transactions),
      total_credits: parseFloat(row.total_credits) || 0,
      total_debits: parseFloat(row.total_debits) || 0,
      net_amount: (parseFloat(row.total_credits) || 0) - (parseFloat(row.total_debits) || 0),
      last_transaction_date: row.last_transaction_date,
      first_transaction_date: row.first_transaction_date
    };
  }

  /**
   * Create multiple transactions in a single database transaction
   * @param {Array<Object>} transactionsData - Array of transaction data
   * @returns {Promise<Array<Transaction>>} Created transactions
   */
  async createMultiple(transactionsData) {
    return await db.transaction(async (client) => {
      const transactions = [];
      
      for (const txnData of transactionsData) {
        const transaction = new Transaction(txnData);
        const validation = transaction.validate();
        
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const query = `
          INSERT INTO transactions (account_id, amount, txn_type, counterparty, reference, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const values = [
          transaction.account_id,
          transaction.amount,
          transaction.txn_type,
          transaction.counterparty,
          transaction.reference,
          transaction.description
        ];

        const result = await client.query(query, values);
        transactions.push(new Transaction(result.rows[0]));
      }

      return transactions;
    });
  }

  /**
   * Get transaction count by account ID
   * @param {number} accountId - Account ID
   * @returns {Promise<number>} Transaction count
   */
  async getTransactionCount(accountId) {
    const query = 'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1';
    const result = await db.query(query, [accountId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete transaction (for testing purposes only)
   * @param {number} txnId - Transaction ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(txnId) {
    const query = 'DELETE FROM transactions WHERE txn_id = $1';
    const result = await db.query(query, [txnId]);
    return result.rowCount > 0;
  }
}

module.exports = new TransactionRepository();