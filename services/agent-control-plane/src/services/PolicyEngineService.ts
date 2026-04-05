import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import database from '../../utils/database';
import logger from '../../utils/logger';
import {
  AgentMission,
  PolicyConstraint,
  PolicyEvaluationResult,
  PolicyViolation,
  RiskLevel,
  ToolPermission
} from '../../types';
import config from '../../config';

interface OPARequest {
  input: {
    action: string;
    resource?: string;
    tenant_id?: string;
    workspace_id?: string;
    user_id?: string;
    mission_id?: string;
    objective?: string;
    tool_name?: string;
    metadata?: Record<string, unknown>;
  };
}

interface OPAResponse {
  result: {
    allow: boolean;
    reasons?: string[];
  };
}

export class PolicyEngineService {
  private readonly opaUrl: string;
  private readonly policyPackage: string;

  constructor() {
    this.opaUrl = config.opa.url;
    this.policyPackage = config.opa.policy;
  }

  async evaluateMissionPolicies(mission: AgentMission): Promise<PolicyEvaluationResult> {
    logger.info('PolicyEngine: Evaluating mission policies', { missionId: mission.id });

    const violations: PolicyViolation[] = [];
    const matchedRules: string[] = [];

    for (const constraint of mission.policy_constraints) {
      const violation = await this.evaluateConstraint(constraint, mission);
      if (violation) {
        violations.push(violation);
      } else {
        matchedRules.push(constraint.policy_id);
      }
    }

    const toolViolations = await this.evaluateToolPermissions(mission.tool_permissions, mission);
    violations.push(...toolViolations);

    const contentViolations = await this.evaluateContentPolicies(mission.objective);
    violations.push(...contentViolations);

    const rateLimitViolations = await this.evaluateRateLimits(mission);
    violations.push(...rateLimitViolations);

    const allowed = violations.length === 0;
    
    let requiredApprovals: string[] | undefined;
    if (!allowed || mission.approval_policy.type === 'manual') {
      requiredApprovals = this.determineRequiredApprovers(violations);
    }

    if (violations.length > 0) {
      await this.emitPolicyBlockedEvent(mission.id, violations);
    }

    return {
      allowed,
      reason: allowed ? 'All policy checks passed' : `${violations.length} policy violations detected`,
      required_approvals: requiredApprovals,
      matched_rules: matchedRules,
      violations
    };
  }

  private async evaluateConstraint(
    constraint: PolicyConstraint,
    mission: AgentMission
  ): Promise<PolicyViolation | null> {
    const constraint_lower = constraint.action_pattern.toLowerCase();
    const objective_lower = mission.objective.toLowerCase();

    if (constraint.effect === 'deny') {
      if (objective_lower.includes(constraint.action_pattern.toLowerCase())) {
        return {
          policy_id: constraint.policy_id,
          policy_name: constraint.policy_type,
          violation_type: 'action_blocked',
          severity: RiskLevel.HIGH,
          description: `Mission objective contains restricted action: ${constraint.action_pattern}`
        };
      }
    }

    return null;
  }

  private async evaluateToolPermissions(
    permissions: ToolPermission[],
    mission: AgentMission
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    for (const permission of permissions) {
      if (permission.requires_approval) {
        const hasApprovalPolicy = mission.approval_policy.required_approvers &&
          mission.approval_policy.required_approvers.length > 0;

        if (!hasApprovalPolicy) {
          violations.push({
            policy_id: `tool-approval-${permission.tool_name}`,
            policy_name: 'Tool Approval Required',
            violation_type: 'missing_approval',
            severity: RiskLevel.MEDIUM,
            description: `Tool ${permission.tool_name} requires approval but no approvers specified`
          });
        }
      }

      if (permission.max_calls) {
        violations.push({
          policy_id: `tool-rate-${permission.tool_name}`,
          policy_name: 'Tool Rate Limit',
          violation_type: 'rate_limit_configured',
          severity: RiskLevel.LOW,
          description: `Tool ${permission.tool_name} has rate limit of ${permission.max_calls} calls`
        });
      }
    }

    return violations;
  }

  private async evaluateContentPolicies(objective: string): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    const objectiveLower = objective.toLowerCase();

    const blockedPatterns = [
      { pattern: 'delete all', severity: RiskLevel.CRITICAL, description: 'Mass deletion not allowed' },
      { pattern: 'drop table', severity: RiskLevel.CRITICAL, description: 'Database manipulation not allowed' },
      { pattern: 'truncate', severity: RiskLevel.HIGH, description: 'Data truncation not allowed' },
      { pattern: 'sudo', severity: RiskLevel.HIGH, description: 'Privilege escalation not allowed' },
      { pattern: 'rm -rf', severity: RiskLevel.CRITICAL, description: 'Recursive force deletion not allowed' },
      { pattern: 'curl | sh', severity: RiskLevel.CRITICAL, description: 'Pipe to shell execution not allowed' },
      { pattern: 'eval(', severity: RiskLevel.HIGH, description: 'Code evaluation not allowed' }
    ];

