import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
  type: 'TRANSFER' | 'UBI_DISTRIBUTION' | 'TASK_REWARD' | 'DEPOSIT' | 'WITHDRAWAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  metadata?: Record<string, any>;
  idempotencyKey: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionFactory {
  static create(overrides: Partial<Transaction> = {}): Transaction {
    const id = overrides.id || uuidv4();
    const timestamp = new Date();

    return {
      id,
      fromAccountId: overrides.fromAccountId || uuidv4(),
      toAccountId: overrides.toAccountId || uuidv4(),
      amount: overrides.amount || '100',
      currency: overrides.currency || 'UBI',
      type: overrides.type || 'TRANSFER',
      status: overrides.status || 'COMPLETED',
      metadata: overrides.metadata || {},
      idempotencyKey: overrides.idempotencyKey || uuidv4(),
      tenantId: overrides.tenantId || 'test-tenant',
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    };
  }

  static createMany(count: number, overrides: Partial<Transaction> = {}): Transaction[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createUBIDistribution(toAccountId: string, amount: string): Transaction {
    return this.create({
      fromAccountId: 'pool-account-id',
      toAccountId,
      amount,
      type: 'UBI_DISTRIBUTION',
    });
  }

  static createTaskReward(toAccountId: string, amount: string, taskId: string): Transaction {
    return this.create({
      fromAccountId: 'task-escrow-id',
      toAccountId,
      amount,
      type: 'TASK_REWARD',
      metadata: { taskId },
    });
  }
}
