import type { Job, JobStatus, EnumerationResult } from '../types';

const STORAGE_KEY = 'subdomain_enumerator_jobs';

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function initDatabase(): void {}

export function createJob(params: {
  job_id: string;
  domain: string;
  vt_api_key: string | null;
  resolve_dns: boolean;
}): void {
  const jobs = loadJobs();
  jobs.unshift({
    job_id: params.job_id,
    status: 'pending',
    domain: params.domain,
    created_at: new Date().toISOString(),
    completed_at: null,
    progress: null,
    result: null,
    error: null,
    vt_api_key: params.vt_api_key,
    resolve_dns: params.resolve_dns ? 1 : 0,
  });
  saveJobs(jobs);
}

export function getAllJobs(): Job[] {
  return loadJobs();
}

export function getJob(jobId: string): Job | null {
  return loadJobs().find((j) => j.job_id === jobId) ?? null;
}

export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  progress?: string
): void {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.job_id === jobId);
  if (job) {
    job.status = status;
    job.progress = progress ?? null;
    saveJobs(jobs);
  }
}

export function updateJobResult(jobId: string, result: EnumerationResult): void {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.job_id === jobId);
  if (job) {
    job.status = 'completed';
    job.result = result;
    job.completed_at = new Date().toISOString();
    job.progress = null;
    saveJobs(jobs);
  }
}

export function updateJobError(jobId: string, error: string): void {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.job_id === jobId);
  if (job) {
    job.status = 'failed';
    job.error = error;
    job.completed_at = new Date().toISOString();
    saveJobs(jobs);
  }
}

export function deleteJob(jobId: string): void {
  saveJobs(loadJobs().filter((j) => j.job_id !== jobId));
}
