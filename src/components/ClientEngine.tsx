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
  <p className={cn("text-[11px] font-medium text-on-surface-variant/60", className)}>{children}</p>
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
  <section className={cn("bg-surface-container-lowest p-6 md:p-8 rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)] space-y-5", className)}>{children}</section>
);
const H: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({ eyebrow, title, sub }) => (
  <div className="space-y-1">
    <Label className="text-primary">{eyebrow}</Label>
    <h4 className="font-semibold text-xl md:text-2xl tracking-tight text-on-surface">{title}</h4>
    {sub && <p className="text-xs md:text-sm text-on-surface-variant/70 font-medium">{sub}</p>}
  </div>
);

const firstSentence = (t?: string) => (String(t || '').match(/^.*?[.!?](\s|$)/)?.[0] || String(t || '')).trim();

const SHADOW = "shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const STAGE_UI: Record<string, { label: string; chip: string }> = {
  draft: { label: 'Needs design', chip: 'bg-slate-100 text-slate-600' },
  ready: { label: 'Ready', chip: 'bg-sky-50 text-sky-700' },
  approved: { label: 'Approved', chip: 'bg-emerald-50 text-emerald-700' },
  scheduled: { label: 'Scheduled', chip: 'bg-amber-50 text-amber-700' },
  published: { label: 'Posted', chip: 'bg-violet-50 text-violet-700' },
};

// The headline of the plan: the one idea, the CTA, the why, and the two main actions.
export const OneIdea: React.FC<{ plan: any; onRefine?: () => void; onNewPlan?: () => void }> = ({ plan, onRefine, onNewPlan }) => {
  const e = plan?.engine || {};
  const idea = e.bigIdea || firstSentence(plan?.strategicSyncSummary?.[0]);
  if (!idea) return null;
  return (
    <section className="rounded-[22px] bg-primary text-white p-7 md:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="space-y-3 max-w-4xl">
        <p className="text-[13px] font-semibold text-amber-300">The one idea</p>
        <p className="text-xl md:text-[28px] font-semibold leading-snug tracking-tight">{idea}</p>
        {e.cta && <p className="text-sm text-white/80">Every post ends with “{e.cta}”</p>}
      </div>
      {(onRefine || onNewPlan) && (
        <div className="flex gap-2 shrink-0">
          {onRefine && <button onClick={onRefine} className="h-10 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold transition-colors">Refine</button>}
          {onNewPlan && <button onClick={onNewPlan} className="h-10 px-4 rounded-xl bg-white text-primary text-sm font-semibold hover:bg-white/90 transition-colors">New plan</button>}
        </div>
      )}
    </section>
  );
};

