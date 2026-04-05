import { v4 as uuidv4 } from 'uuid';
import database from '../../utils/database';
import logger from '../../utils/logger';
import {
  AgentMission,
  AgentTask,
  AgentArtifact,
  CreateMissionRequest,
  MissionStatus,
  TaskStatus,
  TaskType,
  ActionPlan,
  TaskGraph,
  TaskNode,
  ResourceAllocation,
  ToolSelection,
  RiskAssessment,
  RiskLevel,
  PolicyEvaluationResult,
  ApprovalPolicyType
} from '../../types';

export class PlannerService {
  async createPlan(mission: AgentMission): Promise<ActionPlan> {
    logger.info('Planner: Creating task graph', { missionId: mission.id });

    const taskGraph = await this.createTaskGraph(mission);
    const resourceAllocation = this.planResources(mission);
    const toolSequence = await this.selectTools(mission);
    const estimatedDuration = this.estimateDuration(taskGraph);
    const estimatedCost = this.estimateCost(taskGraph);
    const riskAssessment = await this.assessRisks(mission, taskGraph);

    await this.logExecution(mission.id, 'info', 'Plan created successfully', {
      taskCount: taskGraph.tasks.length,
      estimatedDuration,
      estimatedCost,
      riskLevel: riskAssessment.overall_risk
    });

    return {
      task_graph: taskGraph,
      resource_allocation: resourceAllocation,
      tool_sequence: toolSequence,
      estimated_duration_ms: estimatedDuration,
      estimated_cost: estimatedCost,
      risk_assessment: riskAssessment
    };
  }

  private async createTaskGraph(mission: AgentMission): Promise<TaskGraph> {
    const tasks: TaskNode[] = [];
    const objective = mission.objective.toLowerCase();
    
    const contextAnalysisTask: TaskNode = {
      id: uuidv4(),
      name: 'Analyze Context',
      description: 'Analyze mission context and available resources',
      task_type: TaskType.PLANNING,
      dependencies: [],
      estimated_duration_ms: 5000,
      estimated_cost: 0.01
    };
    tasks.push(contextAnalysisTask);

    if (objective.includes('create') || objective.includes('generate') || objective.includes('build')) {
      const creationTask: TaskNode = {
        id: uuidv4(),
        name: 'Content Creation',
        description: 'Create content based on mission objective',
        task_type: TaskType.EXECUTION,
        tool_name: 'content_generator',
        tool_params: { objective: mission.objective },
        dependencies: [contextAnalysisTask.id],
        estimated_duration_ms: 30000,
        estimated_cost: 0.05
      };
      tasks.push(creationTask);

      const reviewTask: TaskNode = {
        id: uuidv4(),
        name: 'Review Content',
        description: 'Review and validate created content',
        task_type: TaskType.REVIEW,
        tool_name: 'content_reviewer',
        tool_params: { quality_threshold: 0.8 },
        dependencies: [creationTask.id],
        estimated_duration_ms: 10000,
        estimated_cost: 0.02
      };
      tasks.push(reviewTask);

      const publishTask: TaskNode = {
        id: uuidv4(),
        name: 'Publish Content',
        description: 'Publish reviewed content',
        task_type: TaskType.PUBLISH,
        tool_name: 'content_publisher',
        dependencies: [reviewTask.id],
        estimated_duration_ms: 5000,
        estimated_cost: 0.01
      };
      tasks.push(publishTask);
    }
    else if (objective.includes('analyze') || objective.includes('evaluate') || objective.includes('assess')) {
      const analysisTask: TaskNode = {
        id: uuidv4(),
        name: 'Data Analysis',
        description: 'Analyze data according to mission objective',
        task_type: TaskType.EXECUTION,
        tool_name: 'data_analyzer',
        tool_params: { objective: mission.objective },
        dependencies: [contextAnalysisTask.id],
        estimated_duration_ms: 60000,
        estimated_cost: 0.10
      };
      tasks.push(analysisTask);

      const reviewTask: TaskNode = {
        id: uuidv4(),
        name: 'Validate Analysis',
        description: 'Validate analysis results',
        task_type: TaskType.REVIEW,
        tool_name: 'result_validator',
        dependencies: [analysisTask.id],
        estimated_duration_ms: 10000,
        estimated_cost: 0.02
      };
      tasks.push(reviewTask);
    }
    else if (objective.includes('update') || objective.includes('modify') || objective.includes('edit')) {
      const fetchTask: TaskNode = {
        id: uuidv4(),
        name: 'Fetch Target',
        description: 'Fetch entity to be updated',
        task_type: TaskType.EXECUTION,
        tool_name: 'entity_fetcher',
        dependencies: [contextAnalysisTask.id],
        estimated_duration_ms: 5000,
        estimated_cost: 0.01
      };
      tasks.push(fetchTask);

      const updateTask: TaskNode = {
        id: uuidv4(),
        name: 'Apply Updates',
        description: 'Apply requested modifications',
        task_type: TaskType.EXECUTION,
        tool_name: 'entity_updater',
        tool_params: { objective: mission.objective },
        dependencies: [fetchTask.id],
        estimated_duration_ms: 15000,
        estimated_cost: 0.03
      };
      tasks.push(updateTask);

      const reviewTask: TaskNode = {
        id: uuidv4(),
        name: 'Verify Updates',
        description: 'Verify applied updates',
        task_type: TaskType.REVIEW,
        tool_name: 'update_verifier',
        dependencies: [updateTask.id],
        estimated_duration_ms: 5000,
        estimated_cost: 0.01
      };
      tasks.push(reviewTask);
    }
    else {
      const executionTask: TaskNode = {
        id: uuidv4(),
        name: 'Execute Mission',
        description: 'Execute the mission objective',
        task_type: TaskType.EXECUTION,
        tool_name: 'generic_executor',
        tool_params: { objective: mission.objective },
        dependencies: [contextAnalysisTask.id],
        estimated_duration_ms: 30000,
        estimated_cost: 0.05
      };
      tasks.push(executionTask);

      const reviewTask: TaskNode = {
        id: uuidv4(),
        name: 'Review Results',
        description: 'Review mission execution results',
        task_type: TaskType.REVIEW,
        tool_name: 'result_reviewer',
        dependencies: [executionTask.id],
        estimated_duration_ms: 10000,
        estimated_cost: 0.02
      };
      tasks.push(reviewTask);
    }

    const executionOrder = this.calculateExecutionOrder(tasks);
    const parallelGroups = this.calculateParallelGroups(tasks);

    return {
      tasks,
      execution_order: executionOrder,
      parallel_groups: parallelGroups
    };
  }

