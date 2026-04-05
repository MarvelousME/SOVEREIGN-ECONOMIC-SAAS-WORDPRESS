import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import { config } from '../config';
import {
  ChannelPolicy,
  PolicyAction,
  Regulation,
  ContentCheckInput
} from '../types';

interface PolicyCheckResult {
  action: PolicyAction;
  channel: string;
  regulation: Regulation;
  requirements: Record<string, any>;
  violations: string[];
  metadata?: Record<string, any>;
}

interface ChannelRequirements {
  requiresPhysicalAddress?: boolean;
  requiresUnsubscribeHeader?: boolean;
  requiresCompanyName?: boolean;
  requiresOptInConsent?: boolean;
  requiresWrittenConsent?: boolean;
  maxMessageLength?: number;
  requiresDisclosure?: boolean;
  minimumAge?: number;
  restrictedContent?: string[];
  allowedContent?: string[];
}

export class PolicyEngine {
  private channelRequirements: Record<string, ChannelRequirements> = {
    email: {
      requiresPhysicalAddress: true,
      requiresUnsubscribeHeader: true,
      requiresCompanyName: true,
      requiresDisclosure: true
    },
    sms: {
      requiresWrittenConsent: true,
      requiresOptInConsent: true,
      maxMessageLength: 160
    },
    push: {
      requiresOptInConsent: true
    },
    social: {
      requiresDisclosure: true,
      minimumAge: 13
    },
    web: {
      requiresDisclosure: true,
      minimumAge: 13
    }
  };

  async checkContent(input: ContentCheckInput): Promise<PolicyCheckResult> {
    const policy = await this.getChannelPolicy(input.channel);

    if (!policy) {
      return {
        action: PolicyAction.ALLOW,
        channel: input.channel,
        regulation: Regulation.FTC,
        requirements: {},
        violations: []
      };
    }

    const violations = this.validateContent(input, policy);

    if (violations.length > 0) {
      await eventService.publish(ComplianceEvents.POLICY_ACTION_BLOCKED, {
        channel: input.channel,
        contentType: input.contentType,
        violations,
        timestamp: new Date()
      });

      const riskScore = this.calculateRiskScore(violations);

      if (riskScore >= config.compliance.reviewQueueHighPriorityThreshold) {
        return {
          action: PolicyAction.REVIEW,
          channel: input.channel,
          regulation: policy.regulation,
          requirements: policy.requirements,
          violations,
          metadata: { riskScore }
        };
      }

      return {
        action: PolicyAction.BLOCK,
        channel: input.channel,
        regulation: policy.regulation,
        requirements: policy.requirements,
        violations
      };
    }

    return {
      action: PolicyAction.ALLOW,
      channel: input.channel,
      regulation: policy.regulation,
      requirements: policy.requirements,
      violations: []
    };
  }

  async getChannelPolicy(channel: string): Promise<ChannelPolicy | null> {
    const query = `
      SELECT * FROM compliance.channel_policies
      WHERE channel = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [channel]);

    if (result.rows.length === 0) {
      return this.getDefaultPolicy(channel);
    }

    return this.mapToChannelPolicy(result.rows[0]);
  }

  async createChannelPolicy(policy: {
    channel: string;
    regulation: Regulation;
    ruleSet: string;
    requirements: ChannelRequirements;
    metadata?: Record<string, any>;
  }): Promise<ChannelPolicy> {
    const id = uuidv4();

    const query = `
      INSERT INTO compliance.channel_policies (
        id, channel, regulation, rule_set, requirements, is_active, metadata,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7, $7
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      policy.channel,
      policy.regulation,
      policy.ruleSet,
      JSON.stringify(policy.requirements),
      JSON.stringify(policy.metadata || {})
    ]);

    logger.info('Channel policy created', { id, channel: policy.channel });

