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

// Middleware - Allow Vercel production frontend, local dev, or custom CLIENT_URL
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://database-migration-safety-analyzer.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
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
app.get('/', (req, res) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    service: 'MIGRATECHECK API Backend',
    version: '2.4.0',
    description: 'Database Migration Safety Analyzer backend service',
    frontend: process.env.CLIENT_URL || 'https://database-migration-safety-analyzer.vercel.app',
    status: 'ONLINE',
    endpoints: [
      `GET  ${baseUrl}/api/health`,
      `POST ${baseUrl}/api/analyze`,
      `GET  ${baseUrl}/api/migrations`,
      `POST ${baseUrl}/api/migrations`,
      `GET  ${baseUrl}/api/rules`,
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

  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `http://localhost:${PORT}`;
  const clientUrl = process.env.CLIENT_URL || 'https://database-migration-safety-analyzer.vercel.app';

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 MIGRATECHECK Backend API running on ${baseUrl}`);
    console.log(`   Frontend Client: ${clientUrl}`);
    console.log(`   Health Check:    ${baseUrl}/api/health`);
    console.log(`   Migrations API:  ${baseUrl}/api/migrations`);
    console.log(`   Analysis API:    ${baseUrl}/api/analyze`);
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
