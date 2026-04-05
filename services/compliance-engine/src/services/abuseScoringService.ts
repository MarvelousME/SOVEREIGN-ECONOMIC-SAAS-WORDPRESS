import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { eventService, ComplianceEvents } from './events.service';
import { config } from '../config';
import {
  AbuseSignal,
  AbuseSignalType
} from '../types';

interface AbuseScore {
  score: number;
  signals: AbuseSignal[];
  isBlocked: boolean;
  confidence: number;
}

interface PatternDetectionResult {
  patternType: string;
  confidence: number;
  details: Record<string, any>;
}

export class AbuseScoringService {
  async calculateAbuseScore(params: {
    contactId?: string;
    email?: string;
    phone?: string;
    content?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<AbuseScore> {
    const signals: AbuseSignal[] = [];

    if (params.email) {
      const emailSignals = await this.analyzeEmail(params.email);
      signals.push(...emailSignals);
    }

    if (params.phone) {
      const phoneSignals = await this.analyzePhone(params.phone);
      signals.push(...phoneSignals);
    }

    if (params.content) {
      const contentSignals = this.analyzeContent(params.content);
      signals.push(...contentSignals);
    }

    if (params.metadata) {
      const metadataSignals = this.analyzeMetadata(params.metadata);
      signals.push(...metadataSignals);
    }

    const totalScore = signals.reduce((sum, s) => sum + (s.severity * s.confidence), 0);
    const maxPossibleScore = signals.length * 100;
    const score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    const avgConfidence = signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0;

    const isBlocked = score >= config.compliance.abuseScoreBlockThreshold;

    for (const signal of signals) {
      await this.recordSignal(signal);
    }

    if (isBlocked && signals.length > 0) {
      await eventService.publish(ComplianceEvents.ABUSE_SIGNAL_DETECTED, {
        contactId: params.contactId,
        email: params.email,
        phone: params.phone,
        score,
        signals: signals.map(s => ({ type: s.type, severity: s.severity })),
        timestamp: new Date()
      });
    }

    return {
      score,
      signals,
      isBlocked,
      confidence: Math.round(avgConfidence)
    };
  }

  async recordSignal(signal: Omit<AbuseSignal, 'id' | 'createdAt' | 'updatedAt'>): Promise<AbuseSignal> {
    const id = uuidv4();

    const query = `
      INSERT INTO compliance.abuse_signals (
        id, contact_id, email, phone, type, severity, confidence,
        details, metadata, resolved_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      signal.contactId || null,
      signal.email || null,
      signal.phone || null,
      signal.type,
      signal.severity,
      signal.confidence,
      JSON.stringify(signal.details || {}),
      JSON.stringify(signal.metadata || {}),
      signal.resolvedAt || null
    ]);

    return this.mapToAbuseSignal(result.rows[0]);
  }

  async getSignalsByContact(contactId: string): Promise<AbuseSignal[]> {
    const query = `
      SELECT * FROM compliance.abuse_signals
      WHERE contact_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [contactId]);

    return result.rows.map(this.mapToAbuseSignal);
  }

  async resolveSignal(signalId: string): Promise<AbuseSignal> {
    const now = new Date();

    const query = `
      UPDATE compliance.abuse_signals
      SET resolved_at = $2,
          metadata = metadata || $3,
          updated_at = $2
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      signalId,
      now,
      JSON.stringify({ resolved: true })
    ]);

    if (result.rows.length === 0) {
      throw new Error('Signal not found');
    }

    return this.mapToAbuseSignal(result.rows[0]);
  }

  async detectPatterns(data: {
    emails?: string[];
    phones?: string[];
    contentSamples?: Record<string, any>[];
  }): Promise<PatternDetectionResult[]> {
    const results: PatternDetectionResult[] = [];

    if (data.emails && data.emails.length > 1) {
      const domainPatterns = this.detectDomainPatterns(data.emails);
      results.push(...domainPatterns);
    }

    if (data.phones && data.phones.length > 1) {
      const numberPatterns = this.detectNumberPatterns(data.phones);
      results.push(...numberPatterns);
    }

    if (data.contentSamples && data.contentSamples.length > 1) {
      const contentPatterns = this.detectContentPatterns(data.contentSamples);
      results.push(...contentPatterns);
    }

    return results;
  }

  private async analyzeEmail(email: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    const emailLower = email.toLowerCase();

    const disposableDomains = [
      'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
      '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trash-mail.com'
    ];

    const domain = emailLower.split('@')[1];
    if (domain && disposableDomains.some(d => domain.includes(d))) {
      signals.push({
        id: '',
        contactId: undefined,
        email,
        phone: undefined,
        type: AbuseSignalType.DISPOSABLE_EMAIL,
        severity: 70,
        confidence: 90,
        details: { domain },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (this.looksLikeSpamTrap(emailLower)) {
      signals.push({
        id: '',
        contactId: undefined,
        email,
        phone: undefined,
        type: AbuseSignalType.SPAM_TRAP,
        severity: 90,
        confidence: 75,
        details: { reason: 'spam_trap_pattern' },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (this.looksLikeHoneypot(emailLower)) {
      signals.push({
        id: '',
        contactId: undefined,
        email,
        phone: undefined,
        type: AbuseSignalType.HONEYPOT,
        severity: 95,
        confidence: 80,
        details: { reason: 'honeypot_pattern' },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return signals;
  }

  private async analyzePhone(phone: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];

    const cleaned = phone.replace(/\D/g, '');

    if (/^1{10,}$/.test(cleaned)) {
      signals.push({
        id: '',
        contactId: undefined,
        email: undefined,
        phone,
        type: AbuseSignalType.BOT_BEHAVIOR,
        severity: 80,
        confidence: 70,
        details: { reason: 'repetitive_digits' },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return signals;
  }

  private analyzeContent(content: Record<string, any>): AbuseSignal[] {
    const signals: AbuseSignal[] = [];
    const contentStr = JSON.stringify(content).toLowerCase();

    const suspiciousPhrases = [
      'act now', 'limited time only', 'click here now', 'free money',
      'no obligation', 'risk free', 'guaranteed approval', 'credit card required',
      'congratulations winner', 'you have won'
    ];

    for (const phrase of suspiciousPhrases) {
      if (contentStr.includes(phrase)) {
        signals.push({
          id: '',
          contactId: undefined,
          email: undefined,
          phone: undefined,
          type: AbuseSignalType.SUSPICIOUS_PATTERN,
          severity: 40,
          confidence: 60,
          details: { phrase, matched: phrase },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    const urlPatterns = contentStr.match(/https?:\/\/[^\s]+/g) || [];
    const suspiciousTlds = ['.xyz', '.top', '.click', '.link', '.work'];
    for (const url of urlPatterns) {
      if (suspiciousTlds.some(tld => url.includes(tld))) {
        signals.push({
          id: '',
          contactId: undefined,
          email: undefined,
          phone: undefined,
          type: AbuseSignalType.FRAUD_INDICATOR,
          severity: 50,
          confidence: 65,
          details: { url, reason: 'suspicious_tld' },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        break;
      }
    }

    return signals;
  }

  private analyzeMetadata(metadata: Record<string, any>): AbuseSignal[] {
    const signals: AbuseSignal[] = [];

    if (metadata.userAgent && this.isSuspiciousUserAgent(metadata.userAgent)) {
      signals.push({
        id: '',
        contactId: undefined,
        email: undefined,
        phone: undefined,
        type: AbuseSignalType.BOT_BEHAVIOR,
        severity: 60,
        confidence: 70,
        details: { userAgent: metadata.userAgent },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (metadata.fingerprint && this.isSuspiciousFingerprint(metadata.fingerprint)) {
      signals.push({
        id: '',
        contactId: undefined,
        email: undefined,
        phone: undefined,
        type: AbuseSignalType.BOT_BEHAVIOR,
        severity: 75,
        confidence: 80,
        details: { fingerprint: metadata.fingerprint },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return signals;
  }

  private looksLikeSpamTrap(email: string): boolean {
    const spamTrapPatterns = [
      /^info@/,
      /^admin@/,
      /^support@/,
      /^sales@/,
      /^test@/
    ];

    return spamTrapPatterns.some(pattern => pattern.test(email));
  }

  private looksLikeHoneypot(email: string): boolean {
    const randomPatterns = [
      /^[a-z]{20,}@/,
      /^[0-9]{10,}@/
    ];

    return randomPatterns.some(pattern => pattern.test(email));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const knownBots = ['bot', 'crawler', 'spider', 'curl', 'wget', 'python-requests'];
    const uaLower = userAgent.toLowerCase();

    return knownBots.some(bot => uaLower.includes(bot));
  }

  private isSuspiciousFingerprint(fingerprint: string): boolean {
    if (fingerprint.length < 10) return true;

    const suspiciousValues = ['undefined', 'null', 'NaN'];
    return suspiciousValues.includes(fingerprint);
  }

  private detectDomainPatterns(emails: string[]): PatternDetectionResult[] {
    const domains = emails.map(e => e.split('@')[1]).filter(Boolean);
    const domainCounts = domains.reduce((acc, d) => {
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const results: PatternDetectionResult[] = [];

    for (const [domain, count] of Object.entries(domainCounts)) {
      if (count >= emails.length * 0.5 && emails.length > 2) {
        results.push({
          patternType: 'mass_registration',
          confidence: 80,
          details: { domain, count, total: emails.length }
        });
      }
    }

    return results;
  }

  private detectNumberPatterns(phones: string[]): PatternDetectionResult[] {
    const cleaned = phones.map(p => p.replace(/\D/g, ''));
    const results: PatternDetectionResult[] = [];

    const allSame = cleaned.every(p => p === cleaned[0]);
    if (allSame && cleaned.length > 1) {
      results.push({
        patternType: 'duplicate_numbers',
        confidence: 95,
        details: { number: cleaned[0], count: cleaned.length }
      });
    }

    const prefixes = cleaned.map(p => p.substring(0, 3));
    const allSamePrefix = prefixes.every(p => p === prefixes[0]);
    if (allSamePrefix && cleaned.length > 5) {
      results.push({
        patternType: 'sequential_registration',
        confidence: 70,
        details: { prefix: prefixes[0], count: cleaned.length }
      });
    }

    return results;
  }

  private detectContentPatterns(samples: Record<string, any>[]): PatternDetectionResult[] {
    const results: PatternDetectionResult[] = [];

    const urlSets = samples.map(s => {
      const contentStr = JSON.stringify(s).toLowerCase();
      const urls = contentStr.match(/https?:\/\/[^\s]+/g) || [];
      return new Set(urls);
    });

    const intersection = urlSets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    });

    if (intersection.size > 0 && samples.length > 2) {
      results.push({
        patternType: 'shared_urls',
        confidence: 85,
        details: { sharedUrls: Array.from(intersection), count: samples.length }
      });
    }

    return results;
  }

  private mapToAbuseSignal(row: any): AbuseSignal {
    return {
      id: row.id,
      contactId: row.contact_id,
      email: row.email,
      phone: row.phone,
      type: row.type as AbuseSignalType,
      severity: row.severity,
      confidence: row.confidence,
      details: JSON.parse(row.details || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const abuseScoringService = new AbuseScoringService();
