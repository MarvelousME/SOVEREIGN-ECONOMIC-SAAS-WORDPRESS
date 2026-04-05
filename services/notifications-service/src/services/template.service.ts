import Handlebars from 'handlebars';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { NotificationTemplate, NotificationType, NotificationChannel } from '../types';

class TemplateService {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  async getTemplate(
    tenantId: string,
    type: NotificationType,
    channel: NotificationChannel,
    locale: string = 'en'
  ): Promise<NotificationTemplate | null> {
    try {
      const result = await db.query<NotificationTemplate>(
        `SELECT * FROM notification_templates 
         WHERE tenant_id = $1 AND type = $2 AND channel = $3 AND locale = $4 AND active = true
         LIMIT 1`,
        [tenantId, type, channel, locale]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get template', { tenantId, type, channel, locale, error });
      throw error;
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationTemplate> {
    try {
      // Validate template by compiling it
      Handlebars.compile(template.body_template);

      const result = await db.query<NotificationTemplate>(
        `INSERT INTO notification_templates 
         (tenant_id, type, channel, name, subject, body_template, variables, locale, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          template.tenant_id,
          template.type,
          template.channel,
          template.name,
          template.subject,
          template.body_template,
          JSON.stringify(template.variables),
          template.locale,
          template.active
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create template', { template, error });
      throw error;
    }
  }

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      if (updates.body_template) {
        Handlebars.compile(updates.body_template);
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          fields.push(`${key} = $${paramCount++}`);
          values.push(key === 'variables' ? JSON.stringify(value) : value);
        }
      });

      values.push(id);

      const result = await db.query<NotificationTemplate>(
        `UPDATE notification_templates SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      // Clear compiled cache
      this.compiledTemplates.delete(id);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update template', { id, updates, error });
      throw error;
    }
  }

  async render(templateId: string, data: Record<string, any>): Promise<string> {
    try {
      let compiled = this.compiledTemplates.get(templateId);

      if (!compiled) {
        const result = await db.query<NotificationTemplate>(
          'SELECT body_template FROM notification_templates WHERE id = $1',
          [templateId]
        );

        if (result.rows.length === 0) {
          throw new Error('Template not found');
        }

        compiled = Handlebars.compile(result.rows[0].body_template);
        this.compiledTemplates.set(templateId, compiled);
      }

      return compiled(data);
    } catch (error) {
      logger.error('Failed to render template', { templateId, data, error });
      throw error;
    }
  }

  async renderInline(template: string, data: Record<string, any>): Promise<string> {
    try {
      const compiled = Handlebars.compile(template);
      return compiled(data);
    } catch (error) {
      logger.error('Failed to render inline template', { template, data, error });
      throw error;
    }
  }

  async listTemplates(tenantId: string, filters?: {
    type?: NotificationType;
    channel?: NotificationChannel;
    active?: boolean;
  }): Promise<NotificationTemplate[]> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramCount = 2;

      if (filters?.type) {
        conditions.push(`type = $${paramCount++}`);
        values.push(filters.type);
      }

      if (filters?.channel) {
        conditions.push(`channel = $${paramCount++}`);
        values.push(filters.channel);
      }

      if (filters?.active !== undefined) {
        conditions.push(`active = $${paramCount++}`);
        values.push(filters.active);
      }

      const result = await db.query<NotificationTemplate>(
        `SELECT * FROM notification_templates 
         WHERE ${conditions.join(' AND ')}
         ORDER BY type, channel, locale`,
        values
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list templates', { tenantId, filters, error });
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await db.query('DELETE FROM notification_templates WHERE id = $1', [id]);
      this.compiledTemplates.delete(id);
    } catch (error) {
      logger.error('Failed to delete template', { id, error });
      throw error;
    }
  }

  clearCache(): void {
    this.compiledTemplates.clear();
  }
}

export const templateService = new TemplateService();
