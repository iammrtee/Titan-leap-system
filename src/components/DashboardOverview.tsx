import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/services/supabase';
import { getAuthHeader } from '@/src/lib/supabase';
import { clientLabel, clientKey, setClientId } from '@/src/lib/clientProfile';
import { GrowingBranch } from './GrowingBranch';

type View = 'audit' | 'strategy' | 'content' | 'sales' | 'funnel' | 'ads';
const GLASS = 'rounded-[24px] text-white bg-[linear-gradient(165deg,rgba(110,40,170,0.62)_0%,rgba(70,30,120,0.5)_55%,rgba(120,100,170,0.42)_100%)] border border-white/25 backdrop-blur-xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(60,20,120,0.25)]';
const SHADOW = 'shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]';
const DAY = 86_400_000;
const periodDays = { '7D': 7, '30D': 30, '1Y': 365 } as const;
type Period = keyof typeof periodDays;

// Rough rates to show everything in dollars. Override NGN with VITE_NGN_PER_USD at build time.
const PER_USD: Record<string, number> = { USD: 1, NGN: Number((import.meta as any).env?.VITE_NGN_PER_USD) || 1600, GBP: 0.79, EUR: 0.92, GHS: 15, KES: 129, ZAR: 18 };
const toUsd = (amount: number, currency: string) => amount / (PER_USD[(currency || 'USD').toUpperCase()] || 1);
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount); }
  catch { return `${currency} ${Math.round(amount).toLocaleString()}`; }
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - +new Date(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};

