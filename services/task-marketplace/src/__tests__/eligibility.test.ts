import { TaskService, UserEligibility } from '../services/task.service';
import { SkillMatchingService } from '../services/skill-matching.service';
import { EventService } from '../services/event.service';
import { Task, TaskStatus, TaskType, TaskCategory, DifficultyLevel } from '../types/task.types';

jest.mock('../config/nats', () => ({
  getNatsConnection: jest.fn(),
  jsonCodec: {
    encode: jest.fn((data: any) => JSON.stringify(data)),
    decode: jest.fn((data: any) => JSON.parse(data.toString())),
  },
}));

jest.mock('../config/database', () => ({
  getClient: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
}));

describe('TaskService Eligibility', () => {
  let taskService: TaskService;
  let mockEventService: jest.Mocked<EventService>;
  let mockPool: any;
  let skillMatcher: SkillMatchingService;

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-123',
    creator_id: 'creator-456',
    title: 'Test Task',
    description: 'Test task description',
    type: TaskType.SIMPLE,
    category: TaskCategory.DEVELOPMENT,
    difficulty: DifficultyLevel.INTERMEDIATE,
    status: TaskStatus.OPEN,
    reward_amount: 100,
    required_skills: ['React', 'TypeScript'],
    min_reputation: 100,
    max_submissions: null,
    submission_count: 0,
    assignee_id: null,
    claimed_at: null,
    expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockPool = {};
    mockEventService = {
      publishTaskCreated: jest.fn(),
      publishTaskClaimed: jest.fn(),
      publishTaskCompleted: jest.fn(),
      publishTaskApproved: jest.fn(),
      publishTaskRejected: jest.fn(),
      publishTaskExpired: jest.fn(),
      publishTaskDisputed: jest.fn(),
      subscribeToReputationUpdates: jest.fn(),
    } as any;

    taskService = new TaskService(mockPool, mockEventService);
    skillMatcher = new SkillMatchingService();
  });

  describe('SkillMatchingService.isEligible', () => {
    it('should return eligible when user meets all requirements', () => {
      const user = {
        user_id: 'user-123',
        skills: ['React', 'TypeScript', 'Node.js'],
        reputation: 200,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = createMockTask({
        required_skills: ['React'],
        min_reputation: 100,
        difficulty: DifficultyLevel.INTERMEDIATE,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not eligible when reputation is below minimum', () => {
      const user = {
        user_id: 'user-123',
        skills: ['React', 'TypeScript'],
        reputation: 50,
        completed_tasks: 5,
        success_rate: 0.8,
        average_rating: 4.0,
      };

      const task = createMockTask({
        min_reputation: 100,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('reputation');
      expect(result.reason).toContain('100');
      expect(result.reason).toContain('50');
    });

    it('should return not eligible when user lacks required skills', () => {
      const user = {
        user_id: 'user-123',
        skills: ['Python', 'Django'],
        reputation: 300,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = createMockTask({
        required_skills: ['React', 'TypeScript', 'GraphQL'],
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Missing required skills');
      expect(result.reason).toContain('React');
      expect(result.reason).toContain('TypeScript');
      expect(result.reason).toContain('GraphQL');
    });

    it('should return eligible when user has all required skills (case insensitive)', () => {
      const user = {
        user_id: 'user-123',
        skills: ['react', 'typescript'],
        reputation: 200,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = createMockTask({
        required_skills: ['React', 'TypeScript'],
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(true);
    });

    it('should return not eligible for expert tasks without sufficient experience', () => {
      const user = {
        user_id: 'user-123',
        skills: ['React', 'TypeScript', 'Node.js'],
        reputation: 600,
        completed_tasks: 5,
        success_rate: 1.0,
        average_rating: 5.0,
      };

      const task = createMockTask({
        difficulty: DifficultyLevel.EXPERT,
        required_skills: ['React'],
        min_reputation: 500,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Expert tasks require at least 10 completed tasks');
    });

    it('should return eligible for expert tasks with sufficient experience', () => {
      const user = {
        user_id: 'user-123',
        skills: ['React', 'TypeScript', 'Node.js'],
        reputation: 600,
        completed_tasks: 15,
        success_rate: 1.0,
        average_rating: 5.0,
      };

      const task = createMockTask({
        difficulty: DifficultyLevel.EXPERT,
        required_skills: ['React'],
        min_reputation: 500,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(true);
    });

    it('should return eligible for tasks with no required skills', () => {
      const user = {
        user_id: 'user-123',
        skills: [],
        reputation: 0,
        completed_tasks: 0,
        success_rate: 0,
        average_rating: 0,
      };

      const task = createMockTask({
        required_skills: [],
        min_reputation: 0,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(true);
    });

    it('should return eligible when user reputation equals minimum', () => {
      const user = {
        user_id: 'user-123',
        skills: ['React'],
        reputation: 100,
        completed_tasks: 5,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = createMockTask({
        min_reputation: 100,
      });

      const result = skillMatcher.isEligible(user, task);

      expect(result.eligible).toBe(true);
    });
  });

  describe('TaskService checkUserEligibility', () => {
    it('should return eligible for valid user and task', async () => {
      const task = createMockTask();
      const userId = 'user-123';

      const mockNats = {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      let resolveCallback: (value: any) => void;
      const responsePromise = new Promise<any>(resolve => {
        resolveCallback = resolve;
      });

      (mockNats.subscribe as jest.Mock).mockImplementation((subject: string) => {
        if (subject.includes('RESPONSE')) {
          setTimeout(() => {
            resolveCallback({
              user_id: userId,
              reputation: 200,
              skills: ['React', 'TypeScript'],
              completed_tasks: 10,
              success_rate: 0.9,
              average_rating: 4.5,
              status: 'active',
            });
          }, 10);
          return { unsubscribe: jest.fn() };
        }
        return { unsubscribe: jest.fn() };
      });

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(true);
      expect(result.userProfile).toBeDefined();
      expect(result.userProfile?.reputation).toBe(200);
    });

    it('should return not eligible for banned user', async () => {
      const task = createMockTask();
      const userId = 'user-123';

      const mockNats = {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      let resolveCallback: (value: any) => void;
      new Promise<any>(resolve => {
        resolveCallback = resolve;
      });

      (mockNats.subscribe as jest.Mock).mockImplementation((subject: string) => {
        if (subject.includes('RESPONSE')) {
          setTimeout(() => {
            resolveCallback({
              user_id: userId,
              reputation: 200,
              skills: ['React'],
              completed_tasks: 10,
              success_rate: 0.9,
              average_rating: 4.5,
              status: 'banned',
            });
          }, 10);
          return { unsubscribe: jest.fn() };
        }
        return { unsubscribe: jest.fn() };
      });

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('banned');
    });

    it('should return not eligible for suspended user', async () => {
      const task = createMockTask();
      const userId = 'user-123';

      const mockNats = {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      let resolveCallback: (value: any) => void;
      new Promise<any>(resolve => {
        resolveCallback = resolve;
      });

      (mockNats.subscribe as jest.Mock).mockImplementation((subject: string) => {
        if (subject.includes('RESPONSE')) {
          setTimeout(() => {
            resolveCallback({
              user_id: userId,
              reputation: 200,
              skills: ['React'],
              completed_tasks: 10,
              success_rate: 0.9,
              average_rating: 4.5,
              status: 'suspended',
            });
          }, 10);
          return { unsubscribe: jest.fn() };
        }
        return { unsubscribe: jest.fn() };
      });

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('suspended');
    });

    it('should return not eligible when user is already assigned to task', async () => {
      const task = createMockTask({ assignee_id: 'user-123' });
      const userId = 'user-123';

      const mockNats = {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      let resolveCallback: (value: any) => void;
      new Promise<any>(resolve => {
        resolveCallback = resolve;
      });

      (mockNats.subscribe as jest.Mock).mockImplementation((subject: string) => {
        if (subject.includes('RESPONSE')) {
          setTimeout(() => {
            resolveCallback({
              user_id: userId,
              reputation: 200,
              skills: ['React'],
              completed_tasks: 10,
              success_rate: 0.9,
              average_rating: 4.5,
              status: 'active',
            });
          }, 10);
          return { unsubscribe: jest.fn() };
        }
        return { unsubscribe: jest.fn() };
      });

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('already assigned');
    });

    it('should handle service unavailability gracefully', async () => {
      const task = createMockTask();
      const userId = 'user-123';

      const mockNats = {
        subscribe: jest.fn().mockImplementation(() => {
          throw new Error('NATS connection error');
        }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('HTTP error'));

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Unable to verify user eligibility');

      global.fetch = originalFetch;
    });

    it('should return not eligible when user profile not found', async () => {
      const task = createMockTask();
      const userId = 'nonexistent-user';

      const mockNats = {
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        publish: jest.fn(),
      };
      (require('../config/nats').getNatsConnection as jest.Mock).mockReturnValue(mockNats);

      let resolveCallback: (value: any) => void;
      new Promise<any>(resolve => {
        resolveCallback = resolve;
      });

      (mockNats.subscribe as jest.Mock).mockImplementation((subject: string) => {
        if (subject.includes('RESPONSE')) {
          setTimeout(() => {
            resolveCallback(null);
          }, 10);
          return { unsubscribe: jest.fn() };
        }
        return { unsubscribe: jest.fn() };
      });

      const result = await taskService.checkUserEligibility(task, userId);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });
});
