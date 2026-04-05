import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

export const intakeSchema = z.object({
  url: z.string().url('Invalid URL format'),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const analyzeSchema = z.object({
  url: z.string().url('Invalid URL format'),
  deepAnalysis: z.boolean().optional().default(false),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const linkQuerySchema = paginationSchema.extend({
  merchantId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  userId: z.string().optional(),
  status: z.enum(['active', 'expired', 'conflict', 'invalid', 'pending']).optional(),
  minFreshnessScore: z.coerce.number().min(0).max(1).optional(),
});

export const merchantQuerySchema = paginationSchema.extend({
  network: z.string().optional(),
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const offerQuerySchema = paginationSchema.extend({
  merchantId: z.string().uuid().optional(),
  offerType: z.string().optional(),
  status: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  categories: z.string().optional(),
  minDiscount: z.coerce.number().optional(),
  search: z.string().optional(),
});

export const opportunityQuerySchema = paginationSchema.extend({
  merchantId: z.string().uuid().optional(),
  minCommission: z.coerce.number().optional(),
  minFreshnessScore: z.coerce.number().min(0).max(1).optional(),
  categories: z.string().optional(),
});
