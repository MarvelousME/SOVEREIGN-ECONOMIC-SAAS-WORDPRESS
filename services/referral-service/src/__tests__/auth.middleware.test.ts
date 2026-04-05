import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should call next() when no authorization header is present', () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header format is invalid', () => {
    mockReq.headers = { authorization: 'InvalidFormat token123' };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    process.env.JWT_SECRET = 'test-secret';
    mockReq.headers = { authorization: 'Bearer invalid.token.here' };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should return 401 when token is expired', () => {
    process.env.JWT_SECRET = 'test-secret';
    const expiredToken = jwt.sign(
      { id: 'user-123', email: 'test@example.com', role: 'user' },
      'test-secret',
      { expiresIn: '-1s' }
    );
    mockReq.headers = { authorization: `Bearer ${expiredToken}` };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('should return 401 when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;
    const validToken = jwt.sign(
      { id: 'user-123', email: 'test@example.com', role: 'user' },
      'test-secret',
      { expiresIn: '1h' }
    );
    mockReq.headers = { authorization: `Bearer ${validToken}` };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('should attach user to request and call next() for valid token', () => {
    process.env.JWT_SECRET = 'test-secret';
    const payload = { id: 'user-123', email: 'test@example.com', role: 'admin' };
    const validToken = jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${validToken}` };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      role: 'admin',
    });
  });

  it('should handle token with only id claim', () => {
    process.env.JWT_SECRET = 'test-secret';
    const validToken = jwt.sign({ id: 'user-456' }, 'test-secret', { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${validToken}` };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as Request).user).toEqual({
      id: 'user-456',
      email: undefined,
      role: undefined,
    });
  });
});