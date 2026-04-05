import { Request, Response, NextFunction } from 'express';

/**
 * Internal provisioning: requires X-Provision-Key matching PROVISION_API_KEY.
 */
export function provisionAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.PROVISION_API_KEY;
  if (!expected || expected.length < 16) {
    res.status(503).json({
      success: false,
      error: 'Provisioning is not configured (set PROVISION_API_KEY)',
    });
    return;
  }

  const key = (req.headers['x-provision-key'] as string | undefined)?.trim();
  if (!key || key !== expected) {
    res.status(401).json({ success: false, error: 'Invalid provision key' });
    return;
  }

  next();
}
