import { AnalysisReport, WorkloadProfile } from '../types/analyzer';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

export interface BackendHealthResponse {
  status: 'UP' | 'DEGRADED';
  service: string;
  version: string;
  timestamp: string;
  database: {
    connected: boolean;
    database: string;
    host: string;
    error: string | null;
    serverVersion?: string;
    message?: string;
  };
}

export interface SavedMigrationItem {
  id: string;
  migration_number: string;
  title: string;
  target_engine: string;
  overall_risk: string;
  safety_score: number;
  estimated_downtime_min: number;
  estimated_downtime_max: number;
  highest_lock_acquired: string;
  table_rewrite_count: number;
  issues_count: number;
  author: string;
  commit_hash: string;
  created_at: string;
}

// 1. Check backend & PostgreSQL health
export async function checkBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 2. Fetch past migrations from PostgreSQL
export async function fetchMigrationsList(): Promise<SavedMigrationItem[]> {
  try {
    const res = await fetch(`${API_BASE}/migrations`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.migrations || [];
  } catch {
    return [];
  }
}

// 3. Save migration analysis report into PostgreSQL
export async function saveMigrationToDatabase(params: {
  migrationNumber?: string;
  title?: string;
  rawSql: string;
  report: AnalysisReport;
  author?: string;
  commitHash?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/migrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 4. Request server-side analysis
export async function analyzeViaBackend(
  sql: string,
  workload: WorkloadProfile
): Promise<AnalysisReport | null> {
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, workload }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.report || null;
  } catch {
    return null;
  }
}
