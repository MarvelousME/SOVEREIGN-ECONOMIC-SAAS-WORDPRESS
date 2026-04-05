import { validateBody, validateQuery } from '../../src/middleware/validation.middleware';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });

    it('should call next for valid body', () => {
      mockRequest.body = { name: 'Test' };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid body', () => {
      mockRequest.body = { name: 123 };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should include field details in error response', () => {
      mockRequest.body = { name: 123 };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
            }),
          ]),
        })
      );
    });

    it('should allow optional fields to be missing', () => {
      mockRequest.body = { name: 'Test' };

      const middleware = validateBody(testSchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    });

    it('should call next for valid query params', () => {
      mockRequest.query = { page: '1', limit: '20' };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should apply default values', () => {
      mockRequest.query = {};

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect((mockRequest as any).query.page).toBe(1);
      expect((mockRequest as any).query.limit).toBe(50);
    });

    it('should return 400 for invalid query params', () => {
      mockRequest.query = { page: '-1' };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should enforce max limit', () => {
      mockRequest.query = { page: '1', limit: '200' };

      const middleware = validateQuery(querySchema);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
