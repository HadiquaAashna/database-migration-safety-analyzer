import { Router, Request, Response } from 'express';
import { pool, isDbConnected } from '../db';

export const migrationsRouter = Router();

// In-memory fallback storage if PostgreSQL is offline
let inMemoryMigrations: any[] = [];

// GET /api/migrations - List past migrations
migrationsRouter.get('/', async (req: Request, res: Response) => {
  const { engine, risk, limit = 50 } = req.query;

  if (isDbConnected) {
    try {
      let query = `
        SELECT 
          id, migration_number, title, target_engine, overall_risk, 
          safety_score, estimated_downtime_min, estimated_downtime_max,
          highest_lock_acquired, table_rewrite_count, issues_count,
          author, commit_hash, created_at
        FROM migrations
        WHERE 1=1
      `;
      const params: any[] = [];

      if (engine && typeof engine === 'string') {
        params.push(engine);
        query += ` AND target_engine = $${params.length}`;
      }

      if (risk && typeof risk === 'string') {
        params.push(risk);
        query += ` AND overall_risk = $${params.length}`;
      }

      params.push(parseInt(String(limit), 10) || 50);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const result = await pool.query(query, params);
      return res.json({
        source: 'postgresql',
        count: result.rows.length,
        migrations: result.rows,
      });
    } catch (err: any) {
      console.error('Error fetching migrations from PostgreSQL:', err);
    }
  }

  // Fallback if PostgreSQL is offline
  return res.json({
    source: 'in-memory',
    count: inMemoryMigrations.length,
    migrations: inMemoryMigrations,
    note: 'Running in in-memory mode. Start PostgreSQL to enable database persistence.',
  });
});

// GET /api/migrations/:id - Get single migration
migrationsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM migrations WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        return res.json(result.rows[0]);
      }
    } catch (err: any) {
      console.error('Error fetching migration by id:', err);
    }
  }

  const found = inMemoryMigrations.find((m) => m.id === id);
  if (found) {
    return res.json(found);
  }

  return res.status(404).json({ error: 'Migration record not found' });
});

// POST /api/migrations - Save analyzed migration
migrationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      id = `mig-${Date.now().toString(36)}`,
      migrationNumber = `#${Math.floor(1000 + Math.random() * 9000)}`,
      title = 'untitled_migration.sql',
      rawSql,
      report,
      author = 'dba-engineer',
      commitHash = 'head',
    } = req.body;

    if (!rawSql || !report) {
      return res.status(400).json({ error: 'rawSql and report objects are required' });
    }

    const migrationRecord = {
      id,
      migration_number: migrationNumber,
      title,
      raw_sql: rawSql,
      target_engine: report.workload?.targetEngine || 'postgres',
      overall_risk: report.overallRisk,
      safety_score: report.safetyScore,
      estimated_downtime_min: report.metrics?.estimatedDowntimeMinSeconds || 0,
      estimated_downtime_max: report.metrics?.estimatedDowntimeMaxSeconds || 0,
      highest_lock_acquired: report.metrics?.highestLockAcquired || 'None',
      table_rewrite_count: report.metrics?.tableRewriteCount || 0,
      issues_count: report.issues?.length || 0,
      workload_profile: report.workload,
      score_breakdown: report.scoreBreakdown,
      issues: report.issues,
      parsed_statements: report.parsedStatements,
      safe_migration_phases: report.safeMigrationPhases,
      unified_safe_sql: report.unifiedSafeSql,
      rollback_sql: report.rollbackSql,
      summary_text: report.summaryText,
      author,
      commit_hash: commitHash,
      created_at: new Date().toISOString(),
    };

    if (isDbConnected) {
      try {
        const insertQuery = `
          INSERT INTO migrations (
            id, migration_number, title, raw_sql, target_engine, overall_risk,
            safety_score, estimated_downtime_min, estimated_downtime_max,
            highest_lock_acquired, table_rewrite_count, issues_count,
            workload_profile, score_breakdown, issues, parsed_statements,
            safe_migration_phases, unified_safe_sql, rollback_sql, summary_text,
            author, commit_hash
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22
          ) RETURNING *
        `;

        const values = [
          migrationRecord.id,
          migrationRecord.migration_number,
          migrationRecord.title,
          migrationRecord.raw_sql,
          migrationRecord.target_engine,
          migrationRecord.overall_risk,
          migrationRecord.safety_score,
          migrationRecord.estimated_downtime_min,
          migrationRecord.estimated_downtime_max,
          migrationRecord.highest_lock_acquired,
          migrationRecord.table_rewrite_count,
          migrationRecord.issues_count,
          JSON.stringify(migrationRecord.workload_profile),
          JSON.stringify(migrationRecord.score_breakdown),
          JSON.stringify(migrationRecord.issues),
          JSON.stringify(migrationRecord.parsed_statements),
          JSON.stringify(migrationRecord.safe_migration_phases),
          migrationRecord.unified_safe_sql,
          migrationRecord.rollback_sql,
          migrationRecord.summary_text,
          migrationRecord.author,
          migrationRecord.commit_hash,
        ];

        const insertRes = await pool.query(insertQuery, values);
        return res.status(201).json({
          success: true,
          source: 'postgresql',
          migration: insertRes.rows[0],
        });
      } catch (dbErr: any) {
        console.error('Failed to save to PostgreSQL, using fallback:', dbErr);
      }
    }

    // In-memory fallback
    inMemoryMigrations.unshift(migrationRecord);
    return res.status(201).json({
      success: true,
      source: 'in-memory',
      migration: migrationRecord,
    });
  } catch (err: any) {
    console.error('Error saving migration:', err);
    return res.status(500).json({ error: 'Failed to save migration', details: err.message });
  }
});

// DELETE /api/migrations/:id - Delete migration record
migrationsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isDbConnected) {
    try {
      await pool.query('DELETE FROM migrations WHERE id = $1', [id]);
      return res.json({ success: true, message: `Deleted migration ${id} from PostgreSQL` });
    } catch (err: any) {
      console.error('Error deleting migration:', err);
    }
  }

  inMemoryMigrations = inMemoryMigrations.filter((m) => m.id !== id);
  return res.json({ success: true, message: `Deleted migration ${id}` });
});
