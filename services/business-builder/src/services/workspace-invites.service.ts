import crypto from 'crypto';
import { Pool } from 'pg';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  role: WorkspaceRole;
  expiresAt: Date;
  acceptedAt?: Date;
  invitedByUserId?: string;
  createdAt: Date;
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class WorkspaceInvitesService {
  constructor(private db: Pool) {}

  async assertMemberRole(
    workspaceId: string,
    userId: string,
    allowed: WorkspaceRole[]
  ): Promise<void> {
    const r = await this.db.query<{ role: string }>(
      `SELECT role FROM tenant_workspace_members WHERE tenant_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    if (r.rowCount === 0) {
      throw new Error('NOT_A_MEMBER');
    }
    const role = r.rows[0].role as WorkspaceRole;
    if (!allowed.includes(role)) {
      throw new Error('INSUFFICIENT_ROLE');
    }
  }

  async createInvite(input: {
    workspaceId: string;
    invitedEmail: string;
    role: WorkspaceRole;
    invitedByUserId: string;
    ttlHours?: number;
  }): Promise<{ invite: WorkspaceInvitation; token: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + (input.ttlHours ?? 72) * 60 * 60 * 1000);
    const invitedEmail = normalizeEmail(input.invitedEmail);

    const r = await this.db.query(
      `INSERT INTO workspace_invitations (
         workspace_id, invited_email, role, token_hash, expires_at, invited_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, workspace_id, invited_email, role, expires_at, accepted_at, invited_by_user_id, created_at`,
      [input.workspaceId, invitedEmail, input.role, tokenHash, expiresAt, input.invitedByUserId]
    );

    const row = r.rows[0] as {
      id: string;
      workspace_id: string;
      invited_email: string;
      role: WorkspaceRole;
      expires_at: string | Date;
      accepted_at: string | Date | null;
      invited_by_user_id: string | null;
      created_at: string | Date;
    };

    return {
      token,
      invite: {
        id: row.id,
        workspaceId: row.workspace_id,
        invitedEmail: row.invited_email,
        role: row.role,
        expiresAt: new Date(row.expires_at),
        acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
        invitedByUserId: row.invited_by_user_id || undefined,
        createdAt: new Date(row.created_at),
      },
    };
  }

  async listInvites(
    workspaceId: string,
    options?: { scope?: 'own' | 'workspace'; userId?: string; limit?: number; offset?: number }
  ): Promise<{ data: WorkspaceInvitation[]; total: number }> {
    const scope = options?.scope || 'workspace';
    const userId = options?.userId;
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const queryParams: string[] = [workspaceId];
    let whereClause = 'workspace_id = $1';

    if (scope === 'own' && userId) {
      queryParams.push(userId);
      whereClause += ` AND invited_by_user_id = $${queryParams.length}`;
    }

    const countResult = await this.db.query(
      `SELECT COUNT(*)::int AS total
       FROM workspace_invitations
       WHERE ${whereClause}`,
      queryParams
    );
    const total = Number((countResult.rows[0] as { total?: number })?.total || 0);

    const listParams: Array<string | number> = [...queryParams, limit, offset];
    const r = await this.db.query(
      `SELECT id, workspace_id, invited_email, role, expires_at, accepted_at, invited_by_user_id, created_at
       FROM workspace_invitations
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return {
      data: (r.rows as any[]).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        invitedEmail: row.invited_email,
        role: row.role,
        expiresAt: new Date(row.expires_at),
        acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
        invitedByUserId: row.invited_by_user_id || undefined,
        createdAt: new Date(row.created_at),
      })),
      total,
    };
  }

  async acceptInvite(input: { token: string; userId: string }): Promise<{ workspaceId: string }> {
    const tokenHash = sha256Hex(input.token.trim());

    const inviteR = await this.db.query(
      `SELECT id, workspace_id, invited_email, role, expires_at, accepted_at
       FROM workspace_invitations
       WHERE token_hash = $1`,
      [tokenHash]
    );
    if (inviteR.rowCount === 0) {
      throw new Error('INVITE_NOT_FOUND');
    }

    const invite = inviteR.rows[0] as any;
    if (invite.accepted_at) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error('INVITE_EXPIRED');
    }

    // Mark accepted (idempotent-ish)
    await this.db.query(
      `UPDATE workspace_invitations SET accepted_at = NOW() WHERE id = $1 AND accepted_at IS NULL`,
      [invite.id]
    );

    // Upsert membership
    await this.db.query(
      `INSERT INTO tenant_workspace_members (tenant_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.workspace_id, input.userId, invite.role]
    );

    return { workspaceId: invite.workspace_id as string };
  }
}

