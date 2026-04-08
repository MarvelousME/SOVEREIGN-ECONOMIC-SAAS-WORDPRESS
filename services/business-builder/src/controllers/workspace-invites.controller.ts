import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { WorkspaceInvitesService, WorkspaceRole } from '../services/workspace-invites.service';

const createInviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']).optional().default('member'),
  ttlHours: z.number().int().min(1).max(24 * 30).optional(),
});

const acceptInviteBody = z.object({
  token: z.string().min(32),
});

const listInvitesQuery = z.object({
  scope: z.enum(['own', 'workspace']).optional().default('workspace'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export class WorkspaceInvitesController {
  constructor(private invites: WorkspaceInvitesService) {}

  listInvites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const userId = req.user?.id;
      const query = listInvitesQuery.parse(req.query);
      const result = await this.invites.listInvites(workspaceId, {
        scope: query.scope,
        userId,
        limit: query.limit,
        offset: query.offset,
      });
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  createInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const body = createInviteBody.parse(req.body);

      await this.invites.assertMemberRole(workspaceId, userId, ['owner', 'admin']);

      const { invite, token } = await this.invites.createInvite({
        workspaceId,
        invitedEmail: body.email,
        role: body.role as WorkspaceRole,
        invitedByUserId: userId,
        ttlHours: body.ttlHours,
      });

      const baseUrl = process.env.PORTAL_BASE_URL?.trim();
      const inviteLink = baseUrl
        ? `${baseUrl.replace(/\/$/, '')}/invite?token=${encodeURIComponent(token)}`
        : undefined;

      res.status(201).json({
        success: true,
        data: {
          invite,
          token, // returned for now (dev-friendly); safe because only hash is stored server-side
          inviteLink,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  acceptInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const body = acceptInviteBody.parse(req.body);
      const result = await this.invites.acceptInvite({ token: body.token, userId });

      res.status(200).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  };
}

