import {
  AnalysisReport,
  BlockedOperations,
  DatabaseEngine,
  DetectedIssue,
  IssueCategory,
  LockMode,
  ParsedStatement,
  PhaseStep,
  RiskLevel,
  WorkloadProfile,
} from '../types/analyzer';

// Helper to calculate lock conflict matrix
export function getBlockedOperations(lock: LockMode): BlockedOperations {
  switch (lock) {
    case 'AccessExclusiveLock':
    case 'MetadataLock_Exclusive':
      return { select: true, insert: true, update: true, delete: true };
    case 'ExclusiveLock':
      return { select: false, insert: true, update: true, delete: true };
    case 'ShareLock':
      return { select: false, insert: true, update: true, delete: true };
    case 'ShareUpdateExclusiveLock':
      return { select: false, insert: false, update: false, delete: false }; // Concurrent with reads and writes, conflicts with vacuum & other DDL
    case 'RowExclusiveLock':
      return { select: false, insert: false, update: false, delete: false };
    case 'AccessShareLock':
    case 'MetadataLock_Shared':
      return { select: false, insert: false, update: false, delete: false };
    default:
      return { select: false, insert: false, update: false, delete: false };
  }
}

// Map lock severity rank
const LOCK_SEVERITY: Record<LockMode, number> = {
  AccessExclusiveLock: 10,
  MetadataLock_Exclusive: 10,
  ExclusiveLock: 8,
  ShareLock: 6,
  ShareUpdateExclusiveLock: 3,
  RowExclusiveLock: 2,
  AccessShareLock: 1,
  MetadataLock_Shared: 1,
  None: 0,
};

// Split raw SQL text into statements preserving line numbers
export function splitSqlStatements(sqlText: string): { sql: string; startLine: number; endLine: number }[] {
  const lines = sqlText.split('\n');
  const results: { sql: string; startLine: number; endLine: number }[] = [];
  
  let currentSql = '';
  let currentStartLine = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let inBlockComment = false;
  let inLineComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNum = lineIdx + 1;
    let i = 0;

    inLineComment = false;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1] || '';

      if (inLineComment) {
        break; // skip rest of line
      }

      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          i += 2;
          continue;
        }
        i++;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && !inDollarQuote) {
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          i += 2;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          i += 2;
          continue;
        }
      }

      // Handle quotes
      if (char === "'" && !inDoubleQuote && !inDollarQuote) {
        inSingleQuote = !inSingleQuote;
        currentSql += char;
        i++;
        continue;
      }

      if (char === '"' && !inSingleQuote && !inDollarQuote) {
        inDoubleQuote = !inDoubleQuote;
        currentSql += char;
        i++;
        continue;
      }

      // Semicolon statement terminator
      if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote) {
        currentSql += char;
        const trimmed = currentSql.trim();
        if (trimmed && trimmed !== ';') {
          results.push({
            sql: trimmed,
            startLine: currentStartLine,
            endLine: lineNum,
          });
        }
        currentSql = '';
        currentStartLine = lineNum;
        i++;
        continue;
      }

      if (currentSql.length === 0 && (char === ' ' || char === '\t' || char === '\r')) {
        // leading whitespace before new statement
        i++;
        continue;
      }

      currentSql += char;
      i++;
    }

    if (currentSql.length > 0) {
      currentSql += '\n';
    } else {
      currentStartLine = lineNum + 1;
    }
  }

  const trimmed = currentSql.trim();
  if (trimmed && trimmed !== ';') {
    results.push({
      sql: trimmed,
      startLine: currentStartLine,
      endLine: lines.length,
    });
  }

  return results;
}

