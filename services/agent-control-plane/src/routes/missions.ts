import { Router, Request, Response } from 'express';
import missionController from '../services/MissionController';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  CreateMissionRequestSchema,
  ExecuteMissionRequestSchema,
  ApprovalRequestSchema,
  RollbackRequestSchema
} from '../types';

interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: unknown };
}

const router = Router();

router.use(authMiddleware);

router.post('/missions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedRequest = CreateMissionRequestSchema.parse(req.body);
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const mission = await missionController.createMission(validatedRequest, userId);
    
    res.status(201).json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/missions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as any;
    const tenant_id = req.query.tenant_id as string;

    const result = await missionController.listMissions(userId, page, limit, { status, tenant_id });
    
    res.json({
      success: true,
      data: result.missions,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/missions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const mission = await missionController.getMission(id, userId);
    
    if (!mission) {
      res.status(404).json({ success: false, error: 'Mission not found' });
      return;
    }
    
    res.json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/missions/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const statusResponse = await missionController.getMissionStatus(id, userId);
    
    res.json({
      success: true,
      data: statusResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/missions/:id/execute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const validatedRequest = ExecuteMissionRequestSchema.parse(req.body);
    const result = await missionController.executeMission(id, userId, validatedRequest);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/missions/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const validatedRequest = ApprovalRequestSchema.parse(req.body);
    const mission = await missionController.approveMission(id, userId, validatedRequest);
    
    res.json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/missions/:id/rollback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const validatedRequest = RollbackRequestSchema.parse(req.body);
    const mission = await missionController.rollbackMission(id, userId, validatedRequest);
    
    res.json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/missions/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const mission = await missionController.cancelMission(id, userId);
    
    res.json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;