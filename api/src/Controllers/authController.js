/**
 * Authentication Controller
 * 
 * @version 1.0.2
 * Security fixes applied
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const userModel = require('../Models/user');

// CRITICAL FIX: Removed hardcoded fallback - fail if not set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: JWT_SECRET environment variable is required in production');
        process.exit(1);
    }
    console.warn('WARNING: JWT_SECRET not set - using generated secret (dev only)');
}

const JWT_EXPIRY = '24h';

class AuthController {
    
    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { username, password } = req.body;
            
            const user = await userModel.findByUsername(username);
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const passwordValid = await bcrypt.compare(password, user.password);
            
            if (!passwordValid) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // CRITICAL FIX: Use proper secret from env
            const secret = JWT_SECRET || this._generateDevSecret();
            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    roles: user.roles,
                },
                secret,
                { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }
            );
            
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles,
                },
            });
            
        } catch (error) {
            console.error('Login error: [REDACTED]');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            const { username, email, password } = req.body;
            
            // CRITICAL FIX: Strong password validation
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ 
                    error: 'Password must be at least 12 characters with uppercase, lowercase, number and special character' 
                });
            }
            
            const existingUser = await userModel.findByUsername(username);
            if (existingUser) {
                return res.status(409).json({ error: 'Username already taken' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const user = await userModel.create({
                username,
                email,
                password: hashedPassword,
                roles: ['subscriber'],
            });
            
            // CRITICAL FIX: Use proper secret from env
            const secret = JWT_SECRET || this._generateDevSecret();
            const token = jwt.sign(
                { userId: user.id, username: user.username, roles: user.roles },
                secret,
                { expiresIn: JWT_EXPIRY, algorithm: 'HS256' }
            );
            
            res.status(201).json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles,
                },
            });
            
        } catch (error) {
            console.error('Registration error: [REDACTED]');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    logout(req, res) {
        res.json({ message: 'Logged out successfully' });
    }
    
    async me(req, res) {
        try {
            const user = req.user;
            const fullUser = await userModel.findById(user.userId);
            
            if (!fullUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({
                id: fullUser.id,
                username: fullUser.username,
                email: fullUser.email,
                roles: fullUser.roles || [],
                status: fullUser.status,
                wallet_address: fullUser.wallet_address ?? null,
                kyc_verified: fullUser.kyc_verified ?? false,
            });
            
        } catch (error) {
            console.error('Me error: [REDACTED]');
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update the authenticated user's profile (self-service).
     */
    async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const userId = req.user.userId;
            const { email, wallet_address, username } = req.body;

            if (username !== undefined) {
                const existing = await userModel.findByUsername(username);
                if (existing && existing.id !== userId) {
                    return res.status(409).json({ error: 'Username already taken' });
                }
            }
            if (email !== undefined) {
                const existing = await userModel.findByEmail(email);
                if (existing && existing.id !== userId) {
                    return res.status(409).json({ error: 'Email already in use' });
                }
            }

            const toNull = (v) => (v === undefined ? null : v);
            const updated = await userModel.update(userId, {
                username: toNull(username),
                email: toNull(email),
                roles: null,
                wallet_address: toNull(wallet_address),
                kyc_verified: null,
                status: null,
            });

            if (!updated) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: updated.id,
                username: updated.username,
                email: updated.email,
                roles: updated.roles || [],
                status: updated.status,
                wallet_address: updated.wallet_address ?? null,
                kyc_verified: updated.kyc_verified ?? false,
            });
        } catch (error) {
            console.error('updateProfile error: [REDACTED]');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new AuthController();
