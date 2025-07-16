import { Router, Request, Response } from 'express';
import { databaseConfig } from '../config/database';
import { redisClient } from '../config/redis';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await checkDatabase();
    const redisHealthy = await checkRedis();

    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy'
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

async function checkDatabase(): Promise<boolean> {
  try {
    const client = await databaseConfig.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    return false;
  }
}

export { router as healthRoutes };
