import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import database from '../utils/database';
import logger from '../utils/logger';
import { StorageManager, Artifact } from '../types';

export class StorageManagerImpl implements StorageManager {
  private minio: Minio.Client;
  private bucket: string;

  constructor() {
    this.minio = new Minio.Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
    this.bucket = config.minio.bucket;
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.minio.bucketExists(this.bucket);
      if (!exists) {
        await this.minio.makeBucket(this.bucket, 'us-east-1');
        logger.info('Created MinIO bucket', { bucket: this.bucket });
      }
    } catch (error) {
      logger.error('Failed to initialize MinIO bucket', { error, bucket: this.bucket });
    }
  }

  async upload(
    agentId: string,
    executionId: string,
    name: string,
    content: Buffer,
    metadata: Record<string, any> = {}
  ): Promise<Artifact> {
    const artifactId = uuidv4();
    const objectName = `${agentId}/${executionId}/${artifactId}/${name}`;

    logger.debug('Uploading artifact', { agentId, executionId, name, size: content.length });

    // Upload to MinIO
    await this.minio.putObject(
      this.bucket,
      objectName,
      content,
      content.length,
      {
        'Content-Type': metadata.contentType || 'application/octet-stream',
        ...metadata,
      }
    );

    // Store metadata in database
    const artifact: Artifact = {
      id: artifactId,
      agentId,
      executionId,
      name,
      type: metadata.contentType || 'application/octet-stream',
      path: objectName,
      size: content.length,
      metadata,
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO agent_artifacts (id, agent_id, execution_id, name, type, path, size, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await database.query(query, [
      artifact.id,
      artifact.agentId,
      artifact.executionId,
      artifact.name,
      artifact.type,
      artifact.path,
      artifact.size,
      JSON.stringify(artifact.metadata),
      artifact.createdAt,
    ]);

    logger.info('Artifact uploaded successfully', { artifactId, agentId, executionId });
    return artifact;
  }

  async download(artifactId: string): Promise<Buffer> {
    logger.debug('Downloading artifact', { artifactId });

    // Get artifact metadata
    const query = 'SELECT * FROM agent_artifacts WHERE id = $1';
    const result = await database.query(query, [artifactId]);

    if (result.rows.length === 0) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const artifact = result.rows[0];

    // Download from MinIO
    const stream = await this.minio.getObject(this.bucket, artifact.path);
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async delete(artifactId: string): Promise<void> {
    logger.info('Deleting artifact', { artifactId });

    // Get artifact metadata
    const query = 'SELECT * FROM agent_artifacts WHERE id = $1';
    const result = await database.query(query, [artifactId]);

    if (result.rows.length === 0) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const artifact = result.rows[0];

    // Delete from MinIO
    await this.minio.removeObject(this.bucket, artifact.path);

    // Delete from database
    await database.query('DELETE FROM agent_artifacts WHERE id = $1', [artifactId]);

    logger.info('Artifact deleted successfully', { artifactId });
  }

  async list(agentId: string, executionId?: string): Promise<Artifact[]> {
    let query = 'SELECT * FROM agent_artifacts WHERE agent_id = $1';
    const params: any[] = [agentId];

    if (executionId) {
      query += ' AND execution_id = $2';
      params.push(executionId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await database.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      executionId: row.execution_id,
      name: row.name,
      type: row.type,
      path: row.path,
      size: row.size,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
    }));
  }
}

export default new StorageManagerImpl();
