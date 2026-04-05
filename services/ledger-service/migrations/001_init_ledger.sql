-- Ledger Service Database Schema
-- Double-entry accounting system

-- Accounts table
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    currency CHAR(3) NOT NULL,
    balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    parent_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT unique_tenant_code UNIQUE (tenant_id, code)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    reference VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    transaction_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED')),
    idempotency_key UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    reversed_by_id UUID,
    reverses_id UUID,
    CONSTRAINT fk_reversed_by FOREIGN KEY (reversed_by_id) REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reverses FOREIGN KEY (reverses_id) REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT unique_idempotency_key UNIQUE (tenant_id, idempotency_key)
);

-- Entries table (double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount DECIMAL(20, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_account FOREIGN KEY (account_id) REFERENCES ledger_accounts(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON ledger_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON ledger_accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON ledger_accounts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON ledger_accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON ledger_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON ledger_transactions(tenant_id, reference);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON ledger_transactions(tenant_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON ledger_transactions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON ledger_transactions(tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_entries_account_date ON ledger_entries(account_id, created_at);

-- Comments for documentation
COMMENT ON TABLE ledger_accounts IS 'Chart of accounts for double-entry ledger';
COMMENT ON TABLE ledger_transactions IS 'Financial transactions with double-entry bookkeeping';
COMMENT ON TABLE ledger_entries IS 'Individual debit/credit entries for each transaction';

COMMENT ON COLUMN ledger_accounts.type IS 'Account type: ASSET, LIABILITY, EQUITY, REVENUE, or EXPENSE';
COMMENT ON COLUMN ledger_accounts.balance IS 'Current account balance (calculated from entries)';
COMMENT ON COLUMN ledger_accounts.version IS 'Optimistic locking version';

COMMENT ON COLUMN ledger_transactions.status IS 'Transaction status: PENDING, COMPLETED, REVERSED, or FAILED';
COMMENT ON COLUMN ledger_transactions.idempotency_key IS 'Unique key for idempotent transaction creation';
COMMENT ON COLUMN ledger_transactions.reverses_id IS 'References the transaction being reversed';

COMMENT ON COLUMN ledger_entries.type IS 'Entry type: DEBIT or CREDIT';
COMMENT ON COLUMN ledger_entries.amount IS 'Entry amount (always positive)';