  private calculateExecutionOrder(tasks: TaskNode[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map(t => t.id));

    while (remaining.size > 0) {
      const batch: string[] = [];
      
      for (const task of tasks) {
        if (remaining.has(task.id) && 
            task.dependencies.every(dep => completed.has(dep))) {
          batch.push(task.id);
        }
      }

      if (batch.length === 0 && remaining.size > 0) {
        logger.warn('Circular dependency detected, breaking cycle');
        batch.push(...remaining);
        remaining.clear();
      }

      batch.forEach(id => {
        remaining.delete(id);
        completed.add(id);
      });
      order.push(batch);
    }

    return order;
  }

  private calculateParallelGroups(tasks: TaskNode[]): string[][] {
    const groups: string[][] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    for (const orderBatch of this.calculateExecutionOrder(tasks)) {
      const parallelTasks = orderBatch.filter(taskId => {
        const task = taskMap.get(taskId);
        if (!task) return false;
        const hasDepInBatch = task.dependencies.some(dep => orderBatch.includes(dep));
        return !hasDepInBatch;
      });
      
      if (parallelTasks.length > 0) {
        groups.push(parallelTasks);
      }
    }

    return groups;
  }

  private planResources(mission: AgentMission): ResourceAllocation {
    const objective = mission.objective.toLowerCase();
    
    if (objective.includes('analyze') || objective.includes('data')) {
      return {
        cpu_cores: 2,
        memory_mb: 1024,
        storage_mb: 512,
        network_allowed: true,
        sandbox_mode: true
      };
    }
    
    if (objective.includes('create') || objective.includes('generate')) {
      return {
        cpu_cores: 1,
        memory_mb: 512,
        storage_mb: 256,
        network_allowed: true,
        sandbox_mode: true
      };
    }

    return {
      cpu_cores: 1,
      memory_mb: 512,
      storage_mb: 256,
      network_allowed: true,
      sandbox_mode: true
    };
  }

