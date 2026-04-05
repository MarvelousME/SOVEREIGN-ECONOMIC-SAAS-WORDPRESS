import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import {
  ComplianceReview,
  ReviewStatus,
  ReviewPriority,
  SubmitReviewInput,
  ProcessReviewInput
} from '../types';

export class ReviewQueueService {
  async submitForReview(input: SubmitReviewInput): Promise<ComplianceReview> {
    const id = uuidv4();
    const now = new Date();

    const riskScore = this.calculateInitialRiskScore(input.content);

    const flags = this.detectFlags(input.content);

    const priority = this.determinePriority(riskScore, flags);

    const query = `
      INSERT INTO compliance.compliance_reviews (
        id, content_id, content_type, content, status, priority,
        risk_score, flags, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $9
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      input.contentId,
      input.contentType,
      JSON.stringify(input.content),
      input.priority || priority,
      riskScore,
      JSON.stringify(flags),
      JSON.stringify({ submittedAt: now })
    ]);

    const review = this.mapToComplianceReview(result.rows[0]);

    await eventService.publish(ComplianceEvents.COMPLIANCE_REVIEW_REQUESTED, {
      reviewId: review.id,
      contentId: review.contentId,
      contentType: review.contentType,
      priority: review.priority,
      riskScore: review.riskScore,
      timestamp: now
    });

    logger.info('Content submitted for review', {
      reviewId: id,
      contentId: input.contentId,
      priority
    });

    return review;
  }

  async processReview(
    reviewId: string,
    input: ProcessReviewInput,
    processedBy: string
  ): Promise<ComplianceReview> {
    const now = new Date();

    const currentReview = await this.getReview(reviewId);
    if (!currentReview) {
      throw new Error('Review not found');
    }

    if (currentReview.status !== ReviewStatus.PENDING &&
        currentReview.status !== ReviewStatus.ESCALATED) {
      throw new Error(`Review cannot be processed in ${currentReview.status} status`);
    }

    const query = `
      UPDATE compliance.compliance_reviews
      SET status = $2,
          decision = $3,
          assigned_to = COALESCE($4, assigned_to),
          reviewed_by = $5,
          reviewed_at = $6,
          metadata = metadata || $7,
          updated_at = $6
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      reviewId,
      input.status,
      input.decision || null,
      input.assignedTo || null,
      processedBy,
      now,
      JSON.stringify({
        previousStatus: currentReview.status,
        processedAt: now
      })
    ]);

    const review = this.mapToComplianceReview(result.rows[0]);

    const eventType = input.status === ReviewStatus.APPROVED
      ? ComplianceEvents.COMPLIANCE_REVIEW_APPROVED
      : ComplianceEvents.COMPLIANCE_REVIEW_REJECTED;

    await eventService.publish(eventType, {
      reviewId: review.id,
      contentId: review.contentId,
      status: input.status,
      decision: input.decision,
      reviewedBy: processedBy,
      timestamp: now
    });

    logger.info('Review processed', {
      reviewId,
      status: input.status,
      reviewedBy: processedBy
    });

    return review;
  }

  async escalateReview(reviewId: string, escalationReason: string): Promise<ComplianceReview> {
    const now = new Date();

    const query = `
      UPDATE compliance.compliance_reviews
      SET status = 'escalated',
          metadata = metadata || $2,
          updated_at = $3
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      reviewId,
      JSON.stringify({ escalationReason, escalatedAt: now }),
      now
    ]);

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    const review = this.mapToComplianceReview(result.rows[0]);

    logger.info('Review escalated', { reviewId, escalationReason });

    return review;
  }

  async appealReview(
    reviewId: string,
    appealReason: string
  ): Promise<ComplianceReview> {
    const now = new Date();

    const currentReview = await this.getReview(reviewId);
    if (!currentReview) {
      throw new Error('Review not found');
    }

    if (currentReview.status !== ReviewStatus.REJECTED) {
      throw new Error('Only rejected reviews can be appealed');
    }

    const query = `
      UPDATE compliance.compliance_reviews
      SET status = 'appealed',
          appeal_reason = $2,
          metadata = metadata || $3,
          updated_at = $4
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      reviewId,
      appealReason,
      JSON.stringify({ appealedAt: now }),
      now
    ]);

    const review = this.mapToComplianceReview(result.rows[0]);

    logger.info('Review appealed', { reviewId, appealReason });

    return review;
  }

  async getReview(reviewId: string): Promise<ComplianceReview | null> {
    const query = `SELECT * FROM compliance.compliance_reviews WHERE id = $1`;
    const result = await db.query(query, [reviewId]);

    if (result.rows.length === 0) return null;

    return this.mapToComplianceReview(result.rows[0]);
  }

  async listPendingReviews(filters?: {
    priority?: ReviewPriority;
    contentType?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reviews: ComplianceReview[]; total: number }> {
    const conditions: string[] = [`status = 'pending'`];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    if (filters?.contentType) {
      conditions.push(`content_type = $${paramIndex++}`);
      values.push(filters.contentType);
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countQuery = `SELECT COUNT(*) FROM compliance.compliance_reviews ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM compliance.compliance_reviews
      ${whereClause}
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        risk_score DESC,
        created_at ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    return {
      reviews: result.rows.map(this.mapToComplianceReview),
      total
    };
  }

  async listReviews(filters?: {
    status?: ReviewStatus;
    contentType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reviews: ComplianceReview[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters?.contentType) {
      conditions.push(`content_type = $${paramIndex++}`);
      values.push(filters.contentType);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countQuery = `SELECT COUNT(*) FROM compliance.compliance_reviews ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM compliance.compliance_reviews
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    return {
      reviews: result.rows.map(this.mapToComplianceReview),
      total
    };
  }

  async updateReviewFlags(
    reviewId: string,
    flags: string[]
  ): Promise<ComplianceReview> {
    const now = new Date();

    const query = `
      UPDATE compliance.compliance_reviews
      SET flags = $2,
          risk_score = $3,
          updated_at = $4
      WHERE id = $1
      RETURNING *
    `;

    const newRiskScore = this.calculateRiskScoreFromFlags(flags);

    const result = await db.query(query, [reviewId, JSON.stringify(flags), newRiskScore, now]);

    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }

    return this.mapToComplianceReview(result.rows[0]);
  }

  private calculateInitialRiskScore(content: Record<string, any>): number {
    let score = 0;

    const suspiciousPatterns = [
      'free money',
      'no risk',
      'guaranteed',
      'act now',
      'limited time',
      'click here',
      'urgent',
      'congratulations'
    ];

    const contentText = JSON.stringify(content).toLowerCase();

    for (const pattern of suspiciousPatterns) {
      if (contentText.includes(pattern)) {
        score += 10;
      }
    }

    if (content.hasAffiliateLink || content.affiliateLink) {
      score += 15;
    }

    if (content.isSponsored || content.sponsoredContent) {
      score += 10;
    }

    if (content.includesTestimonial || content.testimonial) {
      score += 5;
    }

    if (content.includesEarningsClaim || content.earningsClaim) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private detectFlags(content: Record<string, any>): string[] {
    const flags: string[] = [];

    if (content.hasAffiliateLink || content.affiliateLink) {
      flags.push('affiliate_content');
    }

    if (content.isSponsored || content.sponsoredContent) {
      flags.push('sponsored_content');
    }

    if (content.includesTestimonial || content.testimonial) {
      flags.push('testimonial');
    }

    if (content.includesEarningsClaim || content.earningsClaim) {
      flags.push('earnings_claim');
    }

    if (content.includesCelebrityEndorsement || content.celebrityEndorsement) {
      flags.push('celebrity_endorsement');
    }

    if (content.includesHealthClaim || content.healthClaim) {
      flags.push('health_claim');
    }

    if (content.includesFinancialClaim || content.financialClaim) {
      flags.push('financial_claim');
    }

    if (content.userGeneratedContent || content.ugc) {
      flags.push('user_generated_content');
    }

    return flags;
  }

  private determinePriority(riskScore: number, flags: string[]): ReviewPriority {
    const highRiskFlags = ['earnings_claim', 'health_claim', 'financial_claim', 'celebrity_endorsement'];
    const hasHighRiskFlag = flags.some(f => highRiskFlags.includes(f));

    if (riskScore >= 70 || hasHighRiskFlag) {
      return ReviewPriority.HIGH;
    }

    if (riskScore >= 40) {
      return ReviewPriority.MEDIUM;
    }

    if (riskScore >= 20) {
      return ReviewPriority.LOW;
    }

    return ReviewPriority.LOW;
  }

  private calculateRiskScoreFromFlags(flags: string[]): number {
    let score = 0;

    for (const flag of flags) {
      switch (flag) {
        case 'earnings_claim':
          score += 25;
          break;
        case 'health_claim':
          score += 25;
          break;
        case 'financial_claim':
          score += 25;
          break;
        case 'celebrity_endorsement':
          score += 20;
          break;
        case 'affiliate_content':
          score += 15;
          break;
        case 'sponsored_content':
          score += 10;
          break;
        case 'testimonial':
          score += 5;
          break;
        default:
          score += 5;
      }
    }

    return Math.min(100, score);
  }

  private mapToComplianceReview(row: any): ComplianceReview {
    return {
      id: row.id,
      contentId: row.content_id,
      contentType: row.content_type,
      content: JSON.parse(row.content || '{}'),
      status: row.status as ReviewStatus,
      priority: row.priority as ReviewPriority,
      riskScore: row.risk_score,
      flags: JSON.parse(row.flags || '[]'),
      assignedTo: row.assigned_to,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      decision: row.decision,
      appealReason: row.appeal_reason,
      appealReviewedBy: row.appeal_reviewed_by,
      appealReviewedAt: row.appeal_reviewed_at ? new Date(row.appeal_reviewed_at) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const reviewQueueService = new ReviewQueueService();
