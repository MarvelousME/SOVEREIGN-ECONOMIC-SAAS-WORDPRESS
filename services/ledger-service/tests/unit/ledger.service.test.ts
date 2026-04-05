import { LedgerService } from '../../src/services/ledger.service';
import { AccountType, EntryType } from '../../src/types';

describe('LedgerService', () => {
  let ledgerService: LedgerService;

  beforeEach(() => {
    ledgerService = new LedgerService();
  });

  describe('validateEntries', () => {
    it('should reject transactions with less than 2 entries', () => {
      const entries = [
        { account_id: '1', type: EntryType.DEBIT, amount: '100.00', currency: 'USD' }
      ];

      expect(() => {
        (ledgerService as any).validateEntries(entries);
      }).toThrow('Transaction must have at least 2 entries');
    });

    it('should reject entries with negative amounts', () => {
      const entries = [
        { account_id: '1', type: EntryType.DEBIT, amount: '-100.00', currency: 'USD' },
        { account_id: '2', type: EntryType.CREDIT, amount: '100.00', currency: 'USD' }
      ];

      expect(() => {
        (ledgerService as any).validateEntries(entries);
      }).toThrow('Entry amount must be positive');
    });

    it('should reject unbalanced transactions', () => {
      const entries = [
        { account_id: '1', type: EntryType.DEBIT, amount: '100.00', currency: 'USD' },
        { account_id: '2', type: EntryType.CREDIT, amount: '50.00', currency: 'USD' }
      ];

      expect(() => {
        (ledgerService as any).validateEntries(entries);
      }).toThrow(/Debits and credits must be equal/);
    });

    it('should accept balanced transactions', () => {
      const entries = [
        { account_id: '1', type: EntryType.DEBIT, amount: '100.00', currency: 'USD' },
        { account_id: '2', type: EntryType.CREDIT, amount: '100.00', currency: 'USD' }
      ];

      expect(() => {
        (ledgerService as any).validateEntries(entries);
      }).not.toThrow();
    });

    it('should accept multi-entry balanced transactions', () => {
      const entries = [
        { account_id: '1', type: EntryType.DEBIT, amount: '150.00', currency: 'USD' },
        { account_id: '2', type: EntryType.CREDIT, amount: '100.00', currency: 'USD' },
        { account_id: '3', type: EntryType.CREDIT, amount: '50.00', currency: 'USD' }
      ];

      expect(() => {
        (ledgerService as any).validateEntries(entries);
      }).not.toThrow();
    });
  });

  describe('isDebitAccount', () => {
    it('should identify ASSET as debit account', () => {
      expect((ledgerService as any).isDebitAccount(AccountType.ASSET)).toBe(true);
    });

    it('should identify EXPENSE as debit account', () => {
      expect((ledgerService as any).isDebitAccount(AccountType.EXPENSE)).toBe(true);
    });

    it('should identify LIABILITY as credit account', () => {
      expect((ledgerService as any).isDebitAccount(AccountType.LIABILITY)).toBe(false);
    });

    it('should identify EQUITY as credit account', () => {
      expect((ledgerService as any).isDebitAccount(AccountType.EQUITY)).toBe(false);
    });

    it('should identify REVENUE as credit account', () => {
      expect((ledgerService as any).isDebitAccount(AccountType.REVENUE)).toBe(false);
    });
  });
});
