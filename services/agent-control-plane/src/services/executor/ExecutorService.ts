import { v4 as uuidv4 } from 'uuid';
import database from '../../utils/database';
import logger from '../../utils/logger';
import {
  AgentMission,
  AgentTask,
  AgentResult,
  AgentArtifact,
  MissionStatus,
  TaskStatus,
  TaskType,
  Artifact,
  Decision,
  ProvenanceRecord,
  RollbackInstruction,
  NextAction,
  ExecutionMetrics,
  ActionPlan
} from '../../types';

export class ExecutorService {
  private readonly SANDBOX_TIMEOUT_MS = 30000;

  async executeMission(mission: AgentMission, actionPlan: ActionPlan): Promise<AgentResult> {
    logger.info('Executor: Starting mission execution', { missionId: mission.id });
    
    const startTime = Date.now();
    const artifacts: Artifact[] = [];
    const decisions: Decision[] = [];
    const eventsEmitted: string[] = [];
    const nextActions: NextAction[] = [];
    
    let completedTasks = 0;
    let failedTasks = 0;

    try {
      await this.updateMissionStatus(mission.id, MissionStatus.EXECUTING);
      eventsEmitted.push('agent.execution.started');

      for (const task of actionPlan.task_graph.tasks) {
        const taskStartTime = Date.now();
        
        try {
          await this.updateTaskStatus(task.id, TaskStatus.RUNNING);
          
          const result = await this.executeTask(task, mission, actionPlan);
          
          await this.updateTaskResult(task.id, result, Date.now() - taskStartTime);
          await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);
          
          completedTasks++;
          
          if (result.artifacts) {
            artifacts.push(...result.artifacts);
          }
          if (result.decisions) {
            decisions.push(...result.decisions);
          }
          
        } catch (error) {
          logger.error('Executor: Task failed', { taskId: task.id, error });
          await this.updateTaskError(task.id, error instanceof Error ? error.message : 'Unknown error');
          await this.updateTaskStatus(task.id, TaskStatus.FAILED);
          failedTasks++;
          
          if (task.task_type === TaskType.REVIEW || task.task_type === TaskType.PUBLISH) {
            throw error;
          }
        }
      }

      const provenance = this.buildProvenanceRecord(mission, decisions);
      const rollbackInstructions = this.generateRollbackInstructions(actionPlan);
      
      nextActions.push({
        action_type: 'review',
        recommended_tool: 'artifact_reviewer',
        conditions: ['artifacts_created'],
        priority: 1
      });

      if (failedTasks > 0) {
        nextActions.push({
          action_type: 'alert',
          conditions: ['tasks_failed'],
          priority: 0
        });
      }

      const executionMetrics: ExecutionMetrics = {
        total_tasks: actionPlan.task_graph.tasks.length,
        completed_tasks: completedTasks,
        failed_tasks: failedTasks,
        total_duration_ms: Date.now() - startTime,
        total_cost: actionPlan.estimated_cost,
        tokens_used: Math.floor(Math.random() * 10000)
      };

      eventsEmitted.push('agent.execution.completed');

      logger.info('Executor: Mission execution completed', {
        missionId: mission.id,
        completedTasks,
        failedTasks,
        artifactsCreated: artifacts.length
      });

      return {
        mission_id: mission.id,
        action_plan: actionPlan,
        confidence_score: this.calculateConfidenceScore(completedTasks, failedTasks, actionPlan),
        artifacts_created: artifacts,
        decisions_made: decisions,
        provenance,
        rollback_instructions: rollbackInstructions,
        events_emitted: eventsEmitted,
        next_actions: nextActions,
        execution_metrics: executionMetrics
      };

    } catch (error) {
      logger.error('Executor: Mission execution failed', { missionId: mission.id, error });
      await this.updateMissionStatus(mission.id, MissionStatus.FAILED);
      eventsEmitted.push('agent.execution.failed');
      
      throw error;
    }
  }

  private async executeTask(
    task: { id: string; name: string; task_type: TaskType; tool_name?: string; tool_params?: Record<string, unknown> },
    mission: AgentMission,
    actionPlan: ActionPlan
  ): Promise<{ artifacts?: Artifact[]; decisions?: Decision[] }> {
    logger.info('Executor: Executing task', { taskId: task.id, taskType: task.task_type });

    await this.simulateSandboxExecution(task);

    switch (task.task_type) {
      case TaskType.PLANNING:
        return this.executePlanningTask(task, mission);
      
      case TaskType.EXECUTION:
        return this.executeExecutionTask(task, mission);
      
      case TaskType.REVIEW:
        return { artifacts: [], decisions: [] };
      
      case TaskType.PUBLISH:
        return { artifacts: [], decisions: [] };
      
      default:
        return { artifacts: [], decisions: [] };
    }
  }

  private async simulateSandboxExecution(task: { id: string; tool_name?: string }): Promise<void> {
    const executionTime = task.tool_name ? 
      Math.random() * 2000 + 500 : 
      Math.random() * 1000 + 100;
    
    await new Promise(resolve => setTimeout(resolve, executionTime));

    if (task.tool_name?.includes('dangerous')) {
      throw new Error('Blocked dangerous tool in sandbox');
    }
  }

  private async executePlanningTask(
    task: { id: string },
    mission: AgentMission
  ): Promise<{ decisions: Decision[] }> {
    const decision: Decision = {
      decision_id: uuidv4(),
      decision_type: 'context_analysis',
      rationale: `Analyzed mission objective: ${mission.objective.substring(0, 100)}...`,
      inputs_used: ['context_package', 'mission_objective'],
      confidence: 0.95,
      reversible: true
    };

    return { decisions: [decision] };
  }

  private async executeExecutionTask(
    task: { id: string; name: string; tool_name?: string; tool_params?: Record<string, unknown> },
    mission: AgentMission
  ): Promise<{ artifacts: Artifact[]; decisions: Decision[] }> {
    const artifacts: Artifact[] = [];
    const decisions: Decision[] = [];

    const decision: Decision = {
      decision_id: uuidv4(),
      decision_type: 'execution_strategy',
      rationale: `Selected tool ${task.tool_name} for task ${task.name}`,
      inputs_used: ['task_params', 'tool_capabilities'],
      confidence: 0.85,
      reversible: true
    };
    decisions.push(decision);

    if (task.tool_name) {
      const artifact: Artifact = {
        id: uuidv4(),
        name: `Output from ${task.tool_name}`,
        type: this.inferArtifactType(task.tool_name),
        content: this.generateMockContent(task),
        metadata: {
          tool_name: task.tool_name,
          task_id: task.id,
          mission_id: mission.id
        },
        validation_status: 'pending',
        validation_errors: []
      };
      artifacts.push(artifact);
    }

    return { artifacts, decisions };
  }

  private inferArtifactType(toolName: string): string {
    if (toolName.includes('content')) return 'content';
    if (toolName.includes('data')) return 'data';
    if (toolName.includes('file')) return 'file';
    return 'unknown';
  }

  private generateMockContent(task: { tool_name?: string; tool_params?: Record<string, unknown> }): string {
    const objective = task.tool_params?.objective as string || 'Generated content';
    return JSON.stringify({
      generated: true,
      content: `Processed: ${objective}`,
      timestamp: new Date().toISOString()
    });
  }

  private buildProvenanceRecord(
    mission: AgentMission,
    decisions: Decision[]
  ): ProvenanceRecord {
    return {
      original_facts: [
        `Mission objective: ${mission.objective}`,
        `Tenant: ${mission.tenant_id}`,
        `Workspace: ${mission.workspace_id}`
      ],
      transformations: decisions.map(d => ({
        transformation_id: d.decision_id,
        input_facts: d.inputs_used,
        output_facts: [`Decision: ${d.decision_type}`],
        method: d.decision_type,
        timestamp: new Date().toISOString()
      })),
      verification_chain: decisions.map(d => ({
        verification_id: uuidv4(),
        claim: `Decision ${d.decision_id} was made with ${d.confidence * 100}% confidence`,
        verification_method: 'confidence_tracking',
        result: d.confidence > 0.7,
        timestamp: new Date().toISOString()
      }))
    };
  }

  private generateRollbackInstructions(actionPlan: ActionPlan): RollbackInstruction {
    const rollbackSteps = actionPlan.task_graph.tasks
      .filter(task => task.task_type === TaskType.EXECUTION)
      .map((task, index) => ({
        step_order: index,
        action_type: 'reverse_mutation',
        target_resource: task.tool_name || 'unknown',
        restoration_method: task.rollback_strategy || 'restore_previous_state'
      }));

    return {
      can_rollback: rollbackSteps.length > 0,
      rollback_steps: rollbackSteps
    };
  }

  private calculateConfidenceScore(
    completed: number,
    failed: number,
    actionPlan: ActionPlan
  ): number {
    if (completed + failed === 0) return 0;
    
    const successRate = completed / (completed + failed);
    const baseScore = successRate * 0.8;
    const riskPenalty = this.getRiskPenalty(actionPlan.risk_assessment);
    
    return Math.max(0, Math.min(1, baseScore - riskPenalty));
  }

  private getRiskPenalty(riskAssessment: ActionPlan['risk_assessment']): number {
    switch (riskAssessment.overall_risk) {
      case 'critical': return 0.3;
      case 'high': return 0.2;
      case 'medium': return 0.1;
      case 'low': return 0;
      default: return 0.05;
    }
  }

  async saveArtifacts(
    missionId: string,
    artifacts: Artifact[]
  ): Promise<AgentArtifact[]> {
    const savedArtifacts: AgentArtifact[] = [];

    for (const artifact of artifacts) {
      const result = await database.query<AgentArtifact>(
        `INSERT INTO agent_artifacts 
         (id, mission_id, name, type, content, metadata, validation_status, validation_errors, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          artifact.id,
          missionId,
          artifact.name,
          artifact.type,
          artifact.content,
          JSON.stringify(artifact.metadata),
          artifact.validation_status,
          JSON.stringify(artifact.validation_errors),
          new Date()
        ]
      );

      savedArtifacts.push(this.mapRowToArtifact(result.rows[0]));
    }

    return savedArtifacts;
  }

  private async updateMissionStatus(missionId: string, status: MissionStatus): Promise<void> {
    const updates: string[] = ['status = $1', 'updated_at = $2'];
    const values: unknown[] = [status, new Date()];

    if (status === MissionStatus.EXECUTING) {
      updates.push('started_at = $3');
      values.push(new Date());
    }

    if (status === MissionStatus.COMPLETED || status === MissionStatus.FAILED) {
      updates.push('completed_at = $3');
      values.push(new Date());
    }

    await database.query(
      `UPDATE agent_missions SET ${updates.join(', ')} WHERE id = $${values.length + 1}`,
      [...values, missionId]
    );
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const updates: string[] = ['status = $1'];
    const values: unknown[] = [status];

    if (status === TaskStatus.RUNNING) {
      updates.push('started_at = $2');
      values.push(new Date());
    }

    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      updates.push('completed_at = $2');
      values.push(new Date());
    }

    await database.query(
      `UPDATE agent_tasks SET ${updates.join(', ')} WHERE id = $${values.length + 1}`,
      [...values, taskId]
    );
  }

  private async updateTaskResult(
    taskId: string,
    result: Record<string, unknown>,
    durationMs: number
  ): Promise<void> {
    await database.query(
      `UPDATE agent_tasks SET result = $1, actual_duration_ms = $2 WHERE id = $3`,
      [JSON.stringify(result), durationMs, taskId]
    );
  }

  private async updateTaskError(taskId: string, error: string): Promise<void> {
    await database.query(
      `UPDATE agent_tasks SET error = $1 WHERE id = $2`,
      [error, taskId]
    );
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
      validation_errors: typeof row.validation_errors === 'string' ? JSON.parse(row.validation_errors) : row.validation_errors,
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

export default new ExecutorService();
