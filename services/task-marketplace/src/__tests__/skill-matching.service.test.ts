import { SkillMatchingService } from '../services/skill-matching.service';
import { DifficultyLevel, TaskStatus, TaskType, TaskCategory } from '../types/task.types';

describe('SkillMatchingService', () => {
  let service: SkillMatchingService;

  beforeEach(() => {
    service = new SkillMatchingService();
  });

  describe('calculateMatchScore', () => {
    it('should return 100 for perfect match', () => {
      const user = {
        user_id: '123',
        skills: ['React', 'TypeScript', 'Node.js'],
        reputation: 500,
        completed_tasks: 50,
        success_rate: 1.0,
        average_rating: 5.0,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Build React App',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.ADVANCED,
        status: TaskStatus.OPEN,
        reward_amount: 100,
        required_skills: ['React', 'TypeScript'],
        min_reputation: 300,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const score = service.calculateMatchScore(user, task);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should return low score for poor match', () => {
      const user = {
        user_id: '123',
        skills: ['Python', 'Django'],
        reputation: 50,
        completed_tasks: 2,
        success_rate: 0.5,
        average_rating: 3.0,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Build React App',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.EXPERT,
        status: TaskStatus.OPEN,
        reward_amount: 100,
        required_skills: ['React', 'TypeScript', 'GraphQL'],
        min_reputation: 500,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const score = service.calculateMatchScore(user, task);
      expect(score).toBeLessThan(30);
    });

    it('should handle tasks with no required skills', () => {
      const user = {
        user_id: '123',
        skills: ['React'],
        reputation: 100,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Simple Survey',
        description: 'Test task',
        type: TaskType.SURVEY,
        category: TaskCategory.OTHER,
        difficulty: DifficultyLevel.BEGINNER,
        status: TaskStatus.OPEN,
        reward_amount: 5,
        required_skills: [],
        min_reputation: 0,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const score = service.calculateMatchScore(user, task);
      expect(score).toBeGreaterThan(70);
    });
  });

  describe('isEligible', () => {
    it('should return eligible for matching user', () => {
      const user = {
        user_id: '123',
        skills: ['React', 'TypeScript'],
        reputation: 200,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Build Component',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.INTERMEDIATE,
        status: TaskStatus.OPEN,
        reward_amount: 50,
        required_skills: ['React'],
        min_reputation: 100,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = service.isEligible(user, task);
      expect(result.eligible).toBe(true);
    });

    it('should return not eligible if reputation too low', () => {
      const user = {
        user_id: '123',
        skills: ['React'],
        reputation: 50,
        completed_tasks: 5,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Expert Task',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.EXPERT,
        status: TaskStatus.OPEN,
        reward_amount: 500,
        required_skills: ['React'],
        min_reputation: 500,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = service.isEligible(user, task);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('reputation');
    });

    it('should return not eligible if missing required skills', () => {
      const user = {
        user_id: '123',
        skills: ['React'],
        reputation: 300,
        completed_tasks: 20,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Full Stack Task',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.ADVANCED,
        status: TaskStatus.OPEN,
        reward_amount: 200,
        required_skills: ['React', 'Node.js', 'PostgreSQL'],
        min_reputation: 200,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = service.isEligible(user, task);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Missing required skills');
    });

    it('should require minimum experience for expert tasks', () => {
      const user = {
        user_id: '123',
        skills: ['React', 'TypeScript', 'Node.js'],
        reputation: 600,
        completed_tasks: 5,
        success_rate: 1.0,
        average_rating: 5.0,
      };

      const task = {
        id: '456',
        creator_id: '789',
        title: 'Expert Task',
        description: 'Test task',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.EXPERT,
        status: TaskStatus.OPEN,
        reward_amount: 1000,
        required_skills: ['React'],
        min_reputation: 500,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = service.isEligible(user, task);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Expert tasks require at least 10 completed tasks');
    });
  });

  describe('getRecommendations', () => {
    it('should return sorted recommendations', () => {
      const user = {
        user_id: '123',
        skills: ['React', 'TypeScript'],
        reputation: 250,
        completed_tasks: 15,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const tasks = [
        {
          id: '1',
          creator_id: '789',
          title: 'Perfect Match',
          description: 'Test',
          type: TaskType.SIMPLE,
          category: TaskCategory.DEVELOPMENT,
          difficulty: DifficultyLevel.INTERMEDIATE,
          status: TaskStatus.OPEN,
          reward_amount: 100,
          required_skills: ['React', 'TypeScript'],
          min_reputation: 200,
          max_submissions: null,
          submission_count: 0,
          assignee_id: null,
          claimed_at: null,
          expires_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          creator_id: '789',
          title: 'Poor Match',
          description: 'Test',
          type: TaskType.SIMPLE,
          category: TaskCategory.DEVELOPMENT,
          difficulty: DifficultyLevel.EXPERT,
          status: TaskStatus.OPEN,
          reward_amount: 500,
          required_skills: ['Go', 'Kubernetes'],
          min_reputation: 500,
          max_submissions: null,
          submission_count: 0,
          assignee_id: null,
          claimed_at: null,
          expires_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const recommendations = service.getRecommendations(user, tasks, 10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].match_score).toBeGreaterThan(
        recommendations[recommendations.length - 1]?.match_score || 0
      );
    });

    it('should filter out low match scores', () => {
      const user = {
        user_id: '123',
        skills: ['Python'],
        reputation: 50,
        completed_tasks: 2,
        success_rate: 0.7,
        average_rating: 3.5,
      };

      const tasks = [
        {
          id: '1',
          creator_id: '789',
          title: 'React Expert Task',
          description: 'Test',
          type: TaskType.SIMPLE,
          category: TaskCategory.DEVELOPMENT,
          difficulty: DifficultyLevel.EXPERT,
          status: TaskStatus.OPEN,
          reward_amount: 1000,
          required_skills: ['React', 'TypeScript', 'GraphQL'],
          min_reputation: 500,
          max_submissions: null,
          submission_count: 0,
          assignee_id: null,
          claimed_at: null,
          expires_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const recommendations = service.getRecommendations(user, tasks, 10);

      // Should filter out tasks with < 30% match
      expect(recommendations.length).toBe(0);
    });

    it('should respect limit parameter', () => {
      const user = {
        user_id: '123',
        skills: ['React'],
        reputation: 200,
        completed_tasks: 10,
        success_rate: 0.9,
        average_rating: 4.5,
      };

      const tasks = Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        creator_id: '789',
        title: `Task ${i}`,
        description: 'Test',
        type: TaskType.SIMPLE,
        category: TaskCategory.DEVELOPMENT,
        difficulty: DifficultyLevel.BEGINNER,
        status: TaskStatus.OPEN,
        reward_amount: 50,
        required_skills: ['React'],
        min_reputation: 0,
        max_submissions: null,
        submission_count: 0,
        assignee_id: null,
        claimed_at: null,
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const recommendations = service.getRecommendations(user, tasks, 5);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});
