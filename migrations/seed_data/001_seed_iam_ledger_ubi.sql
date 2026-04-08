-- Migration: 001_seed_iam_ledger_ubi.sql
-- Description: Comprehensive seed data for IAM, Ledger, and UBI Engine
-- Created: 2026-04-08
-- Requires: uuid_generate_v4() from pgcrypto extension

BEGIN;

-- ============================================
-- SECTION 1: TENANTS (3 tenants)
-- ============================================
INSERT INTO tenants (id, slug, name, plan, status, settings, created_at) VALUES
(1, 'demo', 'Meridian Dynamics Corp', 'free', 'trial', 
 '{"primary_color": "#4F46E5", "timezone": "America/New_York"}', 
 '2026-01-15 09:00:00+00'),
(2, 'business', 'NovaTech Industries', 'professional', 'active', 
 '{"primary_color": "#059669", "timezone": "Europe/London"}', 
 '2026-02-20 14:30:00+00'),
(3, 'enterprise', 'Apex Global Holdings', 'enterprise', 'active', 
 '{"primary_color": "#DC2626", "timezone": "Asia/Tokyo", "features": ["advanced_ubi", "custom_rules"]}', 
 '2026-03-01 08:00:00+00');

-- ============================================
-- SECTION 2: USERS (12 users across tenants)
-- ============================================
-- Demo tenant users (5 users)
INSERT INTO users (id, tenant_id, username, email, password_hash, status, metadata, created_at, last_login_at) VALUES
(1, 1, 'sarah.chen', 'sarah.chen@meridian.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Sarah", "last_name": "Chen", "department": "Engineering"}', 
 '2026-01-15 09:15:00+00', '2026-04-07 16:45:00+00'),
(2, 1, 'marcus.wright', 'marcus.wright@meridian.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Marcus", "last_name": "Wright", "department": "Product"}', 
 '2026-01-16 10:00:00+00', '2026-04-06 11:20:00+00'),
(3, 1, 'elena.rodriguez', 'elena.rodriguez@meridian.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Elena", "last_name": "Rodriguez", "department": "Finance"}', 
 '2026-01-17 14:30:00+00', '2026-04-07 09:00:00+00'),
(4, 1, 'james.oconnor', 'james.oconnor@meridian.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'inactive', 
 '{"first_name": "James", "last_name": "O Connor", "department": "Marketing"}', 
 '2026-02-01 08:00:00+00', NULL),
(5, 1, 'priya.sharma', 'priya.sharma@meridian.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Priya", "last_name": "Sharma", "department": "Engineering"}', 
 '2026-02-10 11:00:00+00', '2026-04-07 14:30:00+00');

-- Business tenant users (4 users)
INSERT INTO users (id, tenant_id, username, email, password_hash, status, metadata, created_at, last_login_at) VALUES
(6, 2, 'william.foster', 'william.foster@novatech.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "William", "last_name": "Foster", "department": "Executive"}', 
 '2026-02-20 15:00:00+00', '2026-04-07 18:00:00+00'),
(7, 2, 'amanda.bertone', 'amanda.bertone@novatech.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Amanda", "last_name": "Bertone", "department": "Operations"}', 
 '2026-02-22 09:30:00+00', '2026-04-06 16:00:00+00'),
(8, 2, 'david.kim', 'david.kim@novatech.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "David", "last_name": "Kim", "department": "Engineering"}', 
 '2026-03-01 10:00:00+00', '2026-04-07 10:15:00+00'),
(9, 2, 'sofia.andersson', 'sofia.andersson@novatech.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Sofia", "last_name": "Andersson", "department": "Finance"}', 
 '2026-03-05 14:00:00+00', '2026-04-05 12:30:00+00');

-- Enterprise tenant users (3 users)
INSERT INTO users (id, tenant_id, username, email, password_hash, status, metadata, created_at, last_login_at) VALUES
(10, 3, 'victor.sterling', 'victor.sterling@apex.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Victor", "last_name": "Sterling", "department": "Executive"}', 
 '2026-03-01 08:30:00+00', '2026-04-07 20:00:00+00'),
(11, 3, 'natalie.hayes', 'natalie.hayes@apex.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Natalie", "last_name": "Hayes", "department": "Treasury"}', 
 '2026-03-03 11:00:00+00', '2026-04-07 15:45:00+00'),
(12, 3, 'kenji.tanaka', 'kenji.tanaka@apex.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'active', 
 '{"first_name": "Kenji", "last_name": "Tanaka", "department": "Strategy"}', 
 '2026-03-10 09:00:00+00', '2026-04-06 09:30:00+00');

-- ============================================
-- SECTION 3: USER ROLES
-- ============================================
INSERT INTO user_roles (user_id, role, tenant_id, granted_at, granted_by) VALUES
-- Demo tenant roles
(1, 'owner', 1, '2026-01-15 09:15:00+00', NULL),
(2, 'admin', 1, '2026-01-16 10:00:00+00', 1),
(3, 'manager', 1, '2026-01-17 14:30:00+00', 1),
(4, 'member', 1, '2026-02-01 08:00:00+00', 2),
(5, 'member', 1, '2026-02-10 11:00:00+00', 2),
-- Business tenant roles
(6, 'owner', 2, '2026-02-20 15:00:00+00', NULL),
(7, 'admin', 2, '2026-02-22 09:30:00+00', 6),
(8, 'manager', 2, '2026-03-01 10:00:00+00', 6),
(9, 'member', 2, '2026-03-05 14:00:00+00', 7),
-- Enterprise tenant roles
(10, 'owner', 3, '2026-03-01 08:30:00+00', NULL),
(11, 'admin', 3, '2026-03-03 11:00:00+00', 10),
(12, 'manager', 3, '2026-03-10 09:00:00+00', 10);

