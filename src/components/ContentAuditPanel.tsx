import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Activity, AlertTriangle, Link2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditContent, type ContentAuditResult } from '@/src/services/ai';

// ── Content audit, folded into the main audit ────────────────────────────────
// One shared controller (useContentAudit) owns every scrape so the background
// prefetch, "Run Audit" and the Leak Report never pay for the same profile twice.

export const CONTENT_PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Twitter-X', 'YouTube', 'Facebook'];
const MEASURED = ['Instagram', 'TikTok']; // real scraped numbers; everything else is a web-search read
const MAX_PROFILES = 6;
const FRESH_MS = 12 * 60 * 60 * 1000; // matches the server-side Apify cache

export type ProfileInput = { platform: string; handle: string };
type Status = 'running' | 'done' | 'failed';

export const detectProfilePlatform = (h: string, fallback?: string) => {
  const s = h.toLowerCase();
  if (s.includes('instagram.com')) return 'Instagram';
  if (s.includes('tiktok.com')) return 'TikTok';
  if (s.includes('linkedin.com')) return 'LinkedIn';
  if (s.includes('twitter.com') || /(^|\/\/|\.)x\.com\//.test(s)) return 'Twitter-X';
  if (s.includes('youtube.com') || s.includes('youtu.be')) return 'YouTube';
  if (s.includes('facebook.com') || s.includes('fb.com')) return 'Facebook';
  return fallback && CONTENT_PLATFORMS.includes(fallback) ? fallback : 'Instagram';
};

export const keyOf = (p: { platform: string; handle: string }) =>
  `${p.platform}|${p.handle.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '')}`;

// Only treat a handle as "finished typing" if it's a full profile URL or a clean @handle —
// keeps the background prefetch from scraping half-typed usernames.
export const looksComplete = (h: string) =>
  /^(https?:\/\/)?([\w-]+\.)?(instagram|tiktok|linkedin|twitter|x|youtube|facebook|fb)\.com\/\S{2,}/i.test(h.trim()) ||
  /^(https?:\/\/)?youtu\.be\/\S{2,}/i.test(h.trim()) ||
  /^@[\w.]{2,}$/.test(h.trim());

export function profilesFromForm(handles: string[], primaryPlatform?: string): ProfileInput[] {
  const seen = new Set<string>();
  return handles
    .map(h => h.trim())
    .filter(h => h.length >= 2)
    .map(h => ({ platform: detectProfilePlatform(h, primaryPlatform), handle: h }))
    .filter(p => (seen.has(keyOf(p)) ? false : (seen.add(keyOf(p)), true)))
    .slice(0, MAX_PROFILES);
}

export const gradeFromScore = (s: number | null | undefined) =>
  s == null ? null : s >= 90 ? 'A' : s >= 80 ? 'B+' : s >= 70 ? 'B' : s >= 60 ? 'C+' : s >= 50 ? 'C' : s >= 35 ? 'D' : 'F';

const IMPACT_ORDER = ['High', 'Medium', 'Low'];

// Merge per-platform results into the single result the rest of the app reads
// (main audit prompt, Audit Result, Leak Report).
export function combineResults(results: ContentAuditResult[], primaryPlatform?: string): ContentAuditResult | null {
  if (!results.length) return null;
  const scored = results.map(r => r.scores?.overall).filter((v): v is number => v != null);
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  const primary = results.find(r => r.platform === primaryPlatform && r.metrics) || results.find(r => r.metrics) || results[0];
  const withAnalysis = results.filter(r => r.analysis);
  // Primary platform first so its leaks and post ideas lead.
  const ordered = [...withAnalysis].sort((a, b) => (a.platform === primaryPlatform ? -1 : b.platform === primaryPlatform ? 1 : 0));
  return {
    platform: results.length > 1 ? 'All platforms' : results[0].platform,
    handle: results.map(r => r.handle).join(', '),
    dataSource: primary.dataSource,
    dataQuality: withAnalysis.length === results.length ? 'sufficient' : withAnalysis.length ? 'partial' : 'insufficient',
    metrics: primary.metrics,
    scores: overall != null ? { overall, consistency: null, engagement: null, conversionPath: null, formatMix: null } : null,
    grade: gradeFromScore(overall),
    benchmark: null,
    platforms: results,
    auditedAt: Math.max(...results.map(r => r.auditedAt || 0)) || undefined,
    analysis: ordered.length ? {
      verdict: ordered[0].analysis!.verdict,
      whatsWorking: ordered.flatMap(r => (r.analysis!.whatsWorking || []).map(w => (results.length > 1 ? `${r.platform}: ${w}` : w))),
      leaks: ordered
        .flatMap(r => (r.analysis!.leaks || []).map(l => ({ ...l, title: results.length > 1 ? `${r.platform}: ${l.title}` : l.title })))
        .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)),
      contentToOffer: ordered.map(r => r.analysis!.contentToOffer).join(' '),
      nextPosts: ordered.flatMap(r => (r.analysis!.nextPosts || []).map(p => ({ ...p, format: results.length > 1 ? `${r.platform} · ${p.format}` : p.format }))),
      summaryForMainAudit: ordered
        .map(r => `${r.platform} (${r.dataSource === 'web_search' ? 'web read, partial' : 'measured'}${r.scores?.overall != null ? `, ${r.scores.overall}/100` : ''}): ${r.analysis!.summaryForMainAudit}`)
        .join('\n'),
    } : null,
  };
}

