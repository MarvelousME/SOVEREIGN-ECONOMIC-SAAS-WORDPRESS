import { Router } from 'express';
import { ProvisionController } from '../controllers/provision.controller';
import { provisionAuth } from '../middleware/provision-auth.middleware';

export function createProvisionRoutes(controller: ProvisionController): Router {
  const router = Router();
  router.use(provisionAuth);

  router.post('/workspaces', controller.createWorkspace);
  router.get('/workspaces', controller.listWorkspaces);
  router.post('/workspaces/:id/members', controller.addMember);

  return router;
}