-- ============================================
-- SECTION 4: SERVICE ACCOUNTS (3 service accounts)
-- ============================================
INSERT INTO service_accounts (id, tenant_id, name, type, scopes, credentials, active, created_at, created_by) VALUES
(1, 1, 'meridian-api-gateway', 'api', 
 '{"ledger": ["read", "write"], "ubi": ["read"]}', 
 '{"api_key": "sk_live_demo_gateway_xxxxx"}', true, 
 '2026-01-20 00:00:00+00', 1),
(2, 2, 'novatech-automation-bot', 'bot', 
 '{"ledger": ["read", "write"], "ubi": ["read", "write"], "tasks": ["read", "write"]}', 
 '{"bot_token": "bot_demo_novatech_xxxxx"}', true, 
 '2026-02-25 00:00:00+00', 6),
(3, 3, 'apex-treasury-agent', 'agent', 
 '{"ledger": ["read", "write"], "ubi": ["read", "write"], "treasury": ["read", "write"]}', 
 '{"agent_id": "agent_apex_treasury"}', true, 
 '2026-03-05 00:00:00+00', 10);

-- ============================================
-- SECTION 5: LEDGER ACCOUNTS (Chart of Accounts)
-- ============================================
-- Demo tenant accounts
INSERT INTO ledger_accounts (id, tenant_id, account_number, account_name, account_type, currency, balance, parent_account_id) VALUES
(1, 1, '1000', 'Cash and Cash Equivalents', 'asset', 'USD', 50000.00000000, NULL),
(2, 1, '1100', 'Accounts Receivable', 'asset', 'USD', 15000.00000000, NULL),
(3, 1, '1200', 'Equipment', 'asset', 'USD', 25000.00000000, NULL),
(4, 1, '2000', 'Accounts Payable', 'liability', 'USD', 12000.00000000, NULL),
(5, 1, '2100', 'Notes Payable', 'liability', 'USD', 10000.00000000, NULL),
(6, 1, '3000', 'Common Stock', 'equity', 'USD', 50000.00000000, NULL),
(7, 1, '3100', 'Retained Earnings', 'equity', 'USD', 18000.00000000, NULL),
(8, 1, '4000', 'Service Revenue', 'revenue', 'USD', 75000.00000000, NULL),
(9, 1, '5000', 'Salaries and Wages', 'expense', 'USD', 28000.00000000, NULL),
(10, 1, '5100', 'Rent Expense', 'expense', 'USD', 9600.00000000, NULL),
(11, 1, '5200', 'Software Licenses', 'expense', 'USD', 4200.00000000, NULL);

-- Business tenant accounts
INSERT INTO ledger_accounts (id, tenant_id, account_number, account_name, account_type, currency, balance, parent_account_id) VALUES
(12, 2, '1000', 'Cash and Cash Equivalents', 'asset', 'USD', 250000.00000000, NULL),
(13, 2, '1100', 'Accounts Receivable', 'asset', 'USD', 85000.00000000, NULL),
(14, 2, '1200', 'Inventory', 'asset', 'USD', 120000.00000000, NULL),
(15, 2, '1300', 'Prepaid Expenses', 'asset', 'USD', 15000.00000000, NULL),
(16, 2, '2000', 'Accounts Payable', 'liability', 'USD', 55000.00000000, NULL),
(17, 2, '2200', 'Accrued Liabilities', 'liability', 'USD', 22000.00000000, NULL),
(18, 2, '3000', 'Common Stock', 'equity', 'USD', 300000.00000000, NULL),
(19, 2, '3100', 'Retained Earnings', 'equity', 'USD', 93000.00000000, NULL),
(20, 2, '4000', 'Product Sales', 'revenue', 'USD', 420000.00000000, NULL),
(21, 2, '4100', 'Service Revenue', 'revenue', 'USD', 180000.00000000, NULL),
(22, 2, '5000', 'Cost of Goods Sold', 'expense', 'USD', 210000.00000000, NULL),
(23, 2, '5100', 'Operating Expenses', 'expense', 'USD', 95000.00000000, NULL),
(24, 2, '5200', 'Marketing Expenses', 'expense', 'USD', 45000.00000000, NULL);

-- Enterprise tenant accounts
INSERT INTO ledger_accounts (id, tenant_id, account_number, account_name, account_type, currency, balance, parent_account_id) VALUES
(25, 3, '1000', 'Cash and Cash Equivalents', 'asset', 'USD', 2500000.00000000, NULL),
(26, 3, '1100', 'Accounts Receivable', 'asset', 'USD', 850000.00000000, NULL),
(27, 3, '1200', 'Investments', 'asset', 'USD', 1500000.00000000, NULL),
(28, 3, '1300', 'Fixed Assets', 'asset', 'USD', 800000.00000000, NULL),
(29, 3, '2000', 'Accounts Payable', 'liability', 'USD', 320000.00000000, NULL),
(30, 3, '2100', 'Long-Term Debt', 'liability', 'USD', 1500000.00000000, NULL),
(31, 3, '2200', 'Deferred Revenue', 'liability', 'USD', 180000.00000000, NULL),
(32, 3, '3000', 'Common Stock', 'equity', 'USD', 2500000.00000000, NULL),
(33, 3, '3100', 'Additional Paid-In Capital', 'equity', 'USD', 500000.00000000, NULL),
(34, 3, '3200', 'Retained Earnings', 'equity', 'USD', 1330000.00000000, NULL),
(35, 3, '4000', 'Revenue - Products', 'revenue', 'USD', 4500000.00000000, NULL),
(36, 3, '4100', 'Revenue - Services', 'revenue', 'USD', 2200000.00000000, NULL),
(37, 3, '5000', 'Cost of Revenue', 'expense', 'USD', 2400000.00000000, NULL),
(38, 3, '5100', 'Operating Expenses', 'expense', 'USD', 850000.00000000, NULL),
(39, 3, '5200', 'Research and Development', 'expense', 'USD', 650000.00000000, NULL);

