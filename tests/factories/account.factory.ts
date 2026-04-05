import { v4 as uuidv4 } from 'uuid';

export interface Account {
  id: string;
  userId: string;
  accountType: 'USER' | 'POOL' | 'TREASURY' | 'ESCROW' | 'SYSTEM';
  currency: string;
  balance: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountFactory {
  static create(overrides: Partial<Account> = {}): Account {
    const id = overrides.id || uuidv4();
    const timestamp = new Date();

    return {
      id,
      userId: overrides.userId || uuidv4(),
      accountType: overrides.accountType || 'USER',
      currency: overrides.currency || 'UBI',
      balance: overrides.balance || '0',
      tenantId: overrides.tenantId || 'test-tenant',
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    };
  }

  static createMany(count: number, overrides: Partial<Account> = {}): Account[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createUserAccount(userId: string, balance = '1000'): Account {
    return this.create({
      userId,
      accountType: 'USER',
      balance,
    });
  }

  static createPoolAccount(balance = '100000'): Account {
    return this.create({
      userId: 'system',
      accountType: 'POOL',
      balance,
    });
  }

  static createTreasuryAccount(balance = '500000'): Account {
    return this.create({
      userId: 'system',
      accountType: 'TREASURY',
      balance,
    });
  }
}
