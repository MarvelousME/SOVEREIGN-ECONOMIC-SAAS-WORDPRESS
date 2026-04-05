import { db } from '../models/database';
import { eventEmitter } from './eventEmitter';
import { config } from '../config';
import { Lead, LeadScore, LeadSegment, RoutingCondition } from '../types';

interface ScoreRow {
  id: string;
  lead_id: string;
  tenant_id: string;
  behavioral_score: number;
  demographic_score: number;
  engagement_score: number;
  total_score: number;
  scores: Record<string, number>;
  segment: string | null;
  calculated_at: Date;
}

interface SegmentRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  conditions: RoutingCondition[];
  color: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const BEHAVIORAL_WEIGHTS = {
  websiteVisits: 5,
  emailOpens: 2,
  emailClicks: 3,
  formSubmissions: 10,
  contentDownloads: 5,
  webinarAttendances: 8,
  demoRequests: 15,
};

const DEMOGRAPHIC_WEIGHTS = {
  companySize: 10,
  industryMatch: 15,
  jobTitleMatch: 10,
  emailResponse: 5,
  meetingScheduled: 20,
};

const ENGAGEMENT_THRESHOLDS = {
  emailOpens: 5,
  emailClicks: 3,
  websiteVisits: 3,
  formSubmissions: 1,
};

