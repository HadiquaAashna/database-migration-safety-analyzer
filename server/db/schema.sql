-- ============================================================================
-- MIGRATECHECK: Database Migration Safety Analyzer
-- PostgreSQL Database DDL Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(64) PRIMARY KEY,
  migration_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  raw_sql TEXT NOT NULL,
  target_engine VARCHAR(50) NOT NULL DEFAULT 'postgres',
  overall_risk VARCHAR(20) NOT NULL,
  safety_score INTEGER NOT NULL,
  estimated_downtime_min NUMERIC DEFAULT 0,
  estimated_downtime_max NUMERIC DEFAULT 0,
  highest_lock_acquired VARCHAR(100),
  table_rewrite_count INTEGER DEFAULT 0,
  issues_count INTEGER DEFAULT 0,
  workload_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed_statements JSONB NOT NULL DEFAULT '[]'::jsonb,
  safe_migration_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  unified_safe_sql TEXT,
  rollback_sql TEXT,
  summary_text TEXT,
  author VARCHAR(100) DEFAULT 'dba-engineer',
  commit_hash VARCHAR(50) DEFAULT 'head',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migrations_created_at ON migrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_risk ON migrations(overall_risk);
CREATE INDEX IF NOT EXISTS idx_migrations_engine ON migrations(target_engine);

CREATE TABLE IF NOT EXISTS rules (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  engine VARCHAR(50) NOT NULL,
  default_severity VARCHAR(20) NOT NULL,
  lock_mode VARCHAR(100),
  summary TEXT NOT NULL,
  explanation TEXT,
  safe_alternative TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_engine ON rules(engine);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  migration_id VARCHAR(64) REFERENCES migrations(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
