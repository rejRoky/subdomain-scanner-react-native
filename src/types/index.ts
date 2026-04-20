export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SourceSummary {
  name: string;
  count: number;
}

export interface EnumerationResult {
  domain: string;
  live: Record<string, string>;
  dead: string[];
  sources: Record<string, string[]>;
  source_summary: SourceSummary[];
  total: number;
  live_count: number;
  dead_count: number;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  domain: string;
  created_at: string;
  completed_at: string | null;
  progress: string | null;
  result: EnumerationResult | null;
  error: string | null;
  vt_api_key: string | null;
  resolve_dns: number;
}

export interface CreateJobParams {
  domain: string;
  vt_api_key?: string;
  resolve_dns: boolean;
}
