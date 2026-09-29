import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Activity, CheckCircle2, AlertTriangle, ExternalLink, Plus, X, RefreshCw, Link2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditContent, type ContentAuditResult } from '@/src/services/ai';

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Twitter-X', 'YouTube', 'Facebook'];
const MEASURED = ['Instagram', 'TikTok']; // real scraped numbers; everything else is a web-search read
const MAX_PROFILES = 6;

const SCORE_ROWS: { key: 'consistency' | 'engagement' | 'conversionPath' | 'formatMix'; label: string; rule: string }[] = [
  { key: 'consistency', label: 'Posting consistency', rule: '4+ posts a week scores 100. Capped at 30 if nothing posted in 14 days.' },
  { key: 'engagement', label: 'Engagement', rule: 'Likes + comments (+ shares on TikTok) per post ÷ followers, scored against the platform norm.' },
  { key: 'conversionPath', label: 'Path to your offer', rule: 'Link in bio (40), call to action in bio (20), share of captions with a call to action (40).' },
  { key: 'formatMix', label: 'Format mix', rule: 'Instagram only: 3 formats (Reels, carousels, images) scores 100, 2 scores 75, 1 scores 40.' },
];

export type ProfileInput = { platform: string; handle: string };

export const detectProfilePlatform = (h: string, fallback?: string) => {
  const s = h.toLowerCase();
  if (s.includes('instagram.com')) return 'Instagram';
  if (s.includes('tiktok.com')) return 'TikTok';
  if (s.includes('linkedin.com')) return 'LinkedIn';
  if (s.includes('twitter.com') || s.includes('x.com/')) return 'Twitter-X';
  if (s.includes('youtube.com') || s.includes('youtu.be')) return 'YouTube';
  if (s.includes('facebook.com') || s.includes('fb.com')) return 'Facebook';
  return fallback && PLATFORMS.includes(fallback) ? fallback : 'Instagram';
};

const keyOf = (p: ProfileInput) => `${p.platform}|${p.handle.trim().toLowerCase().replace(/\/$/, '')}`;

const gradeFromScore = (s: number | null | undefined) =>
  s == null ? null : s >= 90 ? 'A' : s >= 80 ? 'B+' : s >= 70 ? 'B' : s >= 60 ? 'C+' : s >= 50 ? 'C' : s >= 35 ? 'D' : 'F';

const scoreTone = (v: number | null | undefined) =>
  v == null ? 'bg-outline-variant/30' : v >= 70 ? 'bg-emerald-500' : v >= 45 ? 'bg-amber-500' : 'bg-rose-500';
const gradeTone = (g: string | null | undefined) =>
  !g ? 'bg-surface-container text-on-surface-variant' : g.startsWith('A') || g.startsWith('B') ? 'bg-emerald-500/15 text-emerald-600' : g.startsWith('C') ? 'bg-amber-500/15 text-amber-600' : 'bg-rose-500/15 text-rose-600';

// Merge per-platform results into one result the rest of the app already understands
// (Audit Result + Leak Report read summaryForMainAudit / scores.overall / metrics).
export function combineResults(results: ContentAuditResult[], primaryPlatform?: string): ContentAuditResult | null {
  if (!results.length) return null;
  const scored = results.map(r => r.scores?.overall).filter((v): v is number => v != null);
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  const primary = results.find(r => r.platform === primaryPlatform && r.metrics) || results.find(r => r.metrics) || results[0];
  const withAnalysis = results.filter(r => r.analysis);
  const summary = withAnalysis
    .map(r => `${r.platform} (${r.dataSource === 'web_search' ? 'web read' : 'measured'}${r.scores?.overall != null ? `, ${r.scores.overall}/100` : ''}): ${r.analysis!.summaryForMainAudit}`)
    .join('\n');
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
    analysis: withAnalysis.length ? {
      verdict: withAnalysis.map(r => r.analysis!.verdict).join(' '),
      whatsWorking: withAnalysis.flatMap(r => r.analysis!.whatsWorking || []),
      leaks: withAnalysis.flatMap(r => r.analysis!.leaks || []),
      contentToOffer: withAnalysis.map(r => r.analysis!.contentToOffer).join(' '),
      nextPosts: withAnalysis.flatMap(r => r.analysis!.nextPosts || []),
      summaryForMainAudit: summary,
    } : null,
  };
}

type Props = {
  initialProfiles: ProfileInput[];
  primaryPlatform?: string;
  context: { businessName?: string; offer?: string; audience?: string };
  result: ContentAuditResult | null;
  onResult: (r: ContentAuditResult | null) => void;
};