// Text handed to the main audit prompt.
export function contentSummaryForAudit(ca: ContentAuditResult | null): string {
  if (!ca?.analysis) return '';
  const n = ca.platforms?.length || 1;
  const head = ca.scores?.overall != null ? `Overall content grade ${ca.grade} (${ca.scores.overall}/100) across ${n} platform${n > 1 ? 's' : ''}.` : '';
  const m = ca.metrics || {};
  const primary = [
    m.engagementRatePct != null ? `Primary platform engagement rate: ${m.engagementRatePct}%.` : '',
    m.postsPerWeek != null ? `Posts per week: ${m.postsPerWeek}.` : '',
  ].filter(Boolean).join(' ');
  return [head, primary, ca.analysis.summaryForMainAudit].filter(Boolean).join('\n');
}

type ControllerArgs = {
  context: { businessName?: string; offer?: string; audience?: string };
  primaryPlatform?: string;
  result: ContentAuditResult | null;
  onResult: (r: ContentAuditResult | null) => void;
};

export function useContentAudit({ context, primaryPlatform, result, onResult }: ControllerArgs) {
  const cache = useRef(new Map<string, ContentAuditResult>());
  const inflight = useRef(new Map<string, Promise<ContentAuditResult | null>>());
  const seq = useRef(0);
  const ctx = useRef(context); ctx.current = context;
  const primary = useRef(primaryPlatform); primary.current = primaryPlatform;
  const emit = useRef(onResult); emit.current = onResult;
  const [status, setStatus] = useState<Record<string, Status>>({});

  // Seed from a restored result (localStorage) so a reload doesn't re-scrape.
  useEffect(() => {
    (result?.platforms || []).forEach(r => {
      const k = keyOf(r);
      if (!cache.current.has(k)) cache.current.set(k, r);
    });
  }, [result]);

  const auditOne = useCallback((p: ProfileInput, force: boolean): Promise<ContentAuditResult | null> => {
    const k = keyOf(p);
    const cached = cache.current.get(k);
    if (!force && cached && cached.auditedAt && Date.now() - cached.auditedAt < FRESH_MS) return Promise.resolve(cached);
    const running = inflight.current.get(k);
    if (running) return running; // background prefetch and Run Audit share one request
    setStatus(s => ({ ...s, [k]: 'running' }));
    const req = auditContent(p.platform, p.handle, ctx.current)
      .then(r => {
        const stamped = { ...r, auditedAt: Date.now() };
        cache.current.set(k, stamped);
        setStatus(s => ({ ...s, [k]: 'done' }));
        return stamped;
      })
      .catch(err => {
        console.error(`[ContentAudit] ${p.platform} failed:`, err);
        setStatus(s => ({ ...s, [k]: 'failed' }));
        return cache.current.get(k) || null; // fall back to an older result if we have one
      })
      .finally(() => inflight.current.delete(k));
    inflight.current.set(k, req);
    return req;
  }, []);

  const ensure = useCallback(async (profiles: ProfileInput[], opts: { force?: boolean } = {}) => {
    const mine = ++seq.current;
    if (!profiles.length) { emit.current(null); return null; }
    const results = await Promise.all(profiles.map(p => auditOne(p, !!opts.force)));
    const combined = combineResults(results.filter((r): r is ContentAuditResult => !!r), primary.current);
    if (mine === seq.current) emit.current(combined); // ignore stale runs for an older profile list
    return combined;
  }, [auditOne]);

  const reset = useCallback(() => { cache.current.clear(); setStatus({}); }, []);

  const statusOf = (p: ProfileInput): Status | 'cached' | 'idle' => {
    const k = keyOf(p);
    if (status[k] === 'running') return 'running';
    if (status[k] === 'failed') return 'failed';
    const c = cache.current.get(k);
    return c ? 'cached' : 'idle';
  };
  const resultOf = (p: ProfileInput) => cache.current.get(keyOf(p)) || null;
  const busy = Object.values(status).includes('running');

  return { ensure, reset, statusOf, resultOf, busy };
}