  private async selectTools(mission: AgentMission): Promise<ToolSelection[]> {
    const selections: ToolSelection[] = [];
    const objective = mission.objective.toLowerCase();

    for (const permission of mission.tool_permissions) {
      if (objective.includes('create') && permission.allowed_operations.includes('create')) {
        selections.push({
          tool_name: permission.tool_name,
          purpose: 'Content creation',
          confidence: 0.9,
          fallback_tools: ['generic_generator', 'template_filler']
        });
      }
      
      if (objective.includes('read') || objective.includes('fetch') || objective.includes('get')) {
        if (permission.allowed_operations.includes('read')) {
          selections.push({
            tool_name: permission.tool_name,
            purpose: 'Data retrieval',
            confidence: 0.95,
            fallback_tools: ['cache_reader', 'api_fetch']
          });
        }
      }
      
      if (objective.includes('update') || objective.includes('modify')) {
        if (permission.allowed_operations.includes('update')) {
          selections.push({
            tool_name: permission.tool_name,
            purpose: 'Data modification',
            confidence: 0.85,
            fallback_tools: ['safe_updater', 'validator_update']
          });
        }
      }
    }

    if (selections.length === 0) {
      selections.push({
        tool_name: 'generic_executor',
        purpose: 'General execution',
        confidence: 0.7,
        fallback_tools: []
      });
    }

    return selections;
  }

  private estimateDuration(taskGraph: TaskGraph): number {
    let totalDuration = 0;
    
    for (const task of taskGraph.tasks) {
      const dependentDuration = taskGraph.tasks
        .filter(t => t.dependencies.includes(task.id))
        .reduce((sum, t) => sum + t.estimated_duration_ms, 0);
      
      if (task.estimated_duration_ms > dependentDuration) {
        totalDuration = Math.max(totalDuration, 
          task.estimated_duration_ms + 
          this.getMaxPathDuration(task.id, taskGraph));
      }
    }

    return totalDuration || taskGraph.tasks.reduce((sum, t) => sum + t.estimated_duration_ms, 0);
  }

  private getMaxPathDuration(taskId: string, taskGraph: TaskGraph): number {
    const task = taskGraph.tasks.find(t => t.id === taskId);
    if (!task || task.dependencies.length === 0) return 0;

    const maxDepDuration = Math.max(
      ...task.dependencies.map(depId => 
        taskGraph.tasks.find(t => t.id === depId)?.estimated_duration_ms || 0
      )
    );

    return maxDepDuration + this.getMaxPathDuration(
      task.dependencies[0], 
      taskGraph
    );
  }

  private estimateCost(taskGraph: TaskGraph): number {
    return taskGraph.tasks.reduce((sum, task) => sum + task.estimated_cost, 0);
  }

