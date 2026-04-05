import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Handle custom errors
  if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
    res.status(error.message === 'Unauthorized' ? 401 : 403).json({
      success: false,
      error: error.message,
    });
    return;
  }

  // Handle not found errors
  if (error.message.includes('not found')) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
    return;
  }

  // Handle already taken/exists errors
  if (error.message.includes('already') || error.message.includes('exists')) {
    res.status(409).json({
      success: false,
      error: error.message,
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
