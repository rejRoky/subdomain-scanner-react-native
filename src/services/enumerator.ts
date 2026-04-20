import type { EnumerationResult, CreateJobParams } from '../types';
import {
  fetchCrtsh,
  fetchHackertarget,
  fetchRapiddns,
  fetchAlienvault,
  fetchUrlscan,
  fetchVirustotal,
} from './fetchers';
import { resolveSubdomains } from './resolver';
import {
  createJob as dbCreateJob,
  updateJobStatus,
  updateJobResult,
  updateJobError,
} from './database';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createJob(params: CreateJobParams): string {
  const jobId = generateUUID();
  dbCreateJob({
    job_id: jobId,
    domain: params.domain,
    vt_api_key: params.vt_api_key ?? null,
    resolve_dns: params.resolve_dns,
  });
  return jobId;
}

export async function runEnumeration(
  jobId: string,
  domain: string,
  vtApiKey: string | null,
  resolveDns: boolean
): Promise<void> {
  try {
    updateJobStatus(jobId, 'running', 'Querying passive DNS sources...');

    const fetchers: Array<{ name: string; fn: () => Promise<string[]> }> = [
      { name: 'crt.sh', fn: () => fetchCrtsh(domain) },
      { name: 'hackertarget', fn: () => fetchHackertarget(domain) },
      { name: 'rapiddns', fn: () => fetchRapiddns(domain) },
      { name: 'alienvault', fn: () => fetchAlienvault(domain) },
      { name: 'urlscan.io', fn: () => fetchUrlscan(domain) },
    ];

    if (vtApiKey) {
      fetchers.push({
        name: 'virustotal',
        fn: () => fetchVirustotal(domain, vtApiKey),
      });
    }

    const fetchResults = await Promise.all(
      fetchers.map(({ name, fn }) =>
        fn().then((subdomains) => ({ name, subdomains }))
      )
    );

    const sources: Record<string, string[]> = {};
    const allSet = new Set<string>();
    for (const { name, subdomains } of fetchResults) {
      sources[name] = subdomains;
      subdomains.forEach((s) => allSet.add(s));
    }

    const allSubdomains = Array.from(allSet);
    const source_summary = Object.entries(sources).map(([name, subs]) => ({
      name,
      count: subs.length,
    }));

    let live: Record<string, string> = {};
    let dead: string[] = [];

    if (resolveDns && allSubdomains.length > 0) {
      updateJobStatus(
        jobId,
        'running',
        `Resolving ${allSubdomains.length} subdomains...`
      );
      ({ live, dead } = await resolveSubdomains(
        allSubdomains,
        (done, total) => {
          updateJobStatus(jobId, 'running', `Resolving DNS: ${done}/${total}`);
        }
      ));
    } else {
      dead = allSubdomains;
    }

    const result: EnumerationResult = {
      domain,
      live,
      dead,
      sources,
      source_summary,
      total: allSubdomains.length,
      live_count: Object.keys(live).length,
      dead_count: dead.length,
    };

    updateJobResult(jobId, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJobError(jobId, message);
  }
}
