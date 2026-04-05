export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadSource = 'web' | 'referral' | 'social' | 'email' | 'phone' | 'event' | 'import' | 'api';
export type LeadMedium = 'organic' | 'paid' | 'direct' | 'social' | 'email' | 'content' | 'affiliate';

export interface LeadAttribution {
  source: LeadSource;
  medium: LeadMedium;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  landingPage?: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: LeadStatus;
  score?: number;
  behavioralScore?: number;
  demographicScore?: number;
  engagementScore?: number;
  ownerId?: string;
  attribution: LeadAttribution;
  tags: string[];
  customFields: Record<string, unknown>;
  convertedAt?: Date;
  convertedToDealId?: string;
  lostAt?: Date;
  lostReason?: string;
  lastContactedAt?: Date;
  nextFollowUp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  tenantId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'webinar' | 'demo' | 'other';
  subject: string;
  description?: string;
  direction?: 'inbound' | 'outbound';
  duration?: number;
  outcome?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface LeadScore {
  id: string;
  leadId: string;
  tenantId: string;
  behavioralScore: number;
  demographicScore: number;
  engagementScore: number;
  totalScore: number;
  scores: {
    websiteVisits?: number;
    emailOpens?: number;
    emailClicks?: number;
    formSubmissions?: number;
    contentDownloads?: number;
    webinarAttendances?: number;
    demoRequests?: number;
    companySize?: number;
    industryMatch?: number;
    jobTitleMatch?: number;
    emailResponse?: number;
    meetingScheduled?: number;
  };
  segment?: string;
  calculatedAt: Date;
}

export interface Contact {
  id: string;
  tenantId: string;
  leadId?: string;
  accountId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  linkedInUrl?: string;
  twitterHandle?: string;
  avatar?: string;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactTimeline {
  id: string;
  contactId: string;
  tenantId: string;
  activityType: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'deal_update' | 'status_change' | 'other';
  subject: string;
  description?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  tenantId: string;
  name: string;
  domain?: string;
  industry?: string;
  subIndustry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  website?: string;
  linkedInUrl?: string;
  parentAccountId?: string;
  type?: 'prospect' | 'customer' | 'partner' | 'competitor';
  score?: number;
  customFields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  tenantId: string;
  accountId: string;
  contactId?: string;
  leadId?: string;
  name: string;
  description?: string;
  value: number;
  currency: string;
  probability: number;
  stageId: string;
  pipelineId: string;
  ownerId?: string;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  wonAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealActivity {
  id: string;
  dealId: string;
  tenantId: string;
  type: 'stage_change' | 'note' | 'call' | 'email' | 'meeting' | 'value_change' | 'other';
  description: string;
  fromValue?: string;
  toValue?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  isWinStage: boolean;
  isLossStage: boolean;
  daysToAdvance?: number;
  createdAt: Date;
}

export interface LeadRoutingRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
}

export interface RoutingAction {
  type: 'assign_owner' | 'assign_territory' | 'set_score_threshold' | 'add_tag' | 'set_status' | 'notify';
  value: unknown;
}

export interface LeadSegment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: RoutingCondition[];
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadInput {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  attribution?: Partial<LeadAttribution>;
  tags?: string[];
  customFields?: Record<string, unknown>;
  ownerId?: string;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status?: LeadStatus;
  ownerId?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  nextFollowUp?: Date;
}

export interface CreateContactInput {
  leadId?: string;
  accountId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isPrimary?: boolean;
  isDecisionMaker?: boolean;
  linkedInUrl?: string;
  customFields?: Record<string, unknown>;
}

export interface CreateAccountInput {
  name: string;
  domain?: string;
  industry?: string;
  subIndustry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  address?: Account['address'];
  phone?: string;
  website?: string;
  linkedInUrl?: string;
  parentAccountId?: string;
  type?: Account['type'];
  customFields?: Record<string, unknown>;
}

export interface CreateDealInput {
  accountId: string;
  contactId?: string;
  leadId?: string;
  name: string;
  description?: string;
  value: number;
  currency?: string;
  probability?: number;
  stageId: string;
  pipelineId: string;
  ownerId?: string;
  expectedCloseDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateDealStageInput {
  stageId: string;
  probability?: number;
  notes?: string;
}

export interface LogActivityInput {
  type: LeadActivity['type'];
  subject: string;
  description?: string;
  direction?: LeadActivity['direction'];
  duration?: number;
  outcome?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, unknown>;
}

export interface CRMEvent {
  event: string;
  tenantId: string;
  data: unknown;
  timestamp: Date;
}
