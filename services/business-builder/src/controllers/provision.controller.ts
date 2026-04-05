import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProvisionService } from '../services/provision.service';

const createBody = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(255),
  ownerUserId: z.string().uuid().optional(),
});

const memberBody = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).optional().default('member'),
});

export class ProvisionController {
  constructor(private provision: ProvisionService) {}

  createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createBody.parse(req.body);
      const existing = await this.provision.getWorkspaceBySlug(body.slug);
      if (existing) {
        res.status(409).json({ success: false, error: 'Workspace slug already exists' });
        return;
      }
      const ws = await this.provision.createWorkspace(body.slug, body.name);
      if (body.ownerUserId) {
        await this.provision.addMember(ws.id, body.ownerUserId, 'owner');
      }
      res.status(201).json({ success: true, data: ws });
    } catch (e) {
      next(e);
    }
  };

  listWorkspaces = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.provision.listWorkspaces();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.params.id;
      const body = memberBody.parse(req.body);
      await this.provision.addMember(tenantId, body.userId, body.role);
      res.status(201).json({ success: true, message: 'Member added' });
    } catch (e) {
      next(e);
    }
  };
}
