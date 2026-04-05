import { Router } from 'express';
import { complianceController } from '../controllers/complianceController';

const router = Router();

router.post('/consent', (req, res, next) => 
  complianceController.recordConsent(req, res).catch(next)
);

router.get('/consent/:contactId', (req, res, next) => 
  complianceController.getConsentByContactId(req, res).catch(next)
);

router.delete('/consent/:id', (req, res, next) => 
  complianceController.revokeConsent(req, res).catch(next)
);

router.post('/suppression', (req, res, next) => 
  complianceController.addToSuppression(req, res).catch(next)
);

router.delete('/suppression/:id', (req, res, next) => 
  complianceController.removeFromSuppression(req, res).catch(next)
);

router.get('/suppression', (req, res, next) => 
  complianceController.listSuppressionEntries(req, res).catch(next)
);

router.post('/disclosure', (req, res, next) => 
  complianceController.generateDisclosure(req, res).catch(next)
);

router.get('/policy/:channel', (req, res, next) => 
  complianceController.getChannelPolicy(req, res).catch(next)
);

router.post('/check/:type', (req, res, next) => 
  complianceController.checkContent(req, res).catch(next)
);

router.get('/restrictions/:geo', (req, res, next) => 
  complianceController.getGeoRestrictions(req, res).catch(next)
);

router.post('/review', (req, res, next) => 
  complianceController.submitForReview(req, res).catch(next)
);

router.get('/reviews', (req, res, next) => 
  complianceController.listReviews(req, res).catch(next)
);

router.get('/reviews/pending', (req, res, next) => 
  complianceController.listPendingReviews(req, res).catch(next)
);

router.get('/reviews/:id', (req, res, next) => 
  complianceController.getReview(req, res).catch(next)
);

router.put('/reviews/:id', (req, res, next) => 
  complianceController.processReview(req, res).catch(next)
);

router.post('/geo-restrictions', (req, res, next) => 
  complianceController.createGeoRestriction(req, res).catch(next)
);

router.get('/geo-restrictions', (req, res, next) => 
  complianceController.listGeoRestrictions(req, res).catch(next)
);

router.post('/abuse-score', (req, res, next) => 
  complianceController.calculateAbuseScore(req, res).catch(next)
);

router.get('/abuse-signals/:contactId', (req, res, next) => 
  complianceController.getAbuseSignals(req, res).catch(next)
);

router.post('/templates/disclosure', (req, res, next) => 
  complianceController.createDisclosureTemplate(req, res).catch(next)
);

router.get('/templates/disclosure', (req, res, next) => 
  complianceController.listDisclosureTemplates(req, res).catch(next)
);

router.post('/policies', (req, res, next) => 
  complianceController.createChannelPolicy(req, res).catch(next)
);

router.get('/policies', (req, res, next) => 
  complianceController.listChannelPolicies(req, res).catch(next)
);

export default router;
