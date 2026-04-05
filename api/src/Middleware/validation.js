/**
 * Validation Middleware
 * 
 * @version 1.0.0
 * Comprehensive request validation using Joi for schema validation
 */

const Joi = require('joi');

/**
 * Schema validation middleware factory
 * @param {Object} schema - Joi schema object with optional body, query, params
 * @returns {Function} Express middleware
 */
function validateRequest(schema) {
    return async (req, res, next) => {
        const validationOptions = {
            abortEarly: false, // Return all errors
            allowUnknown: true, // Allow unknown fields (will be stripped)
            stripUnknown: true, // Remove unknown fields
        };

        try {
            // Validate body
            if (schema.body) {
                req.body = await schema.body.validateAsync(req.body, validationOptions);
            }

            // Validate query parameters
            if (schema.query) {
                req.query = await schema.query.validateAsync(req.query, validationOptions);
            }

            // Validate URL parameters
            if (schema.params) {
                req.params = await schema.params.validateAsync(req.params, validationOptions);
            }

            // Validate headers
            if (schema.headers) {
                req.headers = await schema.headers.validateAsync(req.headers, validationOptions);
            }

            next();
        } catch (error) {
            if (error.isJoi) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message,
                        type: detail.type,
                    })),
                });
            }
            next(error);
        }
    };
}

/**
 * Common validation schemas
 */
const schemas = {
    // User schemas
    user: {
        create: Joi.object({
            username: Joi.string()
                .alphanum()
                .min(3)
                .max(50)
                .required()
                .messages({
                    'string.alphanum': 'Username must contain only alphanumeric characters',
                    'string.min': 'Username must be at least 3 characters',
                    'string.max': 'Username cannot exceed 50 characters',
                }),
            email: Joi.string()
                .email()
                .required()
                .messages({
                    'string.email': 'Must be a valid email address',
                }),
            password: Joi.string()
                .min(12)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .required()
                .messages({
                    'string.min': 'Password must be at least 12 characters',
                    'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
                }),
            tenant_id: Joi.string()
                .uuid()
                .required(),
        }),
        
        update: Joi.object({
            username: Joi.string()
                .alphanum()
                .min(3)
                .max(50),
            email: Joi.string()
                .email(),
            bio: Joi.string()
                .max(500),
            avatar_url: Joi.string()
                .uri(),
        }),
    },

    // Agent schemas
    agent: {
        create: Joi.object({
            name: Joi.string()
                .min(3)
                .max(100)
                .required(),
            description: Joi.string()
                .min(20)
                .max(1000)
                .required(),
            type: Joi.string()
                .valid('task_executor', 'data_analyzer', 'content_creator', 'custom')
                .required(),
            scopes: Joi.array()
                .items(Joi.string().valid(
                    'read:tasks',
                    'write:tasks',
                    'read:data',
                    'write:data',
                    'spend:treasury',
                    'read:users'
                ))
                .min(1)
                .required(),
            config: Joi.object()
                .pattern(Joi.string(), Joi.any()),
            tenant_id: Joi.string()
                .uuid()
                .required(),
        }),

        update: Joi.object({
            name: Joi.string()
                .min(3)
                .max(100),
            description: Joi.string()
                .min(20)
                .max(1000),
            scopes: Joi.array()
                .items(Joi.string()),
            config: Joi.object()
                .pattern(Joi.string(), Joi.any()),
            status: Joi.string()
                .valid('active', 'suspended', 'disabled'),
        }),
    },

    // Task schemas
    task: {
        create: Joi.object({
            title: Joi.string()
                .min(10)
                .max(200)
                .required(),
            description: Joi.string()
                .min(50)
                .max(5000)
                .required(),
            reward: Joi.number()
                .positive()
                .precision(2)
                .required(),
            deadline: Joi.date()
                .iso()
                .greater('now')
                .required(),
            required_skills: Joi.array()
                .items(Joi.string()),
            required_reputation: Joi.number()
                .min(0)
                .max(1000),
            tenant_id: Joi.string()
                .uuid()
                .required(),
        }),

        claim: Joi.object({
            task_id: Joi.string()
                .uuid()
                .required(),
            notes: Joi.string()
                .max(1000),
        }),

        submit: Joi.object({
            task_id: Joi.string()
                .uuid()
                .required(),
            submission_url: Joi.string()
                .uri(),
            notes: Joi.string()
                .min(20)
                .max(2000)
                .required(),
            attachments: Joi.array()
                .items(Joi.string().uri()),
        }),
    },

    // Treasury schemas
    treasury: {
        withdraw: Joi.object({
            amount: Joi.number()
                .positive()
                .precision(2)
                .max(1000000)
                .required(),
            destination: Joi.string()
                .pattern(/^0x[a-fA-F0-9]{40}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid Ethereum address',
                }),
            reason: Joi.string()
                .min(10)
                .max(500),
        }),

        allocate: Joi.object({
            allocations: Joi.array()
                .items(Joi.object({
                    strategy: Joi.string()
                        .valid('conservative', 'moderate', 'aggressive', 'custom')
                        .required(),
                    percentage: Joi.number()
                        .min(0)
                        .max(100)
                        .required(),
                    risk_level: Joi.string()
                        .valid('low', 'medium', 'high'),
                }))
                .min(1)
                .required()
                .custom((value, helpers) => {
                    const sum = value.reduce((acc, alloc) => acc + alloc.percentage, 0);
                    if (Math.abs(sum - 100) > 0.01) {
                        return helpers.error('any.invalid', { message: 'Allocations must sum to 100%' });
                    }
                    return value;
                }),
            risk_acknowledged: Joi.boolean(),
        }),
    },

    // Governance schemas
    governance: {
        createProposal: Joi.object({
            title: Joi.string()
                .min(10)
                .max(200)
                .required(),
            description: Joi.string()
                .min(100)
                .max(10000)
                .required(),
            actions: Joi.array()
                .items(Joi.object({
                    type: Joi.string()
                        .valid('treasury_spend', 'parameter_change', 'contract_upgrade', 'custom')
                        .required(),
                    target: Joi.string()
                        .required(),
                    data: Joi.object()
                        .required(),
                }))
                .min(1)
                .required(),
            tenant_id: Joi.string()
                .uuid()
                .required(),
        }),

        vote: Joi.object({
            proposal_id: Joi.string()
                .uuid()
                .required(),
            vote: Joi.string()
                .valid('for', 'against', 'abstain')
                .required(),
            reason: Joi.string()
                .max(1000),
        }),
    },

    // Pagination schema
    pagination: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20),
        sort: Joi.string()
            .pattern(/^[a-zA-Z_]+:(asc|desc)$/),
    }),

    // UUID param
    uuidParam: Joi.object({
        id: Joi.string()
            .uuid()
            .required(),
    }),

    // Tenant ID param
    tenantParam: Joi.object({
        tenant_id: Joi.string()
            .uuid()
            .required(),
    }),
};

