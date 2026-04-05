import { templateService } from '../services/template.service';
import { db } from '../utils/database';
import { NotificationType, NotificationChannel, NotificationTemplate } from '../types';

const mockDb = db as jest.Mocked<typeof db>;

describe('TemplateService', () => {
  const mockTemplate: NotificationTemplate = {
    id: 'template-001',
    tenant_id: 'tenant-456',
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.EMAIL,
    name: 'Task Assignment Email',
    subject: 'New Task: {{task_title}}',
    body_template: '<h1>Hello, {{user_name}}!</h1><p>You have been assigned: {{task_title}}</p>',
    variables: ['user_name', 'task_title'],
    locale: 'en',
    active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    templateService.clearCache();
  });

  describe('getTemplate', () => {
    it('should return template when found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      const result = await templateService.getTemplate(
        'tenant-456',
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.EMAIL,
        'en'
      );

      expect(result).toEqual(mockTemplate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notification_templates'),
        ['tenant-456', NotificationType.TASK_ASSIGNED, NotificationChannel.EMAIL, 'en']
      );
    });

    it('should return null when template not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await templateService.getTemplate(
        'tenant-456',
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.EMAIL,
        'en'
      );

      expect(result).toBeNull();
    });

    it('should use default locale when locale not specified', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      await templateService.getTemplate(
        'tenant-456',
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.EMAIL
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['tenant-456', NotificationType.TASK_ASSIGNED, NotificationChannel.EMAIL, 'en']
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      const result = await templateService.createTemplate({
        tenant_id: 'tenant-456',
        type: NotificationType.TASK_ASSIGNED,
        channel: NotificationChannel.EMAIL,
        name: 'Task Assignment Email',
        subject: 'New Task: {{task_title}}',
        body_template: '<h1>Hello, {{user_name}}!</h1><p>You have been assigned: {{task_title}}</p>',
        variables: ['user_name', 'task_title'],
        locale: 'en',
        active: true
      });

      expect(result).toEqual(mockTemplate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_templates'),
        expect.any(Array)
      );
    });

    it('should throw error for invalid template syntax', async () => {
      await expect(
        templateService.createTemplate({
          tenant_id: 'tenant-456',
          type: NotificationType.TASK_ASSIGNED,
          channel: NotificationChannel.EMAIL,
          name: 'Invalid Template',
          body_template: '{{#each items}}{{/each}', 
          variables: [],
          locale: 'en',
          active: true
        })
      ).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      mockDb.query.mockResolvedValueOnce({ rows: [updatedTemplate], rowCount: 1 } as any);

      const result = await templateService.updateTemplate('template-001', {
        name: 'Updated Name'
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should clear compiled cache after update', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ body_template: mockTemplate.body_template }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      await templateService.render('template-001', { user_name: 'John', task_title: 'Test Task' });
      await templateService.updateTemplate('template-001', { name: 'Updated' });

      const compiled = (templateService as any).compiledTemplates.get('template-001');
      expect(compiled).toBeUndefined();
    });

    it('should throw error when template not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        templateService.updateTemplate('nonexistent', { name: 'Updated' })
      ).rejects.toThrow('Template not found');
    });
  });

  describe('render', () => {
    it('should render template with data', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ body_template: mockTemplate.body_template }], rowCount: 1 } as any);

      const result = await templateService.render('template-001', {
        user_name: 'John',
        task_title: 'Complete Report'
      });

      expect(result).toContain('John');
      expect(result).toContain('Complete Report');
    });

    it('should use cached compiled template', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ body_template: mockTemplate.body_template }], rowCount: 1 } as any);

      await templateService.render('template-001', { user_name: 'John', task_title: 'Task 1' });
      await templateService.render('template-001', { user_name: 'Jane', task_title: 'Task 2' });

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when template not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        templateService.render('nonexistent', {})
      ).rejects.toThrow('Template not found');
    });
  });

  describe('renderInline', () => {
    it('should compile and render inline template', async () => {
      const result = await templateService.renderInline(
        'Hello, {{name}}! You have {{count}} messages.',
        { name: 'Alice', count: 5 }
      );

      expect(result).toBe('Hello, Alice! You have 5 messages.');
    });

    it('should handle complex Handlebars expressions', async () => {
      const result = await templateService.renderInline(
        '{{#if active}}User is active{{else}}User is inactive{{/if}}',
        { active: true }
      );

      expect(result).toBe('User is active');
    });

    it('should handle loops and iterations', async () => {
      const result = await templateService.renderInline(
        '{{#each items}}Item: {{this}}\n{{/each}}',
        { items: ['one', 'two', 'three'] }
      );

      expect(result).toContain('Item: one');
      expect(result).toContain('Item: two');
      expect(result).toContain('Item: three');
    });

    it('should handle missing variables gracefully', async () => {
      const result = await templateService.renderInline(
        'Hello, {{name}}!',
        {}
      );

      expect(result).toBe('Hello, !');
    });

    it('should throw error for invalid template syntax', async () => {
      await expect(
        templateService.renderInline('{{#if}}', {})
      ).rejects.toThrow();
    });
  });

  describe('listTemplates', () => {
    it('should return templates with filters', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      const result = await templateService.listTemplates('tenant-456', {
        type: NotificationType.TASK_ASSIGNED,
        channel: NotificationChannel.EMAIL,
        active: true
      });

      expect(result).toEqual([mockTemplate]);
    });

    it('should return all templates when no filters provided', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 } as any);

      const result = await templateService.listTemplates('tenant-456');

      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template and clear cache', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ body_template: mockTemplate.body_template }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await templateService.render('template-001', { user_name: 'John', task_title: 'Task' });
      await templateService.deleteTemplate('template-001');

      const compiled = (templateService as any).compiledTemplates.get('template-001');
      expect(compiled).toBeUndefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM notification_templates WHERE id = $1',
        ['template-001']
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all compiled templates', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ body_template: mockTemplate.body_template }], rowCount: 1 } as any);

      await templateService.render('template-001', { user_name: 'John', task_title: 'Task' });
      templateService.clearCache();

      const compiled = (templateService as any).compiledTemplates.size;
      expect(compiled).toBe(0);
    });
  });

  describe('template interpolation', () => {
    it('should handle nested variable access', async () => {
      const result = await templateService.renderInline(
        'User: {{user.name}}, Email: {{user.email}}',
        { user: { name: 'John', email: 'john@example.com' } }
      );

      expect(result).toBe('User: John, Email: john@example.com');
    });

    it('should handle conditional blocks', async () => {
      const result = await templateService.renderInline(
        '{{#if showMessage}}Message: {{message}}{{/if}}',
        { showMessage: true, message: 'Hello!' }
      );

      expect(result).toBe('Message: Hello!');
    });

    it('should handle mathematical operations', async () => {
      const result = await templateService.renderInline(
        'Total: {{add items.total tax}}',
        { items: { total: 100 }, tax: 20, add: (a: number, b: number) => a + b }
      );

      expect(result).toBe('Total: 120');
    });

    it('should escape HTML by default', async () => {
      const result = await templateService.renderInline(
        'Message: {{message}}',
        { message: '<script>alert("xss")</script>' }
      );

      expect(result).not.toContain('<script>');
    });

    it('should handle triple-braces for raw HTML', async () => {
      const result = await templateService.renderInline(
        'Raw HTML: {{{html}}}',
        { html: '<b>bold</b>' }
      );

      expect(result).toBe('Raw HTML: <b>bold</b>');
    });
  });
});
