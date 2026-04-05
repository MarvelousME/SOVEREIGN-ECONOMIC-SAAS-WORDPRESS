/**
 * OPA Client Library
 * 
 * @module @ubi-cms/opa-client
 * @description TypeScript client for Open Policy Agent with caching and fallback
 */

import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'lru-cache';

/**
 * OPA Decision Input
 */
export interface OPAInput {
    subject?: {
        id?: string;
        tenant_id?: string;
        roles?: string[];
        type?: string;
        [key: string]: any;
    };
    resource?: {
        id?: string;
        tenant_id?: string;
        type?: string;
        [key: string]: any;
    };
    action?: string;
    resource_type?: string;
    method?: string;
    path?: string[];
    headers?: Record<string, string>;
    query?: Record<string, any>;
    [key: string]: any;
}

/**
 * OPA Decision Result
 */
export interface OPADecision {
    result: {
        allow: boolean;
        violations?: string[];
        decision_metadata?: Record<string, any>;
        [key: string]: any;
    };
}

/**
 * OPA Client Options
 */
export interface OPAClientOptions {
    url: string;
    timeout?: number;
    cache?: boolean;
    cacheTTL?: number;
    cacheMaxSize?: number;
    fallbackAllow?: boolean;
    headers?: Record<string, string>;
}

/**
 * Policy Query Options
 */
export interface PolicyQueryOptions {
    policy: string;
    input: OPAInput;
    useCache?: boolean;
}

/**
 * OPA Client
 */
export class OPAClient {
    private client: AxiosInstance;
    private cache?: LRUCache<string, OPADecision>;
    private options: Required<Omit<OPAClientOptions, 'headers'>> & { headers?: Record<string, string> };

    constructor(options: OPAClientOptions) {
        this.options = {
            url: options.url,
            timeout: options.timeout || 5000,
            cache: options.cache !== false,
            cacheTTL: options.cacheTTL || 60000, // 1 minute default
            cacheMaxSize: options.cacheMaxSize || 1000,
            fallbackAllow: options.fallbackAllow || false,
            headers: options.headers,
        };

        this.client = axios.create({
            baseURL: this.options.url,
            timeout: this.options.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...this.options.headers,
            },
        });

        if (this.options.cache) {
            this.cache = new LRUCache<string, OPADecision>({
                max: this.options.cacheMaxSize,
                ttl: this.options.cacheTTL,
            });
        }
    }

    /**
     * Query a policy
     */
    async query(options: PolicyQueryOptions): Promise<OPADecision> {
        const cacheKey = this.getCacheKey(options.policy, options.input);

        // Check cache
        if (options.useCache !== false && this.cache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }

        try {
            const response = await this.client.post<OPADecision>(
                `/v1/data/${options.policy}`,
                { input: options.input }
            );

            const decision = response.data;

            // Cache the result
            if (this.cache && options.useCache !== false) {
                this.cache.set(cacheKey, decision);
            }

            return decision;
        } catch (error) {
            console.error('OPA query failed:', error);
            return this.handleError(error);
        }
    }

    /**
     * Check if action is allowed
     */
    async isAllowed(policy: string, input: OPAInput): Promise<boolean> {
        const decision = await this.query({ policy, input });
        return decision.result.allow === true;
    }

    /**
     * Get policy violations
     */
    async getViolations(policy: string, input: OPAInput): Promise<string[]> {
        const decision = await this.query({ policy, input });
        return decision.result.violations || [];
    }

    /**
     * Batch query multiple policies
     */
    async batchQuery(queries: PolicyQueryOptions[]): Promise<OPADecision[]> {
        return Promise.all(queries.map(q => this.query(q)));
    }

    /**
     * Check tenant isolation
     */
    async checkTenantIsolation(input: OPAInput): Promise<boolean> {
        return this.isAllowed('tenant_isolation', input);
    }

    /**
     * Check RBAC permissions
     */
    async checkRBAC(input: OPAInput): Promise<boolean> {
        return this.isAllowed('rbac', input);
    }

    /**
     * Check treasury operation
     */
    async checkTreasury(action: string, input: OPAInput): Promise<boolean> {
        return this.isAllowed('treasury', { ...input, action });
    }

    /**
     * Check agent operation
     */
    async checkAgent(action: string, input: OPAInput): Promise<boolean> {
        return this.isAllowed('agents', { ...input, action });
    }

    /**
     * Check task operation
     */
    async checkTask(action: string, input: OPAInput): Promise<boolean> {
        return this.isAllowed('tasks', { ...input, action });
    }

    /**
     * Check governance operation
     */
    async checkGovernance(action: string, input: OPAInput): Promise<boolean> {
        return this.isAllowed('governance', { ...input, action });
    }

    /**
     * Check data access
     */
    async checkDataAccess(action: string, input: OPAInput): Promise<boolean> {
        return this.isAllowed('data_access', { ...input, action });
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache?.clear();
    }

    /**
     * Generate cache key
     */
    private getCacheKey(policy: string, input: OPAInput): string {
        return `${policy}:${JSON.stringify(input)}`;
    }

    /**
     * Handle OPA errors with fallback
     */
    private handleError(error: any): OPADecision {
        if (this.options.fallbackAllow) {
            console.warn('OPA unavailable, falling back to ALLOW');
            return {
                result: {
                    allow: true,
                    violations: ['OPA service unavailable - fallback allow'],
                },
            };
        } else {
            console.warn('OPA unavailable, falling back to DENY');
            return {
                result: {
                    allow: false,
                    violations: ['OPA service unavailable'],
                },
            };
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.client.get('/health');
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Create OPA middleware for Express
 */
export function createOPAMiddleware(client: OPAClient, policy: string) {
    return async (req: any, res: any, next: any) => {
        const input: OPAInput = {
            subject: {
                id: req.user?.id,
                tenant_id: req.user?.tenant_id,
                roles: req.user?.roles,
                type: 'user',
            },
            resource: {
                id: req.params?.id,
                tenant_id: req.headers['x-tenant-id'] || req.user?.tenant_id,
                type: req.params?.resource_type,
            },
            action: req.method.toLowerCase(),
            method: req.method,
            path: req.path.split('/').filter(Boolean),
            headers: req.headers,
            query: req.query,
        };

        try {
            const decision = await client.query({ policy, input });

            if (!decision.result.allow) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Policy decision denied access',
                    violations: decision.result.violations,
                });
            }

            // Attach decision metadata to request
            req.policyDecision = decision.result;
            next();
        } catch (error) {
            console.error('OPA middleware error:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: 'Policy evaluation failed',
            });
        }
    };
}

/**
 * Export default client instance
 */
let defaultClient: OPAClient | null = null;

export function initializeOPA(options: OPAClientOptions): OPAClient {
    defaultClient = new OPAClient(options);
    return defaultClient;
}

export function getOPAClient(): OPAClient {
    if (!defaultClient) {
        throw new Error('OPA client not initialized. Call initializeOPA() first.');
    }
    return defaultClient;
}

export default OPAClient;