    for (const blocked of blockedPatterns) {
      if (objectiveLower.includes(blocked.pattern)) {
        violations.push({
          policy_id: `content-block-${blocked.pattern.replace(/\s+/g, '-')}`,
          policy_name: 'Content Policy',
          violation_type: 'blocked_pattern',
          severity: blocked.severity,
          description: blocked.description
        });
      }
    }

    return violations;
  }

  private async evaluateRateLimits(mission: AgentMission): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    if (mission.cost_budget > 100) {
      violations.push({
        policy_id: 'cost-limit',
        policy_name: 'Cost Budget Policy',
        violation_type: 'excessive_budget',
        severity: RiskLevel.MEDIUM,
        description: `Cost budget ($${mission.cost_budget}) exceeds recommended limit ($100)`,
        remediation: 'Consider reducing cost budget or splitting into smaller missions'
      });
    }

    if (mission.time_budget > 7200) {
      violations.push({
        policy_id: 'time-limit',
        policy_name: 'Time Budget Policy',
        violation_type: 'excessive_time',
        severity: RiskLevel.LOW,
        description: `Time budget (${mission.time_budget}s) exceeds 2 hours`
      });
    }

    return violations;
  }

  private determineRequiredApprovers(violations: PolicyViolation[]): string[] {
    const approvers: Set<string> = new Set();

    for (const violation of violations) {
      if (violation.severity === RiskLevel.CRITICAL) {
        approvers.add('senior_approver');
        approvers.add('compliance_reviewer');
      } else if (violation.severity === RiskLevel.HIGH) {
        approvers.add('senior_approver');
      } else if (violation.severity === RiskLevel.MEDIUM) {
        approvers.add('team_lead');
      }
    }

    return Array.from(approvers);
  }

  async checkOPA(input: OPARequest): Promise<boolean> {
    try {
      const response = await axios.post<OPAResponse>(
        `${this.opaUrl}/v1/data/${this.policyPackage}/allow`,
        input,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );

      return response.data.result.allow;
    } catch (error) {
      logger.error('OPA check failed, failing closed', { error });
      return false;
    }
  }

  async checkToolPermission(
    toolName: string,
    action: string,
    mission: AgentMission
  ): Promise<boolean> {
    const permission = mission.tool_permissions.find(p => p.tool_name === toolName);
    
    if (!permission) {
      logger.warn('PolicyEngine: Tool not in permissions', { toolName });
      return false;
    }

    if (!permission.allowed_operations.includes(action)) {
      logger.warn('PolicyEngine: Action not allowed', { toolName, action });
      return false;
    }

    const opaResult = await this.checkOPA({
      input: {
        action,
        tool_name: toolName,
        tenant_id: mission.tenant_id,
        workspace_id: mission.workspace_id,
        mission_id: mission.id
      }
    });

    return opaResult;
  }

  async evaluateChannelRestrictions(
    mission: AgentMission,
    channel: string
  ): Promise<{ allowed: boolean; reason: string }> {
    const restrictedChannels = ['admin', 'system', 'root'];
    
    if (restrictedChannels.includes(channel.toLowerCase())) {
      return {
        allowed: false,
        reason: `Channel ${channel} is restricted`
      };
    }

    return { allowed: true, reason: 'Channel access granted' };
  }

  private async emitPolicyBlockedEvent(
    missionId: string,
    violations: PolicyViolation[]
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        'policy.action_blocked',
        'policy-engine',
        JSON.stringify({ violations }),
        new Date()
      ]
    );
  }

  async getPolicyRules(tenantId: string): Promise<unknown[]> {
    const result = await database.query(
      'SELECT * FROM agent_policy_rules WHERE tenant_id = $1 AND enabled = true ORDER BY priority DESC',
      [tenantId]
    );

    return result.rows;
  }

  async createPolicyRule(
    tenantId: string,
    rule: {
      name: string;
      description?: string;
      rule_type: string;
      resource_pattern?: string;
      action_pattern?: string;
      conditions?: Record<string, unknown>;
      effect: string;
      priority?: number;
    }
  ): Promise<string> {
    const ruleId = uuidv4();
    
    await database.query(
      `INSERT INTO agent_policy_rules 
       (id, tenant_id, name, description, rule_type, resource_pattern, action_pattern, conditions, effect, priority, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12)`,
      [
        ruleId,
        tenantId,
        rule.name,
        rule.description,
        rule.rule_type,
        rule.resource_pattern,
        rule.action_pattern,
        JSON.stringify(rule.conditions || {}),
        rule.effect,
        rule.priority || 0,
        new Date(),
        new Date()
      ]
    );

    return ruleId;
  }
}

export default new PolicyEngineService();
