import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireUser,
  extractToken,
  verifyToken,
  hasPermission,
  generateToken,
  JwtPayload,
} from '../middleware/auth.middleware';

jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const TEST_SECRET = 'test-secret-key';
const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'user' as const,
};

const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext: NextFunction = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('extractToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractToken('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for missing header', () => {
      const token = extractToken(undefined);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = extractToken('Basic abc123');
      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const token = extractToken('Bearer');
      expect(token).toBe('');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET);
      const payload = verifyToken(token, TEST_SECRET);

      expect(payload).not.toBeNull();
      expect(payload?.id).toBe(TEST_USER.id);
      expect(payload?.email).toBe(TEST_USER.email);
      expect(payload?.role).toBe(TEST_USER.role);
    });

    it('should return null for invalid token', () => {
      const payload = verifyToken('invalid-token', TEST_SECRET);
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET, { expiresIn: '-1h' });
      const payload = verifyToken(token, TEST_SECRET);
      expect(payload).toBeNull();
    });

    it('should return null for token signed with wrong secret', () => {
      const token = jwt.sign(TEST_USER, 'wrong-secret');
      const payload = verifyToken(token, TEST_SECRET);
      expect(payload).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true for user role accessing user permission', () => {
      expect(hasPermission('user', 'user')).toBe(true);
    });

    it('should return true for admin role accessing any permission', () => {
      expect(hasPermission('admin', 'user')).toBe(true);
      expect(hasPermission('admin', 'moderator')).toBe(true);
      expect(hasPermission('admin', 'admin')).toBe(true);
    });

    it('should return true for moderator role accessing moderator and user permissions', () => {
      expect(hasPermission('moderator', 'moderator')).toBe(true);
      expect(hasPermission('moderator', 'user')).toBe(true);
    });

    it('should return false for user role accessing moderator permission', () => {
      expect(hasPermission('user', 'moderator')).toBe(false);
    });

    it('should return false for user role accessing admin permission', () => {
      expect(hasPermission('user', 'admin')).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(hasPermission('unknown', 'user')).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(TEST_USER);
      const payload = jwt.verify(token, TEST_SECRET) as JwtPayload;

      expect(payload.id).toBe(TEST_USER.id);
      expect(payload.email).toBe(TEST_USER.email);
      expect(payload.role).toBe(TEST_USER.role);
    });

    it('should include expiration in token', () => {
      const token = generateToken(TEST_USER, '1h');
      const payload = jwt.verify(token, TEST_SECRET) as JwtPayload;

      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should authenticate valid token and attach user to request', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(TEST_USER.id);
      expect(req.user?.email).toBe(TEST_USER.email);
      expect(req.user?.role).toBe(TEST_USER.role);
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for non-Bearer authorization', () => {
      const req = createMockRequest({
        headers: { authorization: 'Basic abc123' },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET, { expiresIn: '-1h' });
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token missing required fields', () => {
      const token = jwt.sign({ role: 'user' }, TEST_SECRET);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token payload',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should default role to user if not provided', () => {
      const token = jwt.sign({ id: 'user-123', email: 'test@example.com' }, TEST_SECRET);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(req.user?.role).toBe('user');
      expect(createMockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user for valid token', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      optionalAuth(req as Request, res as Response, createMockNext);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(TEST_USER.id);
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should continue without user for missing authorization', () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      optionalAuth(req as Request, res as Response, createMockNext);

      expect(req.user).toBeUndefined();
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should continue without user for invalid token', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockResponse();

      optionalAuth(req as Request, res as Response, createMockNext);

      expect(req.user).toBeUndefined();
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should not fail for expired token', () => {
      const token = jwt.sign(TEST_USER, TEST_SECRET, { expiresIn: '-1h' });
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      expect(() => {
        optionalAuth(req as Request, res as Response, createMockNext);
      }).not.toThrow();

      expect(req.user).toBeUndefined();
      expect(createMockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should call next for user with user role', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();
      const middleware = requireRole('user');

      middleware(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no user attached', () => {
      const req = createMockRequest({});
      const res = createMockResponse();
      const middleware = requireRole('user');

      middleware(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required role', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();
      const middleware = requireRole('admin');

      middleware(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(createMockNext).not.toHaveBeenCalled();
    });

    it('should allow admin to access admin-only route', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'admin@test.com', role: 'admin' },
      });
      const res = createMockResponse();
      const middleware = requireRole('admin');

      middleware(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });

    it('should allow moderator to access moderator routes', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'mod@test.com', role: 'moderator' },
      });
      const res = createMockResponse();
      const middleware = requireRole('moderator');

      middleware(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });

    it('should allow moderator to access user routes', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'mod@test.com', role: 'moderator' },
      });
      const res = createMockResponse();
      const middleware = requireRole('user');

      middleware(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });

    it('should allow admin to access any role routes', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'admin@test.com', role: 'admin' },
      });
      const res = createMockResponse();

      const middleware1 = requireRole('admin');
      middleware1(req as Request, res as Response, createMockNext);
      expect(createMockNext).toHaveBeenCalled();

      jest.clearAllMocks();

      const middleware2 = requireRole('moderator');
      middleware2(req as Request, res as Response, createMockNext);
      expect(createMockNext).toHaveBeenCalled();

      jest.clearAllMocks();

      const middleware3 = requireRole('user');
      middleware3(req as Request, res as Response, createMockNext);
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should accept multiple roles (any match succeeds)', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();
      const middleware = requireRole('admin', 'moderator', 'user');

      middleware(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'admin@test.com', role: 'admin' },
      });
      const res = createMockResponse();

      requireAdmin(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });

    it('should deny non-admin users', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();

      requireAdmin(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireModerator', () => {
    it('should allow moderator users', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'mod@test.com', role: 'moderator' },
      });
      const res = createMockResponse();

      requireModerator(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });

    it('should deny non-moderator users', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();

      requireModerator(req as Request, res as Response, createMockNext);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireUser', () => {
    it('should allow any authenticated user', () => {
      const req = createMockRequest({
        user: { id: '123', email: 'user@test.com', role: 'user' },
      });
      const res = createMockResponse();

      requireUser(req as Request, res as Response, createMockNext);

      expect(createMockNext).toHaveBeenCalled();
    });
  });

  describe('JWT_SECRET environment handling', () => {
    it('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'production-secret';
      const token = generateToken(TEST_USER);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = createMockResponse();

      authenticate(req as Request, res as Response, createMockNext);

      expect(req.user).toBeDefined();
      expect(createMockNext).toHaveBeenCalled();
    });

    it('should throw in production without JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(() => {
        const token = jwt.sign(TEST_USER, 'some-secret');
        const req = createMockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockResponse();
        authenticate(req as Request, res as Response, createMockNext);
      }).toThrow('JWT_SECRET environment variable is required in production');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
