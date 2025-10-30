/**
 * Idempotency Key Model
 * For preventing duplicate transactions
 */
class IdempotencyKey {
  constructor({
    id,
    key,
    txn_id = null,
    request_body = null,
    response_body = null,
    created_at = null,
    expires_at = null
  }) {
    this.id = id;
    this.key = key;
    this.txn_id = txn_id;
    this.request_body = request_body;
    this.response_body = response_body;
    this.created_at = created_at;
    this.expires_at = expires_at;
  }

  /**
   * Convert to JSON object
   */
  toJSON() {
    return {
      id: this.id,
      key: this.key,
      txn_id: this.txn_id,
      request_body: this.request_body,
      response_body: this.response_body,
      created_at: this.created_at,
      expires_at: this.expires_at
    };
  }

  /**
   * Check if idempotency key is expired
   */
  isExpired() {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  /**
   * Check if idempotency key has been processed
   */
  isProcessed() {
    return this.txn_id !== null;
  }

  /**
   * Validate idempotency key data
   */
  validate() {
    const errors = [];

    if (!this.key || this.key.length === 0) {
      errors.push('Idempotency key is required');
    }

    if (this.key && this.key.length > 255) {
      errors.push('Idempotency key must be less than 255 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create expiry date (24 hours from creation)
   */
  static createExpiryDate() {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
  }
}

module.exports = IdempotencyKey;