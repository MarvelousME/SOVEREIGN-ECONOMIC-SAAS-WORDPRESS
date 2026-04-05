import { eventsService } from '../services/events.service';
import { notificationService } from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../types';

jest.mock('../services/notification.service');

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

describe('EventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('event handlers', () => {
    describe('handleTaskAssigned', () => {
      it('should send task assigned notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          assigned_to: 'user-123',
          task_id: 'task-001',
          task_title: 'Complete Report'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleTaskAssigned(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.TASK_ASSIGNED,
          priority: NotificationPriority.HIGH,
          title: 'New Task Assigned',
          message: 'You have been assigned a new task: Complete Report',
          data: { task_id: 'task-001' }
        });
      });
    });

    describe('handleTaskApproved', () => {
      it('should send task approved notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          task_id: 'task-001',
          task_title: 'Complete Report',
          reward_amount: 100
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleTaskApproved(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.TASK_APPROVED,
          priority: NotificationPriority.NORMAL,
          title: 'Task Approved',
          message: 'Your task "Complete Report" has been approved!',
          data: { task_id: 'task-001', reward_amount: 100 }
        });
      });
    });

    describe('handleTaskRejected', () => {
      it('should send task rejected notification with reason', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          task_id: 'task-001',
          task_title: 'Complete Report',
          reason: 'Incomplete work'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleTaskRejected(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.TASK_REJECTED,
          priority: NotificationPriority.NORMAL,
          title: 'Task Rejected',
          message: 'Your task "Complete Report" was rejected. Reason: Incomplete work',
          data: { task_id: 'task-001' }
        });
      });
    });

    describe('handleUBIDistributed', () => {
      it('should send UBI distribution notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          amount: '500.00',
          currency: 'UBI',
          period: 'January 2024'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleUBIDistributed(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.UBI_DISTRIBUTION,
          priority: NotificationPriority.NORMAL,
          title: 'UBI Received',
          message: 'You received 500.00 UBI in UBI for January 2024',
          data: { amount: '500.00', period: 'January 2024' }
        });
      });
    });

    describe('handleRewardIssued', () => {
      it('should send reward received notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          amount: '250.00',
          currency: 'SOVEREIGN',
          reason: 'Task completion bonus'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleRewardIssued(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.REWARD_RECEIVED,
          priority: NotificationPriority.HIGH,
          title: 'Reward Received',
          message: 'You earned 250.00 SOVEREIGN for Task completion bonus!',
          data: { amount: '250.00', reason: 'Task completion bonus' }
        });
      });
    });

    describe('handleAgentExecutionComplete', () => {
      it('should send agent execution complete notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          execution_id: 'exec-001',
          agent_id: 'agent-001',
          agent_name: 'Data Analyzer',
          status: 'success'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleAgentExecutionComplete(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.AGENT_EXECUTION_COMPLETE,
          priority: NotificationPriority.NORMAL,
          title: 'Agent Execution Complete',
          message: 'Your agent "Data Analyzer" has completed execution. Status: success',
          data: { execution_id: 'exec-001', agent_id: 'agent-001' }
        });
      });
    });

    describe('handleGovernanceProposal', () => {
      it('should send governance proposal notification', async () => {
        const eventData = {
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          proposal_id: 'prop-001',
          proposal_title: 'Increase UBI Distribution',
          voting_deadline: '2024-02-01'
        };

        mockNotificationService.sendNotification.mockResolvedValue([]);

        await (eventsService as any).handleGovernanceProposal(eventData);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          tenant_id: 'tenant-456',
          user_id: 'user-123',
          type: NotificationType.GOVERNANCE_PROPOSAL,
          priority: NotificationPriority.URGENT,
          title: 'New Governance Proposal',
          message: 'New proposal: Increase UBI Distribution. Voting ends 2024-02-01',
          data: { proposal_id: 'prop-001' }
        });
      });
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(eventsService.isConnected()).toBe(false);
    });
  });
});
