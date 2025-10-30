const db = require('../database/connection');
const IdempotencyKey = require('../models/IdempotencyKey');

/**
 * Idempotency Key Repository
 * Handles database operations for idempotency keys
 */
class IdempotencyKeyRepository {
  /**
   * Create a new idempotency key
   * @param {Object} idempotencyData - Idempotency key data
   * @returns {Promise<IdempotencyKey>} Created idempotency key
   */
  async create(idempotencyData) {
    const idempotencyKey = new IdempotencyKey(idempotencyData);
    const validation = idempotencyKey.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Set expiry date if not provided
    const expiresAt = idempotencyKey.expires_at || IdempotencyKey.createExpiryDate();

    const query = `
      INSERT INTO idempotency_keys (key, request_body, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      idempotencyKey.key,
      JSON.stringify(idempotencyKey.request_body),
      expiresAt
    ];

    try {
      const result = await db.query(query, values);
      return new IdempotencyKey(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Idempotency key already exists');
      }
      throw error;
    }
  }

  /**
   * Find idempotency key by key value
   * @param {string} key - Idempotency key
   * @returns {Promise<IdempotencyKey|null>} Idempotency key or null
   */
  async findByKey(key) {
    const query = 'SELECT * FROM idempotency_keys WHERE key = $1';
    const result = await db.query(query, [key]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new IdempotencyKey({
      ...row,
      request_body: row.request_body ? JSON.parse(row.request_body) : null,
      response_body: row.response_body ? JSON.parse(row.response_body) : null
    });
  }

  /**
   * Update idempotency key with transaction ID and response
   * @param {string} key - Idempotency key
   * @param {number} txnId - Transaction ID
   * @param {Object} responseBody - Response body
   * @returns {Promise<IdempotencyKey>} Updated idempotency key
   */
  async updateWithResult(key, txnId, responseBody) {
    const query = `
      UPDATE idempotency_keys 
      SET txn_id = $1, response_body = $2
      WHERE key = $3
      RETURNING *
    `;

    const result = await db.query(query, [txnId, JSON.stringify(responseBody), key]);
    
    if (result.rows.length === 0) {
      throw new Error('Idempotency key not found');
    }

    const row = result.rows[0];
    return new IdempotencyKey({
      ...row,
      request_body: row.request_body ? JSON.parse(row.request_body) : null,
      response_body: row.response_body ? JSON.parse(row.response_body) : null
    });
  }

  /**
   * Check if idempotency key exists and is not expired
   * @param {string} key - Idempotency key
   * @returns {Promise<Object>} Status object with exists, expired, processed flags
   */
  async checkKey(key) {
    const query = `
      SELECT key, txn_id, expires_at, response_body
      FROM idempotency_keys 
      WHERE key = $1
    `;
    
    const result = await db.query(query, [key]);
    
    if (result.rows.length === 0) {
      return {
        exists: false,
        expired: false,
        processed: false,
        response: null
      };
    }

    const row = result.rows[0];
    const expiresAt = new Date(row.expires_at);
    const now = new Date();
    const isExpired = now > expiresAt;
    const isProcessed = row.txn_id !== null;

    return {
      exists: true,
      expired: isExpired,
      processed: isProcessed,
      response: row.response_body ? JSON.parse(row.response_body) : null
    };
  }

  /**
   * Clean up expired idempotency keys
   * @returns {Promise<number>} Number of deleted keys
   */
  async cleanupExpired() {
    const query = 'DELETE FROM idempotency_keys WHERE expires_at < CURRENT_TIMESTAMP';
    const result = await db.query(query);
    return result.rowCount;
  }

  /**
   * Delete idempotency key
   * @param {string} key - Idempotency key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    const query = 'DELETE FROM idempotency_keys WHERE key = $1';
    const result = await db.query(query, [key]);
    return result.rowCount > 0;
  }

  /**
   * Get idempotency key statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN txn_id IS NOT NULL THEN 1 END) as processed_keys,
        COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_keys
      FROM idempotency_keys
    `;

    const result = await db.query(query);
    const row = result.rows[0];

    return {
      total_keys: parseInt(row.total_keys),
      processed_keys: parseInt(row.processed_keys),
      expired_keys: parseInt(row.expired_keys),
      pending_keys: parseInt(row.total_keys) - parseInt(row.processed_keys)
    };
  }

  /**
   * Find idempotency keys by transaction ID
   * @param {number} txnId - Transaction ID
   * @returns {Promise<Array<IdempotencyKey>>} Array of idempotency keys
   */
  async findByTransactionId(txnId) {
    const query = 'SELECT * FROM idempotency_keys WHERE txn_id = $1';
    const result = await db.query(query, [txnId]);
    
    return result.rows.map(row => new IdempotencyKey({
      ...row,
      request_body: row.request_body ? JSON.parse(row.request_body) : null,
      response_body: row.response_body ? JSON.parse(row.response_body) : null
    }));
  }
}

module.exports = new IdempotencyKeyRepository();