    return this.mapToChannelPolicy(result.rows[0]);
  }

  async updateChannelPolicy(
    id: string,
    updates: Partial<{
      requirements: ChannelRequirements;
      isActive: boolean;
      ruleSet: string;
      metadata: Record<string, any>;
    }>
  ): Promise<ChannelPolicy> {
    const now = new Date();
    const setClauses: string[] = ['updated_at = $2'];
    const values: any[] = [id, now];
    let paramIndex = 3;

    if (updates.requirements !== undefined) {
      setClauses.push(`requirements = $${paramIndex++}`);
      values.push(JSON.stringify(updates.requirements));
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updates.ruleSet !== undefined) {
      setClauses.push(`rule_set = $${paramIndex++}`);
      values.push(updates.ruleSet);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    const query = `
      UPDATE compliance.channel_policies
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Channel policy not found');
    }

    logger.info('Channel policy updated', { id });

    return this.mapToChannelPolicy(result.rows[0]);
  }

  async listChannelPolicies(filters?: {
    channel?: string;
    regulation?: Regulation;
    isActive?: boolean;
  }): Promise<ChannelPolicy[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters?.regulation) {
      conditions.push(`regulation = $${paramIndex++}`);
      values.push(filters.regulation);
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(filters.isActive);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT * FROM compliance.channel_policies
      ${whereClause}
      ORDER BY channel
    `;

    const result = await db.query(query, values);

    return result.rows.map(this.mapToChannelPolicy);
  }

  private getDefaultPolicy(channel: string): ChannelPolicy {
    const requirements = this.channelRequirements[channel] || {};

    return {
      id: 'default',
      channel,
      regulation: Regulation.FTC,
      ruleSet: 'default',
      requirements: requirements as Record<string, any>,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private validateContent(
    input: ContentCheckInput,
    policy: ChannelPolicy
  ): string[] {
    const violations: string[] = [];
    const requirements = policy.requirements as ChannelRequirements || {};
    const content = input.content;

    if (requirements.requiresPhysicalAddress) {
      if (!content.physicalAddress && !content.address) {
        violations.push('Missing physical address (required for email marketing)');
      }
    }

    if (requirements.requiresUnsubscribeHeader) {
      if (!content.unsubscribeLink && !content.unsubscribe) {
        violations.push('Missing unsubscribe mechanism');
      }
    }

    if (requirements.requiresCompanyName) {
      if (!content.companyName && !content.senderName) {
        violations.push('Missing company/sender name');
      }
    }

    if (requirements.requiresOptInConsent) {
      if (!content.hasOptInConsent && input.contactId) {
        violations.push('Contact has not provided opt-in consent');
      }
    }

    if (requirements.requiresWrittenConsent) {
      if (!content.writtenConsent && !content.explicitConsent) {
        violations.push('Written/explicit consent required for SMS');
      }
    }

    if (requirements.maxMessageLength) {
      const message = content.message || content.body || '';
      if (message.length > requirements.maxMessageLength) {
        violations.push(`Message exceeds maximum length of ${requirements.maxMessageLength} characters`);
      }
    }

    if (requirements.requiresDisclosure) {
      if (!content.hasDisclosure && !content.disclosureText) {
        violations.push('Content requires advertising disclosure');
      }
    }

    if (requirements.minimumAge) {
      if (content.age && content.age < requirements.minimumAge) {
        violations.push(`Content not suitable for users under ${requirements.minimumAge}`);
      }
    }

    if (requirements.restrictedContent && requirements.restrictedContent.length > 0) {
      const contentText = JSON.stringify(content).toLowerCase();
      for (const restricted of requirements.restrictedContent) {
        if (contentText.includes(restricted.toLowerCase())) {
          violations.push(`Content contains restricted term: ${restricted}`);
        }
      }
    }

    return violations;
  }

  private calculateRiskScore(violations: string[]): number {
    const baseScore = violations.length * 15;
    const severityMultiplier = violations.some(v =>
      v.includes('consent') || v.includes('restriction')
    ) ? 1.5 : 1;

    return Math.min(100, Math.round(baseScore * severityMultiplier));
  }

  private mapToChannelPolicy(row: any): ChannelPolicy {
    return {
      id: row.id,
      channel: row.channel,
      regulation: row.regulation as Regulation,
      ruleSet: row.rule_set,
      requirements: JSON.parse(row.requirements || '{}'),
      isActive: row.is_active,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const policyEngine = new PolicyEngine();
