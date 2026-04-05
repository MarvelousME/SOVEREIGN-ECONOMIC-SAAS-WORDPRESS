import { z } from 'zod';

export enum MissionStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  REVIEWING = 'reviewing',
  AWAITING_APPROVAL = 'awaiting_approval',
  PUBLISHING = 'publishing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export enum TaskType {
  PLANNING = 'planning',
  EXECUTION = 'execution',
  REVIEW = 'review',
  PUBLISH = 'publish',
  APPROVAL = 'approval',
  ROLLBACK = 'rollback'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum ApprovalPolicyType {
  AUTO = 'auto',
  MANUAL = 'manual',
  CONDITIONAL = 'conditional'
}

export enum ValidationStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ContextPackage {
  tenant_id: string;
  workspace_id: string;
  user_id: string;
  user_role: string;
  user_permissions: string[];
  workspace_config?: Record<string, unknown>;
  entities?: Record<string, unknown>;
  recent_memories?: MemoryEntry[];
  business_context?: Record<string, unknown>;
}

export interface MemoryEntry {
  id: string;
  content: string;
  type: string;
  relevance: number;
  timestamp: string;
}

export interface ToolPermission {
  tool_name: string;
  tool_category?: string;
  allowed_operations: string[];
  max_calls?: number;
  rate_limit_window_ms?: number;
  requires_approval: boolean;
}

export interface PolicyConstraint {
  policy_id: string;
  policy_type: string;
  resource_pattern: string;
  action_pattern: string;
  conditions: Record<string, unknown>;
  effect: 'allow' | 'deny';
}

export interface ApprovalPolicy {
  type: ApprovalPolicyType;
  required_approvers?: string[];
  approval_threshold?: number;
  auto_approve_conditions?: Record<string, unknown>;
  timeout_minutes?: number;
}

export interface SuccessMetric {
  primary_metric: string;
  target_value: number;
  measurement_method: string;
  validation_queries?: string[];
}

export interface ActionPlan {
  task_graph: TaskGraph;
  resource_allocation: ResourceAllocation;
  tool_sequence: ToolSelection[];
  estimated_duration_ms: number;
  estimated_cost: number;
  risk_assessment: RiskAssessment;
}

export interface TaskGraph {
  tasks: TaskNode[];
  execution_order: string[][];
  parallel_groups: string[][];
}

export interface TaskNode {
  id: string;
  name: string;
  description?: string;
  task_type: TaskType;
  tool_name?: string;
  tool_params?: Record<string, unknown>;
  dependencies: string[];
  estimated_duration_ms: number;
  estimated_cost: number;
  rollback_strategy?: string;
}

export interface ResourceAllocation {
  cpu_cores: number;
  memory_mb: number;
  storage_mb: number;
  network_allowed: boolean;
  sandbox_mode: boolean;
}

export interface ToolSelection {
  tool_name: string;
  purpose: string;
  confidence: number;
  fallback_tools: string[];
}

export interface RiskAssessment {
  overall_risk: RiskLevel;
  risk_factors: RiskFactor[];
  mitigation_strategies: string[];
}

export interface RiskFactor {
  factor: string;
  risk_level: RiskLevel;
  probability: number;
  impact: string;
}

export interface AgentResult {
  mission_id: string;
  action_plan: ActionPlan;
  confidence_score: number;
  artifacts_created: Artifact[];
  decisions_made: Decision[];
  provenance: ProvenanceRecord;
  rollback_instructions: RollbackInstruction;
  events_emitted: string[];
  next_actions: NextAction[];
  execution_metrics: ExecutionMetrics;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  validation_status: ValidationStatus;
  validation_errors: string[];
  quality_score?: number;
}

export interface Decision {
  decision_id: string;
  decision_type: string;
  rationale: string;
  inputs_used: string[];
  confidence: number;
  reversible: boolean;
}

export interface ProvenanceRecord {
  original_facts: string[];
  transformations: TransformationRecord[];
  verification_chain: VerificationRecord[];
}

export interface TransformationRecord {
  transformation_id: string;
  input_facts: string[];
  output_facts: string[];
  method: string;
  timestamp: string;
}

export interface VerificationRecord {
  verification_id: string;
  claim: string;
  verification_method: string;
  result: boolean;
  timestamp: string;
}

export interface RollbackInstruction {
  can_rollback: boolean;
  rollback_steps: RollbackStep[];
  state_snapshot?: Record<string, unknown>;
}

export interface RollbackStep {
  step_order: number;
  action_type: string;
  target_resource: string;
  restoration_method: string;
}

export interface NextAction {
  action_type: string;
  recommended_tool?: string;
  conditions: string[];
  priority: number;
}

export interface ExecutionMetrics {
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_duration_ms: number;
  total_cost: number;
  tokens_used: number;
}

export interface AgentMission {
  id: string;
  tenant_id: string;
  workspace_id: string;
  objective: string;
  entity_ref?: string;
  context_package: ContextPackage;
  tool_permissions: ToolPermission[];
  policy_constraints: PolicyConstraint[];
  approval_policy: ApprovalPolicy;
  success_metric: SuccessMetric;
  time_budget: number;
  cost_budget: number;
  status: MissionStatus;
  priority: number;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
  assigned_to?: string;
  parent_mission_id?: string;
  tags: string[];
}