-- ============================================
-- SECTION 6: LEDGER JOURNALS (8 journal entries)
-- ============================================
INSERT INTO ledger_journals (id, tenant_id, journal_type, reference_number, description, posted_at, created_by) VALUES
-- Demo tenant journals (3)
(1, 1, 'general', 'GJ-2026-0001', 'Initial capital contribution', '2026-01-15 10:00:00+00', 1),
(2, 1, 'general', 'GJ-2026-0002', 'Monthly software license renewal', '2026-02-01 09:00:00+00', 3),
(3, 1, 'general', 'GJ-2026-0003', 'Q1 client payment received', '2026-03-15 14:00:00+00', 3),
-- Business tenant journals (3)
(4, 2, 'sales', 'SJ-2026-0012', 'Invoice #INV-2026-0045 for NovaTech Pro subscription', '2026-03-20 11:00:00+00', 8),
(5, 2, 'general', 'GJ-2026-0015', 'Equipment depreciation allocation', '2026-03-25 16:00:00+00', 9),
(6, 2, 'purchase', 'PJ-2026-0008', 'Inventory restock from Global Supplies Inc', '2026-04-01 10:00:00+00', 7),
-- Enterprise tenant journals (2)
(7, 3, 'general', 'GJ-2026-0001', 'Q1 consolidated revenue entry', '2026-03-31 23:00:00+00', 11),
(8, 3, 'payroll', 'PAY-2026-0004', 'April 2026 payroll distribution', '2026-04-05 00:00:00+00', 11);

-- ============================================
-- SECTION 7: LEDGER TRANSACTIONS (25 transactions)
-- ============================================
-- Demo tenant transactions (10)
INSERT INTO ledger_transactions (id, tenant_id, journal_id, transaction_type, status, description, reference_id, created_at, posted_at) VALUES
(1, 1, 1, 'capital_contribution', 'posted', 'Owner capital contribution for startup runway', 'TXN-2026-001', '2026-01-15 10:00:00+00', '2026-01-15 10:00:01+00'),
(2, 1, 2, 'expense_payment', 'posted', 'Annual software license renewal - Figma Enterprise', 'TXN-2026-002', '2026-02-01 09:00:00+00', '2026-02-01 09:00:05+00'),
(3, 1, 3, 'cash_receipt', 'posted', 'Payment from Horizon Digital for Q1 services', 'TXN-2026-003', '2026-03-15 14:00:00+00', '2026-03-15 14:00:03+00'),
(4, 1, NULL, 'expense_payment', 'posted', 'March salaries disbursement', 'TXN-2026-004', '2026-03-31 16:00:00+00', '2026-03-31 16:00:02+00'),
(5, 1, NULL, 'expense_payment', 'posted', 'Office rent - April 2026', 'TXN-2026-005', '2026-04-01 09:00:00+00', '2026-04-01 09:00:01+00'),
(6, 1, NULL, 'cash_receipt', 'posted', 'Payment from Cascade Systems for MVP delivery', 'TXN-2026-006', '2026-04-03 11:00:00+00', '2026-04-03 11:00:02+00'),
(7, 1, NULL, 'expense_payment', 'posted', 'AWS hosting charges - March 2026', 'TXN-2026-007', '2026-04-05 10:00:00+00', '2026-04-05 10:00:01+00'),
(8, 1, NULL, 'transfer', 'posted', 'UBI pool funding allocation', 'TXN-2026-008', '2026-04-07 00:00:00+00', '2026-04-07 00:00:01+00'),
(9, 1, NULL, 'cash_receipt', 'posted', 'Payment from Zenith Consulting', 'TXN-2026-009', '2026-04-07 15:00:00+00', '2026-04-07 15:00:02+00'),
(10, 1, NULL, 'expense_payment', 'posted', 'Software subscription - GitHub Enterprise', 'TXN-2026-010', '2026-04-07 16:30:00+00', '2026-04-07 16:30:01+00'),

