import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { config } from '../config';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password || undefined,
});

redisClient.on('error', (err) => console.error('Redis error:', err));

let redisReady = false;

(async () => {
  try {
    await redisClient.connect();
    redisReady = true;
    console.log('Redis connected for rate limiting');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!redisReady) {
    next();
    return;
  }

  const userId = req.headers['x-user-id'] as string || req.ip;
  const key = `rate_limit:${userId}`;
  const limit = 100; // requests per minute
  const window = 60; // seconds

  try {
    const current = await redisClient.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      res.status(429).json({
        error: 'Too many requests',
        retry_after: window,
      });
      return;
    }

    if (count === 0) {
      await redisClient.setEx(key, window, '1');
    } else {
      await redisClient.incr(key);
    }

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next();
  }
};
