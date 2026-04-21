import * as SQLite from 'expo-sqlite';
import type { Job, JobStatus, EnumerationResult } from '../types';

let db: SQLite.SQLiteDatabase | null = null;
let initialized = false;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('subdomain_enumerator.db');
  }
  if (!initialized) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        domain TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        progress TEXT,
        result TEXT,
        error TEXT,
        vt_api_key TEXT,
        resolve_dns INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS ix_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS ix_jobs_domain ON jobs(domain);
      CREATE INDEX IF NOT EXISTS ix_jobs_created_at ON jobs(created_at);
    `);
    initialized = true;
  }
  return db;
}

export function initDatabase(): void {
  getDb();
}

interface RawJob {
  job_id: string;
  status: JobStatus;
  domain: string;
  created_at: string;
  completed_at: string | null;
  progress: string | null;
  result: string | null;
  error: string | null;
  vt_api_key: string | null;
  resolve_dns: number;
}

function parseJob(raw: RawJob): Job {
  return {
    ...raw,
    result: raw.result ? (JSON.parse(raw.result) as EnumerationResult) : null,
  };
}

export function createJob(params: {
  job_id: string;
  domain: string;
  vt_api_key: string | null;
  resolve_dns: boolean;
}): void {
  getDb().runSync(
    `INSERT INTO jobs (job_id, status, domain, created_at, resolve_dns, vt_api_key)
     VALUES (?, 'pending', ?, ?, ?, ?)`,
    [
      params.job_id,
      params.domain,
      new Date().toISOString(),
      params.resolve_dns ? 1 : 0,
      params.vt_api_key,
    ]
  );
}

export function getAllJobs(): Job[] {
  const rows = getDb().getAllSync<RawJob>(
    'SELECT * FROM jobs ORDER BY created_at DESC'
  );
  return rows.map(parseJob);
}

export function getJob(jobId: string): Job | null {
  const row = getDb().getFirstSync<RawJob>(
    'SELECT * FROM jobs WHERE job_id = ?',
    [jobId]
  );
  return row ? parseJob(row) : null;
}

export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  progress?: string
): void {
  getDb().runSync(
    'UPDATE jobs SET status = ?, progress = ? WHERE job_id = ?',
    [status, progress ?? null, jobId]
  );
}

export function updateJobResult(
  jobId: string,
  result: EnumerationResult
): void {
  getDb().runSync(
    'UPDATE jobs SET status = ?, result = ?, completed_at = ?, progress = NULL WHERE job_id = ?',
    ['completed', JSON.stringify(result), new Date().toISOString(), jobId]
  );
}

export function updateJobError(jobId: string, error: string): void {
  getDb().runSync(
    'UPDATE jobs SET status = ?, error = ?, completed_at = ? WHERE job_id = ?',
    ['failed', error, new Date().toISOString(), jobId]
  );
}

export function deleteJob(jobId: string): void {
  getDb().runSync('DELETE FROM jobs WHERE job_id = ?', [jobId]);
}
