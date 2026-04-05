/**
 * OPA Testing Utilities
 * 
 * @module @ubi-cms/opa-client/testing
 * @description Testing utilities for OPA policies
 */

import { OPAClient, OPAInput, OPADecision } from './index';

/**
 * Mock OPA Client for testing
 */
export class MockOPAClient extends OPAClient {
    private mockDecisions: Map<string, OPADecision> = new Map();
    private queryLog: Array<{ policy: string; input: OPAInput }> = [];

    constructor() {
        super({
            url: 'http://mock-opa:8181',
            cache: false,
        });
    }

    /**
     * Mock a policy decision
     */
    mockDecision(policy: string, input: OPAInput, decision: OPADecision): void {
        const key = this.getCacheKey(policy, input);
        this.mockDecisions.set(key, decision);
    }

    /**
     * Mock allow decision
     */
    mockAllow(policy: string, input: OPAInput): void {
        this.mockDecision(policy, input, {
            result: { allow: true },
        });
    }

    /**
     * Mock deny decision
     */
    mockDeny(policy: string, input: OPAInput, violations: string[] = []): void {
        this.mockDecision(policy, input, {
            result: { allow: false, violations },
        });
    }

    /**
     * Override query method
     */
    async query(options: { policy: string; input: OPAInput }): Promise<OPADecision> {
        this.queryLog.push({ policy: options.policy, input: options.input });

        const key = this.getCacheKey(options.policy, options.input);
        const mockDecision = this.mockDecisions.get(key);

        if (mockDecision) {
            return mockDecision;
        }

        // Default to deny if no mock configured
        return {
            result: {
                allow: false,
                violations: ['No mock decision configured'],
            },
        };
    }

    /**
     * Get query log
     */
    getQueryLog(): Array<{ policy: string; input: OPAInput }> {
        return this.queryLog;
    }

    /**
     * Clear query log
     */
    clearQueryLog(): void {
        this.queryLog = [];
    }

    /**
     * Reset all mocks
     */
    reset(): void {
        this.mockDecisions.clear();
        this.queryLog = [];
    }

    /**
     * Generate cache key (expose for testing)
     */
    private getCacheKey(policy: string, input: OPAInput): string {
        return `${policy}:${JSON.stringify(input)}`;
    }
}

/**
 * Test case builder
 */
export class OPAPolicyTest {
    private testCases: Array<{
        name: string;
        policy: string;
        input: OPAInput;
        expectedAllow: boolean;
        expectedViolations?: string[];
    }> = [];

    /**
     * Add test case expecting allow
     */
    expectAllow(name: string, policy: string, input: OPAInput): this {
        this.testCases.push({
            name,
            policy,
            input,
            expectedAllow: true,
        });
        return this;
    }

    /**
     * Add test case expecting deny
     */
    expectDeny(name: string, policy: string, input: OPAInput, violations?: string[]): this {
        this.testCases.push({
            name,
            policy,
            input,
            expectedAllow: false,
            expectedViolations: violations,
        });
        return this;
    }

    /**
     * Run all test cases
     */
    async run(client: OPAClient): Promise<{
        passed: number;
        failed: number;
        results: Array<{ name: string; passed: boolean; error?: string }>;
    }> {
        const results: Array<{ name: string; passed: boolean; error?: string }> = [];
        let passed = 0;
        let failed = 0;

        for (const testCase of this.testCases) {
            try {
                const decision = await client.query({
                    policy: testCase.policy,
                    input: testCase.input,
                });

                const allowMatches = decision.result.allow === testCase.expectedAllow;
                
                let violationsMatch = true;
                if (testCase.expectedViolations) {
                    const actualViolations = decision.result.violations || [];
                    violationsMatch = testCase.expectedViolations.every(
                        v => actualViolations.includes(v)
                    );
                }

                if (allowMatches && violationsMatch) {
                    passed++;
                    results.push({ name: testCase.name, passed: true });
                } else {
                    failed++;
                    results.push({
                        name: testCase.name,
                        passed: false,
                        error: `Expected allow=${testCase.expectedAllow}, got allow=${decision.result.allow}`,
                    });
                }
            } catch (error) {
                failed++;
                results.push({
                    name: testCase.name,
                    passed: false,
                    error: (error as Error).message,
                });
            }
        }

        return { passed, failed, results };
    }

    /**
     * Export test cases as JSON
     */
    export(): string {
        return JSON.stringify(this.testCases, null, 2);
    }
}

/**
 * Policy test helpers
 */
export const testHelpers = {
    /**
     * Create user subject
     */
    createUser(overrides: Partial<OPAInput['subject']> = {}): OPAInput['subject'] {
        return {
            id: 'user-123',
            tenant_id: 'tenant-456',
            roles: ['user'],
            type: 'user',
            ...overrides,
        };
    },

    /**
     * Create admin subject
     */
    createAdmin(overrides: Partial<OPAInput['subject']> = {}): OPAInput['subject'] {
        return {
            id: 'admin-123',
            tenant_id: 'tenant-456',
            roles: ['admin', 'user'],
            type: 'user',
            ...overrides,
        };
    },

    /**
     * Create resource
     */
    createResource(overrides: Partial<OPAInput['resource']> = {}): OPAInput['resource'] {
        return {
            id: 'resource-789',
            tenant_id: 'tenant-456',
            type: 'data',
            ...overrides,
        };
    },

    /**
     * Create full input
     */
    createInput(
        subject?: Partial<OPAInput['subject']>,
        resource?: Partial<OPAInput['resource']>,
        action?: string
    ): OPAInput {
        return {
            subject: this.createUser(subject),
            resource: this.createResource(resource),
            action: action || 'read',
        };
    },
};

export default {
    MockOPAClient,
    OPAPolicyTest,
    testHelpers,
};