/**
 * Type validators
 */
const validators = {
    // Ethereum address
    ethereumAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .messages({
            'string.pattern.base': 'Invalid Ethereum address',
        }),

    // Bitcoin address
    bitcoinAddress: Joi.string()
        .pattern(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/)
        .messages({
            'string.pattern.base': 'Invalid Bitcoin address',
        }),

    // IPFS hash
    ipfsHash: Joi.string()
        .pattern(/^Qm[1-9A-HJ-NP-Za-km-z]{44,}|^b[A-Za-z2-7]{58,}|^[Bb][A-Za-z2-7]{58,}|^f[0-9a-f]{50,}/)
        .messages({
            'string.pattern.base': 'Invalid IPFS hash',
        }),

    // ISO date
    isoDate: Joi.date()
        .iso(),

    // URL
    url: Joi.string()
        .uri(),

    // JSON string
    jsonString: Joi.string()
        .custom((value, helpers) => {
            try {
                JSON.parse(value);
                return value;
            } catch (error) {
                return helpers.error('any.invalid');
            }
        })
        .messages({
            'any.invalid': 'Must be valid JSON string',
        }),

    // Amount (crypto)
    cryptoAmount: Joi.number()
        .positive()
        .precision(18)
        .max(1e24),

    // Amount (fiat)
    fiatAmount: Joi.number()
        .positive()
        .precision(2)
        .max(1e12),
};

/**
 * Sanitization functions
 */
const sanitize = {
    // Remove HTML tags
    stripHtml: (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/<[^>]*>/g, '');
    },

    // Remove script tags and event handlers
    xss: (value) => {
        if (typeof value !== 'string') return value;
        return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    },

    // SQL injection prevention (basic)
    sqlInjection: (value) => {
        if (typeof value !== 'string') return value;
        return value
            .replace(/('|(--)|;|\/\*|\*\/|xp_|sp_)/gi, '')
            .trim();
    },

    // Trim and normalize whitespace
    normalizeWhitespace: (value) => {
        if (typeof value !== 'string') return value;
        return value.replace(/\s+/g, ' ').trim();
    },
};

module.exports = {
    validateRequest,
    schemas,
    validators,
    sanitize,
};
