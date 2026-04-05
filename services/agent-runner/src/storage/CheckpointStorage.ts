import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { CheckpointData, CheckpointIntegrity, CheckpointStorage as ICheckpointStorage, CHECKPOINT_VERSION } from '../types';
import logger from '../utils/logger';
import config from '../config';
import database from '../utils/database';

export class CheckpointStorageImpl implements ICheckpointStorage {
  private storageDir: string;
  private useDatabase: boolean;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'checkpoints');
    this.useDatabase = config.database.host !== 'localhost' || process.env.USE_DB_CHECKPOINTS === 'true';
    this.ensureStorageDir();
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      logger.warn('Could not create checkpoint directory, using database', { error });
      this.useDatabase = true;
    }
  }

  private generateChecksum(checkpoint: CheckpointData): string {
    const data = JSON.stringify({
      version: checkpoint.version,
      executionId: checkpoint.executionId,
      agentId: checkpoint.agentId,
      state: checkpoint.state,
      localVariables: checkpoint.localVariables,
      pendingWorkQueue: checkpoint.pendingWorkQueue,
      executionPointer: checkpoint.executionPointer,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private verifyChecksum(checkpoint: CheckpointData): boolean {
    if (!checkpoint.checksum) {
      return false;
    }
    const expectedChecksum = this.generateChecksum(checkpoint);
    return checkpoint.checksum === expectedChecksum;
  }

  async save(executionId: string, checkpoint: CheckpointData): Promise<void> {
    checkpoint.version = CHECKPOINT_VERSION;
    checkpoint.checksum = this.generateChecksum(checkpoint);

    if (this.useDatabase) {
      await this.saveToDatabase(executionId, checkpoint);
    } else {
      await this.saveToFileSystem(executionId, checkpoint);
    }

    logger.info('Checkpoint saved', { executionId, version: checkpoint.version });
  }

  private async saveToFileSystem(executionId: string, checkpoint: CheckpointData): Promise<void> {
    const filePath = this.getFilePath(executionId);
    const data = JSON.stringify(checkpoint, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  private async saveToDatabase(executionId: string, checkpoint: CheckpointData): Promise<void> {
    const query = `
      INSERT INTO checkpoints (execution_id, agent_id, data, version, created_at, expires_at)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      ON CONFLICT (execution_id) DO UPDATE SET
        data = EXCLUDED.data,
        version = EXCLUDED.version,
        created_at = NOW(),
        expires_at = EXCLUDED.expires_at
    `;

    const expiresAt = checkpoint.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await database.query(query, [
      executionId,
      checkpoint.agentId,
      JSON.stringify(checkpoint),
      checkpoint.version,
      expiresAt,
    ]);
  }

  private getFilePath(executionId: string): string {
    return path.join(this.storageDir, `${executionId}.checkpoint.json`);
  }

  async load(executionId: string): Promise<CheckpointData | null> {
    if (this.useDatabase) {
      return this.loadFromDatabase(executionId);
    }
    return this.loadFromFileSystem(executionId);
  }

  private async loadFromFileSystem(executionId: string): Promise<CheckpointData | null> {
    const filePath = this.getFilePath(executionId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const checkpoint = JSON.parse(data) as CheckpointData;

      const integrity = this.validateIntegrity(checkpoint);
      if (!integrity.isValid) {
        logger.error('Checkpoint integrity check failed', { executionId, errors: integrity.errors });
        throw new Error(`Checkpoint integrity failed: ${integrity.errors.join(', ')}`);
      }

      return checkpoint;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async loadFromDatabase(executionId: string): Promise<CheckpointData | null> {
    const query = `SELECT data FROM checkpoints WHERE execution_id = $1`;
    const result = await database.query(query, [executionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const checkpoint = JSON.parse(result.rows[0].data) as CheckpointData;

    const integrity = this.validateIntegrity(checkpoint);
    if (!integrity.isValid) {
      logger.error('Checkpoint integrity check failed', { executionId, errors: integrity.errors });
      throw new Error(`Checkpoint integrity failed: ${integrity.errors.join(', ')}`);
    }

    return checkpoint;
  }

  async delete(executionId: string): Promise<void> {
    if (this.useDatabase) {
      await database.query(`DELETE FROM checkpoints WHERE execution_id = $1`, [executionId]);
    } else {
      const filePath = this.getFilePath(executionId);
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    logger.info('Checkpoint deleted', { executionId });
  }

  async list(agentId?: string): Promise<CheckpointData[]> {
    if (this.useDatabase) {
      const query = agentId
        ? `SELECT data FROM checkpoints WHERE agent_id = $1 ORDER BY created_at DESC`
        : `SELECT data FROM checkpoints ORDER BY created_at DESC`;
      const params = agentId ? [agentId] : [];
      const result = await database.query(query, params);
      return result.rows.map(row => JSON.parse(row.data) as CheckpointData);
    }

    try {
      const files = await fs.readdir(this.storageDir);
      const checkpoints: CheckpointData[] = [];

      for (const file of files) {
        if (!file.endsWith('.checkpoint.json')) continue;

        try {
          const filePath = path.join(this.storageDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const checkpoint = JSON.parse(data) as CheckpointData;

          if (!agentId || checkpoint.agentId === agentId) {
            checkpoints.push(checkpoint);
          }
        } catch (error) {
          logger.warn('Failed to read checkpoint file', { file, error });
        }
      }

      return checkpoints.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  validateIntegrity(checkpoint: CheckpointData): CheckpointIntegrity {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!checkpoint.version) {
      errors.push('Missing checkpoint version');
    } else if (checkpoint.version > CHECKPOINT_VERSION) {
      errors.push(`Checkpoint version ${checkpoint.version} is newer than supported version ${CHECKPOINT_VERSION}`);
    } else if (checkpoint.version < CHECKPOINT_VERSION) {
      warnings.push(`Checkpoint version ${checkpoint.version} is older than current version ${CHECKPOINT_VERSION}`);
    }

    if (!checkpoint.executionId) {
      errors.push('Missing execution ID');
    }

    if (!checkpoint.agentId) {
      errors.push('Missing agent ID');
    }

    if (checkpoint.state === undefined) {
      errors.push('Missing execution state');
    }

    if (checkpoint.localVariables === undefined) {
      warnings.push('Missing local variables - execution may restart from beginning');
    }

    if (checkpoint.pendingWorkQueue === undefined) {
      warnings.push('Missing pending work queue - work items may be lost');
    }

    if (checkpoint.checksum && !this.verifyChecksum(checkpoint)) {
      errors.push('Checksum verification failed - checkpoint may be corrupted');
    }

    if (checkpoint.expiresAt && new Date(checkpoint.expiresAt) < new Date()) {
      warnings.push('Checkpoint has expired');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async migrateCheckpoint(checkpoint: CheckpointData): Promise<CheckpointData> {
    this.validateIntegrity(checkpoint);

    if (checkpoint.version === undefined) {
      checkpoint.version = 0;
    }

    if (checkpoint.version < CHECKPOINT_VERSION) {
      logger.info('Migrating checkpoint', {
        fromVersion: checkpoint.version,
        toVersion: CHECKPOINT_VERSION,
      });

      if (checkpoint.version === 0) {
        checkpoint.state = checkpoint.state || {};
        checkpoint.localVariables = checkpoint.localVariables || {};
        checkpoint.pendingWorkQueue = checkpoint.pendingWorkQueue || [];
        checkpoint.executionPointer = checkpoint.executionPointer || 0;
      }

      checkpoint.version = CHECKPOINT_VERSION;
      checkpoint.checksum = this.generateChecksum(checkpoint);
    }

    return checkpoint;
  }
}

export default new CheckpointStorageImpl();
