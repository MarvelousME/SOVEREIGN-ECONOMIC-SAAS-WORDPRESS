-- Sample data for testing the ledger service
-- This creates a basic chart of accounts for a UBI system

-- Tenant ID for testing
\set tenant_id '\'00000000-0000-0000-0000-000000000001\''

-- ASSETS
INSERT INTO ledger_accounts (id, tenant_id, code, name, type, currency, balance, metadata) VALUES
  ('10000000-0000-0000-0000-000000000001', :tenant_id, '1000', 'Cash', 'ASSET', 'USD', 0, '{}'),
  ('10000000-0000-0000-0000-000000000002', :tenant_id, '1100', 'Bank Account', 'ASSET', 'USD', 0, '{}'),
  ('10000000-0000-0000-0000-000000000003', :tenant_id, '1200', 'UBI Reserve Fund', 'ASSET', 'USD', 0, '{"purpose": "UBI distribution reserve"}');

-- LIABILITIES
INSERT INTO ledger_accounts (id, tenant_id, code, name, type, currency, balance, metadata) VALUES
  ('20000000-0000-0000-0000-000000000001', :tenant_id, '2000', 'Accounts Payable', 'LIABILITY', 'USD', 0, '{}'),
  ('20000000-0000-0000-0000-000000000002', :tenant_id, '2100', 'UBI Obligations', 'LIABILITY', 'USD', 0, '{"purpose": "Outstanding UBI payments"}');

-- EQUITY
INSERT INTO ledger_accounts (id, tenant_id, code, name, type, currency, balance, metadata) VALUES
  ('30000000-0000-0000-0000-000000000001', :tenant_id, '3000', 'Owner Equity', 'EQUITY', 'USD', 0, '{}'),
  ('30000000-0000-0000-0000-000000000002', :tenant_id, '3100', 'Retained Earnings', 'EQUITY', 'USD', 0, '{}');

-- REVENUE
INSERT INTO ledger_accounts (id, tenant_id, code, name, type, currency, balance, metadata) VALUES
  ('40000000-0000-0000-0000-000000000001', :tenant_id, '4000', 'Service Revenue', 'REVENUE', 'USD', 0, '{}'),
  ('40000000-0000-0000-0000-000000000002', :tenant_id, '4100', 'Donation Revenue', 'REVENUE', 'USD', 0, '{}'),
  ('40000000-0000-0000-0000-000000000003', :tenant_id, '4200', 'Grant Revenue', 'REVENUE', 'USD', 0, '{}');

-- EXPENSES
INSERT INTO ledger_accounts (id, tenant_id, code, name, type, currency, balance, metadata) VALUES
  ('50000000-0000-0000-0000-000000000001', :tenant_id, '5000', 'UBI Distribution Expense', 'EXPENSE', 'USD', 0, '{"purpose": "Monthly UBI payments"}'),
  ('50000000-0000-0000-0000-000000000002', :tenant_id, '5100', 'Operating Expenses', 'EXPENSE', 'USD', 0, '{}'),
  ('50000000-0000-0000-0000-000000000003', :tenant_id, '5200', 'Administrative Expenses', 'EXPENSE', 'USD', 0, '{}');

-- Sample Transaction: Initial funding
INSERT INTO ledger_transactions (id, tenant_id, reference, description, transaction_date, status, created_by) VALUES
  ('90000000-0000-0000-0000-000000000001', :tenant_id, 'INIT-001', 'Initial funding', NOW(), 'COMPLETED', 'system');

INSERT INTO ledger_entries (id, transaction_id, account_id, type, amount, currency) VALUES
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'DEBIT', 10000.00, 'USD'),
  ('91000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CREDIT', 10000.00, 'USD');

-- Update balances
UPDATE ledger_accounts SET balance = 10000.00, version = 2 WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE ledger_accounts SET balance = 10000.00, version = 2 WHERE id = '30000000-0000-0000-0000-000000000001';

SELECT 'Sample data loaded successfully' AS status;