-- Business tenant transactions (10)
(11, 2, 4, 'invoice_posting', 'posted', 'Invoice posted for Novatech Pro annual subscription', 'TXN-2026-011', '2026-03-20 11:00:00+00', '2026-03-20 11:00:05+00'),
(12, 2, 5, 'depreciation_entry', 'posted', 'Monthly depreciation - manufacturing equipment', 'TXN-2026-012', '2026-03-25 16:00:00+00', '2026-03-25 16:00:02+00'),
(13, 2, 6, 'inventory_purchase', 'posted', 'Inventory restock - electronic components', 'TXN-2026-013', '2026-04-01 10:00:00+00', '2026-04-01 10:00:03+00'),
(14, 2, NULL, 'cash_receipt', 'posted', 'Payment from Pinnacle Solutions', 'TXN-2026-014', '2026-04-02 09:00:00+00', '2026-04-02 09:00:02+00'),
(15, 2, NULL, 'expense_payment', 'posted', 'Marketing campaign - LinkedIn Ads Q2', 'TXN-2026-015', '2026-04-03 14:00:00+00', '2026-04-03 14:00:01+00'),
(16, 2, NULL, 'expense_payment', 'posted', 'Payroll processing fee - April', 'TXN-2026-016', '2026-04-05 08:00:00+00', '2026-04-05 08:00:01+00'),
(17, 2, NULL, 'transfer', 'posted', 'UBI pool allocation - business pool', 'TXN-2026-017', '2026-04-07 00:00:00+00', '2026-04-07 00:00:01+00'),
(18, 2, NULL, 'cash_receipt', 'posted', 'Invoice #INV-2026-0048 payment', 'TXN-2026-018', '2026-04-07 11:00:00+00', '2026-04-07 11:00:02+00'),
(19, 2, NULL, 'expense_payment', 'posted', 'Annual insurance premium', 'TXN-2026-019', '2026-04-07 14:00:00+00', '2026-04-07 14:00:01+00'),
(20, 2, NULL, 'cash_receipt', 'posted', 'Refund from vendor - overpayment', 'TXN-2026-020', '2026-04-08 10:00:00+00', '2026-04-08 10:00:01+00'),

-- Enterprise tenant transactions (5)
(21, 3, 7, 'revenue_consolidation', 'posted', 'Q1 revenue recognition across all business units', 'TXN-2026-021', '2026-03-31 23:00:00+00', '2026-03-31 23:00:05+00'),
(22, 3, 8, 'payroll_disbursement', 'posted', 'April 2026 payroll for executive and staff', 'TXN-2026-022', '2026-04-05 00:00:00+00', '2026-04-05 00:00:02+00'),
(23, 3, NULL, 'expense_payment', 'posted', 'R&D equipment purchase - laboratory', 'TXN-2026-023', '2026-04-06 11:00:00+00', '2026-04-06 11:00:02+00'),
(24, 3, NULL, 'investment_allocation', 'posted', 'Treasury reserve rebalancing', 'TXN-2026-024', '2026-04-07 16:00:00+00', '2026-04-07 16:00:01+00'),
(25, 3, NULL, 'dividend_distribution', 'posted', 'Q1 shareholder dividend transfer', 'TXN-2026-025', '2026-04-08 09:00:00+00', '2026-04-08 09:00:02+00');

-- ============================================
-- SECTION 8: LEDGER ENTRIES (60+ balanced entries)
-- Each transaction must have debits = credits
-- ============================================
-- Demo tenant entries (25 entries from 10 transactions)
-- Transaction 1: Capital contribution - Debit Cash, Credit Common Stock
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(1, 1, 'debit', 50000.00000000, 50000.00000000, 'Capital contribution received'),
(1, 6, 'credit', 50000.00000000, 50000.00000000, 'Common stock issuance');

-- Transaction 2: Software license renewal - Debit Software Licenses, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(2, 11, 'debit', 4200.00000000, 4200.00000000, 'Annual Figma Enterprise license'),
(2, 1, 'credit', 4200.00000000, 45800.00000000, 'Payment for software license');

-- Transaction 3: Client payment received - Debit Cash, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(3, 1, 'debit', 25000.00000000, 70800.00000000, 'Payment from Horizon Digital'),
(3, 8, 'credit', 25000.00000000, 100000.00000000, 'Q1 service revenue recognized');

-- Transaction 4: Salaries - Debit Salaries, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(4, 9, 'debit', 8500.00000000, 36500.00000000, 'March salaries disbursement'),
(4, 1, 'credit', 8500.00000000, 62300.00000000, 'Payroll disbursement');

-- Transaction 5: Rent - Debit Rent Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(5, 10, 'debit', 3200.00000000, 12800.00000000, 'April 2026 office rent'),
(5, 1, 'credit', 3200.00000000, 59100.00000000, 'Rent payment');

-- Transaction 6: Client payment - Debit Cash, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(6, 1, 'debit', 15000.00000000, 74100.00000000, 'MVP delivery payment - Cascade Systems'),
(6, 8, 'credit', 15000.00000000, 115000.00000000, 'Service revenue recognized');

-- Transaction 7: AWS hosting - Debit Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(7, 11, 'debit', 680.00000000, 4880.00000000, 'AWS March 2026 hosting'),
(7, 1, 'credit', 680.00000000, 73420.00000000, 'AWS invoice payment');

-- Transaction 8: UBI funding - Debit UBI Reserve, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(8, 1, 'debit', 5000.00000000, 78420.00000000, 'UBI pool funding allocation'),
(8, 7, 'credit', 5000.00000000, 23000.00000000, 'Retained earnings allocated to UBI reserve');

-- Transaction 9: Client payment - Debit Cash, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(9, 1, 'debit', 22000.00000000, 100420.00000000, 'Consulting payment - Zenith'),
(9, 8, 'credit', 22000.00000000, 137000.00000000, 'Revenue recognized');

-- Transaction 10: GitHub subscription - Debit Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(10, 11, 'debit', 210.00000000, 5090.00000000, 'GitHub Enterprise subscription'),
(10, 1, 'credit', 210.00000000, 100210.00000000, 'Subscription payment');

-- Business tenant entries (25 entries from 10 transactions)
-- Transaction 11: Invoice posting - Debit AR, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(11, 13, 'debit', 36000.00000000, 121000.00000000, 'Invoice #INV-2026-0048 - Novatech Pro'),
(11, 21, 'credit', 36000.00000000, 216000.00000000, 'Service revenue recognized');