// Calendar posts live per browser (and in Supabase when set up); read the local copy here.
const readCalendar = (): any[] => { try { const v = JSON.parse(localStorage.getItem('titanleap_calendar_items') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

export const DashboardOverview: React.FC<{ onNavigate?: (view: View) => void }> = ({ onNavigate }) => {
  const go = (v: View) => onNavigate?.(v);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [sales, setSales] = React.useState<any[]>([]);
  const [clients, setClients] = React.useState<string[]>(['default']);
  const [budget, setBudget] = React.useState<{ spent: number; budget: number } | null>(null);
  const [period, setPeriod] = React.useState<Period>('30D');
  const calendar = React.useMemo(readCalendar, []);

  React.useEffect(() => {
    const fetchData = async () => {
      const [{ data: l }, { data: s }] = await Promise.all([
        supabase.from('leads').select('id,name,company,source,status,created_at').order('created_at', { ascending: false }).limit(1000),
        supabase.from('sales_transactions').select('amount,currency,product_name,status,created_at').eq('status', 'COMPLETED').order('created_at', { ascending: false }).limit(1000),
      ]);
      setLeads(l || []);
      setSales(s || []);
    };
    fetchData();
    (async () => {
      try {
        const h = await getAuthHeader();
        const [c, b] = await Promise.all([fetch('/api/clients', { headers: h }), fetch('/api/ai/budget', { headers: h })]);
        if (c.ok) { const d = await c.json(); if (d.clients?.length) setClients(d.clients); }
        if (b.ok) setBudget(await b.json());
      } catch {}
    })();
    const ch1 = supabase.channel('dash-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchData).subscribe();
    const ch2 = supabase.channel('dash-sales').on('postgres_changes', { event: '*', schema: 'public', table: 'sales_transactions' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  // ── Numbers ──
  const now = Date.now();
  const days = periodDays[period];
  const inPeriod = sales.filter(s => now - +new Date(s.created_at) <= days * DAY);
  const byCurrency = inPeriod.reduce<Record<string, number>>((m, s) => { const c = s.currency || 'USD'; m[c] = (m[c] || 0) + Number(s.amount || 0); return m; }, {});
  const currencies = Object.entries(byCurrency).sort((a, b) => b[1] - a[1]);
  const mainCurrency = currencies[0]?.[0] || 'USD';
  const buckets = period === '7D' ? 7 : period === '30D' ? 4 : 12;
  const bucketMs = (days * DAY) / buckets;
  const bars = Array.from({ length: buckets }, (_, i) => {
    const start = now - days * DAY + i * bucketMs;
    return inPeriod.filter(s => (s.currency || 'USD') === mainCurrency && +new Date(s.created_at) >= start && +new Date(s.created_at) < start + bucketMs)
      .reduce((a, s) => a + Number(s.amount || 0), 0);
  });
  const maxBar = Math.max(1, ...bars);
  const barLabel = (i: number) => period === '7D'
    ? new Date(now - (6 - i) * DAY).toLocaleDateString(undefined, { weekday: 'short' })
    : period === '30D' ? `Week ${i + 1}` : new Date(new Date().getFullYear(), new Date().getMonth() - (11 - i), 1).toLocaleDateString(undefined, { month: 'short' });

  const leadsThisWeek = leads.filter(l => now - +new Date(l.created_at) <= 7 * DAY).length;
  const hot = leads.filter(l => String(l.status).toUpperCase() === 'HOT');
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const auditsThisMonth = leads.filter(l => /audit/i.test(l.source || '') && /inbound/i.test(l.source || '') && +new Date(l.created_at) >= +monthStart).length;

  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const in7 = new Date(today0); in7.setDate(in7.getDate() + 7);
  const dateOf = (p: any) => new Date(p.year, p.month, p.day);
  const weekPosts = calendar.filter(p => dateOf(p) >= today0 && dateOf(p) < in7);
  const needDesign = weekPosts.filter(p => (p.status || 'draft') === 'draft');
  const upcoming = calendar.filter(p => dateOf(p) >= today0).sort((a, b) => +dateOf(a) - +dateOf(b) || String(a.time).localeCompare(String(b.time))).slice(0, 5);
  const clientPosts = (c: string) => weekPosts.filter(p => (p.client || 'default') === c);
  const hasPlan = (c: string) => { try { return !!localStorage.getItem(clientKey('titanleap_strategy_plan', c)); } catch { return false; } };

  const todo: { tone: string; text: string; where: string; action: string; onClick: () => void }[] = [];
  if (needDesign.length) todo.push({ tone: 'bg-amber-500', text: `${needDesign.length} post${needDesign.length > 1 ? 's' : ''} this week still need a design`, where: 'Calendar', action: 'Open', onClick: () => go('strategy') });
  if (hot.length) todo.push({ tone: 'bg-emerald-600', text: `${hot.length} hot lead${hot.length > 1 ? 's are' : ' is'} waiting for a reply`, where: 'Sales', action: 'Reply', onClick: () => go('sales') });
  clients.filter(c => c !== 'default' && !hasPlan(c)).forEach(c => todo.push({ tone: 'bg-sky-600', text: `${clientLabel(c)} has no 30-day plan yet`, where: clientLabel(c), action: 'Set up', onClick: () => { setClientId(c); go('strategy'); } }));

  const activity = [
    ...leads.slice(0, 8).map(l => ({ at: l.created_at, title: String(l.status).toUpperCase() === 'HOT' ? 'New hot lead' : 'New lead', desc: `${l.name || l.company || 'Someone'} · ${l.source || 'Unknown source'}`, dot: String(l.status).toUpperCase() === 'HOT' ? 'bg-red-500' : 'bg-slate-400' })),
    ...sales.slice(0, 8).map(s => ({ at: s.created_at, title: 'Payment received', desc: `${money(Number(s.amount), s.currency || 'USD')}${s.product_name ? ` · ${s.product_name}` : ''}`, dot: 'bg-emerald-600' })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 6);

  const tile = `${GLASS} p-5 flex flex-col gap-1 min-w-0`;
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const monthStartTs = +monthStart;
  const monthSales = sales.filter(x => +new Date(x.created_at) >= monthStartTs);
  const monthUsd = monthSales.reduce((a, x) => a + toUsd(Number(x.amount || 0), x.currency || 'USD'), 0);
  const payers = Array.from(new Set(inPeriod.map(x => x.product_name).filter(Boolean)));
  return (
    <div className="space-y-6">
      {/* Header: the growing branch runs edge to edge; the greeting and today's tasks sit on it in frosted glass */}
      <section className="relative -mx-4 md:-mx-8 lg:-mx-12 xl:-mx-16 -mt-4 md:-mt-8 lg:-mt-12 xl:-mt-16 overflow-hidden min-h-[clamp(320px,40vw,600px)]">
        <GrowingBranch className="absolute pointer-events-none select-none left-[-9%] top-[-13vw] w-[118%] max-w-none aspect-video" />
        <div className="relative z-10 px-4 md:px-8 lg:px-12 xl:px-16 pt-8 md:pt-12 pb-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">{greeting}</h2>
              <p className="text-sm md:text-base text-on-surface-variant">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · {clients.length} client{clients.length > 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => go('audit')} className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 shadow-sm shrink-0">New audit</button>
          </div>

          <section className={`max-w-[560px] ${GLASS} rounded-[28px] p-6 md:p-7 space-y-4`}>
            <div className="space-y-1">
              <p className="text-amber-300 text-lg" style={{ fontFamily: "'Kalam','Caveat','Segoe Print',cursive" }}>Start here</p>
              <h3 className="text-2xl md:text-[28px] font-bold tracking-tight leading-tight">Needs you today</h3>
            </div>
            {todo.length ? (
              <div className="space-y-2.5">
                {todo.map((t, i) => (
                  <button key={i} onClick={t.onClick} className="w-full flex items-center gap-3 rounded-[16px] px-4 py-3.5 bg-[rgba(25,10,50,0.5)] border border-white/10 hover:bg-[rgba(25,10,50,0.65)] text-left transition-colors">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", t.tone)} />
                    <span className="flex-1 text-[15px] leading-snug text-white">{t.text}</span>
                    <span className="text-[13px] font-semibold text-amber-300 shrink-0">{t.action}</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-[15px] text-white/80">You're all caught up.</p>}
          </section>
        </div>
      </section>

      <div className="relative space-y-6">
        <div aria-hidden className="pointer-events-none absolute -inset-x-8 -inset-y-10 blur-2xl bg-[radial-gradient(40%_45%_at_12%_25%,rgba(168,85,247,0.35),transparent_70%),radial-gradient(35%_40%_at_88%_40%,rgba(250,204,21,0.22),transparent_70%),radial-gradient(45%_40%_at_45%_90%,rgba(124,58,237,0.3),transparent_70%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-wrap gap-4 items-stretch">
          <section className={`flex-[999_1_520px] min-w-0 ${GLASS} p-6 flex flex-col gap-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-[13px] text-white/70">Revenue</p>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-4xl md:text-[44px] font-bold tracking-tight text-amber-300 tabular-nums">{money(byCurrency[mainCurrency] || 0, mainCurrency)}</span>
                  <span className="text-[13px] text-white/70">{period === '7D' ? 'this week' : period === '30D' ? 'this month' : 'this year'}</span>
                </div>
                <p className="text-[13px] text-white/70">
                  {inPeriod.length ? `${inPeriod.length} payment${inPeriod.length > 1 ? 's' : ''}${payers.length ? ` · ${payers.join(', ')}` : ''}` : 'No payments yet. In Sales, open a lead and mark it Paid.'}
                  {mainCurrency !== 'USD' && (byCurrency[mainCurrency] || 0) > 0 ? ` · ≈ ${money(toUsd(byCurrency[mainCurrency], mainCurrency), 'USD')}` : ''}
                </p>
              </div>
              <div role="group" aria-label="Period" className="flex gap-0.5 p-[3px] rounded-[10px] bg-white/10 shrink-0">
                {(Object.keys(periodDays) as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className={cn("h-[30px] px-3 rounded-lg text-[13px] transition-all", period === p ? "bg-white text-[#3b1a6e] font-semibold shadow-sm" : "text-white/70 font-medium")}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 mt-auto">
              <div className="flex items-end gap-2 h-24">
                {bars.map((v, i) => (
                  <div key={i} title={money(v, mainCurrency)} className={cn("flex-1 rounded-md", v ? "bg-amber-300" : "bg-white/15")} style={{ height: `${v ? Math.max(8, (v / maxBar) * 100) : 6}%` }} />
                ))}
              </div>
              <div className="flex gap-2 text-[11px] text-white/60">{bars.map((_, i) => <span key={i} className="flex-1 truncate">{barLabel(i)}</span>)}</div>
            </div>
          </section>

          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-4">
            <div className={cn(tile, "flex-1")}>
              <span className="text-[13px] text-white/70">Active clients</span>
              <span className="text-3xl md:text-[34px] font-bold tracking-tight text-white tabular-nums">{clients.length}</span>
              <span className="text-[13px] text-white/70 truncate">{clients.map(clientLabel).join(' · ')}</span>
            </div>
            <div className={cn(tile, "flex-1")}>
              <span className="text-[13px] text-white/70">Leads generated</span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl md:text-[34px] font-bold tracking-tight text-white tabular-nums">{leads.length}</span>
                {leadsThisWeek > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200">+{leadsThisWeek} this week</span>}
              </div>
              <span className="text-[13px] text-white/70">{hot.length} hot · {leads.length - hot.length} new</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={tile}>
            <span className="text-[13px] text-white/70">Audits this month</span>
            <span className="text-[28px] font-bold text-white tabular-nums">{auditsThisMonth}<span className="text-base font-medium text-white/50"> / 100</span></span>
            <div className="h-1.5 rounded-full bg-white/15 mt-1"><div className="h-1.5 rounded-full bg-amber-300" style={{ width: `${Math.min(100, auditsThisMonth)}%` }} /></div>
          </div>
          <div className={tile}>
            <span className="text-[13px] text-white/70">Posts going out this week</span>
            <span className="text-[28px] font-bold text-white tabular-nums">{weekPosts.length}</span>
            <span className={cn("text-[13px] font-medium", needDesign.length ? "text-amber-300" : "text-emerald-300")}>{needDesign.length ? `${needDesign.length} need design` : weekPosts.length ? 'All have designs' : 'Nothing scheduled'}</span>
          </div>
          <div className={tile}>
            <span className="text-[13px] text-white/70">AI spend this month</span>
            <span className="text-[28px] font-bold text-white tabular-nums">{budget ? `$${budget.spent.toFixed(2)}` : '—'}<span className="text-base font-medium text-white/50">{budget ? ` / $${budget.budget}` : ''}</span></span>
            <span className="text-[13px] text-white/70">Audits not counted</span>
          </div>
        </div>
      </div>

      <section className="relative space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-on-surface">Clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map(c => {
            const posts = clientPosts(c);
            const ready = posts.filter(p => (p.status || 'draft') !== 'draft').length;
            const planned = hasPlan(c);
            return (
              <div key={c} className={`${GLASS} p-6 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-white">{clientLabel(c)}</span>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", planned ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-300/20 text-amber-200")}>{planned ? 'Plan active' : 'Set up'}</span>
                </div>
                {planned ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-white/70">This week</p><p className="text-xl font-semibold text-white">{posts.length} posts</p></div>
                    <div><p className="text-xs text-white/70">Ready</p><p className="text-xl font-semibold text-white">{ready}</p></div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    <p className="text-white">✓ Client created</p>
                    <p className="text-white/70">○ Connect accounts (Creatives)</p>
                    <p className="text-white/70">○ Audit or quick brief</p>
                    <p className="text-white/70">○ 30-day plan</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setClientId(c); go('strategy'); }} className={cn("h-9 px-3.5 rounded-[10px] text-[13px] font-semibold", planned ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-[#3b1a6e]")}>{planned ? 'Strategy' : 'Make a plan'}</button>
                  <button onClick={() => { setClientId(c); go('content'); }} className="h-9 px-3.5 rounded-[10px] text-[13px] font-semibold bg-white/10 text-white hover:bg-white/20">Creatives</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>

    </div>
  );
};
