import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  email: string;
  walletAddress: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    const id = overrides.id || uuidv4();
    const timestamp = new Date();

    return {
      id,
      username: overrides.username || `user_${id.substring(0, 8)}`,
      email: overrides.email || `${id.substring(0, 8)}@test.com`,
      walletAddress: overrides.walletAddress || `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`,
      tenantId: overrides.tenantId || 'test-tenant',
      createdAt: overrides.createdAt || timestamp,
      updatedAt: overrides.updatedAt || timestamp,
    };
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