  private async assessRisks(mission: AgentMission, taskGraph: TaskGraph): Promise<RiskAssessment> {
    const riskFactors: RiskAssessment['risk_factors'] = [];
    const mitigationStrategies: string[] = [];

    const objective = mission.objective.toLowerCase();
    
    if (objective.includes('delete') || objective.includes('remove') || objective.includes('destroy')) {
      riskFactors.push({
        factor: 'Destructive operation',
        risk_level: RiskLevel.HIGH,
        probability: 0.8,
        impact: 'Permanent data loss'
      });
      mitigationStrategies.push('Enable rollback capability');
      mitigationStrategies.push('Require explicit approval');
    }

    if (mission.cost_budget > 100) {
      riskFactors.push({
        factor: 'High cost budget',
        risk_level: RiskLevel.MEDIUM,
        probability: 0.5,
        impact: 'Excessive spending'
      });
      mitigationStrategies.push('Set strict cost limits');
      mitigationStrategies.push('Monitor execution costs');
    }

    if (mission.time_budget > 3600) {
      riskFactors.push({
        factor: 'Long execution window',
        risk_level: RiskLevel.LOW,
        probability: 0.3,
        impact: 'Resource contention'
      });
      mitigationStrategies.push('Set timeout limits');
    }

    if (!mission.entity_ref) {
      riskFactors.push({
        factor: 'No entity reference',
        risk_level: RiskLevel.MEDIUM,
        probability: 0.4,
        impact: 'Incorrect targeting'
      });
      mitigationStrategies.push('Add entity validation');
    }

    const hasExternalTools = taskGraph.tasks.some(t => t.tool_name?.includes('api'));
    if (hasExternalTools) {
      riskFactors.push({
        factor: 'External API calls',
        risk_level: RiskLevel.MEDIUM,
        probability: 0.3,
        impact: 'Service dependency'
      });
      mitigationStrategies.push('Implement fallback logic');
    }

    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      overall_risk: overallRisk,
      risk_factors: riskFactors,
      mitigation_strategies: mitigationStrategies
    };
  }

  private calculateOverallRisk(riskFactors: RiskAssessment['risk_factors']): RiskLevel {
    if (riskFactors.some(rf => rf.risk_level === RiskLevel.CRITICAL)) {
      return RiskLevel.CRITICAL;
    }
    
    const highCount = riskFactors.filter(rf => rf.risk_level === RiskLevel.HIGH).length;
    if (highCount >= 2) {
      return RiskLevel.HIGH;
    }
    if (highCount >= 1) {
      return RiskLevel.MEDIUM;
    }
    
    const mediumCount = riskFactors.filter(rf => rf.risk_level === RiskLevel.MEDIUM).length;
    if (mediumCount >= 2) {
      return RiskLevel.MEDIUM;
    }
    
    return RiskLevel.LOW;
  }

  async evaluatePolicies(mission: AgentMission): Promise<PolicyEvaluationResult> {
    logger.info('Planner: Evaluating policies', { missionId: mission.id });

    const violations: PolicyEvaluationResult['violations'] = [];
    const matchedRules: string[] = [];

    if (mission.objective.toLowerCase().includes('delete') && 
        !mission.policy_constraints.some(p => p.effect === 'allow' && p.action_pattern.includes('delete'))) {
      violations.push({
        policy_id: 'deny-destructive',
        policy_name: 'Destructive Action Policy',
        violation_type: 'destructive_operation',
        severity: RiskLevel.HIGH,
        description: 'Mission involves potentially destructive operations'
      });
    }

    const costBudget = mission.cost_budget;
    if (costBudget > 100) {
      matchedRules.push('high-cost-warning');
    }

    let allowed = violations.length === 0;
    let requiredApprovals: string[] | undefined;

    if (!allowed || mission.approval_policy.type === ApprovalPolicyType.MANUAL) {
      allowed = false;
      requiredApprovals = ['senior_approver'];
    }

    if (mission.approval_policy.type === ApprovalPolicyType.CONDITIONAL && requiredApprovals) {
      requiredApprovals.push('compliance_reviewer');
    }

    await this.logExecution(mission.id, 'info', 'Policy evaluation completed', {
      allowed,
      violations: violations.length,
      requiredApprovals
    });

    return {
      allowed,
      reason: allowed ? 'All policy checks passed' : 'Policy violations detected',
      required_approvals: requiredApprovals,
      matched_rules: matchedRules,
      violations
    };
  }

  async saveTasks(missionId: string, taskGraph: TaskGraph): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];
    
    for (let i = 0; i < taskGraph.tasks.length; i++) {
      const node = taskGraph.tasks[i];
      
      const result = await database.query<AgentTask>(
        `INSERT INTO agent_tasks 
         (id, mission_id, task_index, name, description, task_type, tool_name, tool_params, dependencies, status, estimated_duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          node.id,
          missionId,
          i,
          node.name,
          node.description,
          node.task_type,
          node.tool_name,
          JSON.stringify(node.tool_params || {}),
          node.dependencies,
          TaskStatus.PENDING,
          node.estimated_duration_ms,
          new Date()
        ]
      );
      
      tasks.push(this.mapRowToTask(result.rows[0]));
    }
    
    return tasks;
  }

  private async logExecution(
    missionId: string,
    level: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_execution_logs 
       (id, mission_id, log_level, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), missionId, level, message, JSON.stringify(metadata), new Date()]
    );
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
}

export default new PlannerService();
