/**
 * Account Projection Model
 * Denormalized account data for transaction processing
 */
class AccountProjection {
  constructor({
    account_id,
    customer_id,
    account_number,
    account_type,
    current_balance,
    currency = 'INR',
    status,
    last_updated = null
  }) {
    this.account_id = account_id;
    this.customer_id = customer_id;
    this.account_number = account_number;
    this.account_type = account_type;
    this.current_balance = parseFloat(current_balance);
    this.currency = currency;
    this.status = status;
    this.last_updated = last_updated;
  }

  /**
   * Convert to JSON object
   */
  toJSON() {
    return {
      account_id: this.account_id,
      customer_id: this.customer_id,
      account_number: this.account_number,
      account_type: this.account_type,
      current_balance: this.current_balance,
      currency: this.currency,
      status: this.status,
      last_updated: this.last_updated
    };
  }

  /**
   * Check if account is active
   */
  isActive() {
    return this.status === 'ACTIVE';
  }

  /**
   * Check if account allows overdraft (only CURRENT accounts)
   */
  allowsOverdraft() {
    return this.account_type === 'CURRENT';
  }

  /**
   * Check if account can handle a debit of given amount
   */
  canDebit(amount) {
    if (!this.isActive()) {
      return {
        allowed: false,
        reason: 'Account is not active'
      };
    }

    const newBalance = this.current_balance - amount;
    
    if (newBalance < 0 && !this.allowsOverdraft()) {
      return {
        allowed: false,
        reason: 'Insufficient balance - no overdraft allowed for this account type'
      };
    }

    return {
      allowed: true,
      newBalance
    };
  }

  /**
   * Check if account can handle a credit of given amount
   */
  canCredit(amount) {
    if (!this.isActive()) {
      return {
        allowed: false,
        reason: 'Account is not active'
      };
    }

    return {
      allowed: true,
      newBalance: this.current_balance + amount
    };
  }

  /**
   * Validate account projection data
   */
  validate() {
    const errors = [];

    if (!this.account_id || isNaN(this.account_id)) {
      errors.push('Valid account_id is required');
    }

    if (!this.customer_id || isNaN(this.customer_id)) {
      errors.push('Valid customer_id is required');
    }

    if (!this.account_number || this.account_number.length !== 12) {
      errors.push('Account number must be 12 digits');
    }

    if (!this.account_type || !['SAVINGS', 'CURRENT', 'SALARY'].includes(this.account_type)) {
      errors.push('Valid account type is required');
    }

    if (this.current_balance === null || this.current_balance === undefined || isNaN(this.current_balance)) {
      errors.push('Valid current balance is required');
    }

    if (!this.status || !['ACTIVE', 'FROZEN', 'CLOSED'].includes(this.status)) {
      errors.push('Valid status is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = AccountProjection;