export function ContentAuditPanel({ initialProfiles, primaryPlatform, context, result, onResult }: Props) {
  const [profiles, setProfiles] = useState<ProfileInput[]>(initialProfiles.length ? initialProfiles : [{ platform: primaryPlatform || 'Instagram', handle: '' }]);
  const [touched, setTouched] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Record<string, 'running' | 'done' | 'failed'>>({});
  const [active, setActive] = useState<string>('overview');

  // Follow the Business Assessment form until the user edits the list here.
  const initialKey = initialProfiles.map(keyOf).join(',');
  useEffect(() => { if (!touched && initialProfiles.length) setProfiles(initialProfiles); }, [initialKey]);

  // Per-profile results already in hand (restored from the combined result), so re-runs
  // only spend credits on new or changed handles.
  const cache = useMemo(() => {
    const m = new Map<string, ContentAuditResult>();
    (result?.platforms || (result && !result.platforms ? [result] : [])).forEach(r => m.set(keyOf({ platform: r.platform, handle: r.handle }), r));
    return m;
  }, [result]);

  const edit = (i: number, patch: Partial<ProfileInput>) => {
    setTouched(true);
    setProfiles(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch, ...(patch.handle != null && !patch.platform ? { platform: detectProfilePlatform(patch.handle, p.platform) } : {}) } : p));
  };

  const run = async (force = false) => {
    const seen = new Set<string>();
    const list = profiles
      .map(p => ({ ...p, handle: p.handle.trim() }))
      .filter(p => p.handle && !seen.has(keyOf(p)) && seen.add(keyOf(p)))
      .slice(0, MAX_PROFILES);
    if (!list.length) { toast.error('Add at least one profile link or @handle.'); return; }

    const todo = force ? list : list.filter(p => !cache.has(keyOf(p)));
    const reused = list.length - todo.length;
    if (!todo.length) { toast.info('All these profiles are already audited. Use "Refresh all" to pull fresh data.'); return; }

    setRunning(true);
    setStatus(Object.fromEntries(todo.map(p => [keyOf(p), 'running'])));
    const t = toast.loading(`Auditing ${todo.length} profile${todo.length > 1 ? 's' : ''}…`, { description: reused ? `${reused} already audited, reusing those results.` : undefined });

    const fresh = await Promise.all(todo.map(async p => {
      try {
        const r = await auditContent(p.platform, p.handle, context);
        setStatus(s => ({ ...s, [keyOf(p)]: 'done' }));
        return r;
      } catch (e: any) {
        setStatus(s => ({ ...s, [keyOf(p)]: 'failed' }));
        toast.error(`${p.platform} audit failed`, { description: e?.message });
        return null;
      }
    }));

    const byKey = new Map(cache);
    fresh.forEach((r, i) => { if (r) byKey.set(keyOf(todo[i]), r); });
    const ordered = list.map(p => byKey.get(keyOf(p))).filter((r): r is ContentAuditResult => !!r);
    const combined = combineResults(ordered, primaryPlatform);
    onResult(combined);
    setRunning(false);
    setActive('overview');
    const ok = fresh.filter(Boolean).length;
    if (ok) toast.success(`Content audit ready across ${ordered.length} platform${ordered.length > 1 ? 's' : ''}. It feeds into the full audit and leak report.`, { id: t });
    else toast.dismiss(t);
  };

  const results = result?.platforms || (result ? [result] : []);
  const current = results.find(r => keyOf({ platform: r.platform, handle: r.handle }) === active);

  return (
    <div className="w-full space-y-4">
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Content Audit</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Is their content bringing them customers? Every profile from the assessment is audited in one run. Instagram and TikTok use real numbers from their latest posts; other platforms are a web-search read, so treat them as a rough guide.
          </p>
        </div>

        <div className="space-y-2">
          {profiles.map((p, i) => {
            const st = status[keyOf({ ...p, handle: p.handle.trim() })];
            const done = cache.has(keyOf({ ...p, handle: p.handle.trim() }));
            return (
              <div key={i} className="grid grid-cols-[150px_1fr_auto_auto] gap-2 items-center">
                <select
                  value={p.platform}
                  onChange={e => edit(i, { platform: e.target.value })}
                  className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-3 text-sm text-on-surface"
                  aria-label="Platform"
                >
                  {PLATFORMS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
                <input
                  value={p.handle}
                  onChange={e => edit(i, { handle: e.target.value })}
                  placeholder="@handle or profile link"
                  className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface"
                  aria-label="Profile link or handle"
                />
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap',
                  st === 'running' ? 'bg-primary/10 text-primary' : st === 'failed' ? 'bg-rose-500/15 text-rose-600' : done ? 'bg-emerald-500/15 text-emerald-600' : MEASURED.includes(p.platform) ? 'bg-surface-container text-on-surface-variant' : 'bg-surface-container text-on-surface-variant/60')}>
                  {st === 'running' ? 'Auditing…' : st === 'failed' ? 'Failed' : done ? 'Audited' : MEASURED.includes(p.platform) ? 'Real data' : 'Web read'}
                </span>
                <button
                  onClick={() => { setTouched(true); setProfiles(ps => ps.filter((_, idx) => idx !== i)); }}
                  disabled={profiles.length === 1}
                  className="p-2 rounded-lg text-on-surface-variant/50 hover:text-rose-500 disabled:opacity-30"
                  aria-label="Remove profile"
                ><X size={16} /></button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setTouched(true); setProfiles(ps => [...ps, { platform: 'Instagram', handle: '' }]); }}
            disabled={profiles.length >= MAX_PROFILES}
            className="flex items-center gap-1.5 text-xs font-bold text-primary disabled:opacity-40"
          ><Plus size={14} /> Add profile</button>
          <div className="flex-1" />
          {results.length > 0 && (
            <button onClick={() => run(true)} disabled={running} className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary disabled:opacity-40">
              <RefreshCw size={14} /> Refresh all
            </button>
          )}
          <button
            onClick={() => run(false)}
            disabled={running}
            className="flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            {running ? 'Auditing…' : results.length ? 'Audit new / changed' : 'Audit all platforms'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {[{ k: 'overview', label: 'Overview' }, ...results.map(r => ({ k: keyOf({ platform: r.platform, handle: r.handle }), label: r.platform }))].map(tab => (
              <button key={tab.k} onClick={() => setActive(tab.k)}
                className={cn('px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-colors',
                  active === tab.k ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:border-primary/40')}>
                {tab.label}
              </button>
            ))}
          </div>

          {active === 'overview' || !current ? (
            <Overview combined={result!} results={results} onOpen={setActive} />
          ) : (
            <PlatformDetail r={current} />
          )}
        </>
      )}
    </div>
  );
}

