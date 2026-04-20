const TIMEOUT_MS = 20000;
const USER_AGENT = 'SubdomainEnumerator/1.0 (mobile passive recon)';

function normalizeSubdomains(raw: string[], domain: string): string[] {
  const result = new Set<string>();
  for (const entry of raw) {
    const s = entry.toLowerCase().trim().replace(/^\*\./, '').replace(/\.$/, '');
    if (s && (s === domain || s.endsWith(`.${domain}`))) {
      result.add(s);
    }
  }
  return Array.from(result);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, ...options.headers },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCrtsh(domain: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://crt.sh/?q=%.${domain}&output=json`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      name_value?: string;
      common_name?: string;
    }>;
    const names: string[] = [];
    for (const entry of data) {
      for (const n of (entry.name_value ?? '').split('\n')) {
        names.push(n.trim());
      }
      if (entry.common_name) names.push(entry.common_name.trim());
    }
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}

export async function fetchHackertarget(domain: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://api.hackertarget.com/hostsearch/?q=${domain}`
    );
    if (!res.ok) return [];
    const text = await res.text();
    if (text.includes('API count exceeded') || text.startsWith('error')) return [];
    const names = text
      .split('\n')
      .map((line) => line.split(',')[0].trim())
      .filter(Boolean);
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}

export async function fetchRapiddns(domain: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://rapiddns.io/subdomain/${domain}?full=1`
    );
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})/g;
    const names: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      names.push(match[1]);
    }
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}

export async function fetchAlienvault(domain: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/passive_dns`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      passive_dns?: Array<{ hostname?: string }>;
    };
    const names = (data.passive_dns ?? [])
      .map((e) => e.hostname ?? '')
      .filter(Boolean);
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}

export async function fetchUrlscan(domain: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://urlscan.io/api/v1/search/?q=domain:${domain}&size=100`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ page?: { domain?: string } }>;
    };
    const names = (data.results ?? [])
      .map((r) => r.page?.domain ?? '')
      .filter(Boolean);
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}

export async function fetchVirustotal(
  domain: string,
  apiKey: string
): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `https://www.virustotal.com/api/v3/domains/${domain}/subdomains?limit=40`,
      { headers: { 'x-apikey': apiKey } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    const names = (data.data ?? []).map((e) => e.id ?? '').filter(Boolean);
    return normalizeSubdomains(names, domain);
  } catch {
    return [];
  }
}
