import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { buildSocialShareLinks } from '../services/socialShareLinks';

const QuerySchema = z.object({
  url: z.string().url(),
  text: z.string().max(500).optional().default(''),
});

export class ShareLinksController {
  getShareLinks = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = QuerySchema.safeParse({
        url: req.query.url,
        text: req.query.text,
      });
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query',
          details: parsed.error.flatten(),
        });
        return;
      }
      const { url, text } = parsed.data;
      const shareLinks = buildSocialShareLinks(url, text || hostHintFromUrl(url));
      res.json({ success: true, data: { url, shareLinks } });
    } catch (e) {
      next(e);
    }
  };
}

function hostHintFromUrl(url: string): string {
  try {
    const p = new URL(url);
    return p.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