export class ScoringService {
  async calculateScore(tenantId: string, lead: Lead): Promise<LeadScore | null> {
    const behavioralScore = this.calculateBehavioralScore(lead);
    const demographicScore = this.calculateDemographicScore(lead);
    const engagementScore = this.calculateEngagementScore(lead);

    const { behavioralWeight, demographicWeight, engagementWeight } = config.scoring;

    const totalScore = Math.round(
      behavioralScore.total * behavioralWeight +
      demographicScore.total * demographicWeight +
      engagementScore.total * engagementWeight
    );

    const segment = await this.determineSegment(tenantId, lead, totalScore);

    const row = await db.queryOne<ScoreRow>(
      `INSERT INTO lead_scores (lead_id, tenant_id, behavioral_score, demographic_score, engagement_score, total_score, scores, segment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        lead.id,
        tenantId,
        behavioralScore.total,
        demographicScore.total,
        engagementScore.total,
        totalScore,
        JSON.stringify({
          ...behavioralScore.scores,
          ...demographicScore.scores,
          ...engagementScore.scores,
        }),
        segment || null,
      ]
    );

    if (row) {
      await db.execute(
        `UPDATE leads SET score = $1, behavioral_score = $2, demographic_score = $3, engagement_score = $4 WHERE id = $5`,
        [totalScore, behavioralScore.total, demographicScore.total, engagementScore.total, lead.id]
      );

      const leadScore: LeadScore = {
        id: row.id,
        leadId: row.lead_id,
        tenantId: row.tenant_id,
        behavioralScore: row.behavioral_score,
        demographicScore: row.demographic_score,
        engagementScore: row.engagement_score,
        totalScore: row.total_score,
        scores: row.scores,
        segment: row.segment || undefined,
        calculatedAt: row.calculated_at,
      };

      eventEmitter.emitLeadScored(tenantId, lead, leadScore);

      return leadScore;
    }

    return null;
  }

  private calculateBehavioralScore(lead: Lead): { total: number; scores: Record<string, number> } {
    const scores: Record<string, number> = {};
    let total = 0;

    const activities = lead.customFields?.activities as Record<string, number> || {};

    scores.websiteVisits = Math.min((activities.websiteVisits || 0) * BEHAVIORAL_WEIGHTS.websiteVisits, 25);
    scores.emailOpens = Math.min((activities.emailOpens || 0) * BEHAVIORAL_WEIGHTS.emailOpens, 15);
    scores.emailClicks = Math.min((activities.emailClicks || 0) * BEHAVIORAL_WEIGHTS.emailClicks, 20);
    scores.formSubmissions = Math.min((activities.formSubmissions || 0) * BEHAVIORAL_WEIGHTS.formSubmissions, 30);
    scores.contentDownloads = Math.min((activities.contentDownloads || 0) * BEHAVIORAL_WEIGHTS.contentDownloads, 20);
    scores.webinarAttendances = Math.min((activities.webinarAttendances || 0) * BEHAVIORAL_WEIGHTS.webinarAttendances, 25);
    scores.demoRequests = Math.min((activities.demoRequests || 0) * BEHAVIORAL_WEIGHTS.demoRequests, 35);

    total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    total = Math.min(total, 100);

    return { total, scores };
  }

  private calculateDemographicScore(lead: Lead): { total: number; scores: Record<string, number> } {
    const scores: Record<string, number> = {};
    let total = 0;

    const targetIndustries = ['Technology', 'Finance', 'Healthcare', 'SaaS', 'E-commerce'];
    scores.industryMatch = lead.company && targetIndustries.some(ind => 
      lead.company?.toLowerCase().includes(ind.toLowerCase())
    ) ? DEMOGRAPHIC_WEIGHTS.industryMatch : 0;

    const targetJobTitles = ['CEO', 'CTO', 'CFO', 'VP', 'Director', 'Manager', 'Founder', 'Owner'];
    scores.jobTitleMatch = lead.jobTitle && targetJobTitles.some(title => 
      lead.jobTitle?.toLowerCase().includes(title.toLowerCase())
    ) ? DEMOGRAPHIC_WEIGHTS.jobTitleMatch : 5;

    const companySizes = ['enterprise', 'large', 'medium', 'small'];
    scores.companySize = lead.customFields?.companySize && companySizes.includes(lead.customFields.companySize as string)
      ? DEMOGRAPHIC_WEIGHTS.companySize
      : (lead.company ? 5 : 0);

    scores.emailResponse = lead.customFields?.emailResponse ? DEMOGRAPHIC_WEIGHTS.emailResponse : 0;
    scores.meetingScheduled = lead.customFields?.meetingScheduled ? DEMOGRAPHIC_WEIGHTS.meetingScheduled : 0;

    total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    total = Math.min(total, 100);

    return { total, scores };
  }

  private calculateEngagementScore(lead: Lead): { total: number; scores: Record<string, number> } {
    const scores: Record<string, number> = {};
    let total = 0;

    const activities = lead.customFields?.activities as Record<string, number> || {};

    const emailEngagement = (activities.emailOpens || 0) >= ENGAGEMENT_THRESHOLDS.emailOpens ? 25 :
                           Math.round(((activities.emailOpens || 0) / ENGAGEMENT_THRESHOLDS.emailOpens) * 25);
    
    const clickEngagement = (activities.emailClicks || 0) >= ENGAGEMENT_THRESHOLDS.emailClicks ? 30 :
                           Math.round(((activities.emailClicks || 0) / ENGAGEMENT_THRESHOLDS.emailClicks) * 30);

    const webEngagement = (activities.websiteVisits || 0) >= ENGAGEMENT_THRESHOLDS.websiteVisits ? 25 :
                         Math.round(((activities.websiteVisits || 0) / ENGAGEMENT_THRESHOLDS.websiteVisits) * 25);

    const formEngagement = (activities.formSubmissions || 0) >= ENGAGEMENT_THRESHOLDS.formSubmissions ? 20 :
                          Math.min((activities.formSubmissions || 0) * 20, 20);

    scores.emailEngagement = emailEngagement;
    scores.clickEngagement = clickEngagement;
    scores.webEngagement = webEngagement;
    scores.formEngagement = formEngagement;

    total = emailEngagement + clickEngagement + webEngagement + formEngagement;
    total = Math.min(total, 100);

    return { total, scores };
  }

  private async determineSegment(tenantId: string, lead: Lead, totalScore: number): Promise<string | null> {
    const segments = await db.query<SegmentRow>(
      'SELECT * FROM lead_segments WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    for (const segment of segments) {
      if (this.evaluateConditions(lead, segment.conditions)) {
        return segment.name;
      }
    }

    if (totalScore >= 80) return 'Hot';
    if (totalScore >= 60) return 'Warm';
    if (totalScore >= 40) return 'Cool';
    return 'Cold';
  }

  private evaluateConditions(lead: Lead, conditions: RoutingCondition[]): boolean {
    for (const condition of conditions) {
      const value = this.getLeadFieldValue(lead, condition.field);
      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return false;
      }
    }
    return conditions.length > 0;
  }

  private getLeadFieldValue(lead: Lead, field: string): unknown {
    const fieldMap: Record<string, unknown> = {
      status: lead.status,
      score: lead.score,
      company: lead.company,
      jobTitle: lead.jobTitle,
      email: lead.email,
      tags: lead.tags,
      source: lead.attribution.source,
      medium: lead.attribution.medium,
    };
    return fieldMap[field] ?? lead.customFields?.[field];
  }

  private evaluateCondition(value: unknown, operator: RoutingCondition['operator'], target: unknown): boolean {
    switch (operator) {
      case 'equals':
        return value === target;
      case 'not_equals':
        return value !== target;
      case 'contains':
        return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase());
      case 'not_contains':
        return typeof value === 'string' && typeof target === 'string' && !value.toLowerCase().includes(target.toLowerCase());
      case 'greater_than':
        return typeof value === 'number' && typeof target === 'number' && value > target;
      case 'less_than':
        return typeof value === 'number' && typeof target === 'number' && value < target;
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'not_in':
        return Array.isArray(target) && !target.includes(value);
      default:
        return false;
    }
  }

  async recalculateScore(tenantId: string, lead: Lead): Promise<LeadScore | null> {
    return this.calculateScore(tenantId, lead);
  }

  async getScoreHistory(tenantId: string, leadId: string, limit = 10): Promise<LeadScore[]> {
    const rows = await db.query<ScoreRow>(
      'SELECT * FROM lead_scores WHERE lead_id = $1 AND tenant_id = $2 ORDER BY calculated_at DESC LIMIT $3',
      [leadId, tenantId, limit]
    );

    return rows.map(row => ({
      id: row.id,
      leadId: row.lead_id,
      tenantId: row.tenant_id,
      behavioralScore: row.behavioral_score,
      demographicScore: row.demographic_score,
      engagementScore: row.engagement_score,
      totalScore: row.total_score,
      scores: row.scores,
      segment: row.segment || undefined,
      calculatedAt: row.calculated_at,
    }));
  }

  async batchRecalculateScores(tenantId: string, leadIds: string[]): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const leadId of leadIds) {
      try {
        const lead = await db.queryOne<{ id: string }>('SELECT id FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tenantId]);
        if (lead) {
          await this.recalculateScore(tenantId, lead as unknown as Lead);
          updated++;
        }
      } catch (error) {
        errors.push(`Failed to recalculate score for lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { updated, errors };
  }
}

export const scoringService = new ScoringService();
