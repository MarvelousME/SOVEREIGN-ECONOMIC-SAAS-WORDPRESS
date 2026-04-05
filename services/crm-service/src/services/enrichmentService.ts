import { db } from '../models/database';
import { Lead, Account } from '../types';

interface EnrichmentResult {
  success: boolean;
  data?: Partial<Lead> | Partial<Account>;
  error?: string;
}

interface CompanyInfo {
  name?: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  phone?: string;
  linkedinUrl?: string;
}

export class EnrichmentService {
  async enrichLeadFromEmail(tenantId: string, leadId: string, email: string): Promise<EnrichmentResult> {
    try {
      const domain = email.split('@')[1];
      if (!domain) {
        return { success: false, error: 'Invalid email format' };
      }

      const companyInfo = await this.lookupCompany(domain);
      if (!companyInfo) {
        return { success: false, error: 'Company information not found' };
      }

      const updates: Partial<Lead> = {};
      
      if (companyInfo.industry) {
        updates.customFields = { ...updates.customFields, enrichedIndustry: companyInfo.industry };
      }
      if (companyInfo.employeeCount) {
        updates.customFields = { ...updates.customFields, enrichedEmployeeCount: companyInfo.employeeCount };
      }
      if (companyInfo.phone) {
        updates.phone = companyInfo.phone;
      }

      await db.execute(
        `UPDATE leads SET custom_fields = $1, phone = COALESCE(phone, $2) WHERE id = $3 AND tenant_id = $4`,
        [JSON.stringify(updates.customFields || {}), updates.phone || null, leadId, tenantId]
      );

      return { success: true, data: updates };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' };
    }
  }

  async enrichLeadFromCompany(tenantId: string, leadId: string, companyName: string): Promise<EnrichmentResult> {
    try {
      const companyInfo = await this.lookupCompany(companyName);
      if (!companyInfo) {
        return { success: false, error: 'Company information not found' };
      }

      const updates: Partial<Lead> = {};

      if (companyInfo.industry) {
        updates.company = companyInfo.name;
        updates.customFields = {
          ...updates.customFields,
          enrichedIndustry: companyInfo.industry,
          enrichedEmployeeCount: companyInfo.employeeCount,
          enrichedRevenue: companyInfo.annualRevenue,
        };
      }

      await db.execute(
        `UPDATE leads SET company = COALESCE(company, $1), custom_fields = $2 WHERE id = $3 AND tenant_id = $4`,
        [updates.company || null, JSON.stringify(updates.customFields || {}), leadId, tenantId]
      );

      return { success: true, data: updates };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' };
    }
  }

