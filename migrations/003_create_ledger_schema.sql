-- Migration: 003_create_ledger_schema.sql
-- Description: Create double-entry ledger tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE transaction_status AS ENUM ('pending', 'posted', 'reversed', 'failed');
CREATE TYPE entry_type AS ENUM ('debit', 'credit');
CREATE TYPE journal_type AS ENUM ('general', 'sales', 'purchase', 'payroll', 'adjustment');

-- Ledger accounts table
CREATE TABLE ledger_accounts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance NUMERIC(20, 8) NOT NULL DEFAULT 0,
    parent_account_id BIGINT REFERENCES ledger_accounts(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_account_number UNIQUE (tenant_id, account_number),
    CONSTRAINT balance_precision CHECK (balance = ROUND(balance, 8))
);

-- Create indexes for ledger_accounts
CREATE INDEX idx_ledger_accounts_tenant_id ON ledger_accounts(tenant_id);
CREATE INDEX idx_ledger_accounts_account_type ON ledger_accounts(account_type);
CREATE INDEX idx_ledger_accounts_currency ON ledger_accounts(currency);
CREATE INDEX idx_ledger_accounts_parent ON ledger_accounts(parent_account_id);
CREATE INDEX idx_ledger_accounts_active ON ledger_accounts(is_active);
CREATE INDEX idx_ledger_accounts_metadata ON ledger_accounts USING GIN(metadata);

-- Ledger journals table
CREATE TABLE ledger_journals (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_type journal_type NOT NULL,
    reference_number VARCHAR(100),
    description TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT unique_tenant_reference UNIQUE (tenant_id, reference_number)
);

-- Create indexes for ledger_journals
CREATE INDEX idx_ledger_journals_tenant_id ON ledger_journals(tenant_id);
CREATE INDEX idx_ledger_journals_type ON ledger_journals(journal_type);
CREATE INDEX idx_ledger_journals_posted_at ON ledger_journals(posted_at DESC);

-- Ledger transactions table
CREATE TABLE ledger_transactions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_id BIGINT REFERENCES ledger_journals(id) ON DELETE SET NULL,
    transaction_type VARCHAR(100) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    description TEXT,
    reference_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    posted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversed_by_id BIGINT REFERENCES ledger_transactions(id) ON DELETE SET NULL
);

-- Create indexes for ledger_transactions
CREATE INDEX idx_ledger_transactions_tenant_id ON ledger_transactions(tenant_id);
CREATE INDEX idx_ledger_transactions_journal_id ON ledger_transactions(journal_id);
CREATE INDEX idx_ledger_transactions_type ON ledger_transactions(transaction_type);
CREATE INDEX idx_ledger_transactions_status ON ledger_transactions(status);
CREATE INDEX idx_ledger_transactions_reference ON ledger_transactions(reference_id);
CREATE INDEX idx_ledger_transactions_created_at ON ledger_transactions(created_at DESC);
CREATE INDEX idx_ledger_transactions_metadata ON ledger_transactions USING GIN(metadata);

-- Ledger entries table (double-entry records)
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    entry_type entry_type NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    balance_after NUMERIC(20, 8) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT amount_precision CHECK (amount = ROUND(amount, 8)),
    CONSTRAINT balance_precision CHECK (balance_after = ROUND(balance_after, 8))
);

-- Create indexes for ledger_entries
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX idx_ledger_entries_entry_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);

-- Function to validate balanced transaction
CREATE OR REPLACE FUNCTION validate_balanced_transaction()
RETURNS TRIGGER AS $$
DECLARE
    transaction_balance NUMERIC(20, 8);
BEGIN
    -- Calculate sum of debits minus credits for the transaction
    SELECT COALESCE(
        SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 
        0
    ) INTO transaction_balance
    FROM ledger_entries
    WHERE transaction_id = NEW.transaction_id;
    
    -- Transaction must balance (debits = credits)
    IF ABS(transaction_balance) > 0.00000001 THEN
        RAISE EXCEPTION 'Transaction % is not balanced. Difference: %', 
            NEW.transaction_id, transaction_balance;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate balanced transactions
CREATE CONSTRAINT TRIGGER validate_transaction_balance
    AFTER INSERT OR UPDATE ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION validate_balanced_transaction();

-- Function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC(20, 8);
    account_type_val account_type;
BEGIN
    -- Get current balance and account type
    SELECT balance, account_type INTO current_balance, account_type_val
    FROM ledger_accounts
    WHERE id = NEW.account_id;
    
    -- Calculate new balance based on account type and entry type
    IF account_type_val IN ('asset', 'expense') THEN
        -- Assets and expenses increase with debits
        IF NEW.entry_type = 'debit' THEN
            NEW.balance_after := current_balance + NEW.amount;
        ELSE
            NEW.balance_after := current_balance - NEW.amount;
        END IF;
    ELSE
        -- Liabilities, equity, and revenue increase with credits
        IF NEW.entry_type = 'credit' THEN
            NEW.balance_after := current_balance + NEW.amount;
        ELSE
            NEW.balance_after := current_balance - NEW.amount;
        END IF;
    END IF;
    
    -- Update account balance
    UPDATE ledger_accounts
    SET balance = NEW.balance_after, updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update account balances
CREATE TRIGGER update_account_balance_trigger
    BEFORE INSERT ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Update timestamps trigger
CREATE TRIGGER update_ledger_accounts_updated_at BEFORE UPDATE ON ledger_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON ledger_accounts
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ledger_journals
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ledger_transactions
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON ledger_entries
    USING (
        transaction_id IN (
            SELECT id FROM ledger_transactions 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ledger_entries;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ledger_transactions;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ledger_journals;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON ledger_accounts;
-- DROP TRIGGER IF EXISTS update_account_balance_trigger ON ledger_entries;
-- DROP TRIGGER IF EXISTS validate_transaction_balance ON ledger_entries;
-- DROP TRIGGER IF EXISTS update_ledger_accounts_updated_at ON ledger_accounts;
-- DROP FUNCTION IF EXISTS update_account_balance CASCADE;
-- DROP FUNCTION IF EXISTS validate_balanced_transaction CASCADE;
-- DROP TABLE IF EXISTS ledger_entries CASCADE;
-- DROP TABLE IF EXISTS ledger_transactions CASCADE;
-- DROP TABLE IF EXISTS ledger_journals CASCADE;
-- DROP TABLE IF EXISTS ledger_accounts CASCADE;
-- DROP TYPE IF EXISTS journal_type CASCADE;
-- DROP TYPE IF EXISTS entry_type CASCADE;
-- DROP TYPE IF EXISTS transaction_status CASCADE;
-- DROP TYPE IF EXISTS account_type CASCADE;