export type ContentAuditController = ReturnType<typeof useContentAudit>;

const gradeTone = (g: string | null | undefined) =>
  !g ? 'bg-surface-container text-on-surface-variant'
    : g.startsWith('A') || g.startsWith('B') ? 'bg-emerald-500/15 text-emerald-600'
    : g.startsWith('C') ? 'bg-amber-500/15 text-amber-600'
    : 'bg-rose-500/15 text-rose-600';

// Compact status block that sits under the profile links in the assessment form.
export function ContentAuditInline({ profiles, ctl, result }: { profiles: ProfileInput[]; ctl: ContentAuditController; result: ContentAuditResult | null }) {
  if (!profiles.length) {
    return (
      <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
        Add profile links above and we'll audit their content automatically. Instagram and TikTok use real numbers from recent posts; other platforms get a web-search read.
      </p>
    );
  }
  const pending = profiles.some(p => ['idle', 'failed'].includes(ctl.statusOf(p)));
  return (
    <div className="p-4 rounded-xl bg-surface-container-highest space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Content audit</span>
        </div>
        {result?.grade && (
          <span className={cn('text-[11px] font-black px-2 py-0.5 rounded-md', gradeTone(result.grade))}>
            {result.grade} · {result.scores?.overall}/100
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {profiles.map(p => {
          const st = ctl.statusOf(p);
          const r = ctl.resultOf(p);
          return (
            <div key={keyOf(p)} className="flex items-center gap-2 text-xs">
              <span className="font-bold text-on-surface w-20 shrink-0">{p.platform}</span>
              <span className="text-on-surface-variant/70 truncate flex-1 min-w-0">{p.handle}</span>
              {st === 'running' ? (
                <span className="flex items-center gap-1 text-primary font-bold shrink-0"><Loader2 size={12} className="animate-spin" />Auditing</span>
              ) : st === 'failed' && !r ? (
                <span className="flex items-center gap-1 text-rose-600 font-bold shrink-0"><AlertTriangle size={12} />Failed</span>
              ) : r ? (
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('px-1.5 py-0.5 rounded font-black', gradeTone(r.grade))}>{r.grade || (r.analysis ? '~' : '—')}</span>
                  <span className="text-on-surface-variant/60">{r.dataSource === 'web_search' ? 'web read' : 'measured'}</span>
                </span>
              ) : (
                <span className="text-on-surface-variant/50 shrink-0">{MEASURED.includes(p.platform) ? 'real data' : 'web read'} · queued</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="flex items-start gap-1.5 text-[11px] text-on-surface-variant/60 leading-relaxed">
          <Link2 size={12} className="shrink-0 mt-0.5" />
          Runs automatically. Findings go into the Audit Result and Leak Report.
        </span>
        <button
          onClick={() => ctl.ensure(profiles, { force: !pending })}
          disabled={ctl.busy}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary disabled:opacity-40 shrink-0"
        >
          <RefreshCw size={12} className={ctl.busy ? 'animate-spin' : ''} />
          {pending ? 'Audit now' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
