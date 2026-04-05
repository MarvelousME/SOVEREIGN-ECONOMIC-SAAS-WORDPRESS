/**
 * Audit Logging Middleware
 * 
 * @version 1.0.0
 * Comprehensive audit logging for security, compliance, and debugging
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AuditLogger extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            logMutations: true,
            logQueries: false,
            logAuth: true,
            logSecurity: true,
            logPolicyDecisions: true,
            includeRequestBody: true,
            includeResponseBody: false,
            sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'privateKey'],
            ...options,
        };
        
        this.logs = [];
        this.maxLogs = 10000; // In-memory buffer
    }

    /**
     * Create audit log entry
     */
    createLog(type, data, req) {
        const logEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type,
            tenant_id: req.user?.tenant_id || req.headers['x-tenant-id'],
            user_id: req.user?.id,
            user_email: req.user?.email,
            session_id: req.session?.id,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.get('user-agent'),
            request: {
                method: req.method,
                path: req.path,
                query: this.sanitize(req.query),
                body: this.options.includeRequestBody ? this.sanitize(req.body) : undefined,
            },
            data: this.sanitize(data),
            hash: null, // For tamper-proofing
        };
        
        // Create hash for tamper detection
        logEntry.hash = this.createHash(logEntry);
        
        // Store in memory (limited)
        if (this.logs.length >= this.maxLogs) {
            this.logs.shift();
        }
        this.logs.push(logEntry);
        
        // Emit event for external storage
        this.emit('log', logEntry);
        
        return logEntry;
    }

    /**
     * Create tamper-proof hash
     */
    createHash(logEntry) {
        const data = {
            timestamp: logEntry.timestamp,
            type: logEntry.type,
            user_id: logEntry.user_id,
            data: logEntry.data,
        };
        
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * Sanitize sensitive data
     */
    sanitize(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const sanitized = Array.isArray(obj) ? [] : {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (this.options.sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitize(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Verify log integrity
     */
    verifyLog(logEntry) {
        const { hash, ...data } = logEntry;
        const expectedHash = this.createHash(data);
        return hash === expectedHash;
    }

    /**
     * Query logs
     */
    query(filters = {}) {
        return this.logs.filter(log => {
            for (const [key, value] of Object.entries(filters)) {
                if (log[key] !== value) return false;
            }
            return true;
        });
    }
}

// Global audit logger instance
const auditLogger = new AuditLogger();

/**
 * Middleware: Log all mutations
 */
function logMutations(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }
    
    const originalJson = res.json.bind(res);
    
    res.json = function (data) {
        auditLogger.createLog('mutation', {
            operation: req.method,
            resource: req.path,
            changes: req.body,
            result: auditLogger.options.includeResponseBody ? data : { status: 'success' },
        }, req);
        
        return originalJson(data);
    };
    
    next();
}

/**
 * Middleware: Log authentication events
 */
function logAuthentication(req, res, next) {
    const originalJson = res.json.bind(res);
    
    res.json = function (data) {
        const isAuthEndpoint = req.path.includes('/auth/');
        
        if (isAuthEndpoint) {
            auditLogger.createLog('authentication', {
                action: req.path.split('/').pop(),
                success: res.statusCode < 400,
                username: req.body?.username || req.body?.email,
                reason: data.error || data.message,
            }, req);
        }
        
        return originalJson(data);
    };
    
    next();
}

/**
 * Middleware: Log security events
 */
function logSecurityEvents(req, res, next) {
    // Log on security-related status codes
    res.on('finish', () => {
        if ([401, 403, 429].includes(res.statusCode)) {
            auditLogger.createLog('security', {
                status_code: res.statusCode,
                reason: getSecurityReason(res.statusCode),
                path: req.path,
            }, req);
        }
    });
    
    next();
}

function getSecurityReason(statusCode) {
    switch (statusCode) {
        case 401: return 'Unauthorized access attempt';
        case 403: return 'Forbidden resource access';
        case 429: return 'Rate limit exceeded';
        default: return 'Security event';
    }
}

/**
 * Middleware: Log OPA policy decisions
 */
function logPolicyDecision(action, resource, decision, reason) {
    return (req, res, next) => {
        auditLogger.createLog('policy_decision', {
            action,
            resource,
            decision,
            reason,
            context: {
                tenant_id: req.user?.tenant_id,
                user_roles: req.user?.roles,
            },
        }, req);
        
        next();
    };
}

/**
 * Manual logging functions
 */
const audit = {
    /**
     * Log data access
     */
    dataAccess: (req, resourceType, resourceId, action) => {
        auditLogger.createLog('data_access', {
            resource_type: resourceType,
            resource_id: resourceId,
            action,
        }, req);
    },

    /**
     * Log admin action
     */
    adminAction: (req, action, target, details) => {
        auditLogger.createLog('admin_action', {
            action,
            target,
            details,
        }, req);
    },

    /**
     * Log treasury operation
     */
    treasury: (req, operation, amount, details) => {
        auditLogger.createLog('treasury', {
            operation,
            amount,
            details,
        }, req);
    },

    /**
     * Log governance action
     */
    governance: (req, action, proposalId, details) => {
        auditLogger.createLog('governance', {
            action,
            proposal_id: proposalId,
            details,
        }, req);
    },

    /**
     * Log agent action
     */
    agent: (req, agentId, action, details) => {
        auditLogger.createLog('agent', {
            agent_id: agentId,
            action,
            details,
        }, req);
    },

    /**
     * Log task action
     */
    task: (req, taskId, action, details) => {
        auditLogger.createLog('task', {
            task_id: taskId,
            action,
            details,
        }, req);
    },

    /**
     * Log consent change
     */
    consent: (req, userId, action, consentType, details) => {
        auditLogger.createLog('consent', {
            user_id: userId,
            action,
            consent_type: consentType,
            details,
        }, req);
    },

    /**
     * Log export request
     */
    export: (req, dataType, format) => {
        auditLogger.createLog('export', {
            data_type: dataType,
            format,
        }, req);
    },
};

/**
 * Storage adapters
 */

// Console storage
auditLogger.on('log', (logEntry) => {
    console.log('[AUDIT]', JSON.stringify(logEntry));
});

// File storage (append-only)
const fs = require('fs');
const path = require('path');

function enableFileStorage(logDir = './logs/audit') {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    auditLogger.on('log', (logEntry) => {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(logDir, `audit-${date}.jsonl`);
        
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
    });
}

// Database storage (example)
function enableDatabaseStorage(db) {
    auditLogger.on('log', async (logEntry) => {
        try {
            await db.query(
                `INSERT INTO audit_logs 
                (id, timestamp, type, tenant_id, user_id, ip_address, request, data, hash) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    logEntry.id,
                    logEntry.timestamp,
                    logEntry.type,
                    logEntry.tenant_id,
                    logEntry.user_id,
                    logEntry.ip_address,
                    JSON.stringify(logEntry.request),
                    JSON.stringify(logEntry.data),
                    logEntry.hash,
                ]
            );
        } catch (error) {
            console.error('Failed to store audit log in database:', error);
        }
    });
}

/**
 * Audit log query API
 */
function createAuditQueryMiddleware() {
    return async (req, res) => {
        // Only audit admins can query logs
        if (!req.user?.roles?.includes('audit_admin')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const {
            type,
            user_id,
            tenant_id,
            start_date,
            end_date,
            page = 1,
            limit = 50,
        } = req.query;
        
        const filters = {};
        if (type) filters.type = type;
        if (user_id) filters.user_id = user_id;
        if (tenant_id) filters.tenant_id = tenant_id;
        
        let logs = auditLogger.query(filters);
        
        // Date filtering
        if (start_date) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(start_date));
        }
        if (end_date) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(end_date));
        }
        
        // Pagination
        const total = logs.length;
        const offset = (page - 1) * limit;
        logs = logs.slice(offset, offset + parseInt(limit));
        
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    };
}

module.exports = {
    auditLogger,
    logMutations,
    logAuthentication,
    logSecurityEvents,
    logPolicyDecision,
    audit,
    enableFileStorage,
    enableDatabaseStorage,
    createAuditQueryMiddleware,
};
