import { Pool } from 'pg';
import { TaskRepository } from '../repositories/task.repository';
import { EventService } from './event.service';
import { SkillMatchingService, UserProfile } from './skill-matching.service';
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  ClaimTaskInput,
  SubmitProofInput,
  ReviewSubmissionInput,
  TaskFilters,
  TaskSubmission,
} from '../types/task.types';
import { logger } from '../utils/logger';
import { getClient } from '../config/database';
import { getNatsConnection, jsonCodec } from '../config/nats';

export interface UserEligibility {
  eligible: boolean;
  reason?: string;
  userProfile?: ReputationServiceUser;
}

export interface ReputationServiceUser {
  user_id: string;
  reputation: number;
  skills: string[];
  completed_tasks: number;
  success_rate: number;
  average_rating: number;
  status: 'active' | 'suspended' | 'banned';
}

export enum ReputationServiceSubject {
  GET_USER_PROFILE = 'reputation.get_user_profile',
  GET_USER_PROFILE_RESPONSE = 'reputation.get_user_profile_response',
}

export enum UserServiceSubject {
  GET_USER_STATUS = 'user.get_status',
  GET_USER_STATUS_RESPONSE = 'user.get_status_response',
}

export class TaskService {
  private taskRepo: TaskRepository;
  private skillMatcher: SkillMatchingService;

  constructor(
    private pool: Pool,
    private eventService: EventService
  ) {
    this.taskRepo = new TaskRepository(pool);
    this.skillMatcher = new SkillMatchingService();
  }

  async checkUserEligibility(task: Task, userId: string): Promise<UserEligibility> {
    try {
      const userProfile = await this.getUserProfile(userId);

      if (!userProfile) {
        return { eligible: false, reason: 'User profile not found' };
      }

      if (userProfile.status === 'banned') {
        return { eligible: false, reason: 'User account is banned' };
      }

      if (userProfile.status === 'suspended') {
        return { eligible: false, reason: 'User account is suspended' };
      }

      if (task.assignee_id === userId) {
        return { eligible: false, reason: 'User is already assigned to this task' };
      }

      const userForSkillCheck: UserProfile = {
        user_id: userProfile.user_id,
        skills: userProfile.skills,
        reputation: userProfile.reputation,
        completed_tasks: userProfile.completed_tasks,
        success_rate: userProfile.success_rate,
        average_rating: userProfile.average_rating,
      };

      const skillEligibility = this.skillMatcher.isEligible(userForSkillCheck, task);
      if (!skillEligibility.eligible) {
        return { eligible: false, reason: skillEligibility.reason };
      }

      return { eligible: true, userProfile };
    } catch (error) {
      logger.error('Error checking user eligibility', { error, taskId: task.id, userId });
      return { eligible: false, reason: 'Unable to verify user eligibility' };
    }
  }