-- Transaction 12: Depreciation - Debit Expense, Credit accumulated depreciation (asset reduction)
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(12, 23, 'debit', 8500.00000000, 8500.00000000, 'Monthly depreciation - equipment'),
(12, 14, 'credit', 8500.00000000, 111500.00000000, 'Accumulated depreciation');

-- Transaction 13: Inventory purchase - Debit Inventory, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(13, 14, 'debit', 45000.00000000, 156500.00000000, 'Inventory restock - components'),
(13, 12, 'credit', 45000.00000000, 205000.00000000, 'Payment to supplier');

-- Transaction 14: Cash receipt - Debit Cash, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(14, 12, 'debit', 52000.00000000, 257000.00000000, 'Payment from Pinnacle Solutions'),
(14, 20, 'credit', 52000.00000000, 472000.00000000, 'Product sales revenue');

-- Transaction 15: Marketing expense - Debit Marketing, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(15, 24, 'debit', 12500.00000000, 12500.00000000, 'LinkedIn Ads Q2 campaign'),
(15, 12, 'credit', 12500.00000000, 244500.00000000, 'Marketing payment');

-- Transaction 16: Payroll fee - Debit Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(16, 23, 'debit', 450.00000000, 8950.00000000, 'Payroll processing fee - April'),
(16, 12, 'credit', 450.00000000, 244050.00000000, 'Processing fee payment');

-- Transaction 17: UBI allocation - Debit Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(17, 23, 'debit', 15000.00000000, 23950.00000000, 'UBI pool allocation - business'),
(17, 12, 'credit', 15000.00000000, 229050.00000000, 'UBI funding transfer');

-- Transaction 18: Cash receipt - Debit Cash, Credit AR
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(18, 12, 'debit', 36000.00000000, 265050.00000000, 'Invoice #INV-2026-0045 payment'),
(18, 13, 'credit', 36000.00000000, 85000.00000000, 'AR collection');

-- Transaction 19: Insurance premium - Debit Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(19, 23, 'debit', 18000.00000000, 41950.00000000, 'Annual insurance premium'),
(19, 12, 'credit', 18000.00000000, 247050.00000000, 'Insurance payment');

-- Transaction 20: Refund - Debit Cash, Credit AP (overpayment returned)
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(20, 12, 'debit', 2500.00000000, 249550.00000000, 'Vendor refund - overpayment'),
(20, 16, 'credit', 2500.00000000, 52500.00000000, 'AP adjustment');

-- Enterprise tenant entries (10 entries from 5 transactions)
-- Transaction 21: Revenue consolidation - Debit AR, Credit Revenue
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(21, 26, 'debit', 750000.00000000, 1600000.00000000, 'Q1 consolidated AR'),
(21, 35, 'credit', 450000.00000000, 4950000.00000000, 'Q1 product revenue'),
(21, 36, 'credit', 300000.00000000, 2500000.00000000, 'Q1 service revenue');

-- Transaction 22: Payroll - Debit Payroll Expense, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(22, 38, 'debit', 425000.00000000, 425000.00000000, 'April 2026 payroll'),
(22, 12, 'credit', 425000.00000000, 2075000.00000000, 'Payroll disbursement');

-- Transaction 23: R&D equipment - Debit Fixed Assets, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(23, 28, 'debit', 125000.00000000, 925000.00000000, 'Laboratory equipment purchase'),
(23, 12, 'credit', 125000.00000000, 1950000.00000000, 'Equipment payment');

-- Transaction 24: Treasury rebalancing - Debit Investments, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(24, 27, 'debit', 500000.00000000, 2000000.00000000, 'Investment portfolio rebalancing'),
(24, 12, 'credit', 500000.00000000, 1450000.00000000, 'Investment transfer');

-- Transaction 25: Dividend - Debit Retained Earnings, Credit Cash
INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount, balance_after, description) VALUES
(25, 34, 'debit', 200000.00000000, 1130000.00000000, 'Q1 dividend declaration'),
(25, 12, 'credit', 200000.00000000, 1250000.00000000, 'Dividend disbursement');

-- ============================================
-- SECTION 9: UBI POOLS (3 pools per tenant = 9 total)
-- ============================================
INSERT INTO ubi_pools (id, tenant_id, name, description, pool_type, total_balance, distributed_amount, reserve_amount, currency, rules, active) VALUES
-- Demo tenant pools
(1, 1, 'Meridian Community Fund', 'Universal basic income distribution for active community members', 'universal', 15000.00000000, 4250.00000000, 3000.00000000, 'USD', 
 '{"min_score": 25, "distribution_frequency": "monthly", "max_per_user": 500}', true),
(2, 1, 'Meridian Emergency Reserve', 'Emergency assistance for unexpected hardships', 'conditional', 5000.00000000, 1200.00000000, 1000.00000000, 'USD', 
 '{"min_score": 40, "emergency_verification_required": true}', true),
(3, 1, 'Meridian Growth Pool', 'Contributory rewards for project contributions', 'contribution_based', 8000.00000000, 2100.00000000, 2000.00000000, 'USD', 
 '{"contribution_threshold": 10, "bonus_multiplier": 1.5}', true),

-- Business tenant pools
(4, 2, 'NovaTech Innovation Fund', 'Rewards for process improvements and innovation', 'task_based', 75000.00000000, 28400.00000000, 15000.00000000, 'USD', 
 '{"task_completion_weight": 0.7, "innovation_weight": 0.3}', true),
