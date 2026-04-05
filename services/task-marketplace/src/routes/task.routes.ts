import { Router, Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate, validateQuery } from '../middleware/validation.middleware';
import {
  CreateTaskSchema,
  ClaimTaskSchema,
  SubmitProofSchema,
  ReviewSubmissionSchema,
  TaskFiltersSchema,
} from '../types/task.types';
import { logger } from '../utils/logger';

export function createTaskRoutes(taskService: TaskService): Router {
  const router = Router();

  /**
   * GET /api/v1/tasks
   * List tasks with filters
   */
  router.get(
    '/',
    optionalAuth,
    validateQuery(TaskFiltersSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const filters = req.query as any;
        const result = await taskService.getTasks(filters);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error('Error fetching tasks', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to fetch tasks',
        });
      }
    }
  );

  /**
   * POST /api/v1/tasks
   * Create a new task
   */
  router.post(
    '/',
    authenticate,
    validate(CreateTaskSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const task = await taskService.createTask(req.user!.id, req.body);

        res.status(201).json({
          success: true,
          data: task,
        });
      } catch (error: any) {
        logger.error('Error creating task', { error, userId: req.user!.id });
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to create task',
        });
      }
    }
  );

  /**
   * GET /api/v1/tasks/:id
   * Get task details
   */
  router.get(
    '/:id',
    optionalAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const task = await taskService.getTask(req.params.id);

        if (!task) {
          res.status(404).json({
            success: false,
            error: 'Task not found',
          });
          return;
        }

        res.json({
          success: true,
          data: task,
        });
      } catch (error) {
        logger.error('Error fetching task', { error, taskId: req.params.id });
        res.status(500).json({
          success: false,
          error: 'Failed to fetch task',
        });
      }
    }
  );

  /**
   * POST /api/v1/tasks/:id/claim
   * Claim a task
   */
  router.post(
    '/:id/claim',
    authenticate,
    validate(ClaimTaskSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const task = await taskService.claimTask(
          req.params.id,
          req.user!.id,
          req.body
        );

        res.json({
          success: true,
          data: task,
        });
      } catch (error: any) {
        logger.error('Error claiming task', {
          error,
          taskId: req.params.id,
          userId: req.user!.id,
        });
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to claim task',
        });
      }
    }
  );

  /**
   * POST /api/v1/tasks/:id/submit
   * Submit proof of work
   */
  router.post(
    '/:id/submit',
    authenticate,
    validate(SubmitProofSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const submission = await taskService.submitProof(
          req.params.id,
          req.user!.id,
          req.body
        );

        res.json({
          success: true,
          data: submission,
        });
      } catch (error: any) {
        logger.error('Error submitting proof', {
          error,
          taskId: req.params.id,
          userId: req.user!.id,
        });
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to submit proof',
        });
      }
    }
  );

  /**
   * POST /api/v1/tasks/submissions/:submissionId/approve
   * Approve a submission
   */
  router.post(
    '/submissions/:submissionId/approve',
    authenticate,
    validate(ReviewSubmissionSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const submission = await taskService.approveSubmission(
          req.params.submissionId,
          req.user!.id,
          { ...req.body, approved: true }
        );

        res.json({
          success: true,
          data: submission,
        });
      } catch (error: any) {
        logger.error('Error approving submission', {
          error,
          submissionId: req.params.submissionId,
          userId: req.user!.id,
        });
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to approve submission',
        });
      }
    }
  );

  /**
   * POST /api/v1/tasks/submissions/:submissionId/reject
   * Reject a submission
   */
  router.post(
    '/submissions/:submissionId/reject',
    authenticate,
    validate(ReviewSubmissionSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const submission = await taskService.approveSubmission(
          req.params.submissionId,
          req.user!.id,
          { ...req.body, approved: false }
        );

        res.json({
          success: true,
          data: submission,
        });
      } catch (error: any) {
        logger.error('Error rejecting submission', {
          error,
          submissionId: req.params.submissionId,
          userId: req.user!.id,
        });
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to reject submission',
        });
      }
    }
  );

  /**
   * GET /api/v1/tasks/my-tasks
   * Get user's tasks (created or assigned)
   */
  router.get(
    '/my-tasks',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const role = (req.query.role as 'creator' | 'assignee') || 'creator';
        const tasks = await taskService.getUserTasks(req.user!.id, role);

        res.json({
          success: true,
          data: tasks,
        });
      } catch (error) {
        logger.error('Error fetching user tasks', {
          error,
          userId: req.user!.id,
        });
        res.status(500).json({
          success: false,
          error: 'Failed to fetch tasks',
        });
      }
    }
  );

  /**
   * GET /api/v1/tasks/recommended
   * Get AI-recommended tasks based on user profile
   */
  router.get(
    '/recommended',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        // In production, fetch user profile from another service
        // For now, use mock data
        const userProfile = {
          user_id: req.user!.id,
          skills: (req.query.skills as string)?.split(',') || [],
          reputation: parseInt(req.query.reputation as string) || 0,
          completed_tasks: parseInt(req.query.completed_tasks as string) || 0,
          success_rate: parseFloat(req.query.success_rate as string) || 1.0,
          average_rating: parseFloat(req.query.average_rating as string) || 5.0,
        };

        const limit = parseInt(req.query.limit as string) || 10;
        const recommendations = await taskService.getRecommendedTasks(
          userProfile,
          limit
        );

        res.json({
          success: true,
          data: recommendations,
        });
      } catch (error) {
        logger.error('Error fetching recommended tasks', {
          error,
          userId: req.user!.id,
        });
        res.status(500).json({
          success: false,
          error: 'Failed to fetch recommended tasks',
        });
      }
    }
  );

  /**
   * GET /api/v1/tasks/:id/submissions
   * Get all submissions for a task
   */
  router.get(
    '/:id/submissions',
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const submissions = await taskService.getTaskSubmissions(req.params.id);

        res.json({
          success: true,
          data: submissions,
        });
      } catch (error) {
        logger.error('Error fetching task submissions', {
          error,
          taskId: req.params.id,
        });
        res.status(500).json({
          success: false,
          error: 'Failed to fetch submissions',
        });
      }
    }
  );

  return router;
}
