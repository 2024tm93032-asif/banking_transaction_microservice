const db = require('../database/connection');
const AccountProjection = require('../models/AccountProjection');

/**
 * Account Projection Repository
 * Handles database operations for account projections (denormalized account data)
 */
class AccountProjectionRepository {
  /**
   * Create or update account projection
   * @param {Object} accountData - Account projection data
   * @returns {Promise<AccountProjection>} Created/updated account projection
   */
  async upsert(accountData) {
    const account = new AccountProjection(accountData);
    const validation = account.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const query = `
      INSERT INTO account_projections 
      (account_id, customer_id, account_number, account_type, current_balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (account_id) 
      DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        account_number = EXCLUDED.account_number,
        account_type = EXCLUDED.account_type,
        current_balance = EXCLUDED.current_balance,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      account.account_id,
      account.customer_id,
      account.account_number,
      account.account_type,
      account.current_balance,
      account.currency,
      account.status
    ];

    try {
      const result = await db.query(query, values);
      return new AccountProjection(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Account number already exists');
      }
      throw error;
    }
  }

  /**
   * Find account projection by ID
   * @param {number} accountId - Account ID
   * @returns {Promise<AccountProjection|null>} Account projection or null
   */
  async findById(accountId) {
    const query = 'SELECT * FROM account_projections WHERE account_id = $1';
    const result = await db.query(query, [accountId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new AccountProjection(result.rows[0]);
  }

  /**
   * Find account projection by account number
   * @param {string} accountNumber - Account number
   * @returns {Promise<AccountProjection|null>} Account projection or null
   */
  async findByAccountNumber(accountNumber) {
    const query = 'SELECT * FROM account_projections WHERE account_number = $1';
    const result = await db.query(query, [accountNumber]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new AccountProjection(result.rows[0]);
  }

  /**
   * Find account projections by customer ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Array<AccountProjection>>} Array of account projections
   */
  async findByCustomerId(customerId) {
    const query = 'SELECT * FROM account_projections WHERE customer_id = $1 ORDER BY account_id';
    const result = await db.query(query, [customerId]);
    
    return result.rows.map(row => new AccountProjection(row));
  }

  /**
   * Update account balance
   * @param {number} accountId - Account ID
   * @param {number} newBalance - New balance
   * @returns {Promise<AccountProjection>} Updated account projection
   */
  async updateBalance(accountId, newBalance) {
    const query = `
      UPDATE account_projections 
      SET current_balance = $1, last_updated = CURRENT_TIMESTAMP
      WHERE account_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [newBalance, accountId]);
    
    if (result.rows.length === 0) {
      throw new Error('Account projection not found');
    }

    return new AccountProjection(result.rows[0]);
  }

  /**
   * Update account status
   * @param {number} accountId - Account ID
   * @param {string} status - New status
   * @returns {Promise<AccountProjection>} Updated account projection
   */
  async updateStatus(accountId, status) {
    if (!['ACTIVE', 'FROZEN', 'CLOSED'].includes(status)) {
      throw new Error('Invalid account status');
    }

    const query = `
      UPDATE account_projections 
      SET status = $1, last_updated = CURRENT_TIMESTAMP
      WHERE account_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, accountId]);
    
    if (result.rows.length === 0) {
      throw new Error('Account projection not found');
    }

    return new AccountProjection(result.rows[0]);
  }

  /**
   * Check if account exists and is active
   * @param {number} accountId - Account ID
   * @returns {Promise<boolean>} True if account exists and is active
   */
  async isActive(accountId) {
    const query = 'SELECT status FROM account_projections WHERE account_id = $1';
    const result = await db.query(query, [accountId]);
    
    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].status === 'ACTIVE';
  }

  /**
   * Get account balance
   * @param {number} accountId - Account ID
   * @returns {Promise<number|null>} Account balance or null if not found
   */
  async getBalance(accountId) {
    const query = 'SELECT current_balance FROM account_projections WHERE account_id = $1';
    const result = await db.query(query, [accountId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return parseFloat(result.rows[0].current_balance);
  }

  /**
   * Lock account for update (for concurrent transaction processing)
   * @param {number} accountId - Account ID
   * @param {Object} client - Database client (for transactions)
   * @returns {Promise<AccountProjection>} Locked account projection
   */
  async lockForUpdate(accountId, client = null) {
    const query = 'SELECT * FROM account_projections WHERE account_id = $1 FOR UPDATE';
    const dbClient = client || db;
    
    const result = await dbClient.query(query, [accountId]);
    
    if (result.rows.length === 0) {
      throw new Error('Account projection not found');
    }

    return new AccountProjection(result.rows[0]);
  }

  /**
   * Delete account projection (for testing purposes only)
   * @param {number} accountId - Account ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(accountId) {
    const query = 'DELETE FROM account_projections WHERE account_id = $1';
    const result = await db.query(query, [accountId]);
    return result.rowCount > 0;
  }

  /**
   * Get all account projections with pagination
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array<AccountProjection>>} Array of account projections
   */
  async findAll(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    let query = 'SELECT * FROM account_projections ORDER BY account_id';
    const values = [];

    if (limit) {
      query += ' LIMIT $1';
      values.push(limit);
    }

    if (offset) {
      query += values.length ? ' OFFSET $2' : ' OFFSET $1';
      values.push(offset);
    }

    const result = await db.query(query, values);
    return result.rows.map(row => new AccountProjection(row));
  }
}

module.exports = new AccountProjectionRepository();