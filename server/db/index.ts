import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// PostgreSQL Connection Pool configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'migratecheck',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

export let isDbConnected = false;
export let dbConnectionError: string | null = null;

// Initialize PostgreSQL Schema
export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    dbConnectionError = null;
    console.log('✓ Successfully connected to PostgreSQL database:', pool.options.database || 'migratecheck');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✓ PostgreSQL schema verified and synchronized.');
    }

    // Seed default rules if table is empty
    const rulesCountRes = await client.query('SELECT COUNT(*) FROM rules');
    if (parseInt(rulesCountRes.rows[0].count, 10) === 0) {
      console.log('→ Seeding default database safety rules catalog...');
      await seedDefaultRules(client);
    }

    client.release();
  } catch (err: any) {
    isDbConnected = false;
    dbConnectionError = err.message || 'Could not connect to PostgreSQL';
    console.warn('⚠️  PostgreSQL connection unavailable:', dbConnectionError);
    console.warn('   The server will run in hybrid mode with in-memory persistence until PostgreSQL is started.');
    console.warn('   To run local PostgreSQL: docker compose up -d or verify credentials in .env');
  }
}

async function seedDefaultRules(client: any) {
  const defaultRules = [
    {
      id: 'PG-001',
      name: 'Adding Column with NOT NULL and volatile DEFAULT',
      category: 'Rewrites',
      engine: 'postgres',
      default_severity: 'CRITICAL',
      lock_mode: 'AccessExclusiveLock',
      summary: 'Table rewrite required for pre-v11 or volatile defaults.',
      explanation: 'Acquires AccessExclusiveLock and repacks the entire physical disk heap.',
      safe_alternative: 'Add nullable column first, backfill rows in batches, then add NOT NULL constraint with VALIDATE.',
    },
    {
      id: 'PG-002',
      name: 'Non-Concurrent Index Creation',
      category: 'Locking',
      engine: 'postgres',
      default_severity: 'HIGH',
      lock_mode: 'ShareLock',
      summary: 'Acquires ShareLock blocking writes (INSERT, UPDATE, DELETE).',
      explanation: 'Standard CREATE INDEX blocks all DML statements for the duration of the scan.',
      safe_alternative: 'Execute CREATE INDEX CONCURRENTLY outside an explicit transaction block.',
    },
    {
      id: 'PG-003',
      name: 'Destructive Column Drop',
      category: 'Compatibility',
      engine: 'postgres',
      default_severity: 'CRITICAL',
      lock_mode: 'AccessExclusiveLock',
      summary: 'Permanent data deletion and breaking change for active application pods.',
      explanation: 'Causes immediate HTTP 500 errors if running application code still queries this column.',
      safe_alternative: 'Deprecate in code -> Deploy app v2 -> Verify zero reads -> Drop column in next release.',
    },
    {
      id: 'PG-004',
      name: 'Table Rename Without View Abstraction',
      category: 'Compatibility',
      engine: 'postgres',
      default_severity: 'CRITICAL',
      lock_mode: 'AccessExclusiveLock',
      summary: 'Breaks active queries referencing the old table identifier.',
      explanation: 'Existing connections immediately fail with relation does not exist.',
      safe_alternative: 'Rename table, then immediately create a compatibility VIEW with the old name.',
    },
    {
      id: 'MY-001',
      name: 'MySQL ALGORITHM=COPY Full Table Copy',
      category: 'Rewrites',
      engine: 'mysql',
      default_severity: 'CRITICAL',
      lock_mode: 'MetadataLock_Exclusive',
      summary: 'InnoDB copies entire table to temporary space, blocking writes.',
      explanation: 'Substantial disk I/O, binary log bloat, and replication lag on replicas.',
      safe_alternative: 'Use ALGORITHM=INPLACE, LOCK=NONE or pt-online-schema-change / gh-ost.',
    },
  ];

  for (const r of defaultRules) {
    await client.query(
      `INSERT INTO rules (id, name, category, engine, default_severity, lock_mode, summary, explanation, safe_alternative)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.category, r.engine, r.default_severity, r.lock_mode, r.summary, r.explanation, r.safe_alternative]
    );
  }
  console.log('✓ Seeded standard migration rules into PostgreSQL.');
}
