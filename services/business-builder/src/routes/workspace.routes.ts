import { Router } from 'express';
import { Pool } from 'pg';
import { authenticate } from '../middleware/auth.middleware';
import { tenantContext, requireTenantMembership } from '../middleware/tenant.middleware';
import { tenantIsolation, releaseTenantClient } from '../middleware/tenant-isolation';
import { WorkspaceInvitesService } from '../services/workspace-invites.service';
import { WorkspaceInvitesController } from '../controllers/workspace-invites.controller';
import { WorkspaceBrandingService } from '../services/workspace-branding.service';
import { WorkspaceBrandingController } from '../controllers/workspace-branding.controller';

export function createWorkspaceRoutes(db: Pool): Router {
  const router = Router();

  const invitesService = new WorkspaceInvitesService(db);
  const invitesController = new WorkspaceInvitesController(invitesService);
  const brandingService = new WorkspaceBrandingService(db);
  const brandingController = new WorkspaceBrandingController(brandingService, invitesService);

  router.use(authenticate);
  router.use(tenantContext());
  router.use(tenantIsolation(db));
  router.use(requireTenantMembership(db));

  // Workspace team invitations
  router.get('/:workspaceId/invites', invitesController.listInvites);
  router.post('/:workspaceId/invites', invitesController.createInvite);
  router.post('/invites/accept', invitesController.acceptInvite);
  router.get('/:workspaceId/branding/runtime', brandingController.getRuntimeBranding);
  router.put('/:workspaceId/branding/runtime', brandingController.upsertRuntimeBranding);

  router.use((req, res, next) => {
    // Ensure tenantIsolation client is released
    res.on('finish', () => releaseTenantClient(req));
    next();
  });

  return router;
}

