import { Router } from 'express';
import agentController from '../controllers/AgentController';
import missionRoutes from './missions';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Agent CRUD endpoints
router.post('/agents', agentController.createAgent.bind(agentController));
router.get('/agents', agentController.listAgents.bind(agentController));
router.get('/agents/:id', agentController.getAgent.bind(agentController));
router.put('/agents/:id', agentController.updateAgent.bind(agentController));
router.delete('/agents/:id', agentController.deleteAgent.bind(agentController));

// Agent lifecycle endpoints
router.post('/agents/:id/deploy', agentController.deployAgent.bind(agentController));
router.post('/agents/:id/pause', agentController.pauseAgent.bind(agentController));

// Agent monitoring endpoints
router.get('/agents/:id/logs', agentController.getAgentLogs.bind(agentController));
router.get('/agents/:id/metrics', agentController.getAgentMetrics.bind(agentController));

// Mission endpoints (Planner/Executor/Reviewer/Publisher loop)
router.use('/agent', missionRoutes);

export default router;
