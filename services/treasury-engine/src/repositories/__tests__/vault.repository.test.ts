import { VaultRepository } from '../vault.repository';
import { Pool } from 'pg';
import { VaultStatus, CompoundingFrequency } from '../../types';

jest.mock('pg');

describe('VaultRepository', () => {
  let repository: VaultRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    } as any;

    repository = new VaultRepository(mockPool);
  });

  describe('createVault', () => {
    it('should create a new vault', async () => {
      const vaultData = {
        name: 'Test Vault',
        description: 'A test vault',
        currency: 'USDC',
        strategy_id: 'strategy-123',
        compounding_frequency: CompoundingFrequency.DAILY,
      };

      const mockVault = {
        id: 'vault-123',
        ...vaultData,
        status: VaultStatus.ACTIVE,
        total_balance: '0',
        available_balance: '0',
        locked_balance: '0',
        apy: 0,
        last_compound_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockVault] } as any);

      const result = await repository.createVault(vaultData);

      expect(result).toEqual(mockVault);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vaults'),
        expect.arrayContaining([vaultData.name, vaultData.description, vaultData.currency])
      );
    });
  });

  describe('getVaultById', () => {
    it('should return vault by id', async () => {
      const mockVault = {
        id: 'vault-123',
        name: 'Test Vault',
        status: VaultStatus.ACTIVE,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockVault] } as any);

      const result = await repository.getVaultById('vault-123');

      expect(result).toEqual(mockVault);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM vaults WHERE id ='),
        ['vault-123']
      );
    });

    it('should return null if vault not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await repository.getVaultById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateVaultBalance', () => {
    it('should update vault balance', async () => {
      const vaultId = 'vault-123';
      const totalBalance = '1000.50';
      const availableBalance = '800.00';
      const lockedBalance = '200.50';

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: vaultId }] } as any);

      await repository.updateVaultBalance(vaultId, totalBalance, availableBalance, lockedBalance);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vaults SET'),
        [totalBalance, availableBalance, lockedBalance, vaultId]
      );
    });
  });

  describe('getAllVaults', () => {
    it('should return all vaults with pagination', async () => {
      const mockVaults = [
        { id: 'vault-1', name: 'Vault 1' },
        { id: 'vault-2', name: 'Vault 2' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockVaults, rowCount: 2 } as any);

      const result = await repository.getAllVaults(10, 0);

      expect(result).toEqual(mockVaults);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM vaults'),
        [10, 0]
      );
    });
  });
});
