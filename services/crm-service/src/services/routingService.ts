import { db } from '../models/database';
import { eventEmitter } from './eventEmitter';
import { config } from '../config';
import { Lead, LeadRoutingRule, RoutingCondition, RoutingAction } from '../types';

interface RuleRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
}

interface TerritoryRow {
  id: string;
  tenant_id: string;
  name: string;
  owner_id: string | null;
  region: string | null;
}

export class RoutingService {
  async applyRoutingRules(tenantId: string, lead: Lead): Promise<LeadRoutingRule | null> {
    const rules = await db.query<RuleRow>(
      'SELECT * FROM lead_routing_rules WHERE tenant_id = $1 AND is_active = true ORDER BY priority DESC',
      [tenantId]
    );

    for (const rule of rules) {
      if (this.evaluateConditions(lead, rule.conditions)) {
        await this.executeActions(tenantId, lead, rule.actions);
        return {
          id: rule.id,
          tenantId: rule.tenant_id,
          name: rule.name,
          description: rule.description || undefined,
          conditions: rule.conditions,
          actions: rule.actions,
          priority: rule.priority,
          isActive: rule.is_active,
          createdAt: rule.created_at,
          updatedAt: rule.updated_at,
        };
      }
    }

    return null;
  }

  private evaluateConditions(lead: Lead, conditions: RoutingCondition[]): boolean {
    for (const condition of conditions) {
      const value = this.getLeadFieldValue(lead, condition.field);
      if (!this.evaluateSingleCondition(value, condition.operator, condition.value)) {
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
      campaign: lead.attribution.campaign,
      ownerId: lead.ownerId,
    };
    return fieldMap[field] ?? lead.customFields?.[field];
  }

  private evaluateSingleCondition(value: unknown, operator: RoutingCondition['operator'], target: unknown): boolean {
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

  private async executeActions(tenantId: string, lead: Lead, actions: RoutingAction[]): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'assign_owner':
          await this.assignOwner(tenantId, lead.id, action.value as string);
          break;
        case 'assign_territory':
          await this.assignTerritory(tenantId, lead.id, action.value as string);
          break;
        case 'add_tag':
          await this.addTag(tenantId, lead.id, action.value as string);
          break;
        case 'set_status':
          await this.setStatus(tenantId, lead.id, action.value as string);
          break;
        case 'notify':
          await this.sendNotification(tenantId, lead, action.value as string);
          break;
      }
    }
  }

  private async assignOwner(tenantId: string, leadId: string, ownerId: string): Promise<void> {
    await db.execute(
      'UPDATE leads SET owner_id = $1 WHERE id = $2',
      [ownerId, leadId]
    );
  }

  private async assignTerritory(tenantId: string, leadId: string, territoryName: string): Promise<void> {
    const territory = await db.queryOne<TerritoryRow>(
      'SELECT * FROM territories WHERE tenant_id = $1 AND name = $2',
      [tenantId, territoryName]
    );

    if (territory && territory.owner_id) {
      await this.assignOwner(tenantId, leadId, territory.owner_id);
    }

    await db.execute(
      "UPDATE leads SET custom_fields = jsonb_set(custom_fields, '{territory}', $1) WHERE id = $2",
      [JSON.stringify(territoryName), leadId]
    );
  }

  private async addTag(tenantId: string, leadId: string, tag: string): Promise<void> {
    await db.execute(
      'UPDATE leads SET tags = array_append(tags, $1) WHERE id = $2 AND tenant_id = $3',
      [tag, leadId, tenantId]
    );
  }

  private async setStatus(tenantId: string, leadId: string, status: string): Promise<void> {
    await db.execute(
      'UPDATE leads SET status = $1 WHERE id = $2 AND tenant_id = $3',
      [status, leadId, tenantId]
    );
  }

  private async sendNotification(tenantId: string, lead: Lead, notificationType: string): Promise<void> {
    console.log(`Notification: ${notificationType} for lead ${lead.id}`);
  }

  async roundRobinAssign(tenantId: string, leadId: string): Promise<string | null> {
    const { maxLeadsPerUser } = config.routing;

    const users = await db.query<UserRow>(
      `SELECT u.id, u.email FROM users u 
       WHERE u.tenant_id = $1 AND u.is_active = true
       ORDER BY (
         SELECT COUNT(*) FROM leads l WHERE l.owner_id = u.id AND l.tenant_id = $1
       ) ASC LIMIT 1`,
      [tenantId]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const currentCount = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM leads WHERE owner_id = $1 AND tenant_id = $2',
      [user.id, tenantId]
    );

    if (parseInt(currentCount?.count || '0', 10) < maxLeadsPerUser) {
      await this.assignOwner(tenantId, leadId, user.id);
      return user.id;
    }

    return null;
  }

  async getRoutingRules(tenantId: string): Promise<LeadRoutingRule[]> {
    const rows = await db.query<RuleRow>(
      'SELECT * FROM lead_routing_rules WHERE tenant_id = $1 ORDER BY priority DESC',
      [tenantId]
    );

    return rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || undefined,
      conditions: row.conditions,
      actions: row.actions,
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createRoutingRule(tenantId: string, rule: Omit<LeadRoutingRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<LeadRoutingRule> {
    const row = await db.queryOne<RuleRow>(
      `INSERT INTO lead_routing_rules (tenant_id, name, description, conditions, actions, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        tenantId,
        rule.name,
        rule.description || null,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.priority,
        rule.isActive,
      ]
    );

    if (!row) {
      throw new Error('Failed to create routing rule');
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || undefined,
      conditions: row.conditions,
      actions: row.actions,
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateRoutingRule(tenantId: string, ruleId: string, updates: Partial<LeadRoutingRule>): Promise<LeadRoutingRule | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.conditions !== undefined) {
      setClauses.push(`conditions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.conditions));
    }
    if (updates.actions !== undefined) {
      setClauses.push(`actions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.actions));
    }
    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      return null;
    }

    values.push(ruleId, tenantId);
    const row = await db.queryOne<RuleRow>(
      `UPDATE lead_routing_rules SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex} RETURNING *`,
      values
    );

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || undefined,
      conditions: row.conditions,
      actions: row.actions,
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteRoutingRule(tenantId: string, ruleId: string): Promise<boolean> {
    const count = await db.execute(
      'DELETE FROM lead_routing_rules WHERE id = $1 AND tenant_id = $2',
      [ruleId, tenantId]
    );
    return count > 0;
  }

  async getSLAMeasurements(tenantId: string): Promise<{ leadId: string; timeToFirstContact?: number; slaBreached: boolean }[]> {
    const leads = await db.query<{ id: string; created_at: Date; last_contacted_at: Date | null }>(
      `SELECT id, created_at, last_contacted_at FROM leads 
       WHERE tenant_id = $1 AND status != 'converted' AND status != 'lost'`,
      [tenantId]
    );

    const slaHours = 24;

    return leads.map(lead => {
      const timeToFirstContact = lead.last_contacted_at
        ? Math.floor((new Date(lead.last_contacted_at).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60))
        : undefined;

      const slaBreached = !lead.last_contacted_at && 
        Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60)) > slaHours;

      return {
        leadId: lead.id,
        timeToFirstContact,
        slaBreached,
      };
    });
  }
}

export const routingService = new RoutingService();
