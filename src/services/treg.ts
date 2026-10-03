// Treg (treg.to) market-data client. Every call is optional: if TREG_TOKEN is unset
// the helpers return `{ skipped: true }` and the audit carries on without market data.
// Server-only (reads process.env). Never import from browser code.

const TREG_BASE = "https://treg.to/call";
const DAY = 24 * 60 * 60 * 1000;

export type TregResult<T> = { skipped: true; reason: string } | { skipped: false; data: T };

const dataOf = <T,>(r: TregResult<T>): T | undefined => ((r as any).skipped ? undefined : (r as any).data);

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export const tregEnabled = () => !!process.env.TREG_TOKEN;

async function tregCall<T>(tool: string, body: Record<string, unknown>): Promise<TregResult<T>> {
  const token = process.env.TREG_TOKEN;
  if (!token) return { skipped: true, reason: "TREG_TOKEN not set" };

  const key = `${tool}:${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { skipped: false, data: hit.data as T };

  const headers: Record<string, string> = {
    "X-Treg-Token": token,
    "Content-Type": "application/json",
    // Identity tokens need the team slug; per-org keys ignore it.
    "X-Treg-Org": process.env.TREG_ORG || "titan-leap",
    // Hard cap per call so a routed waterfall can never surprise us.
    "X-Treg-Route-Max-Cost": "0.05",
  };
  try {
    const r = await fetch(`${TREG_BASE}/${tool}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

/** Monthly search volume for a seed keyword in a place (~$0.001). */
export const keywordIdeas = (keyword: string, location: string, limit = 10) =>
  tregCall<{ keywords: any[] }>("treg.google.keywords.ideas", { keyword, location, limit });

/** Google organic results for a query in a place (~$0.001). */
export const serpOrganic = (q: string, location: string, limit = 10) =>
  tregCall<{ results: any[] }>("treg.google.serp.organic", { q, location, limit });

/** Google local pack (rating + review count per business) for a query in a place (~$0.002). */
export const serpLocal = (q: string, location: string, limit = 5) =>
  tregCall<{ results: any[] }>("treg.google.serp.local", { q, location, limit });

/**
 * One market check: demand, who ranks, and local-pack trust. ~$0.005 per audit, cached 24h.
 * Returns raw provider rows reduced to what the audit shows.
 */
export async function marketCheck(opts: { keyword: string; location: string; domain?: string }) {
  if (!tregEnabled()) return { skipped: true as const, reason: "TREG_TOKEN not set" };
  const { keyword, location, domain } = opts;
  const [ideas, organic, local] = await Promise.all([
    keywordIdeas(keyword, location),
    serpOrganic(keyword, location),
    serpLocal(keyword, location),
  ]);

  const norm = (d?: string) => (d || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  const me = norm(domain);

  const top = dataOf(ideas)?.keywords?.[0]?.keyword_data?.keyword_info;
  const demand = top && {
    keyword,
    monthlySearches: top.search_volume ?? null,
    cpc: top.cpc ?? null,
    trend: top.search_volume_trend ?? null,
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
