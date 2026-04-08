import { Router, Request, Response, NextFunction } from 'express';
import { SocialController } from '../controllers/social.controller';

export function createSocialRoutes(controller: SocialController): Router {
  const router = Router();

  // tenant context middleware (same pattern as pages)
  router.use((req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Missing tenant or user context' });
      return;
    }
    (req.body as Record<string, unknown>).tenantId = tenantId;
    (req.body as Record<string, unknown>).userId = userId;
    next();
  });

  router.get('/accounts', controller.listAccounts);
  router.get('/oauth/:provider/start', controller.startOAuth);
  router.get('/oauth/:provider/callback', controller.oauthCallback);

  router.post('/posts', controller.createPost);
  router.get('/posts', controller.listPosts);
  router.post('/posts/:id/cancel', controller.cancelPost);

  return router;
}

