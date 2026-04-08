export const CANONICAL_EVENT_TYPES = [
  'tenant.created',
  'workspace.created',
  'affiliate_link.ingested',
  'merchant.extracted',
  'offer.detected',
  'page.generated',
  'page.published',
  'lead.captured',
  'lead.scored',
  'crm.deal.created',
  'message.drafted',
  'message.sent',
  'message.blocked',
  'consent.recorded',
  'suppression.updated',
  'reward.earned',
  'payout.requested',
  'agent.run_started',
  'agent.run_completed',
  'agent.run_failed',
  'policy.action_blocked',
  'audit.event_recorded',
  'social.post_published',
] as const;

export type CanonicalEventType = typeof CANONICAL_EVENT_TYPES[number];

export type AttributionModelType = 
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'data_driven';

export interface CloudEvent<T = Record<string, unknown>> {
  id: string;
  specversion: string;
  type: string;
  source: string;
  subject?: string;
  time?: string;
  datacontenttype?: string;
  data: T;
  tenantid?: string;
  workspaceid?: string;
}

export interface CanonicalEvent {
  id: string;
  eventId: string;
  tenantId: string;
  workspaceId: string;
  eventType: CanonicalEventType;
  source: string;
  specVersion: string;
  eventTypeSchema?: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  timestamp: Date;
  processingTimeMs?: number;
  createdAt: Date;
}

export interface AttributionTouchpoint {
  id: string;
  tenantId: string;
  workspaceId: string;
  visitorId: string;
  sessionId: string;
  touchpointType: string;
  touchpointId?: string;
  touchpointData: Record<string, unknown>;
  channel?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  keyword?: string;
  firstInteractionAt: Date;
  lastInteractionAt: Date;
  interactionCount: number;
  conversionId?: string;
  createdAt: Date;
}

export interface Conversion {
  id: string;
  tenantId: string;
  workspaceId: string;
  visitorId: string;
  sessionId: string;
  conversionType: string;
  conversionValue: number;
  currency: string;
  revenue: number;
  cost: number;
  touchpoints: AttributionTouchpoint[];
  attributedChannel?: string;
  attributedSource?: string;
  attributedMedium?: string;
  attributedCampaign?: string;
  conversionDate: Date;
  createdAt: Date;
}

export interface AttributionCredit {
  touchpointId: string;
  touchpointType: string;
  credit: number;
}

export interface AttributionResult {
  conversionId: string;
  modelType: AttributionModelType;
  credits: AttributionCredit[];
  totalCredits: number;
}

export interface Experiment {
  id: string;
  tenantId: string;
  workspaceId: string;
  experimentName: string;
  experimentDescription?: string;
  hypothesis?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variantConfig: Record<string, unknown>;
  trafficAllocation: number;
  attributionModelId?: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  variantId: string;
  variantName?: string;
  metricName: string;
  metricValue: number;
  sampleSize: number;
  confidenceLevel?: number;
  pValue?: number;
  statisticalSignificance: boolean;
  winner: boolean;
  createdAt: Date;
}

export interface AnomalyAlert {
  id: string;
  tenantId: string;
  workspaceId: string;
  alertType: string;
  metricName: string;
  currentValue?: number;
  expectedValue?: number;
  deviationPercentage?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  description?: string;
  metadata: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface RealTimeMetric {
  id: string;
  tenantId: string;
  workspaceId: string;
  metricName: string;
  metricValue: number;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  dimensions: Record<string, string>;
  windowStart: Date;
  windowEnd: Date;
  recordedAt: Date;
}

export interface CohortAnalysis {
  id: string;
  tenantId: string;
  workspaceId: string;
  cohortType: string;
  cohortDate: Date;
  cohortSize: number;
  metricName: string;
  metricValues: number[];
  periodNumber: number;
  createdAt: Date;
}

export interface FunnelAnalysis {
  id: string;
  tenantId: string;
  workspaceId: string;
  funnelName: string;
  funnelSteps: FunnelStep[];
  totalUsers: number;
  conversionRates: number[];
  dropOffRates: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStep {
  stepName: string;
  stepOrder: number;
  userCount: number;
  conversionRate?: number;
  dropOffRate?: number;
}

export interface DashboardMetrics {
  totalEvents: number;
  eventsPerMinute: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  revenuePerConversion: number;
  activeTouchpoints: number;
  attributionBreakdown: Record<string, number>;
  topChannels: Array<{ channel: string; conversions: number; revenue: number }>;
  recentAnomalies: AnomalyAlert[];
  periodComparison: {
    eventsChange: number;
    conversionsChange: number;
    revenueChange: number;
  };
}

export interface EventIngestionResult {
  accepted: number;
  rejected: number;
  duplicates: number;
  errors: Array<{ eventId: string; error: string }>;
  processingTimeMs: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface MetricTimeSeries {
  metricName: string;
  data: TimeSeriesPoint[];
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface PageAnalytics {
  pageId: string;
  pageTitle: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
  topExitPages: Array<{ path: string; exits: number }>;
}

export interface LeadAnalytics {
  totalLeads: number;
  qualifiedLeads: number;
  leadScoreDistribution: Record<number, number>;
  leadSources: Record<string, number>;
  conversionFunnel: {
    captured: number;
    scored: number;
    qualified: number;
    converted: number;
  };
  avgTimeToQualify: number;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  costPerRun: number;
  runsOverTime: TimeSeriesPoint[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
