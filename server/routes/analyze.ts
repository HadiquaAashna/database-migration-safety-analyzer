import { Router, Request, Response } from 'express';
import { analyzeMigration } from '../../src/services/analyzerEngine';
import { WorkloadProfile } from '../../src/types/analyzer';
import { pool, isDbConnected } from '../db';

export const analyzeRouter = Router();

analyzeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sql, workload } = req.body;

    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL script is required for analysis' });
    }

    const defaultWorkload: WorkloadProfile = {
      targetEngine: 'postgres',
      estimatedRowCount: 12_000_000,
      estimatedTableSizeBytes: 12_000_000 * 250,
      peakQps: 2500,
      lockTimeoutMs: 2000,
      environment: 'production-critical',
    };

    const effectiveWorkload = {
      ...defaultWorkload,
      ...(workload || {}),
    };

    // Execute static SQL analysis pipeline
    const report = analyzeMigration(sql, effectiveWorkload);

    // If connected to PostgreSQL, record in audit_logs
    if (isDbConnected) {
      try {
        await pool.query(
          `INSERT INTO audit_logs (action, status, details)
           VALUES ($1, $2, $3)`,
          [
            'STATIC_ANALYSIS',
            report.overallRisk,
            JSON.stringify({
              score: report.safetyScore,
              issuesCount: report.issues.length,
              targetEngine: effectiveWorkload.targetEngine,
            }),
          ]
        );
      } catch (logErr) {
        // Non-blocking log failure
        console.warn('Audit log write error:', logErr);
      }
    }

    return res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Error analyzing migration:', err);
    return res.status(500).json({
      error: 'Failed to analyze migration SQL script',
      details: err.message,
    });
  }
});
