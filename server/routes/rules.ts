import { Router, Request, Response } from 'express';
import { pool, isDbConnected } from '../db';
import { RULES_CATALOG } from '../../src/services/rulesCatalog';

export const rulesRouter = Router();

// GET /api/rules - List all rules from PostgreSQL (or static fallback)
rulesRouter.get('/', async (req: Request, res: Response) => {
  const { category, engine } = req.query;

  if (isDbConnected) {
    try {
      let query = 'SELECT * FROM rules WHERE is_active = TRUE';
      const params: any[] = [];

      if (category && typeof category === 'string' && category !== 'ALL') {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }

      if (engine && typeof engine === 'string') {
        params.push(engine);
        query += ` AND engine = $${params.length}`;
      }

      query += ' ORDER BY id ASC';
      const result = await pool.query(query, params);

      if (result.rows.length > 0) {
        return res.json({
          source: 'postgresql',
          count: result.rows.length,
          rules: result.rows,
        });
      }
    } catch (err: any) {
      console.error('Error fetching rules from PostgreSQL:', err);
    }
  }

  // Fallback to rules catalog in codebase
  const filtered = RULES_CATALOG.filter((r) => {
    if (category && category !== 'ALL' && r.category !== category) return false;
    return true;
  });

  return res.json({
    source: 'static-catalog',
    count: filtered.length,
    rules: filtered,
  });
});