function Overview({ combined, results, onOpen }: { combined: ContentAuditResult; results: ContentAuditResult[]; onOpen: (k: string) => void }) {
  const leaks = (combined.analysis?.leaks || [])
    .slice()
    .sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.impact) - ['High', 'Medium', 'Low'].indexOf(b.impact))
    .slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex items-center gap-4">
          <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black', gradeTone(combined.grade))}>{combined.grade || '—'}</div>
          <div>
            <div className="text-3xl font-black text-on-surface">{combined.scores?.overall ?? '—'}<span className="text-base text-on-surface-variant font-bold">/100</span></div>
            <div className="text-xs text-on-surface-variant">overall content score, {results.length} platform{results.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="flex-1 flex items-start gap-2 text-xs text-on-surface-variant bg-primary/5 border border-primary/10 rounded-xl p-3">
          <Link2 size={14} className="text-primary shrink-0 mt-0.5" />
          <span>These findings are fed into the <b className="text-on-surface">Audit Result</b> and the <b className="text-on-surface">Leak Report</b> automatically. Re-run the full audit after changing profiles here.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map(r => {
          const k = keyOf({ platform: r.platform, handle: r.handle });
          const er = r.metrics?.engagementRatePct;
          const bm = r.benchmark?.engagementRatePct;
          return (
            <button key={k} onClick={() => onOpen(k)} className="text-left bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">{r.platform}</div>
                  <div className="text-sm font-bold text-on-surface truncate max-w-[180px]">{r.handle}</div>
                </div>
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black', gradeTone(r.grade))}>{r.grade || '—'}</div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className={cn('px-2 py-0.5 rounded-full font-bold', r.dataSource === 'web_search' ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600')}>
                  {r.dataSource === 'web_search' ? `Web read · ${r.dataQuality}` : 'Measured'}
                </span>
                {r.scores?.overall != null && <span className="text-on-surface-variant">{r.scores.overall}/100</span>}
              </div>
              {er != null && (
                <div className="mt-2 text-xs text-on-surface-variant">
                  Engagement <b className="text-on-surface">{er}%</b>{bm != null && <> vs ~{bm}% typical {er >= bm ? '✓' : '↓'}</>}
                </div>
              )}
              <p className="mt-2 text-xs text-on-surface-variant line-clamp-3">{r.analysis?.verdict || 'Not enough visible to audit this profile.'}</p>
            </button>
          );
        })}
      </div>

      {leaks.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-4">Biggest content leaks across platforms</h3>
          <LeakList leaks={leaks} />
        </div>
      )}
    </div>
  );
}

