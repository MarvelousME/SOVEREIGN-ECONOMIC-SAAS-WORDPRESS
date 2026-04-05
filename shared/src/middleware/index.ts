import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { AppError, isAppError } from '../errors';
import { ApiResponse } from '../types';

/**
 * Correlation ID middleware
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  logger.setDefaultContext({ correlationId });
  next();
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req.method, req.path, res.statusCode, duration, {
      correlationId: req.headers['x-correlation-id'] as string,
      userId: (req as any).user?.id,
    });
  });

  logger.logRequest(req.method, req.path, {
    correlationId: req.headers['x-correlation-id'] as string,
    userId: (req as any).user?.id,
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.logError(error, {
    correlationId: req.headers['x-correlation-id'] as string,
    path: req.path,
    method: req.method,
  });

  if (isAppError(error)) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      metadata: {
        requestId: req.headers['x-correlation-id'] as string,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(error.statusCode).json(response);
  } else {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
      metadata: {
        requestId: req.headers['x-correlation-id'] as string,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(500).json(response);
  }
}

/**
 * Tenant isolation middleware
 */
export function tenantIsolationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TENANT_ID',
        message: 'Tenant ID is required',
      },
    });
    return;
  }

  (req as any).tenantId = tenantId;
  logger.setDefaultContext({ tenantId });
  next();
}

/**
 * Response formatting middleware
 */
export function responseFormatterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res);

  res.json = function (data: any): Response {
    if (data && typeof data === 'object' && !data.success && !data.error) {
      const formattedResponse: ApiResponse = {
        success: true,
        data,
        metadata: {
          requestId: req.headers['x-correlation-id'] as string,
          timestamp: new Date().toISOString(),
        },
      };
      return originalJson(formattedResponse);
    }
    return originalJson(data);
  };

  next();
}
