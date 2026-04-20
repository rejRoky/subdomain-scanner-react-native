const DOH_URL = 'https://cloudflare-dns.com/dns-query';
const MAX_CONCURRENT = 20;
const TIMEOUT_MS = 8000;

interface DoHResponse {
  Status: number;
  Answer?: Array<{ type: number; data: string }>;
}

async function resolveHostname(hostname: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${DOH_URL}?name=${encodeURIComponent(hostname)}&type=A`,
      {
        headers: { Accept: 'application/dns-json' },
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const data: DoHResponse = await res.json();
    if (data.Status !== 0 || !data.Answer) return null;
    const aRecord = data.Answer.find((r) => r.type === 1);
    return aRecord?.data ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveSubdomains(
  subdomains: string[],
  onProgress?: (resolved: number, total: number) => void
): Promise<{ live: Record<string, string>; dead: string[] }> {
  const live: Record<string, string> = {};
  const dead: string[] = [];
  let resolved = 0;

  for (let i = 0; i < subdomains.length; i += MAX_CONCURRENT) {
    const chunk = subdomains.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      chunk.map(async (hostname) => {
        const ip = await resolveHostname(hostname);
        return { hostname, ip };
      })
    );
    for (const { hostname, ip } of results) {
      if (ip) {
        live[hostname] = ip;
      } else {
        dead.push(hostname);
      }
    }
    resolved += chunk.length;
    onProgress?.(Math.min(resolved, subdomains.length), subdomains.length);
  }

  return { live, dead };
}
