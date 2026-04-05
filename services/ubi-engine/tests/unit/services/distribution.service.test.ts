import { DistributionService } from '../../../src/services/distribution.service';
import { getDbHelper } from '@tests/helpers/database.helper';
import { UserFactory } from '@tests/factories/user.factory';
import { v4 as uuidv4 } from 'uuid';

describe('DistributionService', () => {
  let distributionService: DistributionService;
  let dbHelper: ReturnType<typeof getDbHelper>;

  beforeAll(() => {
    dbHelper = getDbHelper();
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
    distributionService = new DistributionService();
  });

  describe('calculateDistribution', () => {
    it('should distribute UBI equally with EQUAL algorithm', async () => {
      const users = UserFactory.createMany(10);
      const poolAmount = '10000';
      
      await dbHelper.seedDatabase({ users });

      const distribution = await distributionService.calculateDistribution({
        poolId: uuidv4(),
        algorithm: 'EQUAL',
        totalAmount: poolAmount,
        eligibleUsers: users.map(u => u.id),
      });

      expect(distribution.recipients).toHaveLength(10);
      
      // Each user should get 1000 (10000 / 10)
      distribution.recipients.forEach(recipient => {
        expect(recipient.amount).toBe('1000');
      });

      expect(distribution.totalDistributed).toBe(poolAmount);
    });

    it('should distribute UBI based on activity with ACTIVITY_WEIGHTED algorithm', async () => {
      const users = UserFactory.createMany(5);
      const poolAmount = '10000';
      
      // Mock activity scores
      const activityScores = [
        { userId: users[0].id, score: 100 },
        { userId: users[1].id, score: 50 },
        { userId: users[2].id, score: 30 },
        { userId: users[3].id, score: 15 },
        { userId: users[4].id, score: 5 },
      ];
      
      await dbHelper.seedDatabase({ 
        users,
        activity_scores: activityScores,
      });

      const distribution = await distributionService.calculateDistribution({
        poolId: uuidv4(),
        algorithm: 'ACTIVITY_WEIGHTED',
        totalAmount: poolAmount,
        eligibleUsers: users.map(u => u.id),
      });

      expect(distribution.recipients).toHaveLength(5);
      
      // User with score 100 should get the most
      const topRecipient = distribution.recipients.find(r => r.userId === users[0].id);
      const lowestRecipient = distribution.recipients.find(r => r.userId === users[4].id);
      
      expect(parseFloat(topRecipient!.amount)).toBeGreaterThan(
        parseFloat(lowestRecipient!.amount)
      );

      // Total should equal pool amount
      const totalDistributed = distribution.recipients.reduce(
        (sum, r) => sum + parseFloat(r.amount), 
        0
      );
      expect(totalDistributed.toString()).toBe(poolAmount);
    });

    it('should apply minimum guarantee with HYBRID algorithm', async () => {
      const users = UserFactory.createMany(10);
      const poolAmount = '10000';
      const minGuarantee = '500';
      
      const activityScores = users.map((u, i) => ({
        userId: u.id,
        score: i * 10, // Varied scores
      }));
      
      await dbHelper.seedDatabase({ 
        users,
        activity_scores: activityScores,
      });

      const distribution = await distributionService.calculateDistribution({
        poolId: uuidv4(),
        algorithm: 'HYBRID',
        totalAmount: poolAmount,
        eligibleUsers: users.map(u => u.id),
        minimumGuarantee: minGuarantee,
      });

      // All recipients should get at least the minimum
      distribution.recipients.forEach(recipient => {
        expect(parseFloat(recipient.amount)).toBeGreaterThanOrEqual(
          parseFloat(minGuarantee)
        );
      });
    });

    it('should handle reputation-weighted distribution', async () => {
      const users = UserFactory.createMany(5);
      const poolAmount = '10000';
      
      const reputations = [
        { userId: users[0].id, score: 1000 },
        { userId: users[1].id, score: 800 },
        { userId: users[2].id, score: 600 },
        { userId: users[3].id, score: 400 },
        { userId: users[4].id, score: 200 },
      ];
      
      await dbHelper.seedDatabase({ 
        users,
        reputations,
      });

      const distribution = await distributionService.calculateDistribution({
        poolId: uuidv4(),
        algorithm: 'REPUTATION_WEIGHTED',
        totalAmount: poolAmount,
        eligibleUsers: users.map(u => u.id),
      });

      // Higher reputation should get more
      const amounts = distribution.recipients.map(r => 
        parseFloat(r.amount)
      );
      
      expect(amounts[0]).toBeGreaterThan(amounts[1]);
      expect(amounts[1]).toBeGreaterThan(amounts[2]);
      expect(amounts[2]).toBeGreaterThan(amounts[3]);
      expect(amounts[3]).toBeGreaterThan(amounts[4]);
    });
  });

  describe('checkEligibility', () => {
    it('should mark user as eligible when meeting all criteria', async () => {
      const user = UserFactory.create();
      
      await dbHelper.seedDatabase({
        users: [user],
        kyc_verifications: [{
          userId: user.id,
          status: 'VERIFIED',
          verifiedAt: new Date(),
        }],
        activity_scores: [{
          userId: user.id,
          score: 50,
        }],
      });

      const eligibility = await distributionService.checkEligibility(user.id);

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reasons).toEqual([]);
    });

    it('should mark user as ineligible without KYC', async () => {
      const user = UserFactory.create();
      
      await dbHelper.seedDatabase({
        users: [user],
      });

      const eligibility = await distributionService.checkEligibility(user.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons).toContain('KYC not verified');
    });

    it('should mark user as ineligible with low activity', async () => {
      const user = UserFactory.create();
      
      await dbHelper.seedDatabase({
        users: [user],
        kyc_verifications: [{
          userId: user.id,
          status: 'VERIFIED',
          verifiedAt: new Date(),
        }],
        activity_scores: [{
          userId: user.id,
          score: 5, // Below threshold
        }],
      });

      const eligibility = await distributionService.checkEligibility(user.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons).toContain('Insufficient activity');
    });

    it('should mark flagged user as ineligible', async () => {
      const user = UserFactory.create();
      
      await dbHelper.seedDatabase({
        users: [user],
        kyc_verifications: [{
          userId: user.id,
          status: 'VERIFIED',
          verifiedAt: new Date(),
        }],
        abuse_flags: [{
          userId: user.id,
          reason: 'Multiple accounts detected',
          status: 'ACTIVE',
        }],
      });

      const eligibility = await distributionService.checkEligibility(user.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reasons).toContain('Abuse flag active');
    });
  });

  describe('executeDistribution', () => {
    it('should execute distribution and create transactions', async () => {
      const users = UserFactory.createMany(5);
      const poolId = uuidv4();
      const poolAmount = '5000';
      
      await dbHelper.seedDatabase({ users });

      const distribution = await distributionService.calculateDistribution({
        poolId,
        algorithm: 'EQUAL',
        totalAmount: poolAmount,
        eligibleUsers: users.map(u => u.id),
      });

      const result = await distributionService.executeDistribution(distribution);

      expect(result.success).toBe(true);
      expect(result.transactionIds).toHaveLength(5);
      expect(result.totalDistributed).toBe(poolAmount);

      // Verify transactions were created
      const transactions = await dbHelper.query(
        'SELECT * FROM transactions WHERE metadata->>\'poolId\' = $1',
        [poolId]
      );

      expect(transactions.rows).toHaveLength(5);
    });

    it('should handle partial distribution failure', async () => {
      const users = UserFactory.createMany(5);
      const poolId = uuidv4();
      
      // Simulate one account missing
      await dbHelper.seedDatabase({ 
        users: users.slice(0, 4), // Only 4 users have accounts
      });

      const distribution = await distributionService.calculateDistribution({
        poolId,
        algorithm: 'EQUAL',
        totalAmount: '5000',
        eligibleUsers: users.map(u => u.id),
      });

      const result = await distributionService.executeDistribution(distribution);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.transactionIds.length).toBeLessThan(5);
    });
  });

  describe('abuseDetection', () => {
    it('should detect multiple accounts from same IP', async () => {
      const users = UserFactory.createMany(3);
      const sharedIP = '192.168.1.100';
      
      await dbHelper.seedDatabase({
        users,
        user_ips: users.map(u => ({
          userId: u.id,
          ipAddress: sharedIP,
          lastSeen: new Date(),
        })),
      });

      const flags = await distributionService.detectAbuse(users.map(u => u.id));

      expect(flags).toHaveLength(3);
      flags.forEach(flag => {
        expect(flag.reason).toContain('Multiple accounts');
      });
    });

    it('should detect wallet address reuse', async () => {
      const sharedWallet = '0x1234567890abcdef';
      const users = UserFactory.createMany(2, { 
        walletAddress: sharedWallet 
      });
      
      await dbHelper.seedDatabase({ users });

      const flags = await distributionService.detectAbuse(users.map(u => u.id));

      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].reason).toContain('wallet');
    });
  });
});
