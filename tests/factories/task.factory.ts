import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  reward: string;
  currency: string;
  status: 'OPEN' | 'CLAIMED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  claimedBy?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  proofUrl?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskFactory {
  static create(overrides: Partial<Task> = {}): Task {
    const id = overrides.id || uuidv4();
    const timestamp = new Date();

    return {
      id,
      title: overrides.title || `Test Task ${id.substring(0, 8)}`,
      description: overrides.description || 'This is a test task description',
      creatorId: overrides.creatorId || uuidv4(),
      reward: overrides.reward || '100',
      currency: overrides.currency || 'UBI',
      status: overrides.status || 'OPEN',
      claimedBy: overrides.claimedBy,
      submittedAt: overrides.submittedAt,
      approvedAt: overrides.approvedAt,
      proofUrl: overrides.proofUrl,
      tenantId: overrides.tenantId || 'test-tenant',
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    };
  }

  static createMany(count: number, overrides: Partial<Task> = {}): Task[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createClaimed(claimedBy: string): Task {
    return this.create({
      status: 'CLAIMED',
      claimedBy,
    });
  }

  static createSubmitted(claimedBy: string, proofUrl: string): Task {
    return this.create({
      status: 'SUBMITTED',
      claimedBy,
      submittedAt: new Date(),
      proofUrl,
    });
  }

  static createCompleted(claimedBy: string): Task {
    const now = new Date();
    return this.create({
      status: 'COMPLETED',
      claimedBy,
      submittedAt: new Date(now.getTime() - 3600000),
      approvedAt: now,
      proofUrl: 'https://example.com/proof.jpg',
    });
  }
}
