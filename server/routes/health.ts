import { Router, Request, Response } from 'express';
import { pool, isDbConnected, dbConnectionError } from '../db';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  let dbStatus = {
    connected: isDbConnected,
    database: process.env.PGDATABASE || 'migratecheck',
    host: process.env.PGHOST || 'localhost',
    error: dbConnectionError,
  };

  // Live ping if we think it's connected
  if (isDbConnected) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      dbStatus = {
        connected: true,
        database: process.env.PGDATABASE || 'migratecheck',
        host: process.env.PGHOST || 'localhost',
        error: null,
      };
      return res.json({
        status: 'UP',
        service: 'MIGRATECHECK API Engine',
        version: '2.4.0',
        timestamp: new Date().toISOString(),
        database: {
          ...dbStatus,
          serverVersion: result.rows[0]?.version,
          ping: 'OK',
        },
      });
    } catch (err: any) {
      dbStatus.connected = false;
      dbStatus.error = err.message;
    }
  }

  return res.json({
    status: 'DEGRADED',
    service: 'MIGRATECHECK API Engine',
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    database: {
      ...dbStatus,
      message: process.env.DATABASE_URL
        ? 'PostgreSQL instance not responding. Verify DATABASE_URL credentials.'
        : 'Running in resilient in-memory mode. Connect PostgreSQL via DATABASE_URL to persist audit history across restarts.',
    },
  });
});
