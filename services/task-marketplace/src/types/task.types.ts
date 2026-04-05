import { z } from 'zod';

// Task Status
export enum TaskStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLAIMED = 'claimed',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPUTED = 'disputed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// Task Type
export enum TaskType {
  SIMPLE = 'simple',
  BOUNTY = 'bounty',
  RECURRING = 'recurring',
  MILESTONE = 'milestone',
  SURVEY = 'survey',
}

// Difficulty Level
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// Recurrence Frequency
export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// Task Category
export enum TaskCategory {
  CONTENT_CREATION = 'content_creation',
  DATA_ENTRY = 'data_entry',
  DESIGN = 'design',
  DEVELOPMENT = 'development',
  MARKETING = 'marketing',
  RESEARCH = 'research',
  TESTING = 'testing',
  TRANSLATION = 'translation',
  WRITING = 'writing',
  OTHER = 'other',
}

// Validation Schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  type: z.nativeEnum(TaskType),
  category: z.nativeEnum(TaskCategory),
  difficulty: z.nativeEnum(DifficultyLevel),
  reward_amount: z.number().positive(),
  required_skills: z.array(z.string()).optional(),
  min_reputation: z.number().min(0).optional(),
  max_submissions: z.number().positive().optional(),
  expires_at: z.string().datetime().optional(),
  recurrence: z.object({
    frequency: z.nativeEnum(RecurrenceFrequency),
    end_date: z.string().datetime().optional(),
  }).optional(),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    reward_amount: z.number().positive(),
    order: z.number().int().positive(),
  })).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    mime_type: z.string(),
  })).optional(),
});

export const ClaimTaskSchema = z.object({
  message: z.string().max(1000).optional(),
});

export const SubmitProofSchema = z.object({
  proof_text: z.string().min(20).max(5000),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    mime_type: z.string(),
  })).optional(),
  milestone_id: z.string().uuid().optional(),
});

export const ReviewSubmissionSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().max(2000).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const TaskFiltersSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  type: z.nativeEnum(TaskType).optional(),
  category: z.nativeEnum(TaskCategory).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).optional(),
  min_reward: z.number().positive().optional(),
  max_reward: z.number().positive().optional(),
  required_skills: z.array(z.string()).optional(),
  search: z.string().optional(),
  creator_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'reward_amount', 'difficulty', 'expires_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Type Inference
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type ClaimTaskInput = z.infer<typeof ClaimTaskSchema>;
export type SubmitProofInput = z.infer<typeof SubmitProofSchema>;
export type ReviewSubmissionInput = z.infer<typeof ReviewSubmissionSchema>;
export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

// Database Models
export interface Task {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  type: TaskType;
  category: TaskCategory;
  difficulty: DifficultyLevel;
  status: TaskStatus;
  reward_amount: number;
  required_skills: string[];
  min_reputation: number;
  max_submissions: number | null;
  submission_count: number;
  assignee_id: string | null;
  claimed_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskMilestone {
  id: string;
  task_id: string;
  title: string;
  description: string;
  reward_amount: number;
  order: number;
  status: TaskStatus;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  milestone_id: string | null;
  proof_text: string;
  attachments: Array<{
    url: string;
    filename: string;
    mime_type: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  feedback: string | null;
  rating: number | null;
  submitted_at: Date;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRecurrence {
  id: string;
  task_id: string;
  frequency: RecurrenceFrequency;
  last_generated_at: Date | null;
  next_generation_at: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  url: string;
  filename: string;
  mime_type: string;
  created_at: Date;
}

export interface TaskDispute {
  id: string;
  task_id: string;
  submission_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved';
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
