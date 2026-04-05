/**
 * Authentication Middleware
 * 
 * @version 1.0.2
 * Security fixes applied
 */

const jwt = require('jsonwebtoken');

// CRITICAL FIX: Removed hardcoded fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET required in production');
    process.exit(1);
}

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const secret = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
    
    try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    const token = authHeader.substring(7);
    const secret = JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
    
    try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        req.user = decoded;
    } catch (error) {
        // Ignore invalid token for optional auth
    }
    
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
}

module.exports = {
    authenticate,
    optionalAuth,
    requireRole,
};
