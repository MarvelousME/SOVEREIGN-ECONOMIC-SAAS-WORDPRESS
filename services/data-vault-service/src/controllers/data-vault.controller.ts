import { Request, Response } from 'express';
import { DataVaultService } from '../services/data-vault.service';
import { StoreDataRequest, GrantConsentRequest, DataExportRequest, DataType } from '../types';
import { logger } from '../utils/logger';

export class DataVaultController {
  private dataVaultService: DataVaultService;

  constructor() {
    this.dataVaultService = new DataVaultService();
  }

  /**
   * Store personal data
   */
  storeData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: StoreDataRequest = req.body;
      const vaultData = await this.dataVaultService.storeData(userId, request);

      res.status(201).json(vaultData);
    } catch (error) {
      logger.error('Error storing data', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Retrieve own data
   */
  retrieveData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dataId = req.query.dataId as string | undefined;
      const dataType = req.query.dataType as DataType | undefined;

      const data = await this.dataVaultService.retrieveData(userId, dataId, dataType);

      res.json(data);
    } catch (error) {
      logger.error('Error retrieving data', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update data
   */
  updateData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const data = req.body;

      const updatedData = await this.dataVaultService.updateData(userId, id, data);

      res.json(updatedData);
    } catch (error) {
      logger.error('Error updating data', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Delete data
   */
  deleteData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await this.dataVaultService.deleteData(userId, id);

      res.json({ message: 'Data deleted successfully' });
    } catch (error) {
      logger.error('Error deleting data', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Grant data access consent
   */
  grantConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: GrantConsentRequest = req.body;
      const consent = await this.dataVaultService.grantConsent(userId, request);

      res.status(201).json(consent);
    } catch (error) {
      logger.error('Error granting consent', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * List consents
   */
  listConsents = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const consents = await this.dataVaultService.listConsents(userId);

      res.json(consents);
    } catch (error) {
      logger.error('Error listing consents', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Revoke consent
   */
  revokeConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await this.dataVaultService.revokeConsent(userId, id);

      res.json({ message: 'Consent revoked successfully' });
    } catch (error) {
      logger.error('Error revoking consent', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Access data with consent (for third parties)
   */
  accessData = async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = (req as any).user?.id;
      if (!requesterId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { consentId } = req.params;
      const result = await this.dataVaultService.accessDataWithConsent(requesterId, consentId);

      res.json(result);
    } catch (error) {
      logger.error('Error accessing data', { error });
      res.status(403).json({ error: (error as Error).message });
    }
  };

  /**
   * Export user data
   */
  exportData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: DataExportRequest = {
        format: (req.query.format as 'json' | 'csv') || 'json',
        dataTypes: req.query.dataTypes
          ? (req.query.dataTypes as string).split(',') as DataType[]
          : undefined
      };

      const exportData = await this.dataVaultService.exportData(userId, request);

      if (request.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=data-export.csv');
        res.send(exportData);
      } else {
        res.json(exportData);
      }
    } catch (error) {
      logger.error('Error exporting data', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get monetization revenue
   */
  getRevenue = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const revenue = await this.dataVaultService.getMonetizationRevenue(userId);

      res.json(revenue);
    } catch (error) {
      logger.error('Error getting revenue', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
