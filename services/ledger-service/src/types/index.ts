export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
  FAILED = 'FAILED'
}

export interface Account {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: string;
  parent_id: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  reference: string;
  description: string;
  transaction_date: Date;
  status: TransactionStatus;
  idempotency_key: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  reversed_by_id: string | null;
  reverses_id: string | null;
}

export interface Entry {
  id: string;
  transaction_id: string;
  account_id: string;
  type: EntryType;
  amount: string;
  currency: string;
  created_at: Date;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  currency: string;
  parent_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionInput {
  reference: string;
  description: string;
  transaction_date?: Date;
  entries: CreateEntryInput[];
  idempotency_key?: string;
  metadata?: Record<string, any>;
  created_by: string;
}

export interface CreateEntryInput {
  account_id: string;
  type: EntryType;
  amount: string;
  currency: string;
}

export interface AccountBalance {
  account_id: string;
  balance: string;
  currency: string;
  as_of_date: Date;
}

export interface AccountStatement {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  currency: string;
  opening_balance: string;
  closing_balance: string;
  entries: StatementEntry[];
  period_start: Date;
  period_end: Date;
}

export interface StatementEntry {
  date: Date;
  transaction_id: string;
  reference: string;
  description: string;
  debit: string | null;
  credit: string | null;
  balance: string;
}

export interface LedgerEvent {
  type: string;
  timestamp: Date;
  tenant_id: string;
  data: any;
}
