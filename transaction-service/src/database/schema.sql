-- Transaction Service Database Schema
-- This service owns: transactions, idempotency_keys, account_projections

-- Create database
-- CREATE DATABASE transaction_db;

-- Enums
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT');
CREATE TYPE account_type AS ENUM ('SAVINGS', 'CURRENT', 'SALARY');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- Account projections table (denormalized data from Account Service)
-- This contains minimal account info needed for transaction processing
CREATE TABLE account_projections (
    account_id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    account_type account_type NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status account_status NOT NULL DEFAULT 'ACTIVE',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (service owned)
CREATE TABLE transactions (
    txn_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    txn_type transaction_type NOT NULL,
    counterparty VARCHAR(255),
    reference VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    balance_after DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to account_projections
    FOREIGN KEY (account_id) REFERENCES account_projections(account_id),
    
    -- Business constraints
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_reference CHECK (reference ~ '^REF[0-9]{8}-[A-Z0-9]{6}$')
);

-- Idempotency keys table for transfer operations
CREATE TABLE idempotency_keys (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    txn_id BIGINT,
    request_body JSONB,
    response_body JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (txn_id) REFERENCES transactions(txn_id)
);

-- Indexes for performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_type ON transactions(txn_type);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_account_projections_customer_id ON account_projections(customer_id);
CREATE INDEX idx_account_projections_account_number ON account_projections(account_number);
CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Function to update balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account projection balance based on transaction type
    IF NEW.txn_type IN ('DEPOSIT', 'TRANSFER_IN') THEN
        UPDATE account_projections 
        SET current_balance = current_balance + NEW.amount,
            last_updated = CURRENT_TIMESTAMP
        WHERE account_id = NEW.account_id;
    ELSIF NEW.txn_type IN ('WITHDRAWAL', 'TRANSFER_OUT') THEN
        UPDATE account_projections 
        SET current_balance = current_balance - NEW.amount,
            last_updated = CURRENT_TIMESTAMP
        WHERE account_id = NEW.account_id;
    END IF;
    
    -- Set balance_after in the transaction record
    SELECT current_balance INTO NEW.balance_after
    FROM account_projections 
    WHERE account_id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update balance
CREATE TRIGGER trigger_update_balance
    BEFORE INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM idempotency_keys 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();