(5, 2, 'NovaTech Emergency Assistance', 'Employee emergency support program', 'conditional', 25000.00000000, 8500.00000000, 5000.00000000, 'USD', 
 '{"min_tenure_months": 3, "verification_required": true}', true),
(6, 2, 'NovaTech Excellence Rewards', 'High performer recognition and rewards', 'hybrid', 50000.00000000, 18200.00000000, 10000.00000000, 'USD', 
 '{"performance_threshold": 75, "tenure_bonus": 0.2}', true),

-- Enterprise tenant pools
(7, 3, 'Apex Global UBI Fund', 'Global universal distribution for all stakeholders', 'universal', 500000.00000000, 185000.00000000, 100000.00000000, 'USD', 
 '{"global_distribution": true, "tiered_by_tenure": true}', true),
(8, 3, 'Apex Crisis Response', 'Rapid response fund for global emergencies', 'conditional', 200000.00000000, 45000.00000000, 50000.00000000, 'USD', 
 '{"rapid_response": true, "max_response_time_hours": 48}', true),
(9, 3, 'Apex Growth Accelerator', 'Investment in stakeholder growth and development', 'contribution_based', 350000.00000000, 125000.00000000, 75000.00000000, 'USD', 
 '{"development_investment": true, "matching_contribution": true}', true);

-- ============================================
-- SECTION 10: UBI RULES (eligibility rules for each pool)
-- ============================================
INSERT INTO ubi_rules (id, tenant_id, pool_id, name, rule_type, weight, conditions, parameters, active, priority) VALUES
-- Demo tenant rules
(1, 1, 1, 'Active User Minimum', 'eligibility', 1.0, 
 '{"min_login_frequency": 4, "min_months_active": 1}', 
 '{"verification_method": "automatic"}', true, 100),
(2, 1, 1, 'Community Engagement', 'amount_calculation', 0.8, 
 '{"contribution_score_min": 20}', 
 '{"base_amount": 50, "score_multiplier": 0.05}', true, 90),
(3, 1, 2, 'Emergency Verification', 'eligibility', 1.0, 
 '{"document_required": ["evidence"], "verification_window_days": 7}', 
 '{"auto_approve_threshold": 500}', true, 100),
(4, 1, 3, 'Contribution Threshold', 'eligibility', 1.0, 
 '{"min_contributions": 3, "min_contribution_value": 10}', 
 '{}', true, 100),
(5, 1, 3, 'Project Quality Score', 'amount_calculation', 0.6, 
 '{"quality_score_min": 3.5}', 
 '{"bonus_per_project": 25}', true, 80),

-- Business tenant rules
(6, 2, 4, 'Task Completion Rate', 'eligibility', 0.9, 
 '{"min_tasks_completed": 5, "completion_rate_min": 0.8}', 
 '{"points_per_task": 10}', true, 100),
(7, 2, 4, 'Innovation Impact', 'amount_calculation', 0.5, 
 '{"innovation_submissions_min": 1}', 
 '{"innovation_bonus": 100}', true, 85),
(8, 2, 5, 'Tenure Requirement', 'eligibility', 1.0, 
 '{"min_months_tenured": 3}', 
 '{"grace_period_days": 30}', true, 100),
(9, 2, 6, 'Performance Rating', 'eligibility', 0.8, 
 '{"performance_rating_min": 4.0}', 
 '{"excellence_bonus": 200}', true, 90),
(10, 2, 6, 'Tenure Bonus', 'frequency', 0.3, 
 '{"min_years": 1}', 
 '{"tenure_multiplier": 0.1}', true, 70),

-- Enterprise tenant rules
(11, 3, 7, 'Stakeholder Status', 'eligibility', 1.0, 
 '{"verified_stakeholder": true, "kyc_completed": true}', 
 '{"base_distribution_usd": 250}', true, 100),
(12, 3, 7, 'Tenure Tier', 'amount_calculation', 0.7, 
 '{"min_months": 6}', 
 '{"tenure_bonus_per_year": 50}', true, 95),
(13, 3, 8, 'Crisis Level', 'eligibility', 1.0, 
 '{"crisis_verification": ["independent", "documented"]}', 
 '{"rapid_fund_cap": 5000}', true, 100),
(14, 3, 9, 'Development Commitment', 'eligibility', 1.0, 
 '{"development_plan_submitted": true}', 
 '{"matching_cap": 10000}', true, 100),
(15, 3, 9, 'Skill Investment', 'amount_calculation', 0.8, 
 '{"courses_completed_min": 2}', 
 '{"course_reimbursement_cap": 2000}', true, 85);

