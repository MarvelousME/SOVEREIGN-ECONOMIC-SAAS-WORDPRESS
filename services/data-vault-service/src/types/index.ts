export enum DataType {
  PROFILE = 'profile',
  ACTIVITY = 'activity',
  PREFERENCE = 'preference',
  BEHAVIORAL = 'behavioral',
  TRANSACTION = 'transaction',
  SKILLS_CREDENTIALS = 'skills_credentials'
}

export enum AnonymizationLevel {
  NONE = 0,          // Full data access
  LOW = 1,           // Minimal anonymization (remove direct identifiers)
  MEDIUM = 2,        // Moderate anonymization (generalize data)
  HIGH = 3,          // Strong anonymization (aggregated only)
  FULL = 4           // Fully anonymous (statistical only)
}

export enum ConsentStatus {
  GRANTED = 'granted',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

export interface VaultData {
  id: string;
  userId: string;
  dataType: DataType;
  data: Record<string, any>;
  encryptedData: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataConsent {
  id: string;
  userId: string;
  dataId?: string;
  dataType?: DataType;
  grantedTo: string;
  purpose: string;
  anonymizationLevel: AnonymizationLevel;
  fields?: string[];
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  metadata?: Record<string, any>;
}

export interface DataAccessLog {
  id: string;
  consentId: string;
  accessedBy: string;
  accessedAt: Date;
  dataType: DataType;
  fieldsAccessed: string[];
  anonymizationLevel: AnonymizationLevel;
  purpose: string;
}

export interface DataMonetization {
  id: string;
  userId: string;
  dataType: DataType;
  buyerId: string;
  price: number;
  revenueShare: number;
  anonymizationLevel: AnonymizationLevel;
  transactionId: string;
  purchasedAt: Date;
  metadata?: Record<string, any>;
}

export interface StoreDataRequest {
  dataType: DataType;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface GrantConsentRequest {
  dataId?: string;
  dataType?: DataType;
  grantedTo: string;
  purpose: string;
  anonymizationLevel: AnonymizationLevel;
  fields?: string[];
  expiresIn?: number; // days
}

export interface DataExportRequest {
  format: 'json' | 'csv';
  dataTypes?: DataType[];
}

export interface AnonymizedData {
  data: Record<string, any>;
  anonymizationLevel: AnonymizationLevel;
  fieldsRemoved: string[];
  fieldsGeneralized: string[];
}
