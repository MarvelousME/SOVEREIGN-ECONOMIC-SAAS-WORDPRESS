import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventsService } from './events.service';
import {
  Account,
  Transaction,
  Entry,
  CreateAccountInput,
  CreateTransactionInput,
  AccountBalance,
  AccountStatement,
  StatementEntry,
  AccountType,
  TransactionStatus,
  EntryType
} from '../types';

export class LedgerService {
  /**
   * Create a new account
   */
  async createAccount(tenantId: string, input: CreateAccountInput): Promise<Account> {
    logger.info('Creating account', { tenantId, input });

    // Check if account code already exists for this tenant
    const existing = await db.query(
      'SELECT id FROM ledger_accounts WHERE tenant_id = $1 AND code = $2',
      [tenantId, input.code]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Account with code ${input.code} already exists`);
    }

    // Validate parent account if provided
    if (input.parent_id) {
      const parent = await db.query(
        'SELECT id, type FROM ledger_accounts WHERE tenant_id = $1 AND id = $2',
        [tenantId, input.parent_id]
      );

      if (parent.rows.length === 0) {
        throw new Error('Parent account not found');
      }

      if (parent.rows[0].type !== input.type) {
        throw new Error('Parent account must be of the same type');
      }
    }

    const id = uuidv4();
    const now = new Date();

    const result = await db.query<Account>(
      `INSERT INTO ledger_accounts 
        (id, tenant_id, code, name, type, currency, balance, parent_id, metadata, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        tenantId,
        input.code,
        input.name,
        input.type,
        input.currency,
        '0',
        input.parent_id || null,
        JSON.stringify(input.metadata || {}),
        now,
        now,
        1
      ]
    );

    const account = result.rows[0];

    // Publish event
    await eventsService.publishAccountCreated(tenantId, account);

    logger.info('Account created', { accountId: account.id });
    return account;
  }

