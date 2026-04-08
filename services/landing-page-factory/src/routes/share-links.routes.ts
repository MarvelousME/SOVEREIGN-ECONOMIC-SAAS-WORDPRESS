import { Router } from 'express';
import { ShareLinksController } from '../controllers/share-links.controller';

export function createShareLinksRoutes(controller: ShareLinksController): Router {
  const router = Router();
  router.get('/share-links', controller.getShareLinks);
  return router;
}