-- ============================================
-- SECTION 11: UBI ELIGIBILITY (link users to pools with scores)
-- ============================================
INSERT INTO ubi_eligibility (user_id, tenant_id, pool_id, eligible, score, activity_level, contribution_score, last_calculated_at, next_distribution_at) VALUES
-- Demo tenant eligibility (5 users x 3 pools)
(1, 1, 1, true, 85.5000, 'very_high', 92.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(1, 1, 2, false, 45.2500, 'high', 78.0000, '2026-04-07 00:00:00+00', NULL),
(1, 1, 3, true, 72.0000, 'very_high', 88.0000, '2026-04-07 00:00:00+00', '2026-04-15 00:00:00+00'),
(2, 1, 1, true, 68.7500, 'high', 75.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(2, 1, 2, true, 82.0000, 'high', 80.0000, '2026-04-07 00:00:00+00', '2026-04-20 00:00:00+00'),
(2, 1, 3, true, 55.0000, 'medium', 60.0000, '2026-04-07 00:00:00+00', '2026-04-15 00:00:00+00'),
(3, 1, 1, true, 92.0000, 'very_high', 95.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(3, 1, 2, true, 78.5000, 'high', 85.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(3, 1, 3, true, 88.0000, 'very_high', 90.0000, '2026-04-07 00:00:00+00', '2026-04-15 00:00:00+00'),
(4, 1, 1, false, 12.0000, 'inactive', 15.0000, '2026-03-01 00:00:00+00', NULL),
(4, 1, 2, false, 8.0000, 'inactive', 10.0000, '2026-03-01 00:00:00+00', NULL),
(4, 1, 3, false, 5.0000, 'inactive', 8.0000, '2026-03-01 00:00:00+00', NULL),
(5, 1, 1, true, 76.2500, 'high', 82.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(5, 1, 2, false, 35.0000, 'medium', 45.0000, '2026-04-07 00:00:00+00', NULL),
(5, 1, 3, true, 62.0000, 'high', 70.0000, '2026-04-07 00:00:00+00', '2026-04-15 00:00:00+00'),

-- Business tenant eligibility (4 users x 3 pools)
(6, 2, 4, true, 95.0000, 'very_high', 98.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(6, 2, 5, true, 88.0000, 'high', 90.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(6, 2, 6, true, 92.5000, 'very_high', 95.0000, '2026-04-07 00:00:00+00', '2026-04-20 00:00:00+00'),
(7, 2, 4, true, 82.0000, 'high', 85.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(7, 2, 5, true, 75.0000, 'medium', 78.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(7, 2, 6, true, 79.0000, 'high', 82.0000, '2026-04-07 00:00:00+00', '2026-04-20 00:00:00+00'),
(8, 2, 4, true, 90.5000, 'very_high', 94.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(8, 2, 5, false, 42.0000, 'medium', 50.0000, '2026-04-07 00:00:00+00', NULL),
(8, 2, 6, true, 85.0000, 'high', 88.0000, '2026-04-07 00:00:00+00', '2026-04-20 00:00:00+00'),
(9, 2, 4, true, 70.0000, 'medium', 75.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(9, 2, 5, true, 65.0000, 'medium', 70.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(9, 2, 6, true, 68.5000, 'medium', 72.0000, '2026-04-07 00:00:00+00', '2026-04-20 00:00:00+00'),

-- Enterprise tenant eligibility (3 users x 3 pools)
(10, 3, 7, true, 98.0000, 'very_high', 100.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(10, 3, 8, false, 30.0000, 'low', 40.0000, '2026-04-07 00:00:00+00', NULL),
(10, 3, 9, true, 95.0000, 'very_high', 98.0000, '2026-04-07 00:00:00+00', '2026-04-25 00:00:00+00'),
(11, 3, 7, true, 94.5000, 'very_high', 96.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(11, 3, 8, false, 25.0000, 'inactive', 35.0000, '2026-04-07 00:00:00+00', NULL),
(11, 3, 9, true, 88.0000, 'high', 92.0000, '2026-04-07 00:00:00+00', '2026-04-25 00:00:00+00'),
(12, 3, 7, true, 91.0000, 'high', 94.0000, '2026-04-07 00:00:00+00', '2026-05-01 00:00:00+00'),
(12, 3, 8, true, 85.0000, 'high', 88.0000, '2026-04-07 00:00:00+00', '2026-04-15 00:00:00+00'),
(12, 3, 9, true, 90.0000, 'high', 93.0000, '2026-04-07 00:00:00+00', '2026-04-25 00:00:00+00');

-- ============================================
-- SECTION 12: UBI DISTRIBUTIONS (35+ historical distributions)
-- ============================================
INSERT INTO ubi_distributions (pool_id, user_id, amount, distribution_type, status, proof, transaction_id, created_at, scheduled_at, completed_at) VALUES
-- Demo tenant distributions (12 distributions across pools)
-- Pool 1 distributions
(1, 1, 150.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_001", "blockchain_tx": "0xabc123"}', 8,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:05+00'),
(1, 2, 125.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_002", "blockchain_tx": "0xabc124"}', 8,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:06+00'),
(1, 3, 175.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_003", "blockchain_tx": "0xabc125"}', 8,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:07+00'),
(1, 5, 140.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_004", "blockchain_tx": "0xabc126"}', 8,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:08+00'),
(1, 1, 165.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_005", "blockchain_tx": "0xabc127"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:05+00'),
(1, 2, 130.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_006", "blockchain_tx": "0xabc128"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:06+00'),
(1, 3, 180.00000000, 'periodic', 'completed', 
 '{"distribution_id": "dist_demo_007", "blockchain_tx": "0xabc129"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:07+00'),
(1, 5, 145.00000000, 'periodic', 'processing', 
 '{"distribution_id": "dist_demo_008"}', NULL,
 '2026-04-07 00:00:00+00', '2026-04-07 00:00:00+00', NULL),

-- Pool 3 distributions
(3, 1, 85.00000000, 'task_completion', 'completed', 
 '{"task_id": "task_demo_001", "quality_score": 4.5}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:03+00'),
(3, 3, 95.00000000, 'task_completion', 'completed', 
 '{"task_id": "task_demo_002", "quality_score": 4.8}', NULL,
 '2026-03-20 00:00:00+00', '2026-03-20 00:00:00+00', '2026-03-20 00:00:03+00'),
(3, 2, 75.00000000, 'achievement', 'completed', 
 '{"achievement": "first_contribution", "badge": " bronze"}', NULL,
 '2026-03-25 00:00:00+00', '2026-03-25 00:00:00+00', '2026-03-25 00:00:02+00'),
(3, 5, 80.00000000, 'achievement', 'completed', 
 '{"achievement": "consistency_award", "badge": "silver"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:02+00'),

-- Business tenant distributions (13 distributions)
-- Pool 4 distributions
(4, 6, 450.00000000, 'task_completion', 'completed', 
 '{"tasks_completed": 12, "avg_quality": 4.6}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:05+00'),
(4, 7, 380.00000000, 'task_completion', 'completed', 
 '{"tasks_completed": 9, "avg_quality": 4.3}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:06+00'),
(4, 8, 420.00000000, 'task_completion', 'completed', 
 '{"tasks_completed": 11, "avg_quality": 4.5}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:07+00'),
(4, 9, 290.00000000, 'task_completion', 'completed', 
 '{"tasks_completed": 6, "avg_quality": 4.0}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:08+00'),
(4, 6, 480.00000000, 'periodic', 'completed', 
 '{"period": "monthly", "period_month": "April 2026"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:05+00'),
(4, 7, 395.00000000, 'periodic', 'completed', 
 '{"period": "monthly", "period_month": "April 2026"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:06+00'),
(4, 8, 440.00000000, 'periodic', 'completed', 
 '{"period": "monthly", "period_month": "April 2026"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:07+00'),

-- Pool 6 distributions
(6, 6, 350.00000000, 'achievement', 'completed', 
 '{"achievement": "q1_excellence", "rating": 4.8}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:03+00'),
(6, 7, 280.00000000, 'achievement', 'completed', 
 '{"achievement": "q1_excellence", "rating": 4.5}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:04+00'),
(6, 8, 320.00000000, 'achievement', 'completed', 
 '{"achievement": "q1_excellence", "rating": 4.6}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:05+00'),
(6, 9, 250.00000000, 'achievement', 'pending', 
 '{"achievement": "q1_excellence", "rating": 4.2}', NULL,
 '2026-04-07 00:00:00+00', '2026-04-07 00:00:00+00', NULL),

-- Enterprise tenant distributions (10 distributions)
-- Pool 7 distributions
(7, 10, 750.00000000, 'periodic', 'completed', 
 '{"tier": "executive", "tenure_years": 2}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:10+00'),
(7, 11, 650.00000000, 'periodic', 'completed', 
 '{"tier": "senior", "tenure_years": 1}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:11+00'),
(7, 12, 580.00000000, 'periodic', 'completed', 
 '{"tier": "senior", "tenure_years": 1}', NULL,
 '2026-03-01 00:00:00+00', '2026-03-01 00:00:00+00', '2026-03-01 00:00:12+00'),
(7, 10, 800.00000000, 'periodic', 'completed', 
 '{"tier": "executive", "tenure_years": 2}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:10+00'),
(7, 11, 700.00000000, 'periodic', 'completed', 
 '{"tier": "senior", "tenure_years": 1}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:11+00'),
(7, 12, 620.00000000, 'periodic', 'completed', 
 '{"tier": "senior", "tenure_years": 1}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:12+00'),

-- Pool 9 distributions
(9, 10, 2500.00000000, 'achievement', 'completed', 
 '{"development_plan": "executive_mba", "completion_rate": 0.75}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:08+00'),
(9, 11, 1800.00000000, 'achievement', 'completed', 
 '{"development_plan": "cfa_level2", "completion_rate": 0.60}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:09+00'),
(9, 12, 2000.00000000, 'achievement', 'completed', 
 '{"development_plan": "tech_leadership", "completion_rate": 0.70}', NULL,
 '2026-03-15 00:00:00+00', '2026-03-15 00:00:00+00', '2026-03-15 00:00:10+00'),
(9, 10, 3000.00000000, 'referral', 'completed', 
 '{"referred_users": 3, "referral_bonus": "triple"}', NULL,
 '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00', '2026-04-01 00:00:08+00');

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (for validation)
-- ============================================
-- Check ledger balance (uncomment to verify)
-- SELECT t.slug, 
--        SUM(CASE WHEN la.account_type IN ('asset', 'expense') AND le.entry_type = 'debit' THEN le.amount
--                 WHEN la.account_type IN ('asset', 'expense') AND le.entry_type = 'credit' THEN -le.amount
--                 WHEN la.account_type IN ('liability', 'equity', 'revenue') AND le.entry_type = 'credit' THEN le.amount
--                 WHEN la.account_type IN ('liability', 'equity', 'revenue') AND le.entry_type = 'debit' THEN -le.amount
--                 ELSE 0 END) as net_change
-- FROM ledger_entries le
-- JOIN ledger_accounts la ON le.account_id = la.id
-- JOIN tenants t ON la.tenant_id = t.id
-- GROUP BY t.slug;

-- ============================================
-- ROLLBACK SECTION (uncomment to rollback)
-- ============================================
-- BEGIN;
-- DELETE FROM ubi_distributions WHERE pool_id IN (SELECT id FROM ubi_pools WHERE tenant_id IN (1, 2, 3));
-- DELETE FROM ubi_eligibility WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM ubi_rules WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM ubi_pools WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM ledger_entries WHERE transaction_id IN (SELECT id FROM ledger_transactions WHERE tenant_id IN (1, 2, 3));
-- DELETE FROM ledger_transactions WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM ledger_journals WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM ledger_accounts WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM service_accounts WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM user_roles WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM users WHERE tenant_id IN (1, 2, 3);
-- DELETE FROM tenants WHERE id IN (1, 2, 3);
-- COMMIT;
