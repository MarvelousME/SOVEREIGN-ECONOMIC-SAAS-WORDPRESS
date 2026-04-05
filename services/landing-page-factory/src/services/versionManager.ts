import { Pool } from 'pg';
import { LandingPageModel, PageVersion } from '../models/landing-page.model';
import { PageBlock, PageMetadata, PageDiff } from '../types';
import { logger } from '../config/logger';
import { eventPublisher } from '../utils/event-publisher';

export class VersionManagerService {
  private pageModel: LandingPageModel;

  constructor(db: Pool) {
    this.pageModel = new LandingPageModel(db);
  }

  async createVersion(
    tenantId: string,
    pageId: string,
    userId: string,
    blocks: PageBlock[],
    metadata: PageMetadata,
    changeDescription?: string
  ): Promise<PageVersion> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const version = await this.pageModel.createVersion(
      pageId,
      userId,
      blocks,
      metadata,
      changeDescription
    );

    logger.info('Created new page version', {
      pageId,
      version: version.version,
      rollbackToken: version.rollbackToken,
    });

    return version;
  }

  async getVersions(
    pageId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ versions: PageVersion[]; total: number }> {
    return this.pageModel.getVersions(pageId, {
      page: options.page || 1,
      limit: options.limit || 20,
    });
  }

  async getVersion(pageId: string, versionId: string): Promise<PageVersion | null> {
    return this.pageModel.getVersionById(pageId, versionId);
  }

  async rollback(
    tenantId: string,
    pageId: string,
    userId: string,
    options: { versionId?: string; rollbackToken?: string; reason?: string }
  ): Promise<{ pageId: string; blocks: PageBlock[]; metadata: PageMetadata }> {
    let version: PageVersion | null = null;

    if (options.versionId) {
      version = await this.pageModel.getVersionById(pageId, options.versionId);
    } else if (options.rollbackToken) {
      version = await this.pageModel.getVersionByToken(options.rollbackToken);
      if (version && version.pageId !== pageId) {
        throw new Error('Rollback token does not match page');
      }
    }

    if (!version) {
      throw new Error('Version not found for rollback');
    }

    const currentPage = await this.pageModel.findById(tenantId, pageId);
    if (!currentPage) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const fromVersion = currentPage.version;

    await this.createVersion(
      tenantId,
      pageId,
      userId,
      currentPage.blocks,
      currentPage.metadata,
      `Rollback to version ${version.version}. Reason: ${options.reason || 'Not specified'}`
    );

    await this.pageModel.update(tenantId, pageId, {
      blocks: version.blocks,
      metadata: version.metadata,
    });

    await eventPublisher.publishPageRollback({
      pageId,
      tenantId,
      userId,
      fromVersion,
      toVersion: version.version,
      rollbackToken: version.rollbackToken || '',
    });

    logger.info('Rolled back page', {
      pageId,
      fromVersion,
      toVersion: version.version,
    });

    return {
      pageId,
      blocks: version.blocks,
      metadata: version.metadata,
    };
  }

  async compareVersions(versionA: PageVersion, versionB: PageVersion): Promise<PageDiff> {
    const blocksA = new Map(versionA.blocks.map((b) => [b.id, b]));
    const blocksB = new Map(versionB.blocks.map((b) => [b.id, b]));

    const added: PageBlock[] = [];
    const removed: PageBlock[] = [];
    const modified: PageDiff['modified'] = [];

    for (const block of versionB.blocks) {
      if (!blocksA.has(block.id)) {
        added.push(block);
      } else {
        const blockA = blocksA.get(block.id)!;
        const changesA = this.detectContentChanges(blockA.content, block.content);
        if (Object.keys(changesA).length > 0) {
          modified.push({
            blockId: block.id,
            before: blockA.content,
            after: block.content,
          });
        }
      }
    }

    for (const block of versionA.blocks) {
      if (!blocksB.has(block.id)) {
        removed.push(block);
      }
    }

    const metadataChanges: PageDiff['metadataChanges'] = [];
    for (const key of Object.keys(versionB.metadata) as (keyof PageMetadata)[]) {
      const valueA = versionA.metadata[key];
      const valueB = versionB.metadata[key];
      if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
        metadataChanges.push({
          field: key,
          before: valueA,
          after: valueB,
        });
      }
    }

    return { added, removed, modified, metadataChanges };
  }

  private detectContentChanges(
    before: PageBlock['content'],
    after: PageBlock['content']
  ): Partial<PageBlock['content']> {
    const changes: Partial<PageBlock['content']> = {};

    for (const key of Object.keys(after) as (keyof PageBlock['content'])[]) {
      const valueBefore = before[key];
      const valueAfter = after[key];

      if (JSON.stringify(valueBefore) !== JSON.stringify(valueAfter)) {
        (changes as Record<string, unknown>)[key] = {
          before: valueBefore,
          after: valueAfter,
        };
      }
    }

    return changes;
  }

  async getVersionDiff(
    pageId: string,
    versionAId: string,
    versionBId: string
  ): Promise<PageDiff | null> {
    const versionA = await this.pageModel.getVersionById(pageId, versionAId);
    const versionB = await this.pageModel.getVersionById(pageId, versionBId);

    if (!versionA || !versionB) {
      return null;
    }

    return this.compareVersions(versionA, versionB);
  }

  async listRollbackTokens(pageId: string): Promise<Array<{ version: number; token: string; createdAt: Date }>> {
    const { versions } = await this.pageModel.getVersions(pageId, { limit: 100 });

    return versions
      .filter((v) => v.rollbackToken)
      .map((v) => ({
        version: v.version,
        token: v.rollbackToken!,
        createdAt: v.createdAt,
      }));
  }
}
