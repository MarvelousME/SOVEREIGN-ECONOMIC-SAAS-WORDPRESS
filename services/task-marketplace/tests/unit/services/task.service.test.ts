import { TaskService } from '../../../src/services/task.service';
import { getDbHelper } from '@tests/helpers/database.helper';
import { getNatsHelper } from '@tests/helpers/nats.helper';
import { UserFactory } from '@tests/factories/user.factory';
import { TaskFactory } from '@tests/factories/task.factory';
import { v4 as uuidv4 } from 'uuid';

describe('TaskService', () => {
  let taskService: TaskService;
  let dbHelper: ReturnType<typeof getDbHelper>;
  let natsHelper: ReturnType<typeof getNatsHelper>;

  beforeAll(() => {
    dbHelper = getDbHelper();
    natsHelper = getNatsHelper();
  });

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
    taskService = new TaskService();
    natsHelper.clearMessages('task.*');
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const creator = UserFactory.create();
      await dbHelper.seedDatabase({ users: [creator] });

      const task = await taskService.createTask({
        title: 'Test Task',
        description: 'Complete this task',
        creatorId: creator.id,
        reward: '100',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      expect(task).toBeDefined();
      expect(task.status).toBe('OPEN');
      expect(task.reward).toBe('100');
    });

    it('should escrow reward amount', async () => {
      const creator = UserFactory.create();
      await dbHelper.seedDatabase({ 
        users: [creator],
        accounts: [{
          id: uuidv4(),
          userId: creator.id,
          balance: '1000',
          currency: 'UBI',
        }],
      });

      const task = await taskService.createTask({
        title: 'Test Task',
        description: 'Test',
        creatorId: creator.id,
        reward: '100',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      // Check escrow account was created and funded
      const escrow = await dbHelper.query(
        'SELECT * FROM accounts WHERE metadata->>\'taskId\' = $1',
        [task.id]
      );

      expect(escrow.rows[0].balance).toBe('100');
    });

    it('should publish task.created event', async () => {
      const creator = UserFactory.create();
      await dbHelper.seedDatabase({ users: [creator] });

      await natsHelper.subscribe('task.created');

      await taskService.createTask({
        title: 'Test Task',
        description: 'Test',
        creatorId: creator.id,
        reward: '100',
        currency: 'UBI',
        tenantId: 'test-tenant',
      });

      const event = await natsHelper.waitForMessage('task.created');
      expect(event).toBeDefined();
      expect(event.title).toBe('Test Task');
    });
  });

  describe('claimTask', () => {
    it('should allow user to claim open task', async () => {
      const task = TaskFactory.create({ status: 'OPEN' });
      const claimer = UserFactory.create();
      
      await dbHelper.seedDatabase({ 
        users: [claimer],
        tasks: [task],
      });

      const claimed = await taskService.claimTask(task.id, claimer.id);

      expect(claimed.status).toBe('CLAIMED');
      expect(claimed.claimedBy).toBe(claimer.id);
    });

    it('should prevent double claiming', async () => {
      const task = TaskFactory.create({ status: 'OPEN' });
      const user1 = UserFactory.create();
      const user2 = UserFactory.create();
      
      await dbHelper.seedDatabase({ 
        users: [user1, user2],
        tasks: [task],
      });

      await taskService.claimTask(task.id, user1.id);

      await expect(
        taskService.claimTask(task.id, user2.id)
      ).rejects.toThrow('already claimed');
    });

    it('should prevent creator from claiming own task', async () => {
      const creator = UserFactory.create();
      const task = TaskFactory.create({ 
        status: 'OPEN',
        creatorId: creator.id,
      });
      
      await dbHelper.seedDatabase({ 
        users: [creator],
        tasks: [task],
      });

      await expect(
        taskService.claimTask(task.id, creator.id)
      ).rejects.toThrow('cannot claim own task');
    });
  });

  describe('submitProof', () => {
    it('should allow claimed task to be submitted', async () => {
      const user = UserFactory.create();
      const task = TaskFactory.createClaimed(user.id);
      
      await dbHelper.seedDatabase({ 
        users: [user],
        tasks: [task],
      });

      const submitted = await taskService.submitProof(task.id, user.id, {
        proofUrl: 'https://example.com/proof.jpg',
        notes: 'Task completed',
      });

      expect(submitted.status).toBe('SUBMITTED');
      expect(submitted.proofUrl).toBe('https://example.com/proof.jpg');
      expect(submitted.submittedAt).toBeDefined();
    });

    it('should prevent submission by non-claimer', async () => {
      const claimer = UserFactory.create();
      const other = UserFactory.create();
      const task = TaskFactory.createClaimed(claimer.id);
      
      await dbHelper.seedDatabase({ 
        users: [claimer, other],
        tasks: [task],
      });

      await expect(
        taskService.submitProof(task.id, other.id, {
          proofUrl: 'https://example.com/proof.jpg',
        })
      ).rejects.toThrow('not claimed by this user');
    });
  });

  describe('approveTask', () => {
    it('should approve submitted task and release payment', async () => {
      const creator = UserFactory.create();
      const claimer = UserFactory.create();
      const task = TaskFactory.createSubmitted(claimer.id, 'proof.jpg');
      task.creatorId = creator.id;
      
      await dbHelper.seedDatabase({ 
        users: [creator, claimer],
        tasks: [task],
        accounts: [
          { id: uuidv4(), userId: claimer.id, balance: '0', currency: 'UBI' },
        ],
      });

      const approved = await taskService.approveTask(task.id, creator.id, {
        feedback: 'Great work!',
      });

      expect(approved.status).toBe('COMPLETED');
      expect(approved.approvedAt).toBeDefined();

      // Check payment was released
      const claimerAccount = await dbHelper.query(
        'SELECT * FROM accounts WHERE user_id = $1',
        [claimer.id]
      );

      expect(claimerAccount.rows[0].balance).toBe(task.reward);
    });

    it('should only allow creator to approve', async () => {
      const creator = UserFactory.create();
      const claimer = UserFactory.create();
      const other = UserFactory.create();
      const task = TaskFactory.createSubmitted(claimer.id, 'proof.jpg');
      task.creatorId = creator.id;
      
      await dbHelper.seedDatabase({ 
        users: [creator, claimer, other],
        tasks: [task],
      });

      await expect(
        taskService.approveTask(task.id, other.id, {})
      ).rejects.toThrow('not the creator');
    });

    it('should publish task.completed event', async () => {
      const creator = UserFactory.create();
      const claimer = UserFactory.create();
      const task = TaskFactory.createSubmitted(claimer.id, 'proof.jpg');
      task.creatorId = creator.id;
      
      await dbHelper.seedDatabase({ 
        users: [creator, claimer],
        tasks: [task],
      });

      await natsHelper.subscribe('task.completed');

      await taskService.approveTask(task.id, creator.id, {});

      const event = await natsHelper.waitForMessage('task.completed');
      expect(event.taskId).toBe(task.id);
      expect(event.claimerId).toBe(claimer.id);
    });
  });

  describe('rejectTask', () => {
    it('should reject submitted task and return to claimed state', async () => {
      const creator = UserFactory.create();
      const claimer = UserFactory.create();
      const task = TaskFactory.createSubmitted(claimer.id, 'proof.jpg');
      task.creatorId = creator.id;
      
      await dbHelper.seedDatabase({ 
        users: [creator, claimer],
        tasks: [task],
      });

      const rejected = await taskService.rejectTask(task.id, creator.id, {
        reason: 'Does not meet requirements',
      });

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.metadata.rejectionReason).toBe('Does not meet requirements');
    });

    it('should allow resubmission after rejection', async () => {
      const creator = UserFactory.create();
      const claimer = UserFactory.create();
      const task = TaskFactory.create({
        status: 'REJECTED',
        claimedBy: claimer.id,
        creatorId: creator.id,
      });
      
      await dbHelper.seedDatabase({ 
        users: [creator, claimer],
        tasks: [task],
      });

      const resubmitted = await taskService.submitProof(task.id, claimer.id, {
        proofUrl: 'https://example.com/new-proof.jpg',
        notes: 'Fixed issues',
      });

      expect(resubmitted.status).toBe('SUBMITTED');
    });
  });

  describe('searchTasks', () => {
    it('should search tasks by keyword', async () => {
      const tasks = [
        TaskFactory.create({ title: 'Write article about blockchain' }),
        TaskFactory.create({ title: 'Design logo' }),
        TaskFactory.create({ title: 'Blockchain development task' }),
      ];
      
      await dbHelper.seedDatabase({ tasks });

      const results = await taskService.searchTasks({
        keyword: 'blockchain',
      });

      expect(results).toHaveLength(2);
    });

    it('should filter by reward range', async () => {
      const tasks = [
        TaskFactory.create({ reward: '50' }),
        TaskFactory.create({ reward: '150' }),
        TaskFactory.create({ reward: '300' }),
      ];
      
      await dbHelper.seedDatabase({ tasks });

      const results = await taskService.searchTasks({
        minReward: '100',
        maxReward: '200',
      });

      expect(results).toHaveLength(1);
      expect(results[0].reward).toBe('150');
    });

    it('should filter by status', async () => {
      const tasks = [
        TaskFactory.create({ status: 'OPEN' }),
        TaskFactory.create({ status: 'CLAIMED' }),
        TaskFactory.create({ status: 'COMPLETED' }),
      ];
      
      await dbHelper.seedDatabase({ tasks });

      const results = await taskService.searchTasks({
        status: 'OPEN',
      });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('OPEN');
    });
  });
});
