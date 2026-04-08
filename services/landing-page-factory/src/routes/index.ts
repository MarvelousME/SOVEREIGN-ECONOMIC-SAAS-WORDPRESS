import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { LandingPageController, TenantContext } from '../controllers/landing-page.controller';

export function createLandingPageRoutes(db: Pool, controller: LandingPageController): Router {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Missing tenant or user context',
      });
      return;
    }

    (req.body as Record<string, unknown>).tenantId = tenantId;
    (req.body as Record<string, unknown>).userId = userId;
    next();
  });

  router.post('/generate', controller.generatePage);

  router.get('/', controller.getPages);

  router.get('/:id', controller.getPage);

  router.put('/:id', controller.updatePage);

  router.post('/:id/publish', controller.publishPage);

  router.post('/:id/rollback', controller.rollbackPage);

  router.get('/:id/versions', controller.getVersions);

  router.get('/:id/preview', controller.getPreview);

  router.post('/:id/review', controller.submitForReview);

  router.post('/:id/approve', controller.approvePage);

  return router;
}

export function createTemplateRoutes(controller: LandingPageController): Router {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        error: 'Missing tenant or user context',
      });
      return;
    }

    (req.body as Record<string, unknown>).tenantId = tenantId;
    (req.body as Record<string, unknown>).userId = userId;
    next();
  });

  router.get('/', controller.getTemplates);

  router.post('/', controller.createTemplate);

  return router;
}
