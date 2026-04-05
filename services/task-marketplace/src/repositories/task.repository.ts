import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  TaskMilestone,
  TaskSubmission,
  TaskRecurrence,
  TaskAttachment,
  TaskDispute,
  CreateTaskInput,
  TaskFilters,
  TaskStatus,
  TaskType,
} from '../types/task.types';

export class TaskRepository {
  constructor(private pool: Pool) {}

  async createTask(
    creatorId: string,
    input: CreateTaskInput,
    client?: PoolClient
  ): Promise<Task> {
    const queryClient = client || this.pool;
    const taskId = uuidv4();

    const query = `
      INSERT INTO tasks (
        id, creator_id, title, description, type, category, difficulty,
        status, reward_amount, required_skills, min_reputation, max_submissions,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      taskId,
      creatorId,
      input.title,
      input.description,
      input.type,
      input.category,
      input.difficulty,
      TaskStatus.OPEN,
      input.reward_amount,
      input.required_skills || [],
      input.min_reputation || 0,
      input.max_submissions || null,
      input.expires_at || null,
    ];

    const result = await queryClient.query(query, values);
    return result.rows[0];
  }

  async findById(taskId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await this.pool.query(query, [taskId]);
    return result.rows[0] || null;
  }

  async findByIdForUpdate(
    taskId: string,
    client: PoolClient
  ): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1 FOR UPDATE';
    const result = await client.query(query, [taskId]);
    return result.rows[0] || null;
  }

  async findAll(filters: TaskFilters): Promise<{ tasks: Task[]; total: number }> {
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCounter = 1;

    // Build WHERE clause
    if (filters.status) {
      whereConditions.push(`status = $${paramCounter++}`);
      queryParams.push(filters.status);
    }

    if (filters.type) {
      whereConditions.push(`type = $${paramCounter++}`);
      queryParams.push(filters.type);
    }

    if (filters.category) {
      whereConditions.push(`category = $${paramCounter++}`);
      queryParams.push(filters.category);
    }

    if (filters.difficulty) {
      whereConditions.push(`difficulty = $${paramCounter++}`);
      queryParams.push(filters.difficulty);
    }

    if (filters.min_reward) {
      whereConditions.push(`reward_amount >= $${paramCounter++}`);
      queryParams.push(filters.min_reward);
    }

    if (filters.max_reward) {
      whereConditions.push(`reward_amount <= $${paramCounter++}`);
      queryParams.push(filters.max_reward);
    }

    if (filters.creator_id) {
      whereConditions.push(`creator_id = $${paramCounter++}`);
      queryParams.push(filters.creator_id);
    }

    if (filters.assignee_id) {
      whereConditions.push(`assignee_id = $${paramCounter++}`);
      queryParams.push(filters.assignee_id);
    }

    if (filters.required_skills && filters.required_skills.length > 0) {
      whereConditions.push(`required_skills && $${paramCounter++}::text[]`);
      queryParams.push(filters.required_skills);
    }

    if (filters.search) {
      whereConditions.push(`(
        title ILIKE $${paramCounter} OR 
        description ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (filters.page - 1) * filters.limit;
    const dataQuery = `
      SELECT * FROM tasks 
      ${whereClause}
      ORDER BY ${filters.sort_by} ${filters.sort_order}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(filters.limit, offset);
    const dataResult = await this.pool.query(dataQuery, queryParams);

    return {
      tasks: dataResult.rows,
      total,
    };
  }

  async updateStatus(
    taskId: string,
    status: TaskStatus,
    client?: PoolClient
  ): Promise<Task> {
    const queryClient = client || this.pool;
    const query = `
      UPDATE tasks 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await queryClient.query(query, [status, taskId]);
    return result.rows[0];
  }

  async claimTask(
    taskId: string,
    assigneeId: string,
    client?: PoolClient
  ): Promise<Task> {
    const queryClient = client || this.pool;
    const query = `
      UPDATE tasks 
      SET 
        status = $1,
        assignee_id = $2,
        claimed_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await queryClient.query(query, [
      TaskStatus.CLAIMED,
      assigneeId,
      taskId,
    ]);
    return result.rows[0];
  }

  async incrementSubmissionCount(
    taskId: string,
    client?: PoolClient
  ): Promise<void> {
    const queryClient = client || this.pool;
    const query = `
      UPDATE tasks 
      SET submission_count = submission_count + 1, updated_at = NOW()
      WHERE id = $1
    `;
    await queryClient.query(query, [taskId]);
  }

  async getExpiredTasks(limit: number = 100): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks 
      WHERE status IN ($1, $2) 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW()
      LIMIT $3
    `;
    const result = await this.pool.query(query, [
      TaskStatus.OPEN,
      TaskStatus.CLAIMED,
      limit,
    ]);
    return result.rows;
  }

  async getUserTaskCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) FROM tasks 
      WHERE creator_id = $1 AND status NOT IN ($2, $3, $4)
    `;
    const result = await this.pool.query(query, [
      userId,
      TaskStatus.APPROVED,
      TaskStatus.CANCELLED,
      TaskStatus.EXPIRED,
    ]);
    return parseInt(result.rows[0].count, 10);
  }

  // Milestone methods
  async createMilestones(
    taskId: string,
    milestones: Array<{
      title: string;
      description: string;
      reward_amount: number;
      order: number;
    }>,
    client?: PoolClient
  ): Promise<TaskMilestone[]> {
    const queryClient = client || this.pool;
    const values = milestones.map(m => [
      uuidv4(),
      taskId,
      m.title,
      m.description,
      m.reward_amount,
      m.order,
      TaskStatus.OPEN,
    ]);

    const query = `
      INSERT INTO task_milestones (
        id, task_id, title, description, reward_amount, order, status
      ) 
      SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::numeric[], $6::integer[], $7::text[])
      RETURNING *
    `;

    const result = await queryClient.query(query, [
      values.map(v => v[0]),
      values.map(v => v[1]),
      values.map(v => v[2]),
      values.map(v => v[3]),
      values.map(v => v[4]),
      values.map(v => v[5]),
      values.map(v => v[6]),
    ]);

    return result.rows;
  }

  async getMilestones(taskId: string): Promise<TaskMilestone[]> {
    const query = `
      SELECT * FROM task_milestones 
      WHERE task_id = $1 
      ORDER BY "order" ASC
    `;
    const result = await this.pool.query(query, [taskId]);
    return result.rows;
  }

  // Submission methods
  async createSubmission(
    taskId: string,
    userId: string,
    proofText: string,
    attachments: any[],
    milestoneId?: string,
    client?: PoolClient
  ): Promise<TaskSubmission> {
    const queryClient = client || this.pool;
    const submissionId = uuidv4();

    const query = `
      INSERT INTO task_submissions (
        id, task_id, user_id, milestone_id, proof_text, attachments, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await queryClient.query(query, [
      submissionId,
      taskId,
      userId,
      milestoneId || null,
      proofText,
      JSON.stringify(attachments || []),
      'pending',
    ]);

    return result.rows[0];
  }

  async getSubmission(submissionId: string): Promise<TaskSubmission | null> {
    const query = 'SELECT * FROM task_submissions WHERE id = $1';
    const result = await this.pool.query(query, [submissionId]);
    return result.rows[0] || null;
  }

  async getTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    const query = `
      SELECT * FROM task_submissions 
      WHERE task_id = $1 
      ORDER BY submitted_at DESC
    `;
    const result = await this.pool.query(query, [taskId]);
    return result.rows;
  }

  async updateSubmissionStatus(
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    rating?: number,
    client?: PoolClient
  ): Promise<TaskSubmission> {
    const queryClient = client || this.pool;
    const query = `
      UPDATE task_submissions 
      SET 
        status = $1,
        feedback = $2,
        rating = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await queryClient.query(query, [
      status,
      feedback || null,
      rating || null,
      submissionId,
    ]);
    return result.rows[0];
  }

  // Recurrence methods
  async createRecurrence(
    taskId: string,
    input: CreateTaskInput,
    client?: PoolClient
  ): Promise<TaskRecurrence | null> {
    if (!input.recurrence) return null;

    const queryClient = client || this.pool;
    const recurrenceId = uuidv4();

    const query = `
      INSERT INTO task_recurrences (
        id, task_id, frequency, next_generation_at, end_date
      ) VALUES ($1, $2, $3, NOW() + INTERVAL '1 ${input.recurrence.frequency}', $4)
      RETURNING *
    `;

    const result = await queryClient.query(query, [
      recurrenceId,
      taskId,
      input.recurrence.frequency,
      input.recurrence.end_date || null,
    ]);

    return result.rows[0];
  }

  // Attachment methods
  async createAttachments(
    taskId: string,
    attachments: Array<{ url: string; filename: string; mime_type: string }>,
    client?: PoolClient
  ): Promise<TaskAttachment[]> {
    if (!attachments || attachments.length === 0) return [];

    const queryClient = client || this.pool;
    const values = attachments.map(a => [uuidv4(), taskId, a.url, a.filename, a.mime_type]);

    const query = `
      INSERT INTO task_attachments (id, task_id, url, filename, mime_type)
      SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::text[], $5::text[])
      RETURNING *
    `;

    const result = await queryClient.query(query, [
      values.map(v => v[0]),
      values.map(v => v[1]),
      values.map(v => v[2]),
      values.map(v => v[3]),
      values.map(v => v[4]),
    ]);

    return result.rows;
  }

  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    const query = 'SELECT * FROM task_attachments WHERE task_id = $1';
    const result = await this.pool.query(query, [taskId]);
    return result.rows;
  }

  // Dispute methods
  async createDispute(
    taskId: string,
    submissionId: string,
    raisedBy: string,
    reason: string,
    client?: PoolClient
  ): Promise<TaskDispute> {
    const queryClient = client || this.pool;
    const disputeId = uuidv4();

    const query = `
      INSERT INTO task_disputes (
        id, task_id, submission_id, raised_by, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await queryClient.query(query, [
      disputeId,
      taskId,
      submissionId,
      raisedBy,
      reason,
      'open',
    ]);

    return result.rows[0];
  }
}
