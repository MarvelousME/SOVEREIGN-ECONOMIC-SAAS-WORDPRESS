import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { WorkspaceInvitesService } from '../services/workspace-invites.service';
import { WorkspaceBrandingService } from '../services/workspace-branding.service';

const upsertBrandingBody = z.object({
  themeId: z.string().min(1),
  themeOverrides: z.record(z.string(), z.string()).optional().default({}),
  brandAssets: z.record(z.string(), z.string()).optional().default({}),
});

export class WorkspaceBrandingController {
  constructor(
    private readonly brandingService: WorkspaceBrandingService,
    private readonly invitesService: WorkspaceInvitesService
  ) {}

  getRuntimeBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const tenantId = req.tenantId;
      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Tenant context missing' });
        return;
      }

      const binding = await this.brandingService.getRuntimeBinding(workspaceId, tenantId);
      res.json({ success: true, data: binding });
    } catch (error) {
      next(error);
    }
  };

  upsertRuntimeBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId;
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ success: false, error: 'Tenant context missing' });
        return;
      }
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await this.invitesService.assertMemberRole(workspaceId, userId, ['owner', 'admin']);
      const body = upsertBrandingBody.parse(req.body);

      const updated = await this.brandingService.upsertRuntimeBinding({
        workspaceId,
        tenantId,
        themeId: body.themeId,
        themeOverrides: body.themeOverrides,
        brandAssets: body.brandAssets,
        updatedBy: userId,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };
}
