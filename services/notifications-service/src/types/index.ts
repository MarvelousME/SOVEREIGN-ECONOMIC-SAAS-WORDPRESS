export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_APPROVED = 'task_approved',
  TASK_REJECTED = 'task_rejected',
  UBI_DISTRIBUTION = 'ubi_distribution',
  REWARD_RECEIVED = 'reward_received',
  TREASURY_PERFORMANCE = 'treasury_performance',
  AGENT_EXECUTION_COMPLETE = 'agent_execution_complete',
  GOVERNANCE_PROPOSAL = 'governance_proposal',
  SYSTEM_ALERT = 'system_alert'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: Record<string, any>;
  template_id?: string;
  scheduled_for?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  error_message?: string;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferences {
  user_id: string;
  tenant_id: string;
  enabled_channels: NotificationChannel[];
  type_preferences: Record<NotificationType, NotificationChannel[]>;
  digest_mode: boolean;
  digest_frequency: DigestFrequency;
  digest_day?: number; // 0-6 for weekly, 0 = Sunday
  digest_time?: string; // HH:MM format
  dnd_enabled: boolean;
  dnd_start_time?: string;
  dnd_end_time?: string;
  locale: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  name: string;
  subject?: string;
  body_template: string;
  variables: string[];
  locale: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SendNotificationRequest {
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  template_id?: string;
  scheduled_for?: Date;
}

export interface NotificationEvent {
  type: string;
  timestamp: Date;
  tenant_id: string;
  data: any;
}

export interface DeliveryResult {
  notification_id: string;
  channel: NotificationChannel;
  success: boolean;
  external_id?: string;
  error?: string;
  delivered_at?: Date;
}

export type DigestFrequency = 'immediate' | 'daily' | 'weekly';

export const DigestFrequency = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily',
  WEEKLY: 'weekly'
} as const;

export interface DigestPreferences {
  user_id: string;
  tenant_id: string;
  digest_frequency: DigestFrequency;
  digest_day: number; // 0-6 for weekly, 0 = Sunday
  digest_time: string; // HH:MM format
  last_digest_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PendingNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  batch_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  created_at: Date;
}

export interface DigestEmailData {
  user_id: string;
  email: string;
  frequency: DigestFrequency;
  notifications: PendingNotification[];
  generated_at: Date;
}
