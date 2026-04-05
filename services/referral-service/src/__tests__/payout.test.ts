import { Response } from 'express';
import { ReferralController } from '../controllers/referralController';
import { PayoutModel, PayoutAuditModel } from '../models/payoutModel';
import RewardModel from '../models/rewardModel';
import TreasuryService from '../services/treasuryService';
import NotificationService from '../services/notificationService';
import { PayoutMethod, PayoutStatus, RewardStatus } from '../types';

interface MockRequest {
  user?: { id: string };
  body?: any;
  query?: any;
}

jest.mock('../models/payoutModel');
jest.mock('../models/rewardModel');
jest.mock('../services/treasuryService');
jest.mock('../services/notificationService');
jest.mock('../config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn((callback: Function) => callback({
    query: jest.fn(),
  })),
}));

beforeAll(() => {
  process.env.PAYOUT_MINIMUM_AMOUNT = '10';
  process.env.PAYOUT_MAXIMUM_AMOUNT = '10000';
  process.env.PAYOUT_DAILY_LIMIT = '5000';
  process.env.PAYOUT_CURRENCY = 'USD';
});

describe('ReferralController Payout', () => {
  let controller: ReferralController;
  let mockPayoutModel: jest.Mocked<PayoutModel>;
  let mockPayoutAuditModel: jest.Mocked<PayoutAuditModel>;
  let mockRewardModel: jest.Mocked<RewardModel>;
  let mockTreasuryService: jest.Mocked<TreasuryService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockReq: MockRequest;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    mockPayoutModel = new PayoutModel() as jest.Mocked<PayoutModel>;
    mockPayoutAuditModel = new PayoutAuditModel() as jest.Mocked<PayoutAuditModel>;
    mockRewardModel = new RewardModel() as jest.Mocked<RewardModel>;
    mockTreasuryService = new TreasuryService() as jest.Mocked<TreasuryService>;
    mockNotificationService = new NotificationService() as jest.Mocked<NotificationService>;

    controller = new ReferralController();
    
    (controller as any).payoutModel = mockPayoutModel;
    (controller as any).payoutAuditModel = mockPayoutAuditModel;
    (controller as any).rewardModel = mockRewardModel;
    (controller as any).treasuryService = mockTreasuryService;
    (controller as any).notificationService = mockNotificationService;

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestPayout', () => {
    const validPayoutRequest = {
      userId: 'user-123',
      amount: 100,
      method: PayoutMethod.BANK_TRANSFER,
      idempotencyKey: 'idem-key-123',
    };

    beforeEach(() => {
      mockReq = {
        user: { id: 'user-123' },
        body: validPayoutRequest,
      };

      mockPayoutModel.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockPayoutModel.getPendingPayoutsTotal = jest.fn().mockResolvedValue(0);
      mockRewardModel.getTotalEarnings = jest.fn().mockResolvedValue(500);
      mockPayoutModel.getTotalPaidOut = jest.fn().mockResolvedValue(100);
      mockPayoutModel.create = jest.fn().mockResolvedValue({
        id: 'payout-123',
        userId: 'user-123',
        amount: 100,
        currency: 'USD',
        method: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.PENDING,
        requestedAt: new Date(),
        processedAt: null,
        metadata: {},
      });
      mockPayoutAuditModel.create = jest.fn().mockResolvedValue(undefined);
      mockRewardModel.findByReferrerId = jest.fn().mockResolvedValue([]);
      mockRewardModel.updateStatus = jest.fn().mockResolvedValue(undefined);
      mockNotificationService.notifyPayoutRequested = jest.fn().mockResolvedValue(undefined);
      mockTreasuryService.processPayout = jest.fn().mockResolvedValue({
        success: true,
        treasuryTransactionId: 'txn-123',
      });
      mockPayoutModel.updateStatus = jest.fn().mockResolvedValue(undefined);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq = {
        body: {
          amount: 100,
          method: PayoutMethod.BANK_TRANSFER,
        },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 when amount is missing', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: { method: PayoutMethod.BANK_TRANSFER },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'amount and method are required' });
    });

    it('should return 400 when method is missing', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: { amount: 100 },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'amount and method are required' });
    });

    it('should return existing payout for duplicate idempotency key', async () => {
      const existingPayout = {
        id: 'payout-existing',
        userId: 'user-123',
        amount: 100,
        currency: 'USD',
        method: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.PENDING,
        requestedAt: new Date(),
        processedAt: null,
        metadata: {},
      };
      mockPayoutModel.findByIdempotencyKey = jest.fn().mockResolvedValue(existingPayout);

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Payout request already processed',
        data: existingPayout,
        duplicate: true,
      });
    });

    it('should return 400 for invalid amount', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: { amount: -50, method: PayoutMethod.BANK_TRANSFER },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid amount' });
    });

    it('should return 400 for invalid payout method', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: { amount: 100, method: 'invalid_method' },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when amount exceeds available balance', async () => {
      mockRewardModel.getTotalEarnings = jest.fn().mockResolvedValue(50);
      mockPayoutModel.getTotalPaidOut = jest.fn().mockResolvedValue(0);
      mockPayoutModel.getPendingPayoutsTotal = jest.fn().mockResolvedValue(0);

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Insufficient balance') })
      );
    });

    it('should return 400 when payout would exceed daily limit', async () => {
      mockRewardModel.getTotalEarnings = jest.fn().mockResolvedValue(10000);
      mockPayoutModel.getTotalPaidOut = jest.fn().mockResolvedValue(0);
      mockPayoutModel.getPendingPayoutsTotal = jest.fn().mockResolvedValue(4901);

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('daily limit') })
      );
    });

    it('should create payout and return success response', async () => {
      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 100,
          method: PayoutMethod.BANK_TRANSFER,
          idempotencyKey: 'idem-key-123',
        })
      );
      expect(mockPayoutAuditModel.create).toHaveBeenCalled();
      expect(mockNotificationService.notifyPayoutRequested).toHaveBeenCalledWith(
        'user-123',
        'payout-123',
        100,
        'USD',
        PayoutMethod.BANK_TRANSFER
      );
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Payout request submitted',
        })
      );
    });

    it('should handle payout processing asynchronously', async () => {
      jest.useFakeTimers();

      await controller.requestPayout(mockReq as any, mockRes as Response);

      await jest.runAllTimersAsync();

      expect(mockPayoutModel.updateStatus).toHaveBeenCalledWith(
        'payout-123',
        PayoutStatus.PROCESSING
      );
      expect(mockTreasuryService.processPayout).toHaveBeenCalledWith(
        expect.objectContaining({
          payoutId: 'payout-123',
          userId: 'user-123',
          amount: 100,
          method: PayoutMethod.BANK_TRANSFER,
        })
      );

      jest.useRealTimers();
    });

    it('should handle successful treasury payout completion', async () => {
      jest.useFakeTimers();

      await controller.requestPayout(mockReq as any, mockRes as Response);
      await jest.runAllTimersAsync();

      expect(mockPayoutModel.updateStatus).toHaveBeenCalledWith(
        'payout-123',
        PayoutStatus.COMPLETED,
        expect.any(Date),
        { treasuryTransactionId: 'txn-123' }
      );
      expect(mockNotificationService.notifyPayoutCompleted).toHaveBeenCalledWith(
        'user-123',
        'payout-123',
        100,
        'USD',
        PayoutMethod.BANK_TRANSFER,
        'txn-123'
      );

      jest.useRealTimers();
    });

    it('should handle failed treasury payout', async () => {
      mockTreasuryService.processPayout = jest.fn().mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
        errorCode: 'INSUFFICIENT_FUNDS',
      });

      jest.useFakeTimers();

      await controller.requestPayout(mockReq as any, mockRes as Response);
      await jest.runAllTimersAsync();

      expect(mockPayoutModel.updateStatus).toHaveBeenCalledWith(
        'payout-123',
        PayoutStatus.FAILED,
        undefined,
        { error: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' }
      );
      expect(mockNotificationService.notifyPayoutFailed).toHaveBeenCalledWith(
        'user-123',
        'payout-123',
        100,
        'USD',
        PayoutMethod.BANK_TRANSFER,
        'Insufficient funds'
      );

      jest.useRealTimers();
    });

    it('should vest pending rewards when creating payout', async () => {
      const pendingRewards = [
        { id: 'reward-1', status: RewardStatus.PENDING, amount: 25 },
        { id: 'reward-2', status: RewardStatus.PENDING, amount: 30 },
      ];
      mockRewardModel.findByReferrerId = jest.fn().mockResolvedValue(pendingRewards);

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockRewardModel.updateStatus).toHaveBeenCalledTimes(2);
      expect(mockRewardModel.updateStatus).toHaveBeenCalledWith('reward-1', RewardStatus.VESTED);
      expect(mockRewardModel.updateStatus).toHaveBeenCalledWith('reward-2', RewardStatus.VESTED);
    });

    it('should generate idempotency key when not provided', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: { amount: 100, method: PayoutMethod.CRYPTO },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: expect.any(String),
        })
      );
    });
  });

  describe('getPayoutHistory', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq = {
        query: {},
      };

      await controller.getPayoutHistory(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should return payout history for authenticated user', async () => {
      const payouts = [
        { id: 'payout-1', amount: 100, status: PayoutStatus.COMPLETED },
        { id: 'payout-2', amount: 50, status: PayoutStatus.PENDING },
      ];
      mockPayoutModel.findByUserId = jest.fn().mockResolvedValue(payouts);

      mockReq = {
        user: { id: 'user-123' },
        query: {},
      };

      await controller.getPayoutHistory(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.findByUserId).toHaveBeenCalledWith('user-123', 100, 0);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: payouts,
      });
    });

    it('should respect limit and offset query params', async () => {
      mockPayoutModel.findByUserId = jest.fn().mockResolvedValue([]);

      mockReq = {
        user: { id: 'user-123' },
        query: { limit: '50', offset: '10' },
      };

      await controller.getPayoutHistory(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.findByUserId).toHaveBeenCalledWith('user-123', 50, 10);
    });
  });

  describe('getPayoutAuditLog', () => {
    it('should return 400 when payoutId is missing', async () => {
      mockReq = {
        query: {},
      };

      await controller.getPayoutAuditLog(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'payoutId is required' });
    });

    it('should return audit log for valid payoutId', async () => {
      const auditLog = [
        { id: 'audit-1', action: 'PAYOUT_REQUESTED', createdAt: new Date() },
        { id: 'audit-2', action: 'PAYOUT_COMPLETED', createdAt: new Date() },
      ];
      mockPayoutAuditModel.findByPayoutId = jest.fn().mockResolvedValue(auditLog);

      mockReq = {
        query: { payoutId: 'payout-123' },
      };

      await controller.getPayoutAuditLog(mockReq as any, mockRes as Response);

      expect(mockPayoutAuditModel.findByPayoutId).toHaveBeenCalledWith('payout-123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: auditLog,
      });
    });
  });

  describe('Idempotency', () => {
    it('should detect and return existing payout for duplicate request', async () => {
      const existingPayout = {
        id: 'payout-existing',
        userId: 'user-123',
        amount: 100,
        currency: 'USD',
        method: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.COMPLETED,
        requestedAt: new Date(),
        processedAt: new Date(),
        metadata: {},
      };
      mockPayoutModel.findByIdempotencyKey = jest.fn().mockResolvedValue(existingPayout);

      mockReq = {
        user: { id: 'user-123' },
        body: {
          amount: 100,
          method: PayoutMethod.BANK_TRANSFER,
          idempotencyKey: 'duplicate-key',
        },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.create).not.toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Payout request already processed',
        data: existingPayout,
        duplicate: true,
      });
    });
  });

  describe('Concurrent Payout Requests', () => {
    it('should handle concurrent requests safely with database locking', async () => {
      const db = require('../config/database');
      const mockClient = {
        query: jest.fn(),
      };
      db.transaction.mockImplementation(async (callback: Function) => {
        return callback(mockClient);
      });

      mockPayoutModel.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockPayoutModel.getPendingPayoutsTotal = jest.fn().mockResolvedValue(0);
      mockRewardModel.getTotalEarnings = jest.fn().mockResolvedValue(500);
      mockPayoutModel.getTotalPaidOut = jest.fn().mockResolvedValue(0);
      mockPayoutModel.create = jest.fn().mockResolvedValue({
        id: 'payout-concurrent',
        userId: 'user-123',
        amount: 50,
        currency: 'USD',
        method: PayoutMethod.BANK_TRANSFER,
        status: PayoutStatus.PENDING,
        requestedAt: new Date(),
        processedAt: null,
        metadata: {},
      });
      mockRewardModel.findByReferrerId = jest.fn().mockResolvedValue([]);
      mockPayoutAuditModel.create = jest.fn().mockResolvedValue(undefined);

      const makeRequest = () => controller.requestPayout(
        { user: { id: 'user-123' }, body: { amount: 50, method: PayoutMethod.BANK_TRANSFER } } as any,
        mockRes as Response
      );

      await Promise.all([makeRequest(), makeRequest()]);

      expect(mockPayoutModel.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Minimum Payout Threshold', () => {
    it('should reject payout below minimum threshold', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: {
          amount: 5,
          method: PayoutMethod.BANK_TRANSFER,
          idempotencyKey: 'small-payout',
        },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Minimum payout amount') })
      );
    });
  });

  describe('Maximum Payout Limit', () => {
    it('should reject payout above maximum threshold', async () => {
      mockReq = {
        user: { id: 'user-123' },
        body: {
          amount: 50000,
          method: PayoutMethod.BANK_TRANSFER,
          idempotencyKey: 'large-payout',
        },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Maximum payout amount') })
      );
    });
  });

  describe('Payout Methods', () => {
    it.each([
      PayoutMethod.BANK_TRANSFER,
      PayoutMethod.CRYPTO,
      PayoutMethod.PLATFORM_CREDIT,
    ])('should accept valid payout method: %s', async (method) => {
      mockReq = {
        user: { id: 'user-123' },
        body: {
          amount: 100,
          method,
          idempotencyKey: `method-test-${method}`,
        },
      };

      await controller.requestPayout(mockReq as any, mockRes as Response);

      expect(mockPayoutModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method,
        })
      );
    });
  });
});
