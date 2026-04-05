import { z } from 'zod';

export enum ConsentBasis {
  EXPLICIT = 'explicit',
  IMPLICIT = 'implicit',
  LEGITIMATE_INTEREST = 'legitimate_interest',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTEREST = 'vital_interest',
  PUBLIC_TASK = 'public_task'
}

export enum ConsentChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEB = 'web',
  MOBILE = 'mobile',
  SOCIAL = 'social',
  DIRECT_MAIL = 'direct_mail',
  PHONE = 'phone'
}

export enum Regulation {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  CAN_SPAM = 'can_spam',
  CASL = 'casl',
  TCPA = 'tcpa',
  FTC = 'ftc',
  COPPA = 'coppa',
  PCI_DSS = 'pci_dss'
}

export enum SuppressionType {
  UNSUBSCRIBE = 'unsubscribe',
  DO_NOT_CONTACT = 'do_not_contact',
  COMPLAINT = 'complaint',
  BLOCKED = 'blocked',
  BLACKLIST = 'blacklist',
  SOFT_BOUNCE = 'soft_bounce',
  HARD_BOUNCE = 'hard_bounce'
}

export enum SuppressionChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  ALL = 'all'
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  APPEALED = 'appealed'
}

export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AbuseSignalType {
  SPAM_TRAP = 'spam_trap',
  DISPOSABLE_EMAIL = 'disposable_email',
  HONEYPOT = 'honeypot',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  BOT_BEHAVIOR = 'bot_behavior',
  FRAUD_INDICATOR = 'fraud_indicator'
}

export enum GeoRestrictionType {
  COUNTRY_BLOCK = 'country_block',
  STATE_BLOCK = 'state_block',
  REGION_BLOCK = 'region_block',
  DATA_RESIDENCY = 'data_residency',
  MARKET_RESTRICTION = 'market_restriction'
}

export enum PolicyAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  REVIEW = 'review',
  MODIFY = 'modify',
  REDIRECT = 'redirect'
}

export enum DisclosureType {
  FTC_AFFILIATE = 'ftc_affiliate',
  SPONSORED_CONTENT = 'sponsored_content',
  NATIVE_ADVERTISING = 'native_advertising',
  PAID_PARTNERSHIP = 'paid_partnership',
  MATERIAL_CONNECTION = 'material_connection'
}

export interface ConsentRecord {
  id: string;
  contactId: string;
  purpose: string;
  basis: ConsentBasis;
  channels: ConsentChannel[];
  regulations: Regulation[];
  status: 'granted' | 'revoked' | 'expired';
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  proofType: string;
  proofData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuppressionEntry {
  id: string;
  contactId?: string;
  email?: string;
  phone?: string;
  type: SuppressionType;
  channel: SuppressionChannel;
  reason?: string;
  source?: string;
  addedBy?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisclosureTemplate {
  id: string;
  type: DisclosureType;
  channel: string;
  regulation: Regulation;
  text: string;
  isActive: boolean;
  version: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelPolicy {
  id: string;
  channel: string;
  regulation: Regulation;
  ruleSet: string;
  requirements: Record<string, any>;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoRestriction {
  id: string;
  type: GeoRestrictionType;
  country?: string;
  state?: string;
  region?: string;
  isBlocked: boolean;
  requiresDisclosure: boolean;
  disclosureText?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceReview {
  id: string;
  contentId: string;
  contentType: string;
  content: Record<string, any>;
  status: ReviewStatus;
  priority: ReviewPriority;
  riskScore: number;
  flags: string[];
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  decision?: string;
  appealReason?: string;
  appealReviewedBy?: string;
  appealReviewedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AbuseSignal {
  id: string;
  contactId?: string;
  email?: string;
  phone?: string;
  type: AbuseSignalType;
  severity: number;
  confidence: number;
  details: Record<string, any>;
  metadata?: Record<string, any>;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  triggerType: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  escalationPath?: string[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const RecordConsentSchema = z.object({
  contactId: z.string(),
  purpose: z.string(),
  basis: z.nativeEnum(ConsentBasis),
  channels: z.array(z.nativeEnum(ConsentChannel)),
  regulations: z.array(z.nativeEnum(Regulation)),
  proofType: z.string().default('web_form'),
  proofData: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresInDays: z.number().optional()
});

export const AddSuppressionSchema = z.object({
  contactId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.nativeEnum(SuppressionType),
  channel: z.nativeEnum(SuppressionChannel),
  reason: z.string().optional(),
  source: z.string().optional(),
  addedBy: z.string().optional(),
  expiresInDays: z.number().optional()
});

export const ContentCheckSchema = z.object({
  contentType: z.string(),
  content: z.record(z.any()),
  channel: z.string(),
  contactId: z.string().optional(),
  geoLocation: z.object({
    country: z.string().optional(),
    state: z.string().optional()
  }).optional()
});

export const SubmitReviewSchema = z.object({
  contentId: z.string(),
  contentType: z.string(),
  content: z.record(z.any()),
  priority: z.nativeEnum(ReviewPriority).optional()
});

export const ProcessReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  decision: z.string().optional(),
  assignedTo: z.string().optional()
});

export type RecordConsentInput = z.infer<typeof RecordConsentSchema>;
export type AddSuppressionInput = z.infer<typeof AddSuppressionSchema>;
export type ContentCheckInput = z.infer<typeof ContentCheckSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type ProcessReviewInput = z.infer<typeof ProcessReviewSchema>;
