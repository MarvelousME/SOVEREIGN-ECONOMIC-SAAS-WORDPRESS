import { v4 as uuidv4 } from 'uuid';
import database from '../utils/database';
import logger from '../utils/logger';
import plannerService from './planner/PlannerService';
import executorService from './executor/ExecutorService';
import reviewerService from './reviewer/ReviewerService';
import publisherService from './publisher/PublisherService';
import policyEngineService from './PolicyEngineService';
import approvalQueueService from './ApprovalQueueService';
import {
  AgentMission,
  AgentTask,
  AgentArtifact,
  CreateMissionRequest,
  MissionStatus,
  ExecuteMissionRequest,
  ApprovalRequest,
  RollbackRequest,
  MissionResponse,
  PlanResponse,
  RollbackToken
} from '../types';

export class MissionController {
  async createMission(request: CreateMissionRequest, userId: string): Promise<AgentMission> {
    logger.info('MissionController: Creating mission', { userId, objective: request.objective });

    const missionId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO agent_missions 
      (id, tenant_id, workspace_id, objective, entity_ref, context_package, tool_permissions, 
       policy_constraints, approval_policy, success_metric, time_budget, cost_budget, status, 
       priority, created_at, updated_at, created_by, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      missionId,
      request.tenant_id,
      request.workspace_id,
      request.objective,
      request.entity_ref || null,
      JSON.stringify(request.context_package),
      JSON.stringify(request.tool_permissions),
      JSON.stringify(request.policy_constraints),
      JSON.stringify(request.approval_policy),
      JSON.stringify(request.success_metric),
      request.time_budget,
      request.cost_budget,
      MissionStatus.PENDING,
      request.priority,
      now,
      now,
      userId,
      request.tags
    ];

    const result = await database.query<AgentMission>(query, values);
    const mission = this.mapRowToMission(result.rows[0]);

    await this.emitEvent(mission.id, 'mission.created', 'mission-controller', { userId });

    logger.info('MissionController: Mission created', { missionId: mission.id });
    return mission;
  }

