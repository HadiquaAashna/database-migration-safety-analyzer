export interface DbRuleDefinition {
  id: string;
  name: string;
  category: 'Locking' | 'Rewrites' | 'Compatibility' | 'Replication' | 'Safety';
  engines: ('postgres' | 'mysql' | 'sqlite')[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  mechanism: string;
  dangerScenario: string;
  safePattern: string;
  safeSqlExample: string;
}

export const RULES_CATALOG: DbRuleDefinition[] = [
  {
    id: 'PG-001',
    name: 'Non-Concurrent Index Creation',
    category: 'Locking',
    engines: ['postgres'],
    severity: 'CRITICAL',
    summary: 'CREATE INDEX without CONCURRENTLY acquires a ShareLock, blocking all concurrent INSERT, UPDATE, and DELETE operations.',
    mechanism: 'A regular CREATE INDEX scans the table twice and holds a ShareLock for the entire duration. In busy OLTP databases, write transactions will queue behind it, eventually exhausting DB connection pools.',
    dangerScenario: 'On a 20M row orders table, an index build taking 90 seconds blocks all checkout writes for 90 seconds, causing widespread customer 504 timeouts.',
    safePattern: 'Use CREATE INDEX CONCURRENTLY. It acquires only a ShareUpdateExclusiveLock, permitting simultaneous reads and writes while building the index in two scan passes.',
    safeSqlExample: `CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);`,
  },
  {
    id: 'PG-002',
    name: 'Volatile Column Defaults Full Table Rewrite',
    category: 'Rewrites',
    engines: ['postgres'],
    severity: 'CRITICAL',
    summary: 'Adding a column with a volatile default function (e.g. now(), gen_random_uuid()) forces Postgres to rewrite every single tuple on disk.',
    mechanism: 'While constant defaults are stored instantly in catalog metadata (pg_attribute.atthasmissing) since PG 11, volatile functions must be evaluated per row, requiring an AccessExclusiveLock while repacking the table.',
    dangerScenario: 'Table rewrite on a 100GB table takes 5-10 minutes, generating massive disk I/O, filling WAL storage, and locking out all read and write queries.',
    safePattern: 'Add column as NULL without default, then set the default for future inserts, then backfill existing records in batches.',
    safeSqlExample: `ALTER TABLE users ADD COLUMN created_uuid UUID;\nALTER TABLE users ALTER COLUMN created_uuid SET DEFAULT gen_random_uuid();\n-- Backfill existing rows via throttled script`,
  },
  {
    id: 'DDL-003',
    name: 'Immediate DROP COLUMN (Breaking Rolling Pods)',
    category: 'Compatibility',
    engines: ['postgres', 'mysql'],
    severity: 'HIGH',
    summary: 'Dropping a column immediately before all running application instances have been updated crashes queries.',
    mechanism: 'During rolling deployments, older app instances still query the column. If the column is dropped in the database before the old pods are terminated, queries fail with "column does not exist".',
    dangerScenario: 'During a 15-minute Kubernetes rolling update, 50% of user traffic routed to old pods crashes with HTTP 500 error spikes.',
    safePattern: 'Follow Martin Fowler Parallel Change (Expand/Contract): Phase 1: Deploy code ignoring column. Phase 2: Wait for 100% rollout. Phase 3: Drop column.',
    safeSqlExample: `-- 1. Remove ORM mapping in code & deploy\n-- 2. Verify 0 queries touch column in pg_stat_statements\n-- 3. Execute DROP COLUMN`,
  },
  {
    id: 'PG-004',
    name: 'Foreign Key Constraint Without NOT VALID',
    category: 'Locking',
    engines: ['postgres'],
    severity: 'HIGH',
    summary: 'Adding a foreign key constraint without NOT VALID performs an exhaustive sequential scan on both tables while holding AccessExclusiveLock.',
    mechanism: 'Postgres locks the table exclusively while iterating through every single record to verify referential integrity. On large tables, this lock is held for minutes.',
    dangerScenario: 'Lock queue backlog builds up; subsequent lightweight SELECT queries get stuck behind the DDL lock wait.',
    safePattern: 'Add foreign key with NOT VALID (instant lock), then validate constraint in a second transaction with VALIDATE CONSTRAINT.',
    safeSqlExample: `ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;\nALTER TABLE orders VALIDATE CONSTRAINT fk_user;`,
  },
  {
    id: 'MYSQL-005',
    name: 'MySQL Metadata Lock & ALGORITHM=COPY Fallback',
    category: 'Locking',
    engines: ['mysql'],
    severity: 'HIGH',
    summary: 'MySQL InnoDB DDL operations that cannot use ALGORITHM=INSTANT or INPLACE will silently fall back to ALGORITHM=COPY.',
    mechanism: 'ALGORITHM=COPY creates a temporary table, copies all rows, builds indexes, and swaps tables, locking writes for the entire copy duration and stalling replication threads.',
    dangerScenario: 'A silent table copy on an 8M row payment table halts all payment processing and causes 30+ minutes of replica lag.',
    safePattern: 'Always explicitly specify ALGORITHM=INPLACE, LOCK=NONE. If unsupported, utilize external ghost-trigger tools like gh-ost or pt-online-schema-change.',
    safeSqlExample: `ALTER TABLE payments MODIFY COLUMN notes VARCHAR(500), ALGORITHM=INPLACE, LOCK=NONE;`,
  },
  {
    id: 'DML-006',
    name: 'Monolithic Unbounded Data Backfill',
    category: 'Replication',
    engines: ['postgres', 'mysql', 'sqlite'],
    severity: 'CRITICAL',
    summary: 'Executing a massive single-statement UPDATE or DELETE locks millions of rows and floods the replication log.',
    mechanism: 'A single transaction updating 5M rows locks all affected index keys, generates gigabytes of WAL/binlog in one shot, and prevents secondary replicas from catching up.',
    dangerScenario: 'Replication lag exceeds failover thresholds; database replica falls behind, causing read stale data and connection drops.',
    safePattern: 'Chunk the backfill into small batches (e.g. 5,000 rows) with small pause intervals (50ms) to allow autovacuum and replication threads to breathe.',
    safeSqlExample: `DO $$\nBEGIN\n  LOOP\n    UPDATE items SET flag = true WHERE id IN (\n      SELECT id FROM items WHERE flag = false LIMIT 5000\n    );\n    EXIT WHEN NOT FOUND;\n    PERFORM pg_sleep(0.05);\n  END LOOP;\nEND $$;`,
  }
];
