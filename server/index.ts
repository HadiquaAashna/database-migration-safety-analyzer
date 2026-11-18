import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase, pool } from './db';
import { healthRouter } from './routes/health';
import { analyzeRouter } from './routes/analyze';
import { migrationsRouter } from './routes/migrations';
import { rulesRouter } from './routes/rules';
import { authRouter } from './routes/auth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Route Handlers
app.use('/api/health', healthRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/migrations', migrationsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/auth', authRouter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    service: 'MIGRATECHECK API Backend',
    version: '2.4.0',
    description: 'Database Migration Safety Analyzer backend service',
    endpoints: [
      'GET  /api/health',
      'POST /api/analyze',
      'GET  /api/migrations',
      'POST /api/migrations',
      'GET  /api/rules',
    ],
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Unknown error occurred',
  });
});

// Boot Server
async function startServer() {
  // Attempt PostgreSQL initialization
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 MIGRATECHECK Backend API running on http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   Migrations API: http://localhost:${PORT}/api/migrations`);
    console.log(`   Analysis API: http://localhost:${PORT}/api/analyze`);
    console.log(`=======================================================`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nClosing PostgreSQL connection pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nClosing PostgreSQL connection pool...');
  await pool.end();
  process.exit(0);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