  async enrichAccountFromDomain(tenantId: string, accountId: string, domain: string): Promise<EnrichmentResult> {
    try {
      const companyInfo = await this.lookupCompany(domain);
      if (!companyInfo) {
        return { success: false, error: 'Company information not found' };
      }

      const updates: Partial<Account> = {};

      if (companyInfo.industry) updates.industry = companyInfo.industry;
      if (companyInfo.employeeCount) updates.employeeCount = companyInfo.employeeCount;
      if (companyInfo.annualRevenue) updates.annualRevenue = companyInfo.annualRevenue;
      if (companyInfo.phone) updates.phone = companyInfo.phone;
      if (companyInfo.linkedinUrl) updates.linkedInUrl = companyInfo.linkedinUrl;
      if (companyInfo.address) updates.address = companyInfo.address;

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.industry) {
        setClauses.push(`industry = $${paramIndex++}`);
        values.push(updates.industry);
      }
      if (updates.employeeCount) {
        setClauses.push(`employee_count = $${paramIndex++}`);
        values.push(updates.employeeCount);
      }
      if (updates.annualRevenue) {
        setClauses.push(`annual_revenue = $${paramIndex++}`);
        values.push(updates.annualRevenue);
      }
      if (updates.phone) {
        setClauses.push(`phone = $${paramIndex++}`);
        values.push(updates.phone);
      }
      if (updates.linkedInUrl) {
        setClauses.push(`linkedin_url = $${paramIndex++}`);
        values.push(updates.linkedInUrl);
      }

      if (setClauses.length > 0) {
        values.push(accountId, tenantId);
        await db.execute(
          `UPDATE accounts SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}`,
          values
        );
      }

      return { success: true, data: updates };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' };
    }
  }

  private async lookupCompany(query: string): Promise<CompanyInfo | null> {
    const domain = query.includes('@') ? query.split('@')[1] : query;
    
    const knownCompanies: Record<string, CompanyInfo> = {
      'google.com': {
        name: 'Google',
        domain: 'google.com',
        industry: 'Technology',
        employeeCount: 150000,
        annualRevenue: 280000000000,
        phone: '+1-650-253-0000',
        linkedinUrl: 'https://linkedin.com/company/google',
      },
      'microsoft.com': {
        name: 'Microsoft',
        domain: 'microsoft.com',
        industry: 'Technology',
        employeeCount: 180000,
        annualRevenue: 198000000000,
        phone: '+1-425-882-8080',
        linkedinUrl: 'https://linkedin.com/company/microsoft',
      },
      'apple.com': {
        name: 'Apple',
        domain: 'apple.com',
        industry: 'Technology',
        employeeCount: 150000,
        annualRevenue: 380000000000,
        phone: '+1-408-996-1010',
        linkedinUrl: 'https://linkedin.com/company/apple',
      },
      'amazon.com': {
        name: 'Amazon',
        domain: 'amazon.com',
        industry: 'E-commerce',
        employeeCount: 1500000,
        annualRevenue: 580000000000,
        phone: '+1-206-266-1000',
        linkedinUrl: 'https://linkedin.com/company/amazon',
      },
    };

    const normalizedDomain = domain.toLowerCase().replace('www.', '');
    return knownCompanies[normalizedDomain] || this.generateMockCompanyData(normalizedDomain);
  }

  private generateMockCompanyData(domain: string): CompanyInfo | null {
    if (!domain || !domain.includes('.')) return null;

    const parts = domain.split('.')[0];
    const tld = domain.split('.')[1];

    if (tld === 'com' || tld === 'io' || tld === 'co') {
      return {
        name: parts.charAt(0).toUpperCase() + parts.slice(1),
        domain: domain,
        industry: 'Technology',
        employeeCount: Math.floor(Math.random() * 500) + 10,
        annualRevenue: Math.floor(Math.random() * 100000000) + 1000000,
      };
    }

    return null;
  }

  async getSocialProfile(tenantId: string, leadId: string): Promise<{ linkedin?: string; twitter?: string }> {
    const result: { linkedin?: string; twitter?: string } = {};

    const lead = await db.queryOne<{ company: string | null; first_name: string | null; last_name: string | null }>(
      'SELECT company, first_name, last_name FROM leads WHERE id = $1 AND tenant_id = $2',
      [leadId, tenantId]
    );

    if (lead?.company) {
      result.linkedin = `https://linkedin.com/company/${lead.company.toLowerCase().replace(/\s+/g, '-')}`;
    }

    if (lead?.first_name && lead?.last_name) {
      result.twitter = `https://twitter.com/${lead.first_name.toLowerCase()}_${lead.last_name.toLowerCase()}`;
    }

    return result;
  }

  async batchEnrichLeads(tenantId: string, leadIds: string[]): Promise<{ enriched: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let enriched = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        const lead = await db.queryOne<{ email: string }>(
          'SELECT email FROM leads WHERE id = $1 AND tenant_id = $2',
          [leadId, tenantId]
        );

        if (lead?.email) {
          const result = await this.enrichLeadFromEmail(tenantId, leadId, lead.email);
          if (result.success) enriched++;
          else {
            failed++;
            errors.push(`Lead ${leadId}: ${result.error}`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`Lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { enriched, failed, errors };
  }
}

export const enrichmentService = new EnrichmentService();