type OverviewItem = { id: string; day: number; month: number; year: number; platform: string; title: string; status: string };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// At-a-glance plan: numbers, this week's posts with their stage, the content mix and the arc.
export const PlanOverview: React.FC<{
  plan: any;
  items: OverviewItem[];
  onOpenCalendar: () => void;
  onOpenItem: (id: string) => void;
}> = ({ plan, items, onOpenCalendar, onOpenItem }) => {
  const e = plan?.engine || {};
  const cal: any[] = plan?.calendar || [];
  const byPlatform = items.reduce<Record<string, number>>((m, it) => { m[it.platform] = (m[it.platform] || 0) + 1; return m; }, {});
  const platformLine = Object.entries(byPlatform).map(([p, n]) => `${n} ${p === 'Twitter' ? 'X' : p}`).join(' · ') || `${cal.length} days planned`;
  const ready = items.filter(it => it.status !== 'draft').length;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const week = items
    .filter(it => { const d = new Date(it.year, it.month, it.day); return d >= start && d < end; })
    .sort((a, b) => +new Date(a.year, a.month, a.day) - +new Date(b.year, b.month, b.day));
  const needDesign = week.filter(it => it.status === 'draft').length;
  const pillars: { name: string; pct: number }[] = (e.pillars || []).slice(0, 5).map((p: any) => ({ name: p.name, pct: Math.max(0, Math.min(100, parseInt(String(p.share || ''), 10) || 0)) }));
  const tile = `bg-surface-container-lowest rounded-[18px] p-5 ${SHADOW} flex flex-col gap-1 min-w-0`;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={tile}>
          <span className="text-[13px] text-on-surface-variant/70">Posts planned</span>
          <span className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface tabular-nums">{items.length || cal.length}</span>
          <span className="text-[13px] font-medium text-primary truncate">{platformLine}</span>
        </div>
        <div className={tile}>
          <span className="text-[13px] text-on-surface-variant/70">Ready to post</span>
          <span className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface tabular-nums">{ready}<span className="text-lg font-medium text-on-surface-variant/50"> / {items.length}</span></span>
          <div className="h-1.5 rounded-full bg-surface-container-high mt-1.5"><div className="h-1.5 rounded-full bg-sky-600" style={{ width: `${items.length ? Math.round((ready / items.length) * 100) : 0}%` }} /></div>
        </div>
        <div className={tile}>
          <span className="text-[13px] text-on-surface-variant/70">This week</span>
          <span className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface tabular-nums">{week.length}</span>
          <span className={cn("text-[13px] font-medium", needDesign ? "text-amber-600" : "text-emerald-600")}>{needDesign ? `${needDesign} need design` : week.length ? 'All have designs' : 'Nothing scheduled'}</span>
        </div>
        <div className={tile}>
          <span className="text-[13px] text-on-surface-variant/70">{e.cta ? `${(e.cta.match(/\b[A-Z]{3,}\b/) || ['Lead'])[0]} replies` : 'Leads from posts'}</span>
          <span className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface-variant/40">—</span>
          <span className="text-[13px] text-on-surface-variant/60">Fills in once posts go live</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 items-start">
        <section className={`flex-[999_1_520px] min-w-0 bg-surface-container-lowest rounded-[18px] p-6 ${SHADOW} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold tracking-tight text-on-surface">This week</h3>
            <button onClick={onOpenCalendar} className="text-sm font-semibold text-primary hover:underline">Open calendar →</button>
          </div>
          {week.length ? (
            <div className="divide-y divide-outline-variant/10">
              {week.map(it => (
                <button key={it.id} onClick={() => onOpenItem(it.id)} className="w-full grid grid-cols-[64px_70px_minmax(0,1fr)_auto] gap-3 items-center py-3 text-left hover:bg-surface-container-low/60 rounded-lg px-1 transition-colors">
                  <span className="text-[13px] text-on-surface-variant/70">{DOW[new Date(it.year, it.month, it.day).getDay()]} {it.day}</span>
                  <span className="text-[13px] font-semibold text-primary truncate">{it.platform === 'Twitter' ? 'X' : it.platform}</span>
                  <span className="text-sm font-medium text-on-surface truncate">{it.title}</span>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", (STAGE_UI[it.status] || STAGE_UI.draft).chip)}>● {(STAGE_UI[it.status] || STAGE_UI.draft).label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/70 py-4">Nothing on the calendar for the next 7 days. Use “Sync to calendar” in Plan details, or import posts on the Calendar tab.</p>
          )}
        </section>

        <section className={`flex-[1_1_320px] min-w-0 bg-surface-container-lowest rounded-[18px] p-6 ${SHADOW} space-y-4`}>
          <h3 className="text-xl font-semibold tracking-tight text-on-surface">Content mix</h3>
          <div className="space-y-3">
            {pillars.map(p => (
              <div key={p.name} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm"><span className="font-medium text-on-surface truncate">{p.name}</span><span className="text-on-surface-variant/70 tabular-nums">{p.pct ? `${p.pct}%` : ''}</span></div>
                <div className="h-2 rounded-full bg-surface-container-high"><div className="h-2 rounded-full bg-primary" style={{ width: `${p.pct || 10}%` }} /></div>
              </div>
            ))}
          </div>
          {e.repurpose && (
            <div className="pt-3 border-t border-outline-variant/10 space-y-1">
              <p className="text-[13px] text-on-surface-variant/70">How each idea is reused</p>
              <p className="text-sm text-on-surface">{e.repurpose}</p>
            </div>
          )}
        </section>
      </div>

      {e.arc?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {e.arc.map((a: any, i: number) => (
            <div key={i} className={`bg-surface-container-lowest rounded-[18px] p-5 ${SHADOW} space-y-1.5 min-w-0`}>
              <p className="text-xs text-on-surface-variant/70">{a.days}</p>
              <p className="text-base font-semibold tracking-tight text-on-surface">{a.title}</p>
              <p className="text-[13px] text-on-surface-variant/80 leading-relaxed">{a.focus}</p>
            </div>
          ))}
        </div>
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

// The plan, arranged like Content Production: a stat row and tabs with equal spacing.
type PlanTabId = 'plan' | 'pillars' | 'rhythm' | 'scripts';
export const PlanTabs: React.FC<{ plan: any; days: React.ReactNode; hideStats?: boolean }> = ({ plan, days, hideStats }) => {
  const [tab, setTab] = useState<PlanTabId>('pillars');
  const e = plan?.engine || {};
  const cal: any[] = plan?.calendar || [];
  const written = cal.filter(d => d.full).length;
  const pillars: any[] = (e.pillars || []).slice(0, 4);
  const tabs: { id: PlanTabId; label: string; count: number }[] = [
    { id: 'pillars', label: 'Content Pillars', count: pillars.length },
    { id: 'rhythm', label: 'Rhythm & KPIs', count: (e.weeklyRhythm || []).length },
    { id: 'plan', label: '30-Day Plan', count: cal.length },
    { id: 'scripts', label: 'Lead Scripts', count: (e.scripts || []).length },
  ];
  const stats = [
    { label: 'Posts planned', value: cal.length, sub: `${(plan?.platforms || []).map((p: string) => p === 'Twitter' ? 'X' : p).join(', ') || 'All platforms'}`, sc: 'text-primary' },
    { label: 'Written in full', value: `${written}/${cal.length}`, sub: written === cal.length && cal.length ? 'All ready' : 'Open a day to write it', sc: 'text-amber-500' },
    { label: 'Content pillars', value: pillars.length, sub: pillars.map(p => p.name).slice(0, 2).join(' · '), sc: 'text-cyan-500' },
    { label: 'Call to action', value: e.offer ? '1' : '—', sub: e.offer || 'Set in the plan', sc: 'text-green-500' },
  ];
  const th = "text-left p-3 text-xs font-medium text-on-surface-variant/60";
  return (
    <div className="space-y-6">
      {!hideStats && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(t => (
          <div key={t.label} className="bg-surface-container-lowest rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)] p-5 min-w-0">
            <p className="text-xs font-medium text-on-surface-variant/60">{t.label}</p>
            <p className="text-3xl md:text-4xl font-semibold tracking-tight text-on-surface mt-1 tabular-nums">{t.value}</p>
            <p className={cn("text-xs font-medium truncate mt-0.5", t.sc)} title={t.sub}>{t.sub}</p>
          </div>
        ))}
      </div>}

      <div className="flex items-center justify-between gap-4 border-b border-outline-variant/15 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("relative flex items-center gap-2 py-4 text-[15px] font-semibold tracking-tight whitespace-nowrap transition-colors",
                active ? "text-primary" : "text-on-surface-variant/60 hover:text-on-surface")}>
              {t.label}
              <span className={cn("min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center transition-colors",
                active ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant/70")}>{t.count}</span>
              <span className={cn("absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all", active ? "bg-primary" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      {tab === 'plan' && (
        <div className="space-y-6">
          {!hideStats && e.arc?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {e.arc.map((a: any, i: number) => (
                <div key={i} className="rounded-[18px] bg-surface-container-lowest shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)] p-5 space-y-1.5 min-w-0">
                  <Label>{a.days}</Label>
                  <p className="text-base font-semibold tracking-tight text-on-surface">{a.title}</p>
                  <p className="text-sm text-on-surface-variant/80 leading-relaxed">{a.focus}</p>
                </div>
              ))}
            </div>
          )}
          {days}
        </div>
      )}

      {tab === 'pillars' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <H eyebrow="What we post" title="Content pillars" sub={e.repurpose} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pillars.map((p: any, i: number) => (
                <div key={i} className="border-t-[3px] border-primary pt-3 space-y-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold tracking-tight text-on-surface">{p.name}</p>
                    <span className="text-xs font-medium text-on-surface-variant/60 shrink-0">{p.share}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant/80 leading-relaxed">{p.what}</p>
                  {p.example && <p className="text-sm italic text-on-surface-variant/60">“{p.example}”</p>}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <H eyebrow="What we test" title="A/B tests" />
            {(plan?.abTestPlan || []).map((t: any, i: number) => (
              <div key={i} className="space-y-0.5">
                <Label>Test: {t.variable}</Label>
                <p className="text-sm font-medium text-on-surface leading-snug">{t.hypothesis}</p>
                {t.successMetric && <p className="text-[11px] text-on-surface-variant/60">Win if: {t.successMetric}</p>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'rhythm' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <H eyebrow="When we post" title="Weekly rhythm" />
            <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
              <table className="w-full text-xs min-w-[480px]">
                <thead><tr className="bg-surface-container-lowest">
                  <th className={th}>Day</th>
                  {(e.rhythmColumns || ['Post']).map((c: string) => <th key={c} className={th}>{c}</th>)}
                  <th className={th}>Pillar</th>
                </tr></thead>
                <tbody>
                  {(e.weeklyRhythm || []).map((r: any, i: number) => (
                    <tr key={i} className="border-t border-outline-variant/10 align-top">
                      <td className="p-3 font-semibold text-on-surface">{r.day}</td>
                      {(e.rhythmColumns || ['Post']).map((c: string, j: number) => <td key={c} className="p-3 text-on-surface-variant/90">{(r.posts || [])[j] || '—'}</td>)}
                      <td className="p-3"><span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-primary whitespace-nowrap">{r.pillar || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <H eyebrow="How we know it works" title="KPIs" sub={e.scoreboardNote} />
            {(plan?.weeklyKPIs || []).length > 0 && (
              <div className="space-y-1">
                <Label>Weekly</Label>
                {plan.weeklyKPIs.map((k: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-xs border-b border-outline-variant/10 last:border-0">
                    <span className="font-medium text-on-surface-variant">{k.kpi}</span>
                    <span className="font-semibold text-primary tabular-nums text-right">{k.target}</span>
                  </div>
                ))}
              </div>
            )}
            {(e.scoreboard || []).length > 0 && (
              <div className="space-y-1">
                <Label>30-day targets</Label>
                {e.scoreboard.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-xs border-b border-outline-variant/10 last:border-0">
                    <span className="font-medium text-on-surface-variant">{m.metric}</span>
                    <span className="font-semibold text-primary tabular-nums text-right">{m.target}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/50">Targets to steer by, not promises.</p>
          </Card>
        </div>
      )}

      {tab === 'scripts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(e.scripts || []).map((sc: any, i: number) => (
            <Card key={i} className="space-y-2">
              <Label className="text-primary/70">{sc.label}</Label>
              <p className="text-[15px] text-on-surface whitespace-pre-line leading-relaxed">{sc.text}</p>
            </Card>
          ))}
          {e.bio && (
            <Card className="md:col-span-3">
              <Label>Profile bio</Label>
              <p className="text-sm font-bold text-on-surface">{e.bio}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
