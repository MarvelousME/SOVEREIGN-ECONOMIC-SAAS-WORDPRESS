import { Router } from 'express';
import { Pool } from 'pg';
import { BusinessController } from '../controllers/business.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantContext, requireTenantMembership } from '../middleware/tenant.middleware';
import { tenantIsolation, releaseTenantClient } from '../middleware/tenant-isolation';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

export function createBusinessRoutes(db: Pool, controller: BusinessController): Router {
  const router = Router();

  router.use(authenticate);
  router.use(tenantContext());
  router.use(tenantIsolation(db));
  router.use(requireTenantMembership(db));

  // GET /api/v1/business/templates - List all business templates
  router.get('/templates', controller.getTemplates);

  // POST /api/v1/business/create - Create a new business
  router.post(
    '/create',
    rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 per hour
    controller.createBusiness
  );

  // GET /api/v1/business - Get user's businesses
  router.get('/', controller.getUserBusinesses);

  // GET /api/v1/business/:id - Get specific business
  router.get('/:id', controller.getBusiness);

  // PUT /api/v1/business/:id - Update business
  router.put('/:id', controller.updateBusiness);

  // DELETE /api/v1/business/:id - Delete business
  router.delete('/:id', controller.deleteBusiness);

  // POST /api/v1/business/:id/deploy - Deploy business
  router.post(
    '/:id/deploy',
    rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), // 5 per hour
    controller.deployBusiness
  );

  // GET /api/v1/business/:id/analytics - Get business analytics
  router.get('/:id/analytics', controller.getAnalytics);

  // POST /api/v1/business/:id/branding - Generate branding
  router.post(
    '/:id/branding',
    rateLimiter({ windowMs: 60 * 60 * 1000, max: 20 }), // 20 per hour
    controller.generateBranding
  );

  // POST /api/v1/business/:id/branding/:element - Regenerate specific branding element
  router.post(
    '/:id/branding/:element',
    rateLimiter({ windowMs: 60 * 60 * 1000, max: 30 }), // 30 per hour
    controller.regenerateBrandingElement
  );

  router.use((req, res, next) => {
    res.on('finish', () => releaseTenantClient(req));
    next();
  });

  return router;
}
