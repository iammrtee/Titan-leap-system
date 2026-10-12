import React, { useState } from 'react';
import { Loader2, RefreshCw, Pencil, ExternalLink, Instagram, Twitter, Linkedin, Youtube, Play, Facebook } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { CompetitorIntel } from '@/src/services/ai';

export const PLAN_PLATFORMS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'Instagram', label: 'Instagram', icon: <Instagram size={13} /> },
  { id: 'Twitter', label: 'X', icon: <Twitter size={13} /> },
  { id: 'TikTok', label: 'TikTok', icon: <Play size={13} /> },
  { id: 'LinkedIn', label: 'LinkedIn', icon: <Linkedin size={13} /> },
  { id: 'YouTube', label: 'YouTube', icon: <Youtube size={13} /> },
  { id: 'Facebook', label: 'Facebook', icon: <Facebook size={13} /> },
];

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn("text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50", className)}>{children}</p>
);

const fmt = (n: number | null | undefined) =>
  n == null ? null : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n);

export type PlanBrief = {
  websiteUrl: string; businessName: string; mainOffer: string; audience: string; industry: string; socialHandles?: string;
  brandType?: 'personal' | 'business'; pricePoint?: string; result?: string; proof?: string; freeOffer?: string;
  followers?: string; postingNow?: string; goal?: string; contentStyle?: string[]; timePerDay?: string;
  tone?: string; avoid?: string; competitors?: string;
};

export const EMPTY_BRIEF: PlanBrief = {
  websiteUrl: '', businessName: '', mainOffer: '', audience: '', industry: '', socialHandles: '',
  brandType: 'personal', pricePoint: '', result: '', proof: '', freeOffer: '', followers: '', postingNow: '',
  goal: '', contentStyle: [], timePerDay: '', tone: '', avoid: '', competitors: '',
};

const STYLES = ['Talking to camera', 'Voiceover / B-roll', 'Carousels', 'Text posts / threads', 'Faceless'];

const field = "w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20";

export const PlatformPicker: React.FC<{ platforms: string[]; onPlatforms: (p: string[]) => void }> = ({ platforms, onPlatforms }) => {
  const toggle = (id: string) => {
    const next = platforms.includes(id) ? platforms.filter(p => p !== id) : [...platforms, id];
    if (next.length) onPlatforms(next);
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PLAN_PLATFORMS.map(p => (
        <button key={p.id} type="button" onClick={() => toggle(p.id)}
          className={cn("flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all",
            platforms.includes(p.id) ? "bg-primary text-white border-primary" : "border-outline-variant/20 text-on-surface-variant/60 hover:text-on-surface")}>
          {p.icon}{p.label}
        </button>
      ))}
    </div>
  );
};

const Chips: React.FC<{ options: string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }> = ({ options, value, onChange, single }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(o => {
      const on = value.includes(o);
      return (
        <button key={o} type="button" onClick={() => onChange(single ? [o] : on ? value.filter(v => v !== o) : [...value, o])}
          className={cn("text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all",
            on ? "bg-primary text-white border-primary" : "border-outline-variant/20 text-on-surface-variant/70 hover:text-on-surface")}>{o}</button>
      );
    })}
  </div>
);