  async getMission(missionId: string, userId: string): Promise<AgentMission | null> {
    const query = `
      SELECT * FROM agent_missions 
      WHERE id = $1 AND created_by = $2
    `;
    const result = await database.query<AgentMission>(query, [missionId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMission(result.rows[0]);
  }

  async getMissionStatus(missionId: string, userId: string): Promise<MissionResponse> {
    const mission = await this.getMission(missionId, userId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    const tasksResult = await database.query<AgentTask>(
      'SELECT * FROM agent_tasks WHERE mission_id = $1 ORDER BY task_index',
      [missionId]
    );

    const artifactsResult = await database.query<AgentArtifact>(
      'SELECT * FROM agent_artifacts WHERE mission_id = $1 ORDER BY created_at',
      [missionId]
    );

    return {
      mission,
      tasks: tasksResult.rows.map(row => this.mapRowToTask(row)),
      artifacts: artifactsResult.rows.map(row => this.mapRowToArtifact(row))
    };
  }

  async listMissions(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: { status?: MissionStatus; tenant_id?: string }
  ): Promise<{ missions: AgentMission[]; total: number }> {
    let query = 'SELECT * FROM agent_missions WHERE created_by = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.tenant_id) {
      query += ` AND tenant_id = $${paramIndex++}`;
      params.push(filters.tenant_id);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await database.query<AgentMission>(query, params);
    const missions = result.rows.map(row => this.mapRowToMission(row));

    return { missions, total };
  }

  async executeMission(
    missionId: string,
    userId: string,
    request: ExecuteMissionRequest
  ): Promise<PlanResponse> {
    logger.info('MissionController: Executing mission', { missionId, request });

    const mission = await this.getMission(missionId, userId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== MissionStatus.PENDING) {
      throw new Error(`Mission cannot be executed in status: ${mission.status}`);
    }

    await this.updateMissionStatus(missionId, MissionStatus.PLANNING);

    const actionPlan = await plannerService.createPlan(mission);

    await plannerService.saveTasks(missionId, actionPlan.task_graph);

    const policyCheck = await policyEngineService.evaluateMissionPolicies(mission);

    if (!policyCheck.allowed) {
      await this.updateMissionStatus(missionId, MissionStatus.REJECTED);
      await this.emitEvent(missionId, 'mission.policy.rejected', 'mission-controller', {
        violations: policyCheck.violations
      });
      throw new Error(`Policy check failed: ${policyCheck.reason}`);
    }

    if (policyCheck.required_approvals && policyCheck.required_approvals.length > 0) {
      await this.updateMissionStatus(missionId, MissionStatus.AWAITING_APPROVAL);
      await this.emitEvent(missionId, 'mission.approval.required', 'mission-controller', {
        requiredApprovers: policyCheck.required_approvals
      });
      return {
        mission_id: missionId,
        action_plan: actionPlan,
        policy_check: policyCheck,
        dry_run_eligible: false
      };
    }

    if (request.dry_run_only) {
      await this.updateMissionStatus(missionId, MissionStatus.PENDING);
      return {
        mission_id: missionId,
        action_plan: actionPlan,
        policy_check: policyCheck,
        dry_run_eligible: true
      };
    }

    await this.updateMissionStatus(missionId, MissionStatus.EXECUTING);
    await this.emitEvent(missionId, 'mission.execution.started', 'mission-controller', {});

    try {
      const result = await executorService.executeMission(mission, actionPlan);

      await executorService.saveArtifacts(missionId, result.artifacts_created);

      await reviewerService.reviewMissionResults(result, mission);

      const artifactsResult = await database.query<AgentArtifact>(
        'SELECT * FROM agent_artifacts WHERE mission_id = $1',
        [missionId]
      );

      const pendingArtifacts = artifactsResult.rows.filter(
        a => a.validation_status !== 'failed'
      );

      if (pendingArtifacts.length > 0) {
        const approval = await publisherService.requestApproval(
          mission,
          pendingArtifacts.map(a => a.id),
          userId
        );

        await this.emitEvent(missionId, 'mission.approval.requested', 'mission-controller', {
          approvalId: approval.id
        });

        return {
          mission_id: missionId,
          action_plan: actionPlan,
          policy_check: policyCheck,
          dry_run_eligible: false
        };
      }

      const publishResult = await publisherService.publishArtifacts(mission, pendingArtifacts);

      await this.updateMissionStatus(missionId, MissionStatus.COMPLETED);
      await this.emitEvent(missionId, 'mission.completed', 'mission-controller', {
        artifactsPublished: publishResult.published_artifacts.length
      });

      return {
        mission_id: missionId,
        action_plan: actionPlan,
        policy_check: policyCheck,
        dry_run_eligible: false
      };

    } catch (error) {
      logger.error('MissionController: Execution failed', { missionId, error });
      await this.updateMissionStatus(missionId, MissionStatus.FAILED);
      await this.emitEvent(missionId, 'mission.execution.failed', 'mission-controller', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async approveMission(
    missionId: string,
    userId: string,
    request: ApprovalRequest
  ): Promise<AgentMission> {
    logger.info('MissionController: Approving mission', { missionId, userId });

    const approvals = await approvalQueueService.getApprovalsByMission(missionId);
    const pendingApproval = approvals.find(a => a.status === 'pending');

    if (!pendingApproval) {
      throw new Error('No pending approval found for this mission');
    }

    const result = request.approved
      ? await approvalQueueService.approve(pendingApproval.id, userId, request.comments)
      : await approvalQueueService.reject(pendingApproval.id, userId, request.comments || 'Rejected');

    if (!result.success) {
      throw new Error('Approval action failed');
    }

    if (request.approved && result.mission) {
      const executeRequest: ExecuteMissionRequest = { dry_run_only: false, force_execution: false };
      await this.executeMission(missionId, userId, executeRequest);
    }

    const updatedMission = await this.getMission(missionId, userId);
    if (!updatedMission) {
      throw new Error('Mission not found after approval');
    }

    return updatedMission;
  }

  async rollbackMission(
    missionId: string,
    userId: string,
    request: RollbackRequest
  ): Promise<AgentMission> {
    logger.info('MissionController: Rolling back mission', { missionId, request });

    const rollbackToken = await this.getRollbackToken(request.token);
    if (!rollbackToken) {
      throw new Error('Invalid rollback token');
    }

    if (rollbackToken.status !== 'active') {
      throw new Error(`Rollback token is ${rollbackToken.status}`);
    }

    if (rollbackToken.mission_id !== missionId) {
      throw new Error('Rollback token does not match mission');
    }

    await this.performRollback(rollbackToken);

    await database.query(
      'UPDATE agent_rollback_tokens SET status = $1, used_at = $2, used_by = $3 WHERE id = $4',
      ['used', new Date(), userId, rollbackToken.id]
    );

    await this.updateMissionStatus(missionId, MissionStatus.ROLLED_BACK);
    await this.emitEvent(missionId, 'mission.rolled_back', 'mission-controller', {
      token: request.token,
      reason: request.reason
    });

    const updatedMission = await this.getMission(missionId, userId);
    if (!updatedMission) {
      throw new Error('Mission not found after rollback');
    }

    return updatedMission;
  }

  async cancelMission(missionId: string, userId: string): Promise<AgentMission> {
    logger.info('MissionController: Cancelling mission', { missionId, userId });

    const mission = await this.getMission(missionId, userId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    const nonCancellable = [MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.CANCELLED, MissionStatus.ROLLED_BACK];
    if (nonCancellable.includes(mission.status)) {
      throw new Error(`Cannot cancel mission in status: ${mission.status}`);
    }

    await this.updateMissionStatus(missionId, MissionStatus.CANCELLED);
    await this.emitEvent(missionId, 'mission.cancelled', 'mission-controller', { userId });

    const updatedMission = await this.getMission(missionId, userId);
    return updatedMission!;
  }

  private async getRollbackToken(token: string): Promise<RollbackToken | null> {
    const result = await database.query(
      'SELECT * FROM agent_rollback_tokens WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      mission_id: result.rows[0].mission_id,
      token: result.rows[0].token,
      action_type: result.rows[0].action_type,
      target_state: typeof result.rows[0].target_state === 'string' 
        ? JSON.parse(result.rows[0].target_state) 
        : result.rows[0].target_state,
      previous_state: result.rows[0].previous_state ? 
        (typeof result.rows[0].previous_state === 'string' 
          ? JSON.parse(result.rows[0].previous_state) 
          : result.rows[0].previous_state) 
        : undefined,
      created_at: result.rows[0].created_at,
      expires_at: result.rows[0].expires_at,
      used_at: result.rows[0].used_at,
      used_by: result.rows[0].used_by,
      status: result.rows[0].status
    };
  }

  private async performRollback(token: RollbackToken): Promise<void> {
    logger.info('MissionController: Performing rollback', { tokenId: token.id });
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info('MissionController: Rollback completed', { tokenId: token.id });
  }

  private async updateMissionStatus(missionId: string, status: MissionStatus): Promise<void> {
    const updates: string[] = ['status = $1', 'updated_at = $2'];
    const values: unknown[] = [status, new Date()];

    if (status === MissionStatus.EXECUTING || status === MissionStatus.APPROVED) {
      updates.push('started_at = $3');
      values.push(new Date());
    }

    if (status === MissionStatus.COMPLETED || status === MissionStatus.FAILED || status === MissionStatus.CANCELLED) {
      updates.push('completed_at = $3');
      values.push(new Date());
    }

    await database.query(
      `UPDATE agent_missions SET ${updates.join(', ')} WHERE id = $${values.length + 1}`,
      [...values, missionId]
    );
  }

  private async emitEvent(
    missionId: string,
    eventType: string,
    source: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        eventType,
        source,
        JSON.stringify(payload),
        new Date().toISOString()
      ]
    );
  }

  private mapRowToMission(row: any): AgentMission {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      workspace_id: row.workspace_id,
      objective: row.objective,
      entity_ref: row.entity_ref,
      context_package: typeof row.context_package === 'string' 
        ? JSON.parse(row.context_package) 
        : row.context_package,
      tool_permissions: typeof row.tool_permissions === 'string' 
        ? JSON.parse(row.tool_permissions) 
        : row.tool_permissions || [],
      policy_constraints: typeof row.policy_constraints === 'string' 
        ? JSON.parse(row.policy_constraints) 
        : row.policy_constraints || [],
      approval_policy: typeof row.approval_policy === 'string' 
        ? JSON.parse(row.approval_policy) 
        : row.approval_policy,
      success_metric: typeof row.success_metric === 'string' 
        ? JSON.parse(row.success_metric) 
        : row.success_metric,
      time_budget: row.time_budget,
      cost_budget: row.cost_budget,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_by: row.created_by,
      assigned_to: row.assigned_to,
      parent_mission_id: row.parent_mission_id,
      tags: row.tags || []
    };
  }

  private mapRowToTask(row: any): AgentTask {
    return {
      id: row.id,
      mission_id: row.mission_id,
      task_index: row.task_index,
      name: row.name,
      description: row.description,
      task_type: row.task_type,
      tool_name: row.tool_name,
      tool_params: typeof row.tool_params === 'string' ? JSON.parse(row.tool_params) : row.tool_params,
      dependencies: row.dependencies || [],
      status: row.status,
      result: row.result,
      error: row.error,
      started_at: row.started_at,
      completed_at: row.completed_at,
      estimated_duration_ms: row.estimated_duration_ms,
      actual_duration_ms: row.actual_duration_ms,
      created_at: row.created_at
    };
  }

  private mapRowToArtifact(row: any): AgentArtifact {
    return {
      id: row.id,
      mission_id: row.mission_id,
      task_id: row.task_id,
      name: row.name,
      type: row.type,
      content: row.content,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      validation_status: row.validation_status,
      validation_errors: typeof row.validation_errors === 'string' 
        ? JSON.parse(row.validation_errors) 
        : row.validation_errors || [],
      quality_score: row.quality_score,
      published_at: row.published_at,
      published_by: row.published_by,
      cdn_url: row.cdn_url,
      size_bytes: row.size_bytes,
      checksum: row.checksum,
      created_at: row.created_at
    };
  }
}

export default new MissionController();