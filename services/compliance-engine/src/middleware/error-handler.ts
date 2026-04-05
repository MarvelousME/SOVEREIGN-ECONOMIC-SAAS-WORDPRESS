import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors
    });
    return;
  }

  if (err.name === 'NotFoundError') {
    res.status(404).json({
      error: 'Resource not found'
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error'
  });
};

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const publicPaths = [
    '/health',
    '/api/v1/compliance/health'
  ];

  if (publicPaths.includes(req.path)) {
    next();
    return;
  }

  const userId = req.headers['x-user-id'];
  const apiKey = req.headers['x-api-key'];

  if (!userId && !apiKey) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  next();
};
