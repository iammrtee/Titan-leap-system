// Treg (treg.to) market-data client. Every call is optional: if TREG_TOKEN is unset
// the helpers return `{ skipped: true }` and the audit carries on without market data.
// Server-only (reads process.env). Never import from browser code.

const TREG_BASE = "https://treg.to/call";
const DAY = 24 * 60 * 60 * 1000;

export type TregResult<T> = { skipped: true; reason: string } | { skipped: false; data: T };

const dataOf = <T,>(r: TregResult<T>): T | undefined => ((r as any).skipped ? undefined : (r as any).data);

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export const tregEnabled = () => !!process.env.TREG_TOKEN;

export async function tregCall<T>(tool: string, body: Record<string, unknown>, method: 'POST' | 'GET' = 'POST'): Promise<TregResult<T>> {
  const token = process.env.TREG_TOKEN;
  if (!token) return { skipped: true, reason: "TREG_TOKEN not set" };

  const key = `${method}:${tool}:${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { skipped: false, data: hit.data as T };

  const headers: Record<string, string> = {
    "X-Treg-Token": token,
    "Content-Type": "application/json",
    // Identity tokens need the team slug; per-org keys ignore it.
    "X-Treg-Org": process.env.TREG_ORG || "titan-leap",
    // Hard cap per call. Treg refuses (free, HTTP 402) any route dearer than this, e.g. the
    // $0.09 DataForSEO volume endpoint the router would otherwise pick.
    "X-Treg-Route-Max-Cost": "0.005",
  };
  try {
    const qs = method === 'GET' ? `?${new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]))}` : '';
    const r = await fetch(`${TREG_BASE}/${tool}${qs}`, {
      method,
      headers,
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return { skipped: true, reason: `treg ${tool} HTTP ${r.status}` };
    const json: any = await r.json();
    const data = (json.output ?? json) as T;
    cache.set(key, { data, expiresAt: Date.now() + DAY });
    return { skipped: false, data };
  } catch (e: any) {
    return { skipped: true, reason: `treg ${tool} failed: ${e?.message || e}` };
  }
}

const SERPSTAT_SE: Record<string, string> = {
  'united states': 'g_us', usa: 'g_us', 'united kingdom': 'g_uk', uk: 'g_uk', canada: 'g_ca', australia: 'g_au',
  germany: 'g_de', france: 'g_fr', spain: 'g_es', italy: 'g_it', netherlands: 'g_nl', ireland: 'g_ie',
  'new zealand': 'g_nz', 'south africa': 'g_za', india: 'g_in', nigeria: 'g_ng', brazil: 'g_br', mexico: 'g_mx',
};
const seFor = (location: string) => {
  const last = (location.split(',').pop() || '').trim().toLowerCase();
  return SERPSTAT_SE[last] || 'g_us';
};

/**
 * Monthly Google searches for ONE phrase (~$0.0005, billed per returned row). Volume is
 * country-level, so local intent comes from the phrase itself ("plumber austin").
 * Serpstat is called directly (not via the routed volume endpoint, which can bill $0.09).
 */
export const keywordVolume = (phrase: string, location: string) =>
  tregCall<{ result?: { data?: any[] } }>("serpstat.google.keywords.volume", {
    method: "SerpstatKeywordProcedure.getKeywordsInfo",
    id: "1",
    params: { keywords: [phrase], se: seFor(location) },
  });

/** Google organic results for a query in a place (~$0.001). */
export const serpOrganic = (q: string, location: string, limit = 10) =>
  tregCall<{ results: any[] }>("treg.google.serp.organic", { q, location, limit });

/** Google local pack (rating + review count per business) for a query in a place (~$0.002). */
export const serpLocal = (q: string, location: string, limit = 5) =>
  tregCall<{ results: any[] }>("treg.google.serp.local", { q, location, limit });

/**
 * One market check: demand, who ranks, and local-pack trust. ~$0.003 per audit, cached 24h.
 * Returns raw provider rows reduced to what the audit shows.
 */
export async function marketCheck(opts: { keyword: string; location: string; domain?: string }) {
  if (!tregEnabled()) return { skipped: true as const, reason: "TREG_TOKEN not set" };
  const { keyword, location, domain } = opts;
  // Put the city in the phrase unless the keyword already has it: volume is country-level.
  const parts = location.split(',').map(x => x.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[0] : ''; // a bare country ("United States") is not a city
  const phrase = city && !keyword.toLowerCase().includes(city.toLowerCase()) ? `${keyword} ${city}` : keyword;
  const [volume, organic, local] = await Promise.all([
    keywordVolume(phrase, location),
    serpOrganic(keyword, location),
    serpLocal(keyword, location),
  ]);

  const norm = (d?: string) => (d || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  const me = norm(domain);

  const top = dataOf(volume)?.result?.data?.[0];
  const demand = top && {
    keyword: phrase,
    monthlySearches: top.region_queries_count ?? null,
    cpc: top.cost ?? null,
    trend: null,
  };

  const rows = dataOf(organic)?.results || [];
  const ownRow = me ? rows.find((r: any) => norm(r.link) === me) : undefined;
  const visibility = organic.skipped
    ? null
    : {
        ranksOnPage1: !!ownRow,
        position: ownRow?.position ?? null,
        topResults: rows.slice(0, 5).map((r: any) => ({ position: r.position, title: r.title, link: r.link })),
      };

  const pack = (dataOf(local)?.results || []).map((r: any) => ({
    name: r.title,
    domain: r.domain,
    rating: r.rating?.value ?? null,
    reviews: r.rating?.votes_count ?? null,
  }));
  const ownPack = me ? pack.find((p: any) => norm(p.domain) === me) : undefined;
  const trust = local.skipped ? null : { competitors: pack, own: ownPack ?? null };

  return { skipped: false as const, demand, visibility, trust };
}
