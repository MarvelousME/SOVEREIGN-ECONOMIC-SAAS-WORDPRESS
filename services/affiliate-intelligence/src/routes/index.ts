import { Router } from 'express';
import AffiliateController from '../controllers/affiliateController';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  intakeSchema,
  analyzeSchema,
  linkQuerySchema,
  merchantQuerySchema,
  offerQuerySchema,
  opportunityQuerySchema,
} from '../middleware/validation.middleware';

const router = Router();

router.post('/intake', validateBody(intakeSchema), AffiliateController.intake);

router.get('/links', validateQuery(linkQuerySchema), AffiliateController.getLinks);
router.get('/links/:id', AffiliateController.getLinkById);
router.post('/links/:id/click', AffiliateController.recordClick);

router.get('/merchants', validateQuery(merchantQuerySchema), AffiliateController.getMerchants);
router.get('/merchants/:id', AffiliateController.getMerchantById);
router.post('/merchants', validateBody(merchantQuerySchema), AffiliateController.createMerchant);

router.get('/offers', validateQuery(offerQuerySchema), AffiliateController.getOffers);
router.get('/offers/:id', AffiliateController.getOfferById);
router.post('/offers', validateBody(offerQuerySchema), AffiliateController.createOffer);

router.get('/opportunities', validateQuery(opportunityQuerySchema), AffiliateController.getOpportunities);

router.post('/analyze', validateBody(analyzeSchema), AffiliateController.analyze);

router.get('/stats', AffiliateController.getStats);

export default router;