// Parse high level statement metadata
export function parseStatement(
  rawSql: string,
  startLine: number,
  endLine: number,
  index: number,
  engine: DatabaseEngine
): ParsedStatement {
  const normalized = rawSql.replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();

  let operationType = 'UNKNOWN';
  let targetTable = 'unknown';
  let targetColumn = undefined;
  let lockType: LockMode = 'None';
  let hasConcurrentKeyword = false;

  // Detect basic DDL types
  if (upper.startsWith('CREATE INDEX')) {
    operationType = 'CREATE_INDEX';
    hasConcurrentKeyword = upper.includes('CONCURRENTLY');
    const tableMatch = upper.match(/ON\s+(?:ONLY\s+)?([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = hasConcurrentKeyword
      ? 'ShareUpdateExclusiveLock'
      : (engine === 'postgres' ? 'ShareLock' : 'MetadataLock_Exclusive');
  } else if (upper.startsWith('DROP INDEX')) {
    operationType = 'DROP_INDEX';
    hasConcurrentKeyword = upper.includes('CONCURRENTLY');
    const idxMatch = upper.match(/DROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?([`"']?[\w.]+[`"']?)/i);
    if (idxMatch) targetTable = `index:${idxMatch[1].replace(/[`"']/g, '')}`;
    lockType = hasConcurrentKeyword
      ? 'ShareUpdateExclusiveLock'
      : (engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive');
  } else if (upper.startsWith('ALTER TABLE')) {
    operationType = 'ALTER_TABLE';
    const tableMatch = upper.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive';

    // Sub-operations inside ALTER TABLE
    if (upper.includes('ADD COLUMN')) {
      const colMatch = upper.match(/ADD\s+(?:COLUMN\s+)?([`"']?[\w]+[`"']?)/i);
      if (colMatch) targetColumn = colMatch[1].replace(/[`"']/g, '');
    } else if (upper.includes('DROP COLUMN')) {
      const colMatch = upper.match(/DROP\s+(?:COLUMN\s+)?([`"']?[\w]+[`"']?)/i);
      if (colMatch) targetColumn = colMatch[1].replace(/[`"']/g, '');
    } else if (upper.includes('RENAME COLUMN')) {
      const colMatch = upper.match(/RENAME\s+(?:COLUMN\s+)?([`"']?[\w]+[`"']?)\s+TO/i);
      if (colMatch) targetColumn = colMatch[1].replace(/[`"']/g, '');
    }
  } else if (upper.startsWith('DROP TABLE')) {
    operationType = 'DROP_TABLE';
    const tableMatch = upper.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive';
  } else if (upper.startsWith('CREATE TABLE')) {
    operationType = 'CREATE_TABLE';
    const tableMatch = upper.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = 'None'; // creating new table doesn't block other existing tables
  } else if (upper.startsWith('TRUNCATE')) {
    operationType = 'TRUNCATE';
    const tableMatch = upper.match(/TRUNCATE\s+(?:TABLE\s+)?([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = 'AccessExclusiveLock';
  } else if (upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    operationType = 'DML_BULK';
    const tableMatch = upper.match(/(?:UPDATE|FROM)\s+([`"']?[\w.]+[`"']?)/i);
    if (tableMatch) targetTable = tableMatch[1].replace(/[`"']/g, '');
    lockType = 'RowExclusiveLock';
  } else if (upper.startsWith('VACUUM') || upper.startsWith('CLUSTER')) {
    operationType = 'MAINTENANCE';
    lockType = upper.includes('FULL') || upper.startsWith('CLUSTER') ? 'AccessExclusiveLock' : 'ShareUpdateExclusiveLock';
  }

  return {
    index,
    rawSql,
    normalizedSql: normalized,
    startLine,
    endLine,
    operationType,
    targetTable,
    targetColumn,
    isTransactional: !upper.includes('CONCURRENTLY') && !upper.startsWith('VACUUM'),
    hasConcurrentKeyword,
    lockType,
  };
}

// Rule Engine to inspect statements
export function analyzeMigration(
  sqlContent: string,
  workload: WorkloadProfile
): AnalysisReport {
  const rawStatements = splitSqlStatements(sqlContent);
  const parsedStatements: ParsedStatement[] = rawStatements.map((s, idx) =>
    parseStatement(s.sql, s.startLine, s.endLine, idx, workload.targetEngine)
  );

  if (parsedStatements.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      safetyScore: 0,
      overallRisk: 'SAFE',
      workload,
      totalStatements: 0,
      issues: [],
      parsedStatements: [],
      scoreBreakdown: {
        lockContention: 100,
        tableRewrite: 100,
        backwardsCompatibility: 100,
        rollbackReadiness: 100,
        replicationSafety: 100,
      },
      metrics: {
        estimatedDowntimeMinSeconds: 0,
        estimatedDowntimeMaxSeconds: 0,
        tablesAffected: [],
        highestLockAcquired: 'None',
        blockedOpsSummary: { select: false, insert: false, update: false, delete: false },
        tableRewriteCount: 0,
        isZeroDowntimeCompliant: true,
      },
      safeMigrationPhases: [],
      unifiedSafeSql: '',
      rollbackSql: '',
      summaryText: 'No SQL statements loaded. Enter or paste migration DDL statements in the editor to analyze concurrency risks, lock levels, and table rewrites.',
    };
  }

  const issues: DetectedIssue[] = [];
  const engine = workload.targetEngine;
  const rows = workload.estimatedRowCount;

  // Approximate rewrite time based on row volume: 1M rows ~= 4s on standard SSD
  const estimatedScanTimeSec = Math.max(0.2, (rows / 1_000_000) * 3.5);

  parsedStatements.forEach((stmt) => {
    const upper = stmt.normalizedSql.toUpperCase();
    const table = stmt.targetTable;

    // RULE 1: Non-concurrent Index Creation (PostgreSQL)
    if (engine === 'postgres' && stmt.operationType === 'CREATE_INDEX' && !stmt.hasConcurrentKeyword) {
      const downtimeEst = Math.round(estimatedScanTimeSec * 1.8);
      issues.push({
        id: `rule-pg-create-index-concurrently-${stmt.index}`,
        ruleId: 'PG-001-INDEX-NO-CONCURRENTLY',
        title: `Index created without CONCURRENTLY on "${table}"`,
        severity: rows > 50000 ? 'CRITICAL' : 'HIGH',
        category: 'LOCK_BLOCKING',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: 'ShareLock',
        blockedOps: { select: false, insert: true, update: true, delete: true },
        estimatedHoldTime: `${downtimeEst}s (Full table scan)`,
        downtimeRiskSeconds: downtimeEst,
        description: `Creating an index without CONCURRENTLY acquires a ShareLock, blocking all concurrent INSERT, UPDATE, and DELETE queries on "${table}" until the index build finishes.`,
        dbInternalsExplanation: `In PostgreSQL, standard CREATE INDEX scans the entire table while holding a ShareLock. Any incoming write transaction will queue up behind this lock. Subsequent read queries might also get starved in the lock queue if write locks wait first.`,
        safeAlternative: `Use CREATE INDEX CONCURRENTLY, which builds the index in two phases using ShareUpdateExclusiveLock without blocking writes.`,
        safeAlternativeSql: stmt.rawSql.replace(/CREATE\s+(UNIQUE\s+)?INDEX/i, (m) => `${m} CONCURRENTLY`),
        docsReference: 'https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY',
      });
    }

    // RULE 2: Non-concurrent Index Drop (PostgreSQL)
    if (engine === 'postgres' && stmt.operationType === 'DROP_INDEX' && !stmt.hasConcurrentKeyword) {
      issues.push({
        id: `rule-pg-drop-index-concurrently-${stmt.index}`,
        ruleId: 'PG-002-DROP-INDEX-NO-CONCURRENTLY',
        title: `Index dropped without CONCURRENTLY`,
        severity: 'MEDIUM',
        category: 'LOCK_BLOCKING',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: 'AccessExclusiveLock',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: '100ms - 5s (Waits for active queries)',
        downtimeRiskSeconds: 2,
        description: `DROP INDEX acquires an AccessExclusiveLock on the target table, blocking all reads and writes until any active reading query finishes.`,
        dbInternalsExplanation: `While the drop operation itself is fast, acquiring an AccessExclusiveLock queues behind long-running SELECT queries on the table, blocking all subsequent incoming traffic.`,
        safeAlternative: `Execute DROP INDEX CONCURRENTLY to remove the index without acquiring AccessExclusiveLock.`,
        safeAlternativeSql: stmt.rawSql.replace(/DROP\s+INDEX/i, 'DROP INDEX CONCURRENTLY'),
        docsReference: 'https://www.postgresql.org/docs/current/sql-dropindex.html',
      });
    }

    // RULE 3: Adding NOT NULL column without DEFAULT or in legacy engines
    if (stmt.operationType === 'ALTER_TABLE' && upper.includes('ADD') && upper.includes('NOT NULL')) {
      const hasDefault = upper.includes('DEFAULT');
      const isVolatileDefault = hasDefault && (upper.includes('NOW()') || upper.includes('RANDOM()') || upper.includes('GEN_RANDOM_UUID()') || upper.includes('UUID_GENERATE_V4()'));
      
      if (!hasDefault) {
        issues.push({
          id: `rule-add-not-null-no-default-${stmt.index}`,
          ruleId: 'DDL-003-NOT-NULL-NO-DEFAULT',
          title: `Adding NOT NULL column without DEFAULT on "${table}"`,
          severity: 'CRITICAL',
          category: 'TABLE_REWRITE',
          statementIndex: stmt.index,
          line: stmt.startLine,
          rawSql: stmt.rawSql,
          table,
          lockAcquired: engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive',
          blockedOps: { select: true, insert: true, update: true, delete: true },
          estimatedHoldTime: 'Immediate Failure / Lock',
          downtimeRiskSeconds: 5,
          description: `Adding a NOT NULL column without a DEFAULT will fail instantly if the table contains existing rows, or acquire a strong lock.`,
          dbInternalsExplanation: `If table "${table}" has rows, the database engine must check every row or populate it. Without a default value, existing rows would violate the NOT NULL constraint, causing transaction rollback.`,
          safeAlternative: `Follow the Expand/Contract pattern: 1) Add column as nullable. 2) Backfill existing rows. 3) Add NOT NULL check constraint or alter column.`,
          safeAlternativeSql: `-- Step 1: Add column as NULLABLE\n${stmt.rawSql.replace(/NOT\s+NULL/i, '')}\n-- Step 2: Backfill existing records in batches\n-- Step 3: Add constraint with NOT VALID, then VALIDATE`,
          docsReference: 'https://brandur.org/postgres-safe-migrations#not-null',
        });
      } else if (isVolatileDefault && engine === 'postgres') {
        const downtime = Math.round(estimatedScanTimeSec * 2.2);
        issues.push({
          id: `rule-add-volatile-default-${stmt.index}`,
          ruleId: 'PG-004-VOLATILE-DEFAULT-REWRITE',
          title: `Volatile DEFAULT (e.g. NOW(), UUID) forces full table rewrite`,
          severity: 'CRITICAL',
          category: 'TABLE_REWRITE',
          statementIndex: stmt.index,
          line: stmt.startLine,
          rawSql: stmt.rawSql,
          table,
          lockAcquired: 'AccessExclusiveLock',
          blockedOps: { select: true, insert: true, update: true, delete: true },
          estimatedHoldTime: `${downtime}s table rewrite`,
          downtimeRiskSeconds: downtime,
          description: `In PostgreSQL, adding a column with a volatile function default (like now() or uuid_generate_v4()) rewrites the entire table under AccessExclusiveLock.`,
          dbInternalsExplanation: `Since Postgres 11, constant defaults are stored in pg_attribute.atthasmissing (O(1) instant catalog update). However, non-constant/volatile functions must evaluate per row, necessitating a physical rewrite of all disk pages.`,
          safeAlternative: `Add the column as nullable without default, set default for future rows, then backfill existing records in small batches.`,
          safeAlternativeSql: `-- Step 1: Add column NULLABLE without volatile default\nALTER TABLE ${table} ADD COLUMN ...;\n-- Step 2: Set default for future inserts\nALTER TABLE ${table} ALTER COLUMN ... SET DEFAULT ...;\n-- Step 3: Batch backfill`,
          docsReference: 'https://www.postgresql.org/docs/current/ddl-alter.html',
        });
      }
    }

    // RULE 4: Destructive DROP COLUMN (Backwards Compatibility & Pod Crash Risk)
    if (stmt.operationType === 'ALTER_TABLE' && upper.includes('DROP COLUMN')) {
      issues.push({
        id: `rule-drop-column-breaking-${stmt.index}`,
        ruleId: 'DDL-005-EXPAND-CONTRACT-DROP-COLUMN',
        title: `Immediate DROP COLUMN breaks active application instances`,
        severity: 'HIGH',
        category: 'BACKWARDS_INCOMPATIBLE',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: '0.5s - 4s',
        downtimeRiskSeconds: 3,
        description: `Dropping column "${stmt.targetColumn || 'target'}" immediately will crash active application pods that run SELECT * or insert into this column during deployment.`,
        dbInternalsExplanation: `During a zero-downtime rolling deployment, old application code runs concurrently with new schema. If old instances execute queries expecting this column, queries will throw "column does not exist" 500 errors.`,
        safeAlternative: `Contract Phase: 1) Deploy code ignoring/deprecating column. 2) Remove column references in ORM models. 3) Run DDL to drop column only after 100% rollout.`,
        safeAlternativeSql: `-- Safe Deploy Sequence:\n-- Step 1: Deploy App Code removing ORM field mapping\n-- Step 2: Verify zero queries access column\n-- Step 3: Execute DROP COLUMN\n${stmt.rawSql}`,
        docsReference: 'https://martinfowler.com/bliki/ParallelChange.html',
      });
    }

    // RULE 5: Column Rename / Table Rename (Instant Breakage)
    if (stmt.operationType === 'ALTER_TABLE' && (upper.includes('RENAME COLUMN') || upper.includes('RENAME TO'))) {
      issues.push({
        id: `rule-rename-instant-break-${stmt.index}`,
        ruleId: 'DDL-006-RENAME-SCHEMA-BREAKAGE',
        title: `In-place column/table rename breaks active queries`,
        severity: 'HIGH',
        category: 'BACKWARDS_INCOMPATIBLE',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: '1s - 3s',
        downtimeRiskSeconds: 2,
        description: `Renaming a database column or table in-place instantly invalidates all active application queries, prepared statements, and ORM query caches.`,
        dbInternalsExplanation: `Neither PostgreSQL nor MySQL provides transparent column aliases at the table level without views. Renaming breaks existing queries immediately upon transaction commit.`,
        safeAlternative: `Expand/Contract: 1) Add new column. 2) Dual-write via trigger/app code. 3) Backfill historical data. 4) Switch reads to new column. 5) Drop old column.`,
        safeAlternativeSql: `-- Safe Expand-Contract steps:\n-- 1. ALTER TABLE ${table} ADD COLUMN new_name ...;\n-- 2. CREATE TRIGGER sync_columns ... (or app-level dual write)\n-- 3. UPDATE ${table} SET new_name = old_name WHERE new_name IS NULL;\n-- 4. Deploy code reading new_name\n-- 5. Drop old_name`,
        docsReference: 'https://gitlab.com/gitlab-org/gitlab/-/blob/master/doc/development/database/renaming_columns.md',
      });
    }

    // RULE 6: Adding Foreign Key without NOT VALID (PostgreSQL)
    if (engine === 'postgres' && stmt.operationType === 'ALTER_TABLE' && upper.includes('ADD CONSTRAINT') && upper.includes('FOREIGN KEY')) {
      const hasNotValid = upper.includes('NOT VALID');
      if (!hasNotValid) {
        const downtime = Math.round(estimatedScanTimeSec * 1.5);
        issues.push({
          id: `rule-pg-fk-not-valid-${stmt.index}`,
          ruleId: 'PG-007-FK-WITHOUT-NOT-VALID',
          title: `Foreign Key added without NOT VALID blocks all writes`,
          severity: rows > 100000 ? 'CRITICAL' : 'HIGH',
          category: 'LOCK_BLOCKING',
          statementIndex: stmt.index,
          line: stmt.startLine,
          rawSql: stmt.rawSql,
          table,
          lockAcquired: 'AccessExclusiveLock',
          blockedOps: { select: true, insert: true, update: true, delete: true },
          estimatedHoldTime: `${downtime}s (Full sequential scan on both tables)`,
          downtimeRiskSeconds: downtime,
          description: `Adding a Foreign Key constraint checks every existing row across both tables while holding an AccessExclusiveLock on "${table}".`,
          dbInternalsExplanation: `By default, PostgreSQL acquires AccessExclusiveLock and performs an exhaustive scan of both referenced and referencing tables to validate referential integrity, blocking all reads and writes during the scan.`,
          safeAlternative: `Split into two steps: 1) Add constraint with NOT VALID (instant lock). 2) Validate constraint in a separate transaction using VALIDATE CONSTRAINT (holds only ShareRowExclusiveLock).`,
          safeAlternativeSql: `${stmt.rawSql.replace(/;$/, '')} NOT VALID;\nALTER TABLE ${table} VALIDATE CONSTRAINT <constraint_name>;`,
          docsReference: 'https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-NOTES',
        });
      }
    }

    // RULE 7: Altering Column Type (Full Table Rewrite)
    if (stmt.operationType === 'ALTER_TABLE' && upper.includes('ALTER COLUMN') && upper.includes('TYPE')) {
      const isDangerousTypeChange = 
        (upper.includes('INT') && upper.includes('BIGINT')) ||
        (upper.includes('VARCHAR') && upper.includes('INTEGER')) ||
        (upper.includes('JSONB') && upper.includes('USING'));
      
      const downtime = Math.round(estimatedScanTimeSec * 3.0);
      issues.push({
        id: `rule-alter-column-type-${stmt.index}`,
        ruleId: 'DDL-008-TYPE-CHANGE-REWRITE',
        title: `Altering column data type causes complete table rewrite`,
        severity: 'CRITICAL',
        category: 'TABLE_REWRITE',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: engine === 'postgres' ? 'AccessExclusiveLock' : 'MetadataLock_Exclusive',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: `${downtime}s (Rewrites ${rows.toLocaleString()} rows on disk)`,
        downtimeRiskSeconds: downtime,
        description: `Changing a column's physical data type forces the storage engine to unpack and rewrite every single row on disk under exclusive table lock.`,
        dbInternalsExplanation: `Because binary representations differ (e.g. 4-byte integer vs 8-byte bigint or text to jsonb), PostgreSQL creates a new heap file and writes new tuples for every row. Disk I/O saturates and locks out all traffic.`,
        safeAlternative: `Dual-column migration pattern: 1) Add new column with desired type. 2) Dual-write new rows. 3) Backfill historical rows in 5k chunks. 4) Switch read code. 5) Drop old column.`,
        safeAlternativeSql: `-- Safe Expand-Contract Pattern:\nALTER TABLE ${table} ADD COLUMN temp_col <new_type>;\n-- Backfill script with sleep intervals\n-- Update application to use new column`,
        docsReference: 'https://www.postgresql.org/docs/current/sql-altertable.html',
      });
    }

    // RULE 8: Unbounded Bulk DML (Large UPDATE / DELETE without batching)
    if (stmt.operationType === 'DML_BULK' && !upper.includes('LIMIT') && !upper.includes('WHERE')) {
      issues.push({
        id: `rule-unbounded-dml-${stmt.index}`,
        ruleId: 'DML-009-UNBOUNDED-BULK-UPDATE',
        title: `Unbounded bulk ${upper.startsWith('UPDATE') ? 'UPDATE' : 'DELETE'} locks millions of rows`,
        severity: 'CRITICAL',
        category: 'REPLICATION_LAG',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: 'RowExclusiveLock',
        blockedOps: { select: false, insert: false, update: true, delete: true },
        estimatedHoldTime: `${Math.round(estimatedScanTimeSec * 2)}s + Replication Lag`,
        downtimeRiskSeconds: Math.round(estimatedScanTimeSec * 2),
        description: `Executing an unbounded bulk DML statement inside a migration transaction inflates the WAL / redo log, blocks vacuum, and causes severe replication lag on read replicas.`,
        dbInternalsExplanation: `A monolithic UPDATE creates massive MVCC tuple bloat and generates millions of WAL records in a single transaction. Read replicas cannot process other queries while replaying this huge transaction.`,
        safeAlternative: `Batch the update into small chunks of 1,000 to 5,000 rows with a sleep interval between batches.`,
        safeAlternativeSql: `DO $$\nDECLARE\n  rows_updated INT;\nBEGIN\n  LOOP\n    UPDATE ${table} SET ... WHERE id IN (\n      SELECT id FROM ${table} WHERE ... LIMIT 5000\n    );\n    GET DIAGNOSTICS rows_updated = ROW_COUNT;\n    EXIT WHEN rows_updated = 0;\n    PERFORM pg_sleep(0.05); -- Yield locks\n  END LOOP;\nEND $$;`,
        docsReference: 'https://brandur.org/large-scale-backfills',
      });
    }

    // RULE 9: Dangerous TRUNCATE or DROP TABLE
    if (stmt.operationType === 'TRUNCATE' || stmt.operationType === 'DROP_TABLE') {
      issues.push({
        id: `rule-destructive-drop-${stmt.index}`,
        ruleId: 'DDL-010-IRREVERSIBLE-DATA-LOSS',
        title: `Irreversible ${stmt.operationType} on "${table}"`,
        severity: 'HIGH',
        category: 'DATA_LOSS',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table,
        lockAcquired: 'AccessExclusiveLock',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: '1s',
        downtimeRiskSeconds: 1,
        description: `Executing ${stmt.operationType} permanently destroys table data and cannot be rolled back via standard forward migration scripts without snapshot restore.`,
        dbInternalsExplanation: `TRUNCATE and DROP TABLE acquire AccessExclusiveLock and un-link data files. Even within transactions in some engines, recovery requires point-in-time recovery (PITR) from backups.`,
        safeAlternative: `Rename table to a deprecated archive schema first (e.g. "_deprecated_2026_${table}") and drop only after a 30-day quarantine period.`,
        safeAlternativeSql: `ALTER TABLE ${table} RENAME TO _archive_${table}_quarantine;`,
        docsReference: 'https://flywaydb.org/documentation/concepts/migrations#safety',
      });
    }

    // RULE 10: VACUUM FULL / CLUSTER in migration script
    if (stmt.operationType === 'MAINTENANCE' && (upper.includes('FULL') || upper.startsWith('CLUSTER'))) {
      issues.push({
        id: `rule-vacuum-full-${stmt.index}`,
        ruleId: 'PG-011-VACUUM-FULL-LOCK',
        title: `VACUUM FULL / CLUSTER inside migration locks table exclusively`,
        severity: 'CRITICAL',
        category: 'LOCK_BLOCKING',
        statementIndex: stmt.index,
        line: stmt.startLine,
        rawSql: stmt.rawSql,
        table: 'global',
        lockAcquired: 'AccessExclusiveLock',
        blockedOps: { select: true, insert: true, update: true, delete: true },
        estimatedHoldTime: `${Math.round(estimatedScanTimeSec * 4)}s (Full table repacking)`,
        downtimeRiskSeconds: Math.round(estimatedScanTimeSec * 4),
        description: `VACUUM FULL locks the entire table against both reads and writes while repacking data pages. Never run it during online migrations.`,
        dbInternalsExplanation: `Unlike regular VACUUM which runs concurrently, VACUUM FULL rebuilds the table from scratch to reclaim disk space, locking out every application request.`,
        safeAlternative: `Use pg_repack or standard autovacuum tuning to reclaim table space without exclusive locks.`,
        safeAlternativeSql: `-- Use external non-blocking tool: pg_repack -d mydb -t ${table}`,
        docsReference: 'https://reorg.github.io/pg_repack/',
      });
    }

    // RULE 11: MySQL Online DDL ALGORITHM=COPY or Metadata Lock
    if (engine === 'mysql' && stmt.operationType === 'ALTER_TABLE') {
      if (upper.includes('ALGORITHM=COPY') || (!upper.includes('ALGORITHM=INPLACE') && !upper.includes('ALGORITHM=INSTANT'))) {
        issues.push({
          id: `rule-mysql-copy-ddl-${stmt.index}`,
          ruleId: 'MYSQL-012-METADATA-LOCK-COPY',
          title: `MySQL DDL may trigger table copy (ALGORITHM=COPY)`,
          severity: 'HIGH',
          category: 'LOCK_BLOCKING',
          statementIndex: stmt.index,
          line: stmt.startLine,
          rawSql: stmt.rawSql,
          table,
          lockAcquired: 'MetadataLock_Exclusive',
          blockedOps: { select: false, insert: true, update: true, delete: true },
          estimatedHoldTime: `${Math.round(estimatedScanTimeSec * 2.5)}s`,
          downtimeRiskSeconds: Math.round(estimatedScanTimeSec * 2.5),
          description: `In MySQL 8.0 InnoDB, if an ALTER TABLE cannot be completed via INSTANT or INPLACE, MySQL silently falls back to ALGORITHM=COPY, copying the table and locking writes.`,
          dbInternalsExplanation: `MySQL acquires a Metadata Lock (MDL) at statement start. If falling back to COPY, concurrent DML is blocked or buffered in temporary logs, risking replication thread lag.`,
          safeAlternative: `Explicitly declare ALGORITHM=INPLACE, LOCK=NONE, or use gh-ost / pt-online-schema-change for zero-downtime alterations.`,
          safeAlternativeSql: `${stmt.rawSql.replace(/;$/, '')}, ALGORITHM=INPLACE, LOCK=NONE;`,
          docsReference: 'https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html',
        });
      }
    }
  });

  // Check multi-statement lock ordering deadlock hazard
  const distinctTables = Array.from(new Set(parsedStatements.map((s) => s.targetTable).filter((t) => t && t !== 'unknown' && !t.startsWith('index:'))));
  if (distinctTables.length > 1 && parsedStatements.length >= 3) {
    issues.push({
      id: 'rule-multi-table-deadlock',
      ruleId: 'TRANS-013-LOCK-ORDERING-DEADLOCK',
      title: `Multi-table DDL inside single migration script risks distributed deadlock`,
      severity: 'MEDIUM',
      category: 'DEADLOCK_RISK',
      statementIndex: 0,
      line: 1,
      rawSql: `-- Multiple tables modified: ${distinctTables.join(', ')}`,
      table: distinctTables.join(', '),
      lockAcquired: 'AccessExclusiveLock',
      blockedOps: { select: false, insert: true, update: true, delete: true },
      estimatedHoldTime: 'Variable (Deadlock detector timeout)',
      downtimeRiskSeconds: 1,
      description: `Altering multiple tables (${distinctTables.join(', ')}) in a single transaction risks deadlocking with concurrent application queries acquiring locks in different orders.`,
      dbInternalsExplanation: `If transaction T1 acquires Lock(A) and waits for Lock(B), while application transaction T2 holds Lock(B) and queries A, PostgreSQL/MySQL triggers a deadlock cycle and cancels one transaction.`,
      safeAlternative: `Split DDL for distinct tables into separate standalone migration files with lock_timeout set.`,
      safeAlternativeSql: `SET lock_timeout = '3s';\n-- Run table A changes first, commit, then run table B changes.`,
      docsReference: 'https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS',
    });
  }

  // Calculate scores
  const totalWeight = issues.reduce((acc, issue) => {
    switch (issue.severity) {
      case 'CRITICAL': return acc + 35;
      case 'HIGH': return acc + 20;
      case 'MEDIUM': return acc + 10;
      case 'LOW': return acc + 4;
      default: return acc;
    }
  }, 0);

  const rawSafetyScore = Math.max(0, 100 - totalWeight);
  const safetyScore = issues.length === 0 ? 98 : rawSafetyScore;

  let overallRisk: RiskLevel = 'SAFE';
  if (issues.some((i) => i.severity === 'CRITICAL') || safetyScore < 45) {
    overallRisk = 'CRITICAL';
  } else if (issues.some((i) => i.severity === 'HIGH') || safetyScore < 70) {
    overallRisk = 'HIGH';
  } else if (issues.some((i) => i.severity === 'MEDIUM') || safetyScore < 88) {
    overallRisk = 'MEDIUM';
  } else if (issues.length > 0) {
    overallRisk = 'LOW';
  }

  // Score breakdown calculations
  const lockIssues = issues.filter((i) => i.category === 'LOCK_BLOCKING');
  const rewriteIssues = issues.filter((i) => i.category === 'TABLE_REWRITE');
  const compatIssues = issues.filter((i) => i.category === 'BACKWARDS_INCOMPATIBLE');
  const lossIssues = issues.filter((i) => i.category === 'DATA_LOSS');
  const replIssues = issues.filter((i) => i.category === 'REPLICATION_LAG' || i.category === 'DEADLOCK_RISK');

  const lockContentionScore = Math.max(10, 100 - lockIssues.length * 28);
  const tableRewriteScore = Math.max(15, 100 - rewriteIssues.length * 35);
  const backwardsCompatScore = Math.max(20, 100 - compatIssues.length * 30);
  const rollbackScore = Math.max(25, 100 - lossIssues.length * 40);
  const replicationSafetyScore = Math.max(30, 100 - replIssues.length * 25);

  const totalDowntimeSec = issues.reduce((sum, i) => sum + i.downtimeRiskSeconds, 0);

  // Highest lock level
  let highestLock: LockMode = 'None';
  let maxLockRank = 0;
  parsedStatements.forEach((s) => {
    if (LOCK_SEVERITY[s.lockType] > maxLockRank) {
      maxLockRank = LOCK_SEVERITY[s.lockType];
      highestLock = s.lockType;
    }
  });

  // Blocked operations
  const blockedSummary = issues.reduce(
    (acc, i) => ({
      select: acc.select || i.blockedOps.select,
      insert: acc.insert || i.blockedOps.insert,
      update: acc.update || i.blockedOps.update,
      delete: acc.delete || i.blockedOps.delete,
    }),
    { select: false, insert: false, update: false, delete: false }
  );

  // Safe migration multi-phase generator
  const safePhases = generateSafePhases(parsedStatements, issues, engine, workload);
  const rollbackSql = generateRollbackPlan(parsedStatements, engine);

  // Summary Text
  let summaryText = '';
  if (issues.length === 0) {
    summaryText = `Migration is Zero-Downtime Safe! All ${parsedStatements.length} statement(s) adhere to production concurrency standards and do not block reads or writes.`;
  } else {
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const highCount = issues.filter((i) => i.severity === 'HIGH').length;
    summaryText = `Detected ${issues.length} safety violation(s) across ${distinctTables.length || 1} table(s) (${criticalCount} Critical, ${highCount} High). Estimated application lock hold time is ~${totalDowntimeSec}s under ${rows.toLocaleString()} row volume.`;
  }

  return {
    timestamp: new Date().toISOString(),
    safetyScore,
    overallRisk,
    workload,
    totalStatements: parsedStatements.length,
    issues,
    parsedStatements,
    scoreBreakdown: {
      lockContention: lockContentionScore,
      tableRewrite: tableRewriteScore,
      backwardsCompatibility: backwardsCompatScore,
      rollbackReadiness: rollbackScore,
      replicationSafety: replicationSafetyScore,
    },
    metrics: {
      estimatedDowntimeMinSeconds: Math.max(0, Math.floor(totalDowntimeSec * 0.7)),
      estimatedDowntimeMaxSeconds: Math.ceil(totalDowntimeSec * 1.6),
      tablesAffected: distinctTables,
      highestLockAcquired: highestLock,
      blockedOpsSummary: blockedSummary,
      tableRewriteCount: rewriteIssues.length,
      isZeroDowntimeCompliant: issues.length === 0,
    },
    safeMigrationPhases: safePhases,
    unifiedSafeSql: safePhases.map((p) => `-- ${p.phase}: ${p.title}\n${p.sql}`).join('\n\n'),
    rollbackSql,
    summaryText,
  };
}

// Generate Safe Zero-Downtime Multi-Phase Recipe
function generateSafePhases(
  statements: ParsedStatement[],
  issues: DetectedIssue[],
  engine: DatabaseEngine,
  workload: WorkloadProfile
): PhaseStep[] {
  if (statements.length === 0) {
    return [];
  }
  const phases: PhaseStep[] = [];

  // Phase 1: Expand Phase (Safe Non-blocking DDL)
  const p1Sql: string[] = [];
  p1Sql.push(`-- Set defensive statement lock timeout so migration doesn't stall OLTP traffic`);
  if (engine === 'postgres') {
    p1Sql.push(`SET lock_timeout = '${workload.lockTimeoutMs}ms';`);
    p1Sql.push(`SET statement_timeout = '60s';\n`);
  } else if (engine === 'mysql') {
    p1Sql.push(`SET lock_wait_timeout = ${Math.round(workload.lockTimeoutMs / 1000)};\n`);
  }

  statements.forEach((stmt) => {
    let rewritten = stmt.rawSql;
    if (engine === 'postgres') {
      // Fix index creation
      if (stmt.operationType === 'CREATE_INDEX' && !stmt.hasConcurrentKeyword) {
        rewritten = rewritten.replace(/CREATE\s+(UNIQUE\s+)?INDEX/i, (m) => `${m} CONCURRENTLY`);
      }
      // Fix NOT VALID FK
      if (rewritten.toUpperCase().includes('ADD CONSTRAINT') && rewritten.toUpperCase().includes('FOREIGN KEY') && !rewritten.toUpperCase().includes('NOT VALID')) {
        rewritten = rewritten.replace(/;$/, '') + ' NOT VALID;';
      }
      // Fix NOT NULL by removing it for Phase 1
      if (rewritten.toUpperCase().includes('ADD COLUMN') && rewritten.toUpperCase().includes('NOT NULL')) {
        rewritten = rewritten.replace(/NOT\s+NULL/gi, '/* Added in Phase 3 */');
      }
    } else if (engine === 'mysql') {
      if (stmt.operationType === 'ALTER_TABLE' && !rewritten.toUpperCase().includes('ALGORITHM=')) {
        rewritten = rewritten.replace(/;$/, '') + ', ALGORITHM=INPLACE, LOCK=NONE;';
      }
    }
    p1Sql.push(rewritten);
  });

  phases.push({
    stepNumber: 1,
    title: 'Expand Schema (Non-blocking & Concurrent)',
    phase: 'Phase 1: Expand',
    sql: p1Sql.join('\n'),
    explanation: 'Applies non-breaking schema additions with tight lock timeouts. Concurrently creates indexes and adds nullable columns without locking live reads or writes.',
    lockImpact: 'ShareUpdateExclusiveLock / MetadataLock_Shared (Zero OLTP block)',
    downtime: '0.0s (Zero Downtime)',
  });

  // Phase 2: Backfill / Dual-Write
  phases.push({
    stepNumber: 2,
    title: 'Batch Backfill Historical Data & Deploy Dual-Write Code',
    phase: 'Phase 2: Backfill / Dual-Write',
    sql: `-- Phase 2 Application & Data Backfill:\n-- 1. Deploy application code that writes to BOTH old and new columns.\n-- 2. Backfill historical records in controlled batches with sleep throttling:\n\nDO $$\nDECLARE\n  batch_size INT := 5000;\n  updated_count INT;\nBEGIN\n  LOOP\n    -- Update batch without locking the whole table\n    UPDATE ${statements[0]?.targetTable || 'target_table'}\n    SET ...\n    WHERE id IN (\n      SELECT id FROM ${statements[0]?.targetTable || 'target_table'}\n      WHERE ...\n      LIMIT batch_size\n    );\n    GET DIAGNOSTICS updated_count = ROW_COUNT;\n    EXIT WHEN updated_count = 0;\n    PERFORM pg_sleep(0.05); -- Yield lock to OLTP queries\n  END LOOP;\nEND $$;`,
    explanation: 'Safely copies data for millions of existing records without locking the entire table or saturating database replication channels.',
    lockImpact: 'RowExclusiveLock on 5k row chunks only',
    downtime: '0.0s (Zero Downtime)',
  });

  // Phase 3: Switch & Validate Constraints
  const p3Sql: string[] = [];
  statements.forEach((stmt) => {
    if (engine === 'postgres' && stmt.rawSql.toUpperCase().includes('FOREIGN KEY')) {
      const match = stmt.rawSql.match(/CONSTRAINT\s+([`"']?[\w]+[`"']?)/i);
      const constraintName = match ? match[1] : 'fk_constraint_name';
      p3Sql.push(`ALTER TABLE ${stmt.targetTable} VALIDATE CONSTRAINT ${constraintName};`);
    }
    if (stmt.rawSql.toUpperCase().includes('NOT NULL')) {
      p3Sql.push(`-- Validate NOT NULL safely via check constraint\nALTER TABLE ${stmt.targetTable} ADD CONSTRAINT check_${stmt.targetColumn || 'col'}_not_null CHECK (${stmt.targetColumn || 'col'} IS NOT NULL) NOT VALID;\nALTER TABLE ${stmt.targetTable} VALIDATE CONSTRAINT check_${stmt.targetColumn || 'col'}_not_null;`);
    }
  });

  if (p3Sql.length === 0) {
    p3Sql.push(`-- Deploy application code pointing 100% of read and write queries to the new schema schema version.`);
  }

  phases.push({
    stepNumber: 3,
    title: 'Validate Constraints & Switch Application Traffic',
    phase: 'Phase 3: Switch',
    sql: p3Sql.join('\n'),
    explanation: 'Validates foreign key and NOT NULL constraints without full table locks. Completes rolling deployment of updated backend services.',
    lockImpact: 'ShareRowExclusiveLock (Allows concurrent SELECTs)',
    downtime: '0.0s (Zero Downtime)',
  });

  // Phase 4: Contract / Cleanup
  phases.push({
    stepNumber: 4,
    title: 'Contract Phase: Deprecate & Drop Legacy Columns/Indexes',
    phase: 'Phase 4: Contract',
    sql: `-- Run after 100% of old application pods have retired:\n-- DROP redundant legacy columns and obsolete indexes safely\n-- DROP INDEX CONCURRENTLY IF EXISTS old_idx;`,
    explanation: 'Safely removes old columns, temporary sync triggers, and deprecated indexes once all previous application versions are verified offline.',
    lockImpact: 'AccessExclusiveLock (Sub-second catalog unlinking)',
    downtime: '0.0s (Zero Downtime)',
  });

  return phases;
}

// Generate Rollback Plan SQL
function generateRollbackPlan(statements: ParsedStatement[], engine: DatabaseEngine): string {
  if (statements.length === 0) {
    return '';
  }
  const rollbackLines: string[] = [
    `-- ==========================================================`,
    `-- AUTOMATIC ROLLBACK PLAN (Forward-Safe Undo Script)`,
    `-- Target Engine: ${engine.toUpperCase()}`,
    `-- ==========================================================`,
    `BEGIN;`,
    `SET lock_timeout = '3s';`,
    ``,
  ];

  const reversed = [...statements].reverse();

  reversed.forEach((stmt) => {
    const upper = stmt.normalizedSql.toUpperCase();
    if (stmt.operationType === 'CREATE_INDEX') {
      const match = upper.match(/INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([`"']?[\w.]+[`"']?)/i);
      const idxName = match ? match[1] : 'index_name';
      rollbackLines.push(`DROP INDEX ${engine === 'postgres' ? 'CONCURRENTLY ' : ''}IF EXISTS ${idxName};`);
    } else if (stmt.operationType === 'ALTER_TABLE') {
      if (upper.includes('ADD COLUMN')) {
        const match = upper.match(/ADD\s+(?:COLUMN\s+)?([`"']?[\w]+[`"']?)/i);
        const colName = match ? match[1] : 'column_name';
        rollbackLines.push(`ALTER TABLE ${stmt.targetTable} DROP COLUMN IF EXISTS ${colName};`);
      } else if (upper.includes('ADD CONSTRAINT')) {
        const match = upper.match(/CONSTRAINT\s+([`"']?[\w]+[`"']?)/i);
        const constrName = match ? match[1] : 'constraint_name';
        rollbackLines.push(`ALTER TABLE ${stmt.targetTable} DROP CONSTRAINT IF EXISTS ${constrName};`);
      } else {
        rollbackLines.push(`-- TODO: Manual reversal required for: ${stmt.rawSql}`);
      }
    } else {
      rollbackLines.push(`-- WARNING: Irreversible operation in forward flow: ${stmt.rawSql}`);
    }
  });

  rollbackLines.push(`\nCOMMIT;`);
  return rollbackLines.join('\n');
}