  /**
   * Get account by ID
   */
  async getAccount(tenantId: string, accountId: string): Promise<Account | null> {
    const result = await db.query<Account>(
      'SELECT * FROM ledger_accounts WHERE tenant_id = $1 AND id = $2',
      [tenantId, accountId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(tenantId: string, accountId: string): Promise<AccountBalance> {
    const account = await this.getAccount(tenantId, accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      account_id: account.id,
      balance: account.balance,
      currency: account.currency,
      as_of_date: new Date()
    };
  }

  /**
   * Create a transaction with double-entry bookkeeping
   */
  async createTransaction(
    tenantId: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    logger.info('Creating transaction', { tenantId, input });

    // Validate entries
    this.validateEntries(input.entries);

    // Check for idempotency
    if (input.idempotency_key) {
      const existing = await db.query(
        'SELECT * FROM ledger_transactions WHERE tenant_id = $1 AND idempotency_key = $2',
        [tenantId, input.idempotency_key]
      );

      if (existing.rows.length > 0) {
        logger.info('Transaction already exists (idempotency)', { 
          idempotencyKey: input.idempotency_key 
        });
        return existing.rows[0];
      }
    }

    // Execute in transaction
    return await db.transaction(async (client) => {
      const transactionId = uuidv4();
      const now = new Date();
      const transactionDate = input.transaction_date || now;

      // Create transaction record
      const txResult = await client.query<Transaction>(
        `INSERT INTO ledger_transactions 
          (id, tenant_id, reference, description, transaction_date, status, idempotency_key, metadata, created_at, updated_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          transactionId,
          tenantId,
          input.reference,
          input.description,
          transactionDate,
          TransactionStatus.COMPLETED,
          input.idempotency_key || null,
          JSON.stringify(input.metadata || {}),
          now,
          now,
          input.created_by
        ]
      );

      const transaction = txResult.rows[0];

      // Create entries and update account balances
      for (const entryInput of input.entries) {
        // Verify account exists and belongs to tenant
        const account = await this.getAccountWithLock(client, tenantId, entryInput.account_id);

        if (!account) {
          throw new Error(`Account ${entryInput.account_id} not found`);
        }

        if (account.currency !== entryInput.currency) {
          throw new Error(
            `Currency mismatch: account ${account.code} uses ${account.currency}, entry uses ${entryInput.currency}`
          );
        }

        // Create entry
        const entryId = uuidv4();
        await client.query(
          `INSERT INTO ledger_entries 
            (id, transaction_id, account_id, type, amount, currency, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            entryId,
            transactionId,
            entryInput.account_id,
            entryInput.type,
            entryInput.amount,
            entryInput.currency,
            now
          ]
        );

        // Update account balance with optimistic locking
        await this.updateAccountBalance(
          client,
          account,
          entryInput.type,
          entryInput.amount
        );
      }

      // Publish event
      await eventsService.publishTransactionCreated(tenantId, transaction);

      logger.info('Transaction created', { transactionId: transaction.id });
      return transaction;
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(tenantId: string, transactionId: string): Promise<Transaction | null> {
    const result = await db.query<Transaction>(
      'SELECT * FROM ledger_transactions WHERE tenant_id = $1 AND id = $2',
      [tenantId, transactionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get transaction entries
   */
  async getTransactionEntries(tenantId: string, transactionId: string): Promise<Entry[]> {
    const result = await db.query<Entry>(
      `SELECT e.* FROM ledger_entries e
       JOIN ledger_transactions t ON e.transaction_id = t.id
       WHERE t.tenant_id = $1 AND e.transaction_id = $2
       ORDER BY e.created_at`,
      [tenantId, transactionId]
    );

    return result.rows;
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(
    tenantId: string,
    transactionId: string,
    reversedBy: string
  ): Promise<Transaction> {
    logger.info('Reversing transaction', { tenantId, transactionId });

    return await db.transaction(async (client) => {
      // Get original transaction
      const txResult = await client.query<Transaction>(
        `SELECT * FROM ledger_transactions 
         WHERE tenant_id = $1 AND id = $2 
         FOR UPDATE`,
        [tenantId, transactionId]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const originalTx = txResult.rows[0];

      if (originalTx.status === TransactionStatus.REVERSED) {
        throw new Error('Transaction already reversed');
      }

      if (originalTx.status !== TransactionStatus.COMPLETED) {
        throw new Error('Can only reverse completed transactions');
      }

      // Get original entries
      const entriesResult = await client.query<Entry>(
        'SELECT * FROM ledger_entries WHERE transaction_id = $1',
        [transactionId]
      );

      // Create reversing transaction
      const reversingTxId = uuidv4();
      const now = new Date();

      const reversingTxResult = await client.query<Transaction>(
        `INSERT INTO ledger_transactions 
          (id, tenant_id, reference, description, transaction_date, status, metadata, created_at, updated_at, created_by, reverses_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          reversingTxId,
          tenantId,
          `REV-${originalTx.reference}`,
          `Reversal of: ${originalTx.description}`,
          now,
          TransactionStatus.COMPLETED,
          JSON.stringify({ reverses: transactionId }),
          now,
          now,
          reversedBy,
          transactionId
        ]
      );

      const reversingTx = reversingTxResult.rows[0];

      // Create reversing entries (flip debit/credit)
      for (const entry of entriesResult.rows) {
        const account = await this.getAccountWithLock(client, tenantId, entry.account_id);

        if (!account) {
          throw new Error(`Account ${entry.account_id} not found`);
        }

        const reverseType = entry.type === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

        const entryId = uuidv4();
        await client.query(
          `INSERT INTO ledger_entries 
            (id, transaction_id, account_id, type, amount, currency, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [entryId, reversingTxId, entry.account_id, reverseType, entry.amount, entry.currency, now]
        );

        // Update account balance
        await this.updateAccountBalance(client, account, reverseType, entry.amount);
      }

      // Mark original transaction as reversed
      await client.query(
        `UPDATE ledger_transactions 
         SET status = $1, reversed_by_id = $2, updated_at = $3
         WHERE id = $4`,
        [TransactionStatus.REVERSED, reversingTxId, now, transactionId]
      );

      // Publish event
      await eventsService.publishTransactionReversed(tenantId, reversingTx);

      logger.info('Transaction reversed', { 
        originalTxId: transactionId, 
        reversingTxId: reversingTx.id 
      });

      return reversingTx;
    });
  }

  /**
   * Get account statement
   */
  async getAccountStatement(
    tenantId: string,
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AccountStatement> {
    const account = await this.getAccount(tenantId, accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    // Get opening balance
    const openingBalanceResult = await db.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN e.type = 'DEBIT' THEN CAST(e.amount AS DECIMAL)
          ELSE -CAST(e.amount AS DECIMAL)
        END
      ), 0) as balance
       FROM ledger_entries e
       JOIN ledger_transactions t ON e.transaction_id = t.id
       WHERE e.account_id = $1 
         AND t.tenant_id = $2
         AND t.transaction_date < $3
         AND t.status = 'COMPLETED'`,
      [accountId, tenantId, startDate]
    );

    const openingBalance = openingBalanceResult.rows[0].balance.toString();

    // Get entries within period
    const entriesResult = await db.query(
      `SELECT 
         t.transaction_date as date,
         t.id as transaction_id,
         t.reference,
         t.description,
         e.type,
         e.amount
       FROM ledger_entries e
       JOIN ledger_transactions t ON e.transaction_id = t.id
       WHERE e.account_id = $1 
         AND t.tenant_id = $2
         AND t.transaction_date >= $3 
         AND t.transaction_date <= $4
         AND t.status = 'COMPLETED'
       ORDER BY t.transaction_date, t.created_at`,
      [accountId, tenantId, startDate, endDate]
    );

    // Calculate running balance
    let runningBalance = parseFloat(openingBalance);
    const entries: StatementEntry[] = entriesResult.rows.map((row) => {
      const amount = parseFloat(row.amount);
      const isDebit = row.type === EntryType.DEBIT;

      // Update running balance based on account type
      if (this.isDebitAccount(account.type)) {
        runningBalance += isDebit ? amount : -amount;
      } else {
        runningBalance += isDebit ? -amount : amount;
      }

      return {
        date: row.date,
        transaction_id: row.transaction_id,
        reference: row.reference,
        description: row.description,
        debit: isDebit ? row.amount : null,
        credit: !isDebit ? row.amount : null,
        balance: runningBalance.toFixed(2)
      };
    });

    return {
      account_id: account.id,
      account_name: account.name,
      account_type: account.type,
      currency: account.currency,
      opening_balance: openingBalance,
      closing_balance: runningBalance.toFixed(2),
      entries,
      period_start: startDate,
      period_end: endDate
    };
  }

  /**
   * Get account transaction history
   */
  async getAccountHistory(
    tenantId: string,
    accountId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Entry[]> {
    const account = await this.getAccount(tenantId, accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    const result = await db.query<Entry>(
      `SELECT e.* FROM ledger_entries e
       JOIN ledger_transactions t ON e.transaction_id = t.id
       WHERE e.account_id = $1 
         AND t.tenant_id = $2
         AND t.status = 'COMPLETED'
       ORDER BY t.transaction_date DESC, e.created_at DESC
       LIMIT $3 OFFSET $4`,
      [accountId, tenantId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Validate transaction entries (double-entry rules)
   */
  private validateEntries(entries: any[]): void {
    if (entries.length < 2) {
      throw new Error('Transaction must have at least 2 entries');
    }

    // Group by currency
    const byCurrency: { [key: string]: { debits: number; credits: number } } = {};

    for (const entry of entries) {
      if (!byCurrency[entry.currency]) {
        byCurrency[entry.currency] = { debits: 0, credits: 0 };
      }

      const amount = parseFloat(entry.amount);

      if (amount <= 0) {
        throw new Error('Entry amount must be positive');
      }

      if (entry.type === EntryType.DEBIT) {
        byCurrency[entry.currency].debits += amount;
      } else if (entry.type === EntryType.CREDIT) {
        byCurrency[entry.currency].credits += amount;
      } else {
        throw new Error(`Invalid entry type: ${entry.type}`);
      }
    }

    // Verify debits equal credits for each currency
    for (const currency in byCurrency) {
      const { debits, credits } = byCurrency[currency];
      const diff = Math.abs(debits - credits);

      // Allow for floating point precision errors (0.01)
      if (diff > 0.01) {
        throw new Error(
          `Debits and credits must be equal for ${currency}. Debits: ${debits}, Credits: ${credits}`
        );
      }
    }
  }

  /**
   * Get account with row lock
   */
  private async getAccountWithLock(
    client: PoolClient,
    tenantId: string,
    accountId: string
  ): Promise<Account | null> {
    const result = await client.query<Account>(
      'SELECT * FROM ledger_accounts WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
      [tenantId, accountId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update account balance with optimistic locking
   */
  private async updateAccountBalance(
    client: PoolClient,
    account: Account,
    entryType: EntryType,
    amount: string
  ): Promise<void> {
    const currentBalance = parseFloat(account.balance);
    const changeAmount = parseFloat(amount);
    let newBalance: number;

    // Calculate new balance based on account type and entry type
    if (this.isDebitAccount(account.type)) {
      // Assets and Expenses increase with debits
      newBalance = entryType === EntryType.DEBIT 
        ? currentBalance + changeAmount 
        : currentBalance - changeAmount;
    } else {
      // Liabilities, Equity, and Revenue increase with credits
      newBalance = entryType === EntryType.CREDIT 
        ? currentBalance + changeAmount 
        : currentBalance - changeAmount;
    }

    const result = await client.query(
      `UPDATE ledger_accounts 
       SET balance = $1, version = version + 1, updated_at = $2
       WHERE id = $3 AND version = $4`,
      [newBalance.toFixed(2), new Date(), account.id, account.version]
    );

    if (result.rowCount === 0) {
      throw new Error('Account balance update failed (version conflict)');
    }

    // Publish balance update event
    await eventsService.publishBalanceUpdated(
      account.tenant_id,
      account.id,
      newBalance.toFixed(2)
    );
  }

  /**
   * Check if account type increases with debits
   */
  private isDebitAccount(type: AccountType): boolean {
    return type === AccountType.ASSET || type === AccountType.EXPENSE;
  }
}

export const ledgerService = new LedgerService();
