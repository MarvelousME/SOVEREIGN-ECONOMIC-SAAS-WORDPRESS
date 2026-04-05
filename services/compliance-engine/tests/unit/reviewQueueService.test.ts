import { ReviewQueueService } from '../../src/services/reviewQueueService';
import { db } from '../../src/utils/database';
import { eventService } from '../../src/services/events.service';
import { ReviewStatus, ReviewPriority } from '../../src/types';

jest.mock('../../src/utils/database');
jest.mock('../../src/services/events.service');

describe('ReviewQueueService', () => {
  let reviewQueueService: ReviewQueueService;

  beforeEach(() => {
    reviewQueueService = new ReviewQueueService();
    jest.clearAllMocks();
  });

  describe('submitForReview', () => {
    it('should submit content for review and calculate risk score', async () => {
      const mockReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({ message: 'test content with affiliate link', hasAffiliateLink: true }),
        status: 'pending',
        priority: 'medium',
        risk_score: 15,
        flags: JSON.stringify(['affiliate_content']),
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision: null,
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({ submittedAt: new Date() }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockReview] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await reviewQueueService.submitForReview({
        contentId: 'content-123',
        contentType: 'blog_post',
        content: { message: 'test content with affiliate link', hasAffiliateLink: true }
      });

      expect(result).toBeDefined();
      expect(result.contentId).toBe('content-123');
      expect(result.status).toBe(ReviewStatus.PENDING);
      expect(result.flags).toContain('affiliate_content');
      expect(eventService.publish).toHaveBeenCalledWith(
        'compliance.review.requested',
        expect.objectContaining({
          reviewId: expect.any(String),
          contentId: 'content-123'
        })
      );
    });

    it('should assign high priority for earnings claims', async () => {
      const mockReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({ message: 'You can earn $1000/day!', includesEarningsClaim: true }),
        status: 'pending',
        priority: 'high',
        risk_score: 45,
        flags: JSON.stringify(['earnings_claim']),
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision: null,
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockReview] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await reviewQueueService.submitForReview({
        contentId: 'content-123',
        contentType: 'blog_post',
        content: { message: 'You can earn $1000/day!', includesEarningsClaim: true }
      });

      expect(result.priority).toBe(ReviewPriority.HIGH);
      expect(result.flags).toContain('earnings_claim');
    });
  });

  describe('processReview', () => {
    it('should approve a review', async () => {
      const pendingReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({}),
        status: 'pending',
        priority: 'medium',
        risk_score: 20,
        flags: JSON.stringify([]),
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision: null,
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      const approvedReview = {
        ...pendingReview,
        status: 'approved',
        decision: 'Content is compliant',
        reviewed_by: 'admin',
        reviewed_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [pendingReview] })
        .mockResolvedValueOnce({ rows: [approvedReview] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await reviewQueueService.processReview(
        'review-1',
        { status: ReviewStatus.APPROVED, decision: 'Content is compliant' },
        'admin'
      );

      expect(result.status).toBe(ReviewStatus.APPROVED);
      expect(result.decision).toBe('Content is compliant');
      expect(eventService.publish).toHaveBeenCalledWith(
        'compliance.review.approved',
        expect.objectContaining({
          reviewId: 'review-1',
          status: ReviewStatus.APPROVED
        })
      );
    });

    it('should reject a review', async () => {
      const pendingReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({}),
        status: 'pending',
        priority: 'medium',
        risk_score: 20,
        flags: JSON.stringify([]),
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision: null,
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      const rejectedReview = {
        ...pendingReview,
        status: 'rejected',
        decision: 'Missing required disclosures',
        reviewed_by: 'admin',
        reviewed_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [pendingReview] })
        .mockResolvedValueOnce({ rows: [rejectedReview] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await reviewQueueService.processReview(
        'review-1',
        { status: ReviewStatus.REJECTED, decision: 'Missing required disclosures' },
        'admin'
      );

      expect(result.status).toBe(ReviewStatus.REJECTED);
      expect(eventService.publish).toHaveBeenCalledWith(
        'compliance.review.rejected',
        expect.objectContaining({
          reviewId: 'review-1',
          status: ReviewStatus.REJECTED
        })
      );
    });

    it('should throw error when review not in pending status', async () => {
      const approvedReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({}),
        status: 'approved',
        priority: 'medium',
        risk_score: 20,
        flags: JSON.stringify([]),
        assigned_to: null,
        reviewed_by: 'admin',
        reviewed_at: new Date(),
        decision: 'Approved',
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [approvedReview] });

      await expect(
        reviewQueueService.processReview(
          'review-1',
          { status: ReviewStatus.REJECTED },
          'admin'
        )
      ).rejects.toThrow('Review cannot be processed in approved status');
    });
  });

  describe('listPendingReviews', () => {
    it('should list pending reviews ordered by priority', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          content_id: 'content-1',
          content_type: 'blog_post',
          content: JSON.stringify({}),
          status: 'pending',
          priority: 'high',
          risk_score: 80,
          flags: JSON.stringify(['earnings_claim']),
          assigned_to: null,
          reviewed_by: null,
          reviewed_at: null,
          decision: null,
          appeal_reason: null,
          appeal_reviewed_by: null,
          appeal_reviewed_at: null,
          metadata: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockReviews });

      const result = await reviewQueueService.listPendingReviews({
        limit: 10,
        offset: 0
      });

      expect(result.total).toBe(1);
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].priority).toBe(ReviewPriority.HIGH);
    });
  });

  describe('appealReview', () => {
    it('should allow appeal of rejected review', async () => {
      const rejectedReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({}),
        status: 'rejected',
        priority: 'medium',
        risk_score: 20,
        flags: JSON.stringify([]),
        assigned_to: null,
        reviewed_by: 'admin',
        reviewed_at: new Date(),
        decision: 'Missing disclosures',
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      const appealedReview = {
        ...rejectedReview,
        status: 'appealed',
        appeal_reason: 'I have added all required disclosures'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [rejectedReview] })
        .mockResolvedValueOnce({ rows: [appealedReview] });

      const result = await reviewQueueService.appealReview(
        'review-1',
        'I have added all required disclosures'
      );

      expect(result.status).toBe(ReviewStatus.APPEALED);
      expect(result.appealReason).toBe('I have added all required disclosures');
    });

    it('should throw error when appealing non-rejected review', async () => {
      const pendingReview = {
        id: 'review-1',
        content_id: 'content-123',
        content_type: 'blog_post',
        content: JSON.stringify({}),
        status: 'pending',
        priority: 'medium',
        risk_score: 20,
        flags: JSON.stringify([]),
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        decision: null,
        appeal_reason: null,
        appeal_reviewed_by: null,
        appeal_reviewed_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [pendingReview] });

      await expect(
        reviewQueueService.appealReview('review-1', 'Some reason')
      ).rejects.toThrow('Only rejected reviews can be appealed');
    });
  });
});
