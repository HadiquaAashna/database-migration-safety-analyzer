export type DatabaseEngine = 'postgres' | 'mysql' | 'sqlite';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

export type IssueCategory = 
  | 'LOCK_BLOCKING'
  | 'TABLE_REWRITE'
  | 'BACKWARDS_INCOMPATIBLE'
  | 'DATA_LOSS'
  | 'REPLICATION_LAG'
  | 'DEADLOCK_RISK'
  | 'TRANSACTION_SAFETY';

export type LockMode = 
  | 'AccessExclusiveLock'
  | 'ExclusiveLock'
  | 'ShareLock'
  | 'ShareUpdateExclusiveLock'
  | 'RowExclusiveLock'
  | 'AccessShareLock'
  | 'MetadataLock_Exclusive'
  | 'MetadataLock_Shared'
  | 'None';

export interface BlockedOperations {
  select: boolean;
  insert: boolean;
  update: boolean;
  delete: boolean;
}

export interface StatementLocation {
  startLine: number;
  endLine: number;
  statementIndex: number;
}

export interface DetectedIssue {
  id: string;
  ruleId: string;
  title: string;
  severity: RiskLevel;
  category: IssueCategory;
  statementIndex: number;
  line: number;
  rawSql: string;
  table: string;
  lockAcquired: LockMode;
  blockedOps: BlockedOperations;
  estimatedHoldTime: string;
  description: string;
  dbInternalsExplanation: string;
  safeAlternative: string;
  safeAlternativeSql: string;
  downtimeRiskSeconds: number;
  docsReference: string;
}

export interface ParsedStatement {
  index: number;
  rawSql: string;
  normalizedSql: string;
  startLine: number;
  endLine: number;
  operationType: string;
  targetTable: string;
  targetColumn?: string;
  isTransactional: boolean;
  hasConcurrentKeyword: boolean;
  lockType: LockMode;
}

export interface WorkloadProfile {
  targetEngine: DatabaseEngine;
  estimatedRowCount: number; // e.g., 500_000
  estimatedTableSizeBytes: number;
  peakQps: number; // queries per second
  lockTimeoutMs: number; // max tolerable lock wait
  environment: 'production-critical' | 'staging' | 'internal-service';
}

export interface PhaseStep {
  stepNumber: number;
  title: string;
  phase: 'Phase 1: Expand' | 'Phase 2: Backfill / Dual-Write' | 'Phase 3: Switch' | 'Phase 4: Contract';
  sql: string;
  explanation: string;
  lockImpact: string;
  downtime: string;
}

export interface AnalysisReport {
  timestamp: string;
  safetyScore: number; // 0 to 100
  overallRisk: RiskLevel;
  workload: WorkloadProfile;
  totalStatements: number;
  issues: DetectedIssue[];
  parsedStatements: ParsedStatement[];
  scoreBreakdown: {
    lockContention: number; // 0 - 100
    tableRewrite: number;
    backwardsCompatibility: number;
    rollbackReadiness: number;
    replicationSafety: number;
  };
  metrics: {
    estimatedDowntimeMinSeconds: number;
    estimatedDowntimeMaxSeconds: number;
    tablesAffected: string[];
    highestLockAcquired: LockMode;
    blockedOpsSummary: BlockedOperations;
    tableRewriteCount: number;
    isZeroDowntimeCompliant: boolean;
  };
  safeMigrationPhases: PhaseStep[];
  unifiedSafeSql: string;
  rollbackSql: string;
  summaryText: string;
}

export interface SampleMigration {
  id: string;
  title: string;
  description: string;
  engine: DatabaseEngine;
  expectedRisk: RiskLevel;
  tableSize: number;
  sql: string;
  tags: string[];
}