export interface AgentTask {
  id: string;
  mission_id: string;
  task_index: number;
  name: string;
  description?: string;
  task_type: TaskType;
  tool_name?: string;
  tool_params?: Record<string, unknown>;
  dependencies: string[];
  status: TaskStatus;
  result?: Record<string, unknown>;
  error?: string;
  started_at?: Date;
  completed_at?: Date;
  estimated_duration_ms?: number;
  actual_duration_ms?: number;
  created_at: Date;
}

export interface AgentArtifact {
  id: string;
  mission_id: string;
  task_id?: string;
  name: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  validation_status: ValidationStatus;
  validation_errors: string[];
  quality_score?: number;
  published_at?: Date;
  published_by?: string;
  cdn_url?: string;
  size_bytes?: number;
  checksum?: string;
  created_at: Date;
}

export interface AgentApproval {
  id: string;
  mission_id: string;
  artifact_ids: string[];
  requested_by: string;
  requested_at: Date;
  approved_by?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_at?: Date;
  rejection_reason?: string;
  status: ApprovalStatus;
  priority: number;
  due_at?: Date;
  notification_sent: boolean;
  comments: Comment[];
}

export interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export interface RollbackToken {
  id: string;
  mission_id: string;
  token: string;
  action_type: string;
  target_state: Record<string, unknown>;
  previous_state?: Record<string, unknown>;
  created_at: Date;
  expires_at: Date;
  used_at?: Date;
  used_by?: string;
  status: 'active' | 'used' | 'expired';
}

export interface DryRunResult {
  id: string;
  mission_id?: string;
  tenant_id: string;
  workspace_id: string;
  input_snapshot: Record<string, unknown>;
  simulation_result: Record<string, unknown>;
  estimated_cost: number;
  estimated_duration_ms: number;
  risk_assessment: RiskAssessment;
  policy_violations: PolicyViolation[];
  created_at: Date;
  expires_at: Date;
}

export interface PolicyViolation {
  policy_id: string;
  policy_name: string;
  violation_type: string;
  severity: RiskLevel;
  description: string;
  remediation?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  required_approvals?: string[];
  matched_rules: string[];
  violations: PolicyViolation[];
}

export interface EventPayload {
  mission_id: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  correlation_id?: string;
  timestamp: string;
}

export const CreateMissionRequestSchema = z.object({
  tenant_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  objective: z.string().min(1).max(5000),
  entity_ref: z.string().optional(),
  context_package: z.object({
    tenant_id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    user_id: z.string().uuid(),
    user_role: z.string(),
    user_permissions: z.array(z.string()),
    workspace_config: z.record(z.unknown()).optional(),
    entities: z.record(z.unknown()).optional(),
    recent_memories: z.array(z.object({
      id: z.string(),
      content: z.string(),
      type: z.string(),
      relevance: z.number(),
      timestamp: z.string()
    })).optional(),
    business_context: z.record(z.unknown()).optional()
  }),
  tool_permissions: z.array(z.object({
    tool_name: z.string(),
    tool_category: z.string().optional(),
    allowed_operations: z.array(z.string()),
    max_calls: z.number().optional(),
    rate_limit_window_ms: z.number().optional(),
    requires_approval: z.boolean()
  })).default([]),
  policy_constraints: z.array(z.object({
    policy_id: z.string(),
    policy_type: z.string(),
    resource_pattern: z.string(),
    action_pattern: z.string(),
    conditions: z.record(z.unknown()),
    effect: z.enum(['allow', 'deny'])
  })).default([]),
  approval_policy: z.object({
    type: z.enum(['auto', 'manual', 'conditional']),
    required_approvers: z.array(z.string()).optional(),
    approval_threshold: z.number().optional(),
    auto_approve_conditions: z.record(z.unknown()).optional(),
    timeout_minutes: z.number().optional()
  }).default({ type: 'auto' }),
  success_metric: z.object({
    primary_metric: z.string(),
    target_value: z.number(),
    measurement_method: z.string(),
    validation_queries: z.array(z.string()).optional()
  }),
  time_budget: z.number().min(60).max(86400).default(3600),
  cost_budget: z.number().min(0).max(1000).default(10),
  priority: z.number().min(0).max(10).default(0),
  tags: z.array(z.string()).default([])
});

export type CreateMissionRequest = z.infer<typeof CreateMissionRequestSchema>;

export const ExecuteMissionRequestSchema = z.object({
  dry_run_only: z.boolean().default(false),
  force_execution: z.boolean().default(false)
});

export type ExecuteMissionRequest = z.infer<typeof ExecuteMissionRequestSchema>;

export const ApprovalRequestSchema = z.object({
  approved: z.boolean(),
  comments: z.string().optional()
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const RollbackRequestSchema = z.object({
  token: z.string(),
  reason: z.string().optional()
});

export type RollbackRequest = z.infer<typeof RollbackRequestSchema>;

export interface MissionResponse {
  mission: AgentMission;
  tasks?: AgentTask[];
  artifacts?: AgentArtifact[];
}

export interface PlanResponse {
  mission_id: string;
  action_plan: ActionPlan;
  policy_check: PolicyEvaluationResult;
  dry_run_eligible: boolean;
}
