import { SampleMigration } from '../types/analyzer';

export const SAMPLE_MIGRATIONS: SampleMigration[] = [
  {
    id: 'ecommerce-orders-danger',
    title: '🚨 High-Volume Orders Schema Update (PostgreSQL)',
    description: 'Contains 4 critical production hazards: Missing CONCURRENTLY index, volatile default rewrite, immediate NOT NULL, and un-validated foreign key on 12M rows.',
    engine: 'postgres',
    expectedRisk: 'CRITICAL',
    tableSize: 12_000_000,
    tags: ['PostgreSQL', 'E-Commerce', 'Table Rewrite', 'Exclusive Lock'],
    sql: `-- Migration V42__add_order_discount_and_customer_fk.sql
-- Intended for production OLTP database with ~12,000,000 orders

BEGIN;

-- 1. Adding NOT NULL column with volatile UUID default (Triggers full table rewrite!)
ALTER TABLE orders 
  ADD COLUMN tracking_uuid UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Creating index without CONCURRENTLY (Acquires ShareLock, blocks all checkout INSERTs)
CREATE INDEX idx_orders_customer_created 
  ON orders(customer_id, created_at DESC);

-- 3. Adding foreign key without NOT VALID (Full sequential scan blocking all writes)
ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_promotions 
  FOREIGN KEY (applied_promo_id) REFERENCES promotions(id);

-- 4. In-place column rename (Immediately breaks running API pods querying legacy column)
ALTER TABLE orders 
  RENAME COLUMN discount_amt TO promo_discount_amount;

COMMIT;`,
  },
  {
    id: 'user-auth-type-rewrite',
    title: '⚠️ User Identity & Security Upgrade (PostgreSQL)',
    description: 'Type alteration from VARCHAR to JSONB causing massive disk rewrite, along with immediate DROP COLUMN breaking rolling deployments.',
    engine: 'postgres',
    expectedRisk: 'HIGH',
    tableSize: 4_500_000,
    tags: ['PostgreSQL', 'Auth', 'Expand-Contract Violation', 'Disk I/O'],
    sql: `-- Migration V18__upgrade_user_security_and_mfa.sql
-- Modifies core 'users' table (4.5M registered users)

BEGIN;

-- 1. Alter column type forces complete table tuple repacking under AccessExclusiveLock
ALTER TABLE users 
  ALTER COLUMN metadata TYPE JSONB USING metadata::jsonb;

-- 2. Immediate column drop breaks running backend pods before they finish rolling restart
ALTER TABLE users 
  DROP COLUMN legacy_password_salt;

-- 3. Non-concurrent index drop locks out authentication queries
DROP INDEX idx_users_email_verified;

-- 4. Unbounded bulk update causes massive WAL spike and replication lag
UPDATE users 
  SET security_version = 2;

COMMIT;`,
  },
  {
    id: 'mysql-payments-catalog',
    title: '⚡ MySQL 8.0 Payment Ledger (Metadata Lock & COPY)',
    description: 'InnoDB DDL modifying column data types and adding constraints without ALGORITHM=INPLACE or LOCK=NONE, causing silent table copy locks.',
    engine: 'mysql',
    expectedRisk: 'HIGH',
    tableSize: 8_000_000,
    tags: ['MySQL 8.0', 'InnoDB', 'Metadata Lock', 'Replication Lag'],
    sql: `-- Migration 2026_10_08_payments_partitioning.sql
-- MySQL 8.0 InnoDB Production Migration on payment_transactions (8M rows)

-- 1. DDL without ALGORITHM=INPLACE triggers fallback to ALGORITHM=COPY
ALTER TABLE payment_transactions 
  MODIFY COLUMN currency VARCHAR(10) NOT NULL;

-- 2. Dropping primary key requires full table rebuild and locks concurrent writes
ALTER TABLE payment_transactions 
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id, created_date);

-- 3. Unbounded bulk delete in single transaction inflates InnoDB undo log
DELETE FROM payment_transactions 
  WHERE status = 'FAILED' AND created_date < '2024-01-01';`,
  },
  {
    id: 'saas-tenant-clean-reference',
    title: '✅ SaaS Tenant Isolation (Zero-Downtime Safe Reference)',
    description: 'Production-ready gold standard migration utilizing CONCURRENTLY, NOT VALID constraint addition, and defensive lock timeouts.',
    engine: 'postgres',
    expectedRisk: 'SAFE',
    tableSize: 25_000_000,
    tags: ['PostgreSQL', 'Zero Downtime', 'Gold Standard', 'Safe Recipe'],
    sql: `-- Migration V55__tenant_workspace_isolation_safe.sql
-- Zero-Downtime compliant migration tested for high-concurrency OLTP

-- Step 1: Defensive lock timeouts prevent migration from blocking OLTP queue
SET lock_timeout = '2000ms';
SET statement_timeout = '30000ms';

-- Step 2: Add column as NULLABLE (Instant O(1) metadata change since Postgres 11)
ALTER TABLE workspaces 
  ADD COLUMN tenant_uuid UUID;

-- Step 3: Concurrently build unique index without locking table reads/writes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_uuid 
  ON workspaces(tenant_uuid);

-- Step 4: Add foreign key constraint with NOT VALID (instant lock acquisition)
ALTER TABLE workspaces 
  ADD CONSTRAINT fk_workspaces_tenant 
  FOREIGN KEY (tenant_uuid) REFERENCES tenants(id) 
  NOT VALID;

-- Validation is executed in a subsequent background task or phase:
-- ALTER TABLE workspaces VALIDATE CONSTRAINT fk_workspaces_tenant;`,
  },
  {
    id: 'analytics-events-dataloss',
    title: '💥 Analytics Pipeline Restructure (Data Loss & Rollback Hazard)',
    description: 'Contains destructive TRUNCATE and multi-table DDL inside single transaction creating distributed deadlock hazards.',
    engine: 'postgres',
    expectedRisk: 'CRITICAL',
    tableSize: 35_000_000,
    tags: ['Analytics', 'Data Loss', 'Deadlock Risk', 'VACUUM FULL'],
    sql: `-- Migration V88__analytics_raw_events_flush.sql
-- Analytics pipeline maintenance migration

BEGIN;

-- 1. Irreversible truncate flushes entire table without snapshot safeguard
TRUNCATE TABLE raw_clickstream_events;

-- 2. VACUUM FULL locks out all ingestion workers
VACUUM FULL raw_clickstream_events;

-- 3. Multi-table schema shift altering telemetry_logs and event_dispatchers
ALTER TABLE telemetry_logs ADD COLUMN batch_id BIGINT;
ALTER TABLE event_dispatchers ADD COLUMN max_retries INT DEFAULT 3;

COMMIT;`,
  }
];