// Start card for the 30-day plan: build it from the audit, or from a short brief that asks
// for everything the plan needs (offer, buyer, proof, goal, how you like to create).
export const PlanStart: React.FC<{
  auditName: string | null;
  source: 'audit' | 'brief';
  onSource: (s: 'audit' | 'brief') => void;
  brief: PlanBrief;
  onBrief: (b: PlanBrief) => void;
  onSmartFill: () => void;
  smartFilling: boolean;
  platforms: string[];
  onPlatforms: (p: string[]) => void;
  onGenerate: () => void;
  busy: boolean;
  budget: { spent: number; budget: number } | null;
  onCancel?: () => void;
}> = ({ auditName, source, onSource, brief, onBrief, onSmartFill, smartFilling, platforms, onPlatforms, onGenerate, busy, budget, onCancel }) => {
  const b = { ...EMPTY_BRIEF, ...brief };
  const set = (k: keyof PlanBrief) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onBrief({ ...b, [k]: e.target.value });
  const missing = source === 'brief' ? [!b.businessName.trim() && 'your name or brand', !b.mainOffer.trim() && 'what you sell', !b.audience.trim() && 'who you sell to'].filter(Boolean) as string[] : [];
  const ready = source === 'audit' ? !!auditName : missing.length === 0;
  const tab = (id: 'audit' | 'brief', title: string, sub: string, disabled = false) => (
    <button type="button" disabled={disabled} onClick={() => onSource(id)}
      className={cn("flex-1 text-left rounded-2xl border p-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        source === id ? "border-primary bg-primary/5" : "border-outline-variant/15 hover:border-primary/30")}>
      <p className={cn("text-sm font-black", source === id ? "text-primary" : "text-on-surface")}>{title}</p>
      <p className="text-xs text-on-surface-variant/70 mt-0.5">{sub}</p>
    </button>
  );
  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-5 md:p-8 space-y-6 max-w-3xl mx-auto w-full">
      <div className="space-y-1">
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">Build your 30-day Client Engine</h3>
        <p className="text-sm text-on-surface-variant/70">We find your competitors, read what is winning for them, and build 30 days of posts that bring in clients.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {tab('audit', 'From my audit', auditName ? `Uses the audit for ${auditName}` : 'Run an audit first to use this', !auditName)}
        {tab('brief', 'Quick brief', 'No audit needed. Four quick answers.')}
      </div>

      {source === 'brief' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input id="plan-brief-website" value={b.websiteUrl} onChange={set('websiteUrl')} placeholder="Your website or Instagram link" className={field} />
            <button type="button" onClick={onSmartFill} disabled={smartFilling || !b.websiteUrl.trim()}
              className="shrink-0 flex items-center gap-1.5 px-4 rounded-xl bg-surface-container-highest text-on-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
              {smartFilling ? <Loader2 size={13} className="animate-spin" /> : null} Smart Fill
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input id="plan-brief-name" value={b.businessName} onChange={set('businessName')} placeholder="Your name or brand *" className={field} />
            <input id="plan-brief-offer" value={b.mainOffer} onChange={set('mainOffer')} placeholder="What you sell *" className={field} />
            <input id="plan-brief-audience" value={b.audience} onChange={set('audience')} placeholder="Who you sell to *" className={field} />
            <input id="plan-brief-goal" value={b.goal} onChange={set('goal')} placeholder="30-day goal, e.g. 3 new clients" className={field} />
          </div>
          <details className="group">
            <summary className="cursor-pointer list-none text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-primary select-none">
              <span className="group-open:hidden">+ Add more detail (optional, better plan)</span><span className="hidden group-open:inline">− Less detail</span>
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <input id="plan-brief-free" value={b.freeOffer} onChange={set('freeOffer')} placeholder="Free thing people can ask for (e.g. free audit)" className={field} />
              <input id="plan-brief-proof" value={b.proof} onChange={set('proof')} placeholder="A real result you can show" className={field} />
              <input id="plan-brief-tone" value={b.tone} onChange={set('tone')} placeholder="Your tone (e.g. direct, a bit funny)" className={field} />
              <input id="plan-brief-competitors" value={b.competitors} onChange={set('competitors')} placeholder="Competitor links (empty = we find them)" className={field} />
              <div className="sm:col-span-2 space-y-1.5">
                <span className="text-xs font-bold text-on-surface">Formats you're happy to make</span>
                <Chips options={STYLES} value={b.contentStyle || []} onChange={v => onBrief({ ...b, contentStyle: v })} />
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="space-y-2">
        <Label>Posting on</Label>
        <PlatformPicker platforms={platforms} onPlatforms={onPlatforms} />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="button" onClick={onGenerate} disabled={!ready || busy}
          className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null} Generate 30-day plan
        </button>
        {missing.length > 0 && <span className="text-[11px] text-on-surface-variant/60">Still needed: {missing.join(', ')}</span>}
        {onCancel && <button type="button" onClick={onCancel} className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface">Cancel</button>}
        {budget && <span className="sm:ml-auto text-[10px] text-on-surface-variant/40">AI spend this month: ${budget.spent.toFixed(2)} of ${budget.budget.toFixed(2)}</span>}
      </div>
    </div>
  );
};

// Competitor Analysis tab: who the plan learns from, and what is winning for them.
export const PlanCompetitors: React.FC<{
  intel: CompetitorIntel | null;
  input: string;
  onInput: (v: string) => void;
  onResearch: () => void;
  busy: boolean;
}> = ({ intel, input, onInput, onResearch, busy }) => {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 p-5 md:p-7 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-black tracking-tight text-on-surface">Competitors for your 30-day plan</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/70">Picked automatically when you generate a plan. Change them here any time.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:text-primary">
              <Pencil size={12} /> Choose my own
            </button>
            {intel && (
              <button onClick={onResearch} disabled={busy} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:text-primary disabled:opacity-40">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
              </button>
            )}
          </div>
        </div>
        {busy ? (
          <p className="flex items-center gap-2 text-sm font-bold text-primary"><Loader2 size={14} className="animate-spin" /> Finding competitors and reading their best posts (1–2 min)…</p>
        ) : intel?.competitors?.length ? (
          <div className="flex flex-wrap gap-2">
            {intel.competitors.map((c: any, i: number) => (
              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 text-on-surface">
                {c.platform === 'web' ? c.handle : `@${c.handle}`}
                <span className="font-medium text-on-surface-variant/60"> · {c.source === 'scraped' ? `${c.postsAnalyzed} posts read` : 'web research'}</span>
              </span>
            ))}
            <span className="text-[10px] text-on-surface-variant/50 self-center">Researched {new Date(intel.researchedAt).toLocaleDateString()}</span>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant/60">None yet. Generate a plan and we will pick them from your business details, or choose your own.</p>
        )}
        {editing && (
          <div className="flex flex-col md:flex-row gap-2">
            <textarea value={input} onChange={e => onInput(e.target.value)} rows={3}
              placeholder={"One per line. Instagram or TikTok links give the best data.\nhttps://www.instagram.com/competitor"}
              className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            <button onClick={() => { setEditing(false); onResearch(); }} disabled={!input.trim()}
              className="md:w-40 bg-primary text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40">
              Research these
            </button>
          </div>
        )}
      </div>
      <WinningPosts intel={intel} />
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <section className={cn("bg-surface-container-low p-5 md:p-7 rounded-3xl border border-outline-variant/10 space-y-4", className)}>{children}</section>
);
const H: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({ eyebrow, title, sub }) => (
  <div className="space-y-1">
    <Label className="text-primary/70">{eyebrow}</Label>
    <h4 className="font-black text-lg md:text-xl tracking-tight text-on-surface">{title}</h4>
    {sub && <p className="text-xs md:text-sm text-on-surface-variant/70 font-medium">{sub}</p>}
  </div>
);

// The top half of the plan: the system that turns posts into clients.
export const EngineTop: React.FC<{ plan: any }> = ({ plan }) => {
  const e = plan?.engine;
  if (!e) return null;
  return (
    <div className="space-y-6">
      {e.bigIdea && (
        <div className="rounded-3xl bg-primary text-white p-6 md:p-8 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">The one idea</p>
          <p className="text-lg md:text-2xl font-black leading-snug tracking-tight">{e.bigIdea}</p>
          {e.cta && <p className="text-xs md:text-sm font-bold text-white/80 pt-1">Every post ends with: “{e.cta}”</p>}
        </div>
      )}
      {e.funnel?.length > 0 && (
        <Card>
          <H eyebrow="From post to paying client" title="The funnel" />
          <div className="flex flex-wrap gap-2">
            {e.funnel.map((s: any, i: number) => (
              <div key={i} className={cn("flex-1 min-w-[130px] rounded-xl border p-3 space-y-0.5",
                i >= e.funnel.length - 2 ? "border-amber-400/60 bg-amber-400/5" : "border-outline-variant/15 bg-surface-container-lowest")}>
                <p className="text-xs font-black text-on-surface">{s.step}</p>
                <p className="text-[11px] text-on-surface-variant/70 leading-snug">{s.detail}</p>
              </div>
            ))}
          </div>
          {e.bio && <p className="text-xs text-on-surface-variant/70"><span className="font-black text-on-surface">Bio:</span> {e.bio}</p>}
        </Card>
      )}
    </div>
  );
};

// Real competitor posts that won, with numbers and links. This is the evidence the plan copies.
export const WinningPosts: React.FC<{ intel: CompetitorIntel | null }> = ({ intel }) => {
  if (!intel?.competitors?.length) return null;
  const posts = intel.competitors
    .flatMap((c: any) => (c.topPosts || []).map((t: any) => ({ ...t, handle: c.handle, platform: c.platform })))
    .sort((a: any, b: any) => (b.timesMedian || 0) - (a.timesMedian || 0))
    .slice(0, 9);
  const pb = intel.playbook || {};
  return (
    <Card>
      <H eyebrow="What is already winning" title="Competitors’ best posts"
        sub={pb.summary || 'Real posts that beat each account’s usual numbers. The plan copies their structure, never their words.'} />
      {posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {posts.map((p: any, i: number) => (
            <div key={i} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 p-4 flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-on-surface truncate">@{p.handle}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-primary/70 shrink-0">{p.platform} · {p.format}</span>
              </div>
              <p className="text-xs text-on-surface-variant/90 leading-snug line-clamp-4">{p.caption || '(no caption)'}</p>
              <div className="flex items-center gap-3 text-[10px] font-bold text-on-surface-variant/60 mt-auto tabular-nums">
                {p.views ? <span>{fmt(p.views)} views</span> : null}
                {p.likes != null ? <span>{fmt(p.likes)} likes</span> : null}
                {p.comments ? <span>{fmt(p.comments)} comments</span> : null}
                {p.timesMedian ? <span className="text-emerald-600">{p.timesMedian}× their usual</span> : null}
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline flex items-center gap-0.5">Open <ExternalLink size={10} /></a>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(pb.winningPatterns?.length > 0 || pb.provenHooks?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {pb.winningPatterns?.length > 0 && (
            <div className="space-y-2">
              <Label>Patterns that win</Label>
              {pb.winningPatterns.slice(0, 5).map((w: any, i: number) => (
                <div key={i} className="text-xs">
                  <p className="font-black text-on-surface">{w.pattern} <span className="font-bold text-primary/70">· {w.format}</span></p>
                  <p className="text-on-surface-variant/70">{w.whyItWorks} <span className="text-emerald-600 font-bold">{w.evidence}</span></p>
                </div>
              ))}
            </div>
          )}
          {pb.provenHooks?.length > 0 && (
            <div className="space-y-2">
              <Label>Their hook → our version</Label>
              {pb.provenHooks.slice(0, 5).map((h: any, i: number) => (
                <div key={i} className="text-xs">
                  <p className="text-on-surface-variant/60 italic">“{h.original}”</p>
                  <p className="font-bold text-on-surface">→ {h.ourVersion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {(pb.gaps?.length > 0 || pb.avoid?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {pb.gaps?.length > 0 && <div className="space-y-1"><Label>Gaps we can own</Label>{pb.gaps.map((g: string, i: number) => <p key={i} className="text-on-surface-variant/80">• {g}</p>)}</div>}
          {pb.avoid?.length > 0 && <div className="space-y-1"><Label>Avoid</Label>{pb.avoid.map((g: string, i: number) => <p key={i} className="text-on-surface-variant/80">• {g}</p>)}</div>}
        </div>
      )}
    </Card>
  );
};

// Pillars, weekly rhythm and the 30-day arc: what to post, when, and the story across the month.
export const EngineMiddle: React.FC<{ plan: any }> = ({ plan }) => {
  const e = plan?.engine;
  if (!e) return null;
  return (
    <div className="space-y-6">
      {e.pillars?.length > 0 && (
        <Card>
          <H eyebrow="What we post" title="Content pillars" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {e.pillars.map((p: any, i: number) => (
              <div key={i} className="border-t-[3px] border-primary pt-3 space-y-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-black text-on-surface">{p.name}</p>
                  <span className="text-[10px] font-black text-on-surface-variant/50 shrink-0">{p.share}</span>
                </div>
                <p className="text-xs text-on-surface-variant/80">{p.what}</p>
                {p.example && <p className="text-xs italic text-on-surface-variant/60">“{p.example}”</p>}
              </div>
            ))}
          </div>
          {e.repurpose && <p className="text-xs text-on-surface-variant/70">{e.repurpose}</p>}
        </Card>
      )}
      {e.weeklyRhythm?.length > 0 && (
        <Card>
          <H eyebrow="When we post" title="Weekly rhythm" />
          <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Day</th>
                  {(e.rhythmColumns || ['Post']).map((c: string) => (
                    <th key={c} className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">{c}</th>
                  ))}
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Pillar</th>
                </tr>
              </thead>
              <tbody>
                {e.weeklyRhythm.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-outline-variant/10 align-top">
                    <td className="p-3 font-black text-on-surface">{r.day}</td>
                    {(e.rhythmColumns || ['Post']).map((c: string, j: number) => (
                      <td key={c} className="p-3 text-on-surface-variant/90">{(r.posts || [])[j] || '—'}</td>
                    ))}
                    <td className="p-3"><span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-primary whitespace-nowrap">{r.pillar || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {e.arc?.length > 0 && (
        <Card>
          <H eyebrow="The story across the month" title="30-day arc" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {e.arc.map((a: any, i: number) => (
              <div key={i} className="rounded-2xl bg-surface-container-lowest p-4 space-y-1 min-w-0">
                <Label>{a.days}</Label>
                <p className="text-sm font-black text-on-surface">{a.title}</p>
                <p className="text-xs text-on-surface-variant/80">{a.focus}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// After the 30 days: what to say to leads and how to keep score.
export const EngineBottom: React.FC<{ plan: any }> = ({ plan }) => {
  const e = plan?.engine;
  if (!e) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {e.scripts?.length > 0 && (
        <Card>
          <H eyebrow="What we say" title="Lead scripts" />
          {e.scripts.map((s: any, i: number) => (
            <div key={i} className="border-l-[3px] border-amber-400 pl-3 space-y-0.5">
              <Label>{s.label}</Label>
              <p className="text-xs text-on-surface font-medium whitespace-pre-line">{s.text}</p>
            </div>
          ))}
        </Card>
      )}
      {e.scoreboard?.length > 0 && (
        <Card>
          <H eyebrow="How we know it works" title="Scoreboard" sub={e.scoreboardNote} />
          <div className="divide-y divide-outline-variant/10">
            {e.scoreboard.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="font-bold text-on-surface-variant">{m.metric}</span>
                <span className="font-black text-primary tabular-nums whitespace-nowrap">{m.target}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-on-surface-variant/50">Targets to steer by, not promises.</p>
        </Card>
      )}
    </div>
  );
};
