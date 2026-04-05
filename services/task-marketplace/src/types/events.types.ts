// Event Types for NATS messaging

export interface TaskCreatedEvent {
  task_id: string;
  creator_id: string;
  type: string;
  category: string;
  difficulty: string;
  reward_amount: number;
  created_at: string;
}

export interface TaskClaimedEvent {
  task_id: string;
  creator_id: string;
  assignee_id: string;
  claimed_at: string;
}

export interface TaskCompletedEvent {
  task_id: string;
  creator_id: string;
  assignee_id: string;
  reward_amount: number;
  completed_at: string;
}

export interface TaskApprovedEvent {
  task_id: string;
  submission_id: string;
  creator_id: string;
  assignee_id: string;
  reward_amount: number;
  rating: number | null;
  approved_at: string;
}

export interface TaskRejectedEvent {
  task_id: string;
  submission_id: string;
  creator_id: string;
  assignee_id: string;
  feedback: string | null;
  rejected_at: string;
}

export interface TaskExpiredEvent {
  task_id: string;
  creator_id: string;
  expired_at: string;
}

export interface TaskDisputedEvent {
  task_id: string;
  submission_id: string;
  dispute_id: string;
  raised_by: string;
  reason: string;
  created_at: string;
}

export interface ReputationUpdatedEvent {
  user_id: string;
  old_reputation: number;
  new_reputation: number;
  reason: string;
  updated_at: string;
}

export enum EventSubject {
  TASK_CREATED = 'task.created',
  TASK_CLAIMED = 'task.claimed',
  TASK_COMPLETED = 'task.completed',
  TASK_APPROVED = 'task.approved',
  TASK_REJECTED = 'task.rejected',
  TASK_EXPIRED = 'task.expired',
  TASK_DISPUTED = 'task.disputed',
  REPUTATION_UPDATED = 'reputation.updated',
}
