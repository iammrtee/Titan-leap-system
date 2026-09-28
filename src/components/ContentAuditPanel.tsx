import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Activity, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditContent, type ContentAuditResult } from '@/src/services/ai';

const PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter-X', 'TikTok', 'YouTube', 'Facebook'];

const SCORE_ROWS: { key: 'consistency' | 'engagement' | 'conversionPath' | 'formatMix'; label: string; rule: string }[] = [
  { key: 'consistency', label: 'Posting consistency', rule: '4+ posts a week scores 100. Capped at 30 if nothing posted in 14 days.' },
  { key: 'engagement', label: 'Engagement', rule: 'Likes + comments per post ÷ followers. 3%+ scores 100, under 0.5% scores 20.' },
  { key: 'conversionPath', label: 'Path to your offer', rule: 'Link in bio (40), call to action in bio (20), share of captions with a call to action (40).' },
  { key: 'formatMix', label: 'Format mix', rule: '3 formats (Reels, carousels, images) scores 100, 2 scores 75, 1 scores 40.' },
];

const scoreTone = (v: number | null | undefined) =>
  v == null ? 'bg-outline-variant/30' : v >= 70 ? 'bg-emerald-500' : v >= 45 ? 'bg-amber-500' : 'bg-rose-500';

type Props = {
  initialPlatform?: string;
  initialHandle?: string;
  context: { businessName?: string; offer?: string; audience?: string };
  result: ContentAuditResult | null;
  onResult: (r: ContentAuditResult | null) => void;
};

export function ContentAuditPanel({ initialPlatform, initialHandle, context, result, onResult }: Props) {
  const [platform, setPlatform] = useState(initialPlatform && PLATFORMS.includes(initialPlatform) ? initialPlatform : 'Instagram');
  const [handle, setHandle] = useState(initialHandle || '');
  const [running, setRunning] = useState(false);

  // Keep in sync with the Business Assessment form until the user types here.
  useEffect(() => { if (initialPlatform && PLATFORMS.includes(initialPlatform)) setPlatform(initialPlatform); }, [initialPlatform]);
  useEffect(() => { if (initialHandle && !handle) setHandle(initialHandle); }, [initialHandle]);

  const run = async () => {
    if (!handle.trim()) { toast.error('Add the profile link or @handle first.'); return; }
    setRunning(true);
    const t = toast.loading('Auditing content…', { description: platform === 'Instagram' ? 'Pulling their real posts and numbers.' : 'Reading their profile.' });
    try {
      const r = await auditContent(platform, handle.trim(), context);
      onResult(r);
      if (r.dataQuality === 'insufficient') toast.warning("Couldn't see enough of this profile to audit it.", { id: t });
      else toast.success('Content audit ready. It will be included in the full audit.', { id: t });
    } catch (e: any) {
      toast.error('Content audit failed', { id: t, description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  const m = result?.metrics || {};
  const a = result?.analysis;
  const isMeasured = result?.dataSource === 'instagram_api';

  return (
    <div className="w-full space-y-4">
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Content Audit</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Is their content bringing them customers? Instagram uses real numbers from their last posts. Other platforms are read through web search, so treat them as a rough read.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface"
            aria-label="Platform"
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@handle or profile link"
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface"
            aria-label="Profile link or handle"
          />
          <button
            onClick={run}
            disabled={running}
            className="flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            {running ? 'Auditing…' : result ? 'Run again' : 'Run content audit'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">{result.platform} · {result.handle}</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                isMeasured ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
              )}>
                {isMeasured ? 'Measured from real posts' : `Web read · ${result.dataQuality}`}
              </span>
            </div>
            {a ? (
              <p className="text-lg md:text-xl font-bold text-on-surface leading-snug">{a.verdict}</p>
            ) : (
              <p className="text-on-surface-variant">Not enough visible on this profile to audit. Check the handle, or ask the client for screenshots of their insights.</p>
            )}
          </div>

          {result.scores && (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6">
              <div className="flex items-baseline gap-3 mb-4">
                <div className="text-4xl font-black text-on-surface">{result.scores.overall ?? '—'}</div>
                <div className="text-sm text-on-surface-variant">content score out of 100</div>
              </div>
              <div className="space-y-3">
                {SCORE_ROWS.map(row => {
                  const v = result.scores?.[row.key];
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

          {result.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['Followers', m.followers],
                ['Posts, last 30 days', m.postsLast30Days],
                ['Posts per week', m.postsPerWeek],
                ['Engagement rate', m.engagementRatePct != null ? `${m.engagementRatePct}%` : null],
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
                  <div className="space-y-4">
                    {a.leaks.map((l, i) => (
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
      )}
    </div>
  );
}
