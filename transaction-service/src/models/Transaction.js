/**
 * Transaction Model
 * Represents a banking transaction
 */
class Transaction {
  constructor({
    txn_id,
    account_id,
    amount,
    txn_type,
    counterparty = null,
    reference,
    description = null,
    balance_after = null,
    created_at = null,
    updated_at = null
  }) {
    this.txn_id = txn_id;
    this.account_id = account_id;
    this.amount = parseFloat(amount);
    this.txn_type = txn_type;
    this.counterparty = counterparty;
    this.reference = reference;
    this.description = description;
    this.balance_after = balance_after ? parseFloat(balance_after) : null;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  /**
   * Convert to JSON object
   */
  toJSON() {
    return {
      txn_id: this.txn_id,
      account_id: this.account_id,
      amount: this.amount,
      txn_type: this.txn_type,
      counterparty: this.counterparty,
      reference: this.reference,
      description: this.description,
      balance_after: this.balance_after,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Validate transaction data
   */
  validate() {
    const errors = [];

    if (!this.account_id || isNaN(this.account_id)) {
      errors.push('Valid account_id is required');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (!this.txn_type || !['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'].includes(this.txn_type)) {
      errors.push('Valid transaction type is required');
    }

    if (!this.reference || !this.reference.match(/^REF[0-9]{8}-[A-Z0-9]{6}$/)) {
      errors.push('Reference must follow pattern REF[YYYYMMDD]-[6CHARS]');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if transaction is a credit (increases balance)
   */
  isCredit() {
    return ['DEPOSIT', 'TRANSFER_IN'].includes(this.txn_type);
  }

  /**
   * Check if transaction is a debit (decreases balance)
   */
  isDebit() {
    return ['WITHDRAWAL', 'TRANSFER_OUT'].includes(this.txn_type);
  }
}

module.exports = Transaction;