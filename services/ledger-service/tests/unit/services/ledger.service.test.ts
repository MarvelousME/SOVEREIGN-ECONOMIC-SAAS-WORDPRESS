import { LedgerService } from '../../../src/services/ledger.service';
import { Pool } from 'pg';
import { getDbHelper } from '@tests/helpers/database.helper';
import { AccountFactory } from '@tests/factories/account.factory';
import { v4 as uuidv4 } from 'uuid';

describe('LedgerService', () => {
  let ledgerService: LedgerService;
  let dbHelper: ReturnType<typeof getDbHelper>;

  beforeAll(() => {
    dbHelper = getDbHelper();
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
    ledgerService = new LedgerService();
  });

  describe('createAccount', () => {
    it('should create a new account with zero balance', async () => {
      const userId = uuidv4();
      const account = await ledgerService.createAccount({
        userId,
        accountType: 'USER',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      expect(account).toBeDefined();
      expect(account.userId).toBe(userId);
      expect(account.balance).toBe('0');
      expect(account.currency).toBe('UBI');
    });

    it('should prevent duplicate accounts for same user and currency', async () => {
      const userId = uuidv4();
      
      await ledgerService.createAccount({
        userId,
        accountType: 'USER',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      await expect(
        ledgerService.createAccount({
          userId,
          accountType: 'USER',
          currency: 'UBI',
          tenantId: 'test-tenant',
        })
      ).rejects.toThrow();
    });

    it('should allow multiple accounts with different currencies', async () => {
      const userId = uuidv4();
      
      const account1 = await ledgerService.createAccount({
        userId,
        accountType: 'USER',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      const account2 = await ledgerService.createAccount({
        userId,
        accountType: 'USER',
        currency: 'USDC',
        tenantId: 'test-tenant',
      });

      expect(account1.id).not.toBe(account2.id);
      expect(account1.currency).toBe('UBI');
      expect(account2.currency).toBe('USDC');
    });
  });

  describe('createTransaction', () => {
    it('should create a double-entry transaction', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '1000');
      const toAccount = AccountFactory.createUserAccount(uuidv4(), '500');
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount],
      });

      const transaction = await ledgerService.createTransaction({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: '100',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe('100');
      expect(transaction.status).toBe('COMPLETED');

      // Verify balances updated
      const updatedFromBalance = await ledgerService.getBalance(fromAccount.id);
      const updatedToBalance = await ledgerService.getBalance(toAccount.id);
      
      expect(updatedFromBalance).toBe('900'); // 1000 - 100
      expect(updatedToBalance).toBe('600'); // 500 + 100
    });

    it('should reject transaction with insufficient balance', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '50');
      const toAccount = AccountFactory.createUserAccount(uuidv4(), '0');
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount],
      });

      await expect(
        ledgerService.createTransaction({
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: '100',
          currency: 'UBI',
          type: 'TRANSFER',
          idempotencyKey: uuidv4(),
          tenantId: 'test-tenant',
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should enforce idempotency', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '1000');
      const toAccount = AccountFactory.createUserAccount(uuidv4(), '0');
      const idempotencyKey = uuidv4();
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount],
      });

      const tx1 = await ledgerService.createTransaction({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: '100',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey,
        tenantId: 'test-tenant',
      });

      // Same idempotency key should return same transaction
      const tx2 = await ledgerService.createTransaction({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: '100',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey,
        tenantId: 'test-tenant',
      });

      expect(tx1.id).toBe(tx2.id);
      
      // Balance should only be deducted once
      const balance = await ledgerService.getBalance(fromAccount.id);
      expect(balance).toBe('900');
    });

    it('should handle concurrent transactions correctly', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '1000');
      const toAccount1 = AccountFactory.createUserAccount(uuidv4(), '0');
      const toAccount2 = AccountFactory.createUserAccount(uuidv4(), '0');
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount1, toAccount2],
      });

      // Execute concurrent transactions
      await Promise.all([
        ledgerService.createTransaction({
          fromAccountId: fromAccount.id,
          toAccountId: toAccount1.id,
          amount: '300',
          currency: 'UBI',
          type: 'TRANSFER',
          idempotencyKey: uuidv4(),
          tenantId: 'test-tenant',
        }),
        ledgerService.createTransaction({
          fromAccountId: fromAccount.id,
          toAccountId: toAccount2.id,
          amount: '400',
          currency: 'UBI',
          type: 'TRANSFER',
          idempotencyKey: uuidv4(),
          tenantId: 'test-tenant',
        }),
      ]);

      const finalBalance = await ledgerService.getBalance(fromAccount.id);
      expect(finalBalance).toBe('300'); // 1000 - 300 - 400
    });
  });

  describe('reverseTransaction', () => {
    it('should reverse a completed transaction', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '1000');
      const toAccount = AccountFactory.createUserAccount(uuidv4(), '500');
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount],
      });

      const transaction = await ledgerService.createTransaction({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: '100',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      const reversal = await ledgerService.reverseTransaction(transaction.id);

      expect(reversal).toBeDefined();
      expect(reversal.metadata?.reversesTransactionId).toBe(transaction.id);

      // Verify balances restored
      const fromBalance = await ledgerService.getBalance(fromAccount.id);
      const toBalance = await ledgerService.getBalance(toAccount.id);
      
      expect(fromBalance).toBe('1000');
      expect(toBalance).toBe('500');
    });

    it('should prevent double reversal', async () => {
      const fromAccount = AccountFactory.createUserAccount(uuidv4(), '1000');
      const toAccount = AccountFactory.createUserAccount(uuidv4(), '0');
      
      await dbHelper.seedDatabase({
        accounts: [fromAccount, toAccount],
      });

      const transaction = await ledgerService.createTransaction({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: '100',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      await ledgerService.reverseTransaction(transaction.id);

      await expect(
        ledgerService.reverseTransaction(transaction.id)
      ).rejects.toThrow('already reversed');
    });
  });

  describe('getBalance', () => {
    it('should return correct balance after multiple transactions', async () => {
      const account = AccountFactory.createUserAccount(uuidv4(), '1000');
      const otherAccount1 = AccountFactory.createUserAccount(uuidv4(), '0');
      const otherAccount2 = AccountFactory.createUserAccount(uuidv4(), '0');
      
      await dbHelper.seedDatabase({
        accounts: [account, otherAccount1, otherAccount2],
      });

      // Multiple outgoing transactions
      await ledgerService.createTransaction({
        fromAccountId: account.id,
        toAccountId: otherAccount1.id,
        amount: '200',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      await ledgerService.createTransaction({
        fromAccountId: account.id,
        toAccountId: otherAccount2.id,
        amount: '150',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      // Incoming transaction
      await ledgerService.createTransaction({
        fromAccountId: otherAccount1.id,
        toAccountId: account.id,
        amount: '50',
        currency: 'UBI',
        type: 'TRANSFER',
        idempotencyKey: uuidv4(),
        tenantId: 'test-tenant',
      });

      const balance = await ledgerService.getBalance(account.id);
      expect(balance).toBe('700'); // 1000 - 200 - 150 + 50
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const account = AccountFactory.createUserAccount(uuidv4(), '10000');
      const otherAccounts = AccountFactory.createMany(5);
      
      await dbHelper.seedDatabase({
        accounts: [account, ...otherAccounts],
      });

      // Create multiple transactions
      for (const otherAccount of otherAccounts) {
        await ledgerService.createTransaction({
          fromAccountId: account.id,
          toAccountId: otherAccount.id,
          amount: '100',
          currency: 'UBI',
          type: 'TRANSFER',
          idempotencyKey: uuidv4(),
          tenantId: 'test-tenant',
        });
      }

      const history = await ledgerService.getTransactionHistory(account.id, {
        limit: 3,
        offset: 0,
      });

      expect(history.transactions).toHaveLength(3);
      expect(history.total).toBe(5);
      expect(history.hasMore).toBe(true);
    });
  });
});