function LeakList({ leaks }: { leaks: NonNullable<ContentAuditResult['analysis']>['leaks'] }) {
  return (
    <div className="space-y-4">
      {leaks.map((l, i) => (
        <div key={i} className="border-l-2 border-rose-500 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500" />
            <span className="font-bold text-on-surface">{i + 1}. {l.title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">Impact {l.impact} · Effort {l.effort}</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1"><b className="text-on-surface">Evidence:</b> {l.evidence}</p>
          <p className="text-sm text-on-surface-variant mt-1"><b className="text-on-surface">Fix:</b> {l.fix}</p>
        </div>
      ))}
    </div>
  );
}

function PlatformDetail({ r }: { r: ContentAuditResult }) {
  const m = r.metrics || {};
  const a = r.analysis;
  const isMeasured = r.dataSource !== 'web_search';
  const bm = r.benchmark?.engagementRatePct;
  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">{r.platform} · {r.handle}</span>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', isMeasured ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600')}>
            {isMeasured ? 'Measured from real posts' : `Web read · ${r.dataQuality}`}
          </span>
          {r.grade && <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black', gradeTone(r.grade))}>Grade {r.grade}</span>}
        </div>
        {a ? <p className="text-lg md:text-xl font-bold text-on-surface leading-snug">{a.verdict}</p>
           : <p className="text-on-surface-variant">Not enough visible on this profile to audit. Check the handle, or ask the client for screenshots of their insights.</p>}
      </div>

      {r.scores && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="text-4xl font-black text-on-surface">{r.scores.overall ?? '—'}</div>
            <div className="text-sm text-on-surface-variant">content score out of 100</div>
          </div>
          <div className="space-y-3">
            {SCORE_ROWS.filter(row => r.scores?.[row.key] != null).map(row => {
              const v = r.scores?.[row.key];
              return (
                <div key={row.key}>
                  <div className="flex justify-between text-sm"><span className="font-semibold text-on-surface">{row.label}</span><span className="font-bold text-on-surface">{v ?? '—'}</span></div>
                  <div className="h-2 rounded-full bg-surface-container mt-1.5 overflow-hidden">
                    <div className={cn('h-full rounded-full', scoreTone(v))} style={{ width: `${v ?? 0}%` }} />
                  </div>
                  <div className="text-[11px] text-on-surface-variant/60 mt-1">{row.rule}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {r.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ['Followers', m.followers],
            ['Posts, last 30 days', m.postsLast30Days],
            ['Posts per week', m.postsPerWeek],
            ['Engagement rate', m.engagementRatePct != null ? `${m.engagementRatePct}%${bm != null ? ` (typical ~${bm}%)` : ''}` : null],
            ['Avg likes', m.avgLikes],
            ['Avg comments', m.avgComments],
            ['Days since last post', m.daysSinceLastPost],
            ['Captions with a CTA', m.captionsWithCtaPct != null ? `${m.captionsWithCtaPct}%` : (m.postsWithCtaPct != null ? `${m.postsWithCtaPct}%` : null)],
          ] as [string, any][]).map(([label, val]) => (
            <div key={label} className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-4">
              <div className="text-[11px] text-on-surface-variant/60">{label}</div>
              <div className="text-xl font-black text-on-surface mt-1">{val ?? 'Not visible'}</div>
            </div>
          ))}
        </div>
      )}

      {a && (
        <>
          {a.leaks?.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-4">Where the content leaks customers</h3>
              <LeakList leaks={a.leaks} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">What's working</h3>
              <ul className="space-y-2">
                {(a.whatsWorking || []).map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-on-surface-variant"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />{w}</li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">Does content lead to the offer?</h3>
              <p className="text-sm text-on-surface-variant">{a.contentToOffer}</p>
            </div>
          </div>

          {a.nextPosts?.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-4">Next 3 posts to make</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {a.nextPosts.map((p, i) => (
                  <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary">{p.format}</div>
                    <p className="font-bold text-on-surface mt-2">"{p.hook}"</p>
                    <p className="text-xs text-on-surface-variant mt-2">{p.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isMeasured && (m.bestPosts?.length > 0) && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">Best and weakest posts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[['Best', m.bestPosts], ['Weakest', m.weakestPosts]].map(([label, list]: any) => (
              <div key={label}>
                <div className="font-bold text-on-surface mb-2">{label}</div>
                <ul className="space-y-2">
                  {(list || []).map((p: any, i: number) => (
                    <li key={i} className="text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{p.engagement} engagements</span> · {p.format} · {p.date}
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 ml-2 text-primary"><ExternalLink size={12} />open</a>}
                      <div className="text-xs mt-0.5">{p.firstLine || '(no caption)'}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
