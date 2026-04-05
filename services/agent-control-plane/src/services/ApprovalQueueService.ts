import { v4 as uuidv4 } from 'uuid';
import database from '../../utils/database';
import logger from '../../utils/logger';
import {
  AgentApproval,
  ApprovalStatus,
  MissionStatus
} from '../../types';

export interface ApprovalNotification {
  approvalId: string;
  missionId: string;
  missionObjective: string;
  requestedBy: string;
  approvers: string[];
  priority: number;
  dueAt: Date;
}

export class ApprovalQueueService {
  private readonly NOTIFICATION_TIMEOUT_MS = 60000;

  async requestApproval(
    missionId: string,
    artifactIds: string[],
    requestedBy: string,
    requestedAt: Date,
    priority: number,
    timeoutMinutes: number
  ): Promise<AgentApproval> {
    logger.info('ApprovalQueue: Requesting approval', { missionId, artifactIds });

    const approvalId = uuidv4();
    const dueAt = new Date(requestedAt);
    dueAt.setMinutes(dueAt.getMinutes() + timeoutMinutes);

    const result = await database.query(
      `INSERT INTO agent_approvals 
       (id, mission_id, artifact_ids, requested_by, requested_at, status, priority, due_at, notification_sent, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        approvalId,
        missionId,
        artifactIds,
        requestedBy,
        requestedAt,
        ApprovalStatus.PENDING,
        priority,
        dueAt,
        false,
        JSON.stringify([])
      ]
    );

    await this.updateMissionStatus(missionId, MissionStatus.AWAITING_APPROVAL);

    await this.scheduleNotification(approvalId, dueAt);

    await this.emitApprovalRequestedEvent(approvalId, missionId);

    logger.info('ApprovalQueue: Approval requested', { approvalId, dueAt });

    return this.mapRowToApproval(result.rows[0]);
  }

  async getApproval(approvalId: string): Promise<AgentApproval | null> {
    const result = await database.query(
      'SELECT * FROM agent_approvals WHERE id = $1',
      [approvalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToApproval(result.rows[0]);
  }

  async getPendingApprovals(approverId?: string): Promise<AgentApproval[]> {
    let query = `
      SELECT * FROM agent_approvals 
      WHERE status = $1 AND due_at > NOW()
    `;
    const params: unknown[] = [ApprovalStatus.PENDING];

    const result = await database.query(query, params);

    return result.rows.map(row => this.mapRowToApproval(row));
  }

  async getApprovalsByMission(missionId: string): Promise<AgentApproval[]> {
    const result = await database.query(
      'SELECT * FROM agent_approvals WHERE mission_id = $1 ORDER BY requested_at DESC',
      [missionId]
    );

    return result.rows.map(row => this.mapRowToApproval(row));
  }

  async approve(
    approvalId: string,
    approverId: string,
    comments?: string
  ): Promise<{ success: boolean; mission?: AgentMission }> {
    logger.info('ApprovalQueue: Processing approval', { approvalId, approverId });

    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval already ${approval.status}`);
    }

    const now = new Date();
    const commentsArray = [...approval.comments];
    if (comments) {
      commentsArray.push({
        id: uuidv4(),
        user_id: approverId,
        content: comments,
        created_at: now
      });
    }

    await database.query(
      `UPDATE agent_approvals 
       SET status = $1, approved_by = $2, approved_at = $3, comments = $4
       WHERE id = $5`,
      [
        ApprovalStatus.APPROVED,
        approverId,
        now,
        JSON.stringify(commentsArray),
        approvalId
      ]
    );

    await this.updateMissionStatus(approval.mission_id, MissionStatus.APPROVED);

    await this.emitApprovalGrantedEvent(approvalId, approval.mission_id, approverId);

    const missionResult = await database.query(
      'SELECT * FROM agent_missions WHERE id = $1',
      [approval.mission_id]
    );

    logger.info('ApprovalQueue: Approval granted', { approvalId });

