import { Router } from 'express';
import { leadController } from '../controllers/leadController';
import { contactController } from '../controllers/contactController';
import { accountController } from '../controllers/accountController';
import { dealController } from '../controllers/dealController';

const router = Router();

router.post('/leads', (req, res) => leadController.create(req, res));
router.get('/leads', (req, res) => leadController.list(req, res));
router.get('/leads/:id', (req, res) => leadController.getById(req, res));
router.put('/leads/:id', (req, res) => leadController.update(req, res));
router.delete('/leads/:id', (req, res) => leadController.delete(req, res));
router.post('/leads/:id/convert', (req, res) => leadController.convertToDeal(req, res));
router.post('/leads/:id/activities', (req, res) => leadController.logActivity(req, res));
router.get('/leads/:id/timeline', (req, res) => leadController.getTimeline(req, res));
router.get('/leads/:id/score', (req, res) => leadController.getScore(req, res));
router.post('/leads/:id/recalculate-score', (req, res) => leadController.recalculateScore(req, res));
router.post('/leads/bulk-import', (req, res) => leadController.bulkImport(req, res));
router.get('/leads/rules', (req, res) => leadController.getRoutingRules(req, res));
router.post('/leads/rules', (req, res) => leadController.createRoutingRule(req, res));
router.get('/leads/sla', (req, res) => leadController.getSLAMeasurements(req, res));

router.get('/contacts', (req, res) => contactController.list(req, res));
router.post('/contacts', (req, res) => contactController.create(req, res));
router.get('/contacts/:id', (req, res) => contactController.getById(req, res));
router.put('/contacts/:id', (req, res) => contactController.update(req, res));
router.delete('/contacts/:id', (req, res) => contactController.delete(req, res));
router.get('/contacts/:id/timeline', (req, res) => contactController.getTimeline(req, res));
router.post('/contacts/:id/activities', (req, res) => contactController.logActivity(req, res));
router.get('/contacts/account/:accountId', (req, res) => contactController.getByAccount(req, res));
router.post('/contacts/:id/set-primary', (req, res) => contactController.setPrimary(req, res));

router.get('/accounts', (req, res) => accountController.list(req, res));
router.post('/accounts', (req, res) => accountController.create(req, res));
router.get('/accounts/:id', (req, res) => accountController.getById(req, res));
router.put('/accounts/:id', (req, res) => accountController.update(req, res));
router.delete('/accounts/:id', (req, res) => accountController.delete(req, res));
router.get('/accounts/:id/hierarchy', (req, res) => accountController.getHierarchy(req, res));
router.post('/accounts/:id/enrich', (req, res) => accountController.enrich(req, res));
router.post('/accounts/:id/calculate-score', (req, res) => accountController.calculateScore(req, res));

router.get('/deals', (req, res) => dealController.list(req, res));
router.post('/deals', (req, res) => dealController.create(req, res));
router.get('/deals/:id', (req, res) => dealController.getById(req, res));
router.put('/deals/:id', (req, res) => dealController.update(req, res));
router.put('/deals/:id/stage', (req, res) => dealController.updateStage(req, res));
router.delete('/deals/:id', (req, res) => dealController.delete(req, res));
router.get('/deals/:id/activities', (req, res) => dealController.getActivities(req, res));
router.post('/deals/:id/activities', (req, res) => dealController.logActivity(req, res));

router.get('/pipelines', (req, res) => dealController.getPipelines(req, res));
router.post('/pipelines', (req, res) => dealController.createPipeline(req, res));
router.get('/pipelines/:pipelineId', (req, res) => dealController.getPipelineView(req, res));
router.post('/pipelines/:pipelineId/stages', (req, res) => dealController.createStage(req, res));

router.get('/analytics/win-analysis', (req, res) => dealController.winAnalysis(req, res));

export default router;