  private async getUserProfile(userId: string): Promise<ReputationServiceUser | null> {
    try {
      const nats = getNatsConnection();

      const response = await new Promise<ReputationServiceUser>((resolve, reject) => {
        const subscription = nats.subscribe(ReputationServiceSubject.GET_USER_PROFILE_RESPONSE);

        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error('Timeout waiting for user profile'));
        }, 5000);

        nats.publish(ReputationServiceSubject.GET_USER_PROFILE, jsonCodec.encode({ user_id: userId }));

        (async () => {
          for await (const msg of subscription) {
            const data = jsonCodec.decode(msg.data) as ReputationServiceUser;
            if (data.user_id === userId) {
              clearTimeout(timeout);
              subscription.unsubscribe();
              resolve(data);
              break;
            }
          }
        })();
      });

      return response;
    } catch (error) {
      logger.warn('Failed to get user profile from reputation-service, attempting HTTP fallback', { error, userId });

      return await this.getUserProfileViaHttp(userId);
    }
  }

  private async getUserProfileViaHttp(userId: string): Promise<ReputationServiceUser | null> {
    const reputationServiceUrl = process.env.REPUTATION_SERVICE_URL || 'http://localhost:3001';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${reputationServiceUrl}/api/users/${userId}/profile`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('Failed to fetch user profile via HTTP', { status: response.status, userId });
        return null;
      }

      const data = await response.json() as ReputationServiceUser;

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('HTTP request timeout for user profile', { userId });
      } else {
        logger.error('Failed to fetch user profile via HTTP', { error, userId });
      }
      return null;
    }
  }

  async createTask(creatorId: string, input: CreateTaskInput): Promise<Task> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Check task limit
      const taskCount = await this.taskRepo.getUserTaskCount(creatorId);
      const maxTasks = parseInt(process.env.MAX_TASKS_PER_USER || '100', 10);

      if (taskCount >= maxTasks) {
        throw new Error(`Maximum task limit reached (${maxTasks})`);
      }

      // Create main task
      const task = await this.taskRepo.createTask(creatorId, input, client);

      // Create milestones if provided
      if (input.milestones && input.milestones.length > 0) {
        await this.taskRepo.createMilestones(task.id, input.milestones, client);
      }

      // Create attachments if provided
      if (input.attachments && input.attachments.length > 0) {
        await this.taskRepo.createAttachments(task.id, input.attachments, client);
      }

      // Create recurrence if provided
      if (input.recurrence) {
        await this.taskRepo.createRecurrence(task.id, input, client);
      }

      await client.query('COMMIT');

      // Publish event
      await this.eventService.publishTaskCreated({
        task_id: task.id,
        creator_id: creatorId,
        type: task.type,
        category: task.category,
        difficulty: task.difficulty,
        reward_amount: task.reward_amount,
        created_at: task.created_at.toISOString(),
      });

      logger.info('Task created', { taskId: task.id, creatorId });
      return task;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create task', { error, creatorId, input });
      throw error;
    } finally {
      client.release();
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    return await this.taskRepo.findById(taskId);
  }

  async getTasks(filters: TaskFilters): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    const result = await this.taskRepo.findAll(filters);
    return {
      ...result,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async claimTask(taskId: string, userId: string, input: ClaimTaskInput): Promise<Task> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Lock task for update
      const task = await this.taskRepo.findByIdForUpdate(taskId, client);

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== TaskStatus.OPEN) {
        throw new Error(`Task is not available (status: ${task.status})`);
      }

      if (task.creator_id === userId) {
        throw new Error('Cannot claim your own task');
      }

      if (task.expires_at && new Date(task.expires_at) < new Date()) {
        throw new Error('Task has expired');
      }

      const eligibility = await this.checkUserEligibility(task, userId);
      if (!eligibility.eligible) {
        throw new Error(`Not eligible to claim task: ${eligibility.reason}`);
      }

      const updatedTask = await this.taskRepo.claimTask(taskId, userId, client);

      await client.query('COMMIT');

      // Publish event
      await this.eventService.publishTaskClaimed({
        task_id: taskId,
        creator_id: task.creator_id,
        assignee_id: userId,
        claimed_at: new Date().toISOString(),
      });

      logger.info('Task claimed', { taskId, userId });
      return updatedTask;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to claim task', { error, taskId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async submitProof(taskId: string, userId: string, input: SubmitProofInput): Promise<TaskSubmission> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const task = await this.taskRepo.findByIdForUpdate(taskId, client);

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.assignee_id !== userId) {
        throw new Error('Only the assigned user can submit proof');
      }

      if (![TaskStatus.CLAIMED, TaskStatus.IN_PROGRESS].includes(task.status)) {
        throw new Error(`Cannot submit proof for task with status: ${task.status}`);
      }

      // Create submission
      const submission = await this.taskRepo.createSubmission(
        taskId,
        userId,
        input.proof_text,
        input.attachments || [],
        input.milestone_id,
        client
      );

      // Update task status
      await this.taskRepo.updateStatus(taskId, TaskStatus.SUBMITTED, client);

      // Increment submission count
      await this.taskRepo.incrementSubmissionCount(taskId, client);

      await client.query('COMMIT');

      // Publish event
      await this.eventService.publishTaskCompleted({
        task_id: taskId,
        creator_id: task.creator_id,
        assignee_id: userId,
        reward_amount: task.reward_amount,
        completed_at: new Date().toISOString(),
      });

      logger.info('Proof submitted', { taskId, userId, submissionId: submission.id });
      return submission;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to submit proof', { error, taskId, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  async approveSubmission(
    submissionId: string,
    userId: string,
    input: ReviewSubmissionInput
  ): Promise<TaskSubmission> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const submission = await this.taskRepo.getSubmission(submissionId);

      if (!submission) {
        throw new Error('Submission not found');
      }

      const task = await this.taskRepo.findByIdForUpdate(submission.task_id, client);

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.creator_id !== userId) {
        throw new Error('Only task creator can approve submissions');
      }

      if (submission.status !== 'pending') {
        throw new Error(`Submission already reviewed (status: ${submission.status})`);
      }

      // Update submission
      const updatedSubmission = await this.taskRepo.updateSubmissionStatus(
        submissionId,
        input.approved ? 'approved' : 'rejected',
        input.feedback,
        input.rating,
        client
      );

      // Update task status
      const newTaskStatus = input.approved ? TaskStatus.APPROVED : TaskStatus.REJECTED;
      await this.taskRepo.updateStatus(task.id, newTaskStatus, client);

      await client.query('COMMIT');

      // Publish appropriate event
      if (input.approved) {
        await this.eventService.publishTaskApproved({
          task_id: task.id,
          submission_id: submissionId,
          creator_id: task.creator_id,
          assignee_id: submission.user_id,
          reward_amount: task.reward_amount,
          rating: input.rating || null,
          approved_at: new Date().toISOString(),
        });
      } else {
        await this.eventService.publishTaskRejected({
          task_id: task.id,
          submission_id: submissionId,
          creator_id: task.creator_id,
          assignee_id: submission.user_id,
          feedback: input.feedback || null,
          rejected_at: new Date().toISOString(),
        });
      }

      logger.info('Submission reviewed', {
        submissionId,
        taskId: task.id,
        approved: input.approved,
      });

      return updatedSubmission;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to review submission', { error, submissionId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecommendedTasks(userProfile: UserProfile, limit: number = 10): Promise<any[]> {
    // Get all open tasks
    const { tasks } = await this.taskRepo.findAll({
      status: TaskStatus.OPEN,
      page: 1,
      limit: 100,
      sort_by: 'created_at',
      sort_order: 'desc',
    });

    // Get recommendations
    const recommendations = this.skillMatcher.getRecommendations(
      userProfile,
      tasks,
      limit
    );

    return recommendations;
  }

  async getUserTasks(userId: string, role: 'creator' | 'assignee'): Promise<Task[]> {
    const filters: TaskFilters = {
      ...(role === 'creator' ? { creator_id: userId } : { assignee_id: userId }),
      page: 1,
      limit: 100,
      sort_by: 'created_at',
      sort_order: 'desc',
    };

    const { tasks } = await this.taskRepo.findAll(filters);
    return tasks;
  }

  async getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    return await this.taskRepo.getTaskSubmissions(taskId);
  }

  async processExpiredTasks(): Promise<number> {
    const expiredTasks = await this.taskRepo.getExpiredTasks();
    let processedCount = 0;

    for (const task of expiredTasks) {
      try {
        await this.taskRepo.updateStatus(task.id, TaskStatus.EXPIRED);

        await this.eventService.publishTaskExpired({
          task_id: task.id,
          creator_id: task.creator_id,
          expired_at: new Date().toISOString(),
        });

        processedCount++;
      } catch (error) {
        logger.error('Failed to process expired task', { error, taskId: task.id });
      }
    }

    logger.info('Processed expired tasks', { count: processedCount });
    return processedCount;
  }

  async createDispute(
    submissionId: string,
    userId: string,
    reason: string
  ): Promise<any> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const submission = await this.taskRepo.getSubmission(submissionId);

      if (!submission) {
        throw new Error('Submission not found');
      }

      const task = await this.taskRepo.findById(submission.task_id);

      if (!task) {
        throw new Error('Task not found');
      }

      // Only task participants can raise disputes
      if (userId !== task.creator_id && userId !== submission.user_id) {
        throw new Error('Only task participants can raise disputes');
      }

      const dispute = await this.taskRepo.createDispute(
        task.id,
        submissionId,
        userId,
        reason,
        client
      );

      // Update task status
      await this.taskRepo.updateStatus(task.id, TaskStatus.DISPUTED, client);

      await client.query('COMMIT');

      // Publish event
      await this.eventService.publishTaskDisputed({
        task_id: task.id,
        submission_id: submissionId,
        dispute_id: dispute.id,
        raised_by: userId,
        reason,
        created_at: new Date().toISOString(),
      });

      logger.info('Dispute created', { disputeId: dispute.id, taskId: task.id });
      return dispute;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create dispute', { error, submissionId });
      throw error;
    } finally {
      client.release();
    }
  }
}