    return {
      success: true,
      mission: missionResult.rows[0]
    };
  }

  async reject(
    approvalId: string,
    rejecterId: string,
    reason: string
  ): Promise<{ success: boolean; mission?: AgentMission }> {
    logger.info('ApprovalQueue: Processing rejection', { approvalId, rejecterId });

    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval already ${approval.status}`);
    }

    const now = new Date();
    const commentsArray = [...approval.comments];
    commentsArray.push({
      id: uuidv4(),
      user_id: rejecterId,
      content: `Rejection: ${reason}`,
      created_at: now
    });

    await database.query(
      `UPDATE agent_approvals 
       SET status = $1, rejected_by = $2, rejected_at = $3, rejection_reason = $4, comments = $5
       WHERE id = $6`,
      [
        ApprovalStatus.REJECTED,
        rejecterId,
        now,
        reason,
        JSON.stringify(commentsArray),
        approvalId
      ]
    );

    await this.updateMissionStatus(approval.mission_id, MissionStatus.REJECTED);

    await this.emitApprovalRejectedEvent(approvalId, approval.mission_id, rejecterId, reason);

    const missionResult = await database.query(
      'SELECT * FROM agent_missions WHERE id = $1',
      [approval.mission_id]
    );

    logger.info('ApprovalQueue: Approval rejected', { approvalId, reason });

    return { success: true, mission: missionResult.rows[0] };
  }

  async handleTimeout(approvalId: string): Promise<void> {
    logger.info('ApprovalQueue: Handling timeout', { approvalId });

    const approval = await this.getApproval(approvalId);
    if (!approval || approval.status !== ApprovalStatus.PENDING) {
      return;
    }

    await database.query(
      `UPDATE agent_approvals SET status = $1 WHERE id = $2`,
      [ApprovalStatus.EXPIRED, approvalId]
    );

    await this.updateMissionStatus(approval.mission_id, MissionStatus.REJECTED);

    await this.emitApprovalExpiredEvent(approvalId, approval.mission_id);

    logger.info('ApprovalQueue: Approval expired', { approvalId });
  }

  async addComment(
    approvalId: string,
    userId: string,
    content: string
  ): Promise<AgentApproval> {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }

    const now = new Date();
    const commentsArray = [...approval.comments];
    commentsArray.push({
      id: uuidv4(),
      user_id: userId,
      content,
      created_at: now
    });

    await database.query(
      `UPDATE agent_approvals SET comments = $1 WHERE id = $2`,
      [JSON.stringify(commentsArray), approvalId]
    );

    const updated = await this.getApproval(approvalId);
    return updated!;
  }

  private async scheduleNotification(approvalId: string, dueAt: Date): Promise<void> {
    const now = new Date();
    const delayMs = dueAt.getTime() - now.getTime();

    if (delayMs <= 0) {
      await this.sendNotification(approvalId);
      return;
    }

    setTimeout(async () => {
      await this.sendNotification(approvalId);
    }, Math.min(delayMs, this.NOTIFICATION_TIMEOUT_MS));
  }

  private async sendNotification(approvalId: string): Promise<void> {
    const approval = await this.getApproval(approvalId);
    if (!approval || approval.notification_sent) {
      return;
    }

    logger.info('ApprovalQueue: Sending notification', { approvalId });

    await database.query(
      `UPDATE agent_approvals SET notification_sent = true WHERE id = $1`,
      [approvalId]
    );
  }

  private async updateMissionStatus(missionId: string, status: MissionStatus): Promise<void> {
    await database.query(
      `UPDATE agent_missions SET status = $1, updated_at = $2 WHERE id = $3`,
      [status, new Date(), missionId]
    );
  }

  private async emitApprovalRequestedEvent(
    approvalId: string,
    missionId: string
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        'agent.approval.requested',
        'approval-queue',
        JSON.stringify({ approvalId }),
        new Date()
      ]
    );
  }

  private async emitApprovalGrantedEvent(
    approvalId: string,
    missionId: string,
    approverId: string
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        'agent.approval.granted',
        'approval-queue',
        JSON.stringify({ approvalId, approverId }),
        new Date()
      ]
    );
  }

  private async emitApprovalRejectedEvent(
    approvalId: string,
    missionId: string,
    rejecterId: string,
    reason: string
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        'agent.approval.rejected',
        'approval-queue',
        JSON.stringify({ approvalId, rejecterId, reason }),
        new Date()
      ]
    );
  }

  private async emitApprovalExpiredEvent(
    approvalId: string,
    missionId: string
  ): Promise<void> {
    await database.query(
      `INSERT INTO agent_events 
       (id, mission_id, event_type, source, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        missionId,
        'agent.approval.expired',
        'approval-queue',
        JSON.stringify({ approvalId }),
        new Date()
      ]
    );
  }

  private mapRowToApproval(row: any): AgentApproval {
    return {
      id: row.id,
      mission_id: row.mission_id,
      artifact_ids: row.artifact_ids || [],
      requested_by: row.requested_by,
      requested_at: row.requested_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      status: row.status,
      priority: row.priority,
      due_at: row.due_at,
      notification_sent: row.notification_sent,
      comments: typeof row.comments === 'string' ? JSON.parse(row.comments) : row.comments || []
    };
  }
}

interface AgentMission {
  id: string;
  tenant_id: string;
  workspace_id: string;
  objective: string;
  status: MissionStatus;
  created_by: string;
  created_at: Date;
}

export default new ApprovalQueueService();
