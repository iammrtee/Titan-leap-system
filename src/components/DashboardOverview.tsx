import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/services/supabase';
import { getAuthHeader } from '@/src/lib/supabase';
import { clientLabel, clientKey, setClientId } from '@/src/lib/clientProfile';
import { GrowingBranch } from './GrowingBranch';

type View = 'audit' | 'strategy' | 'content' | 'sales' | 'funnel' | 'ads';
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

  const tile = `bg-surface-container-lowest rounded-[18px] p-5 ${SHADOW} flex flex-col gap-1 min-w-0`;
  return (
    <div className="space-y-7">
      {(() => {
        const monthSales = sales.filter(x => +new Date(x.created_at) >= +monthStart);
        const usd = monthSales.reduce((a, x) => a + toUsd(Number(x.amount || 0), x.currency || 'USD'), 0);
        const local = monthSales.filter(x => (x.currency || 'USD') !== 'USD').reduce<Record<string, number>>((m, x) => { m[x.currency] = (m[x.currency] || 0) + Number(x.amount || 0); return m; }, {});
        const h = new Date().getHours();
        const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
        const glassTile = "rounded-[22px] p-5 bg-white/70 dark:bg-white/10 border border-white/80 dark:border-white/15 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_30px_rgba(60,20,120,0.10)] flex flex-col gap-1 min-w-0";
        return (
          <section className="relative -mx-4 md:-mx-8 lg:-mx-12 xl:-mx-16 -mt-4 md:-mt-8 lg:-mt-12 xl:-mt-16 overflow-hidden min-h-[640px]">
            {/* The branch grows across the whole hero, behind the glass */}
            <GrowingBranch className="absolute pointer-events-none select-none z-0 left-[-4%] top-[-14%] w-[108%] max-w-none aspect-video" />

            <div className="relative z-10 px-4 md:px-8 lg:px-12 xl:px-16 pt-8 md:pt-12 pb-6 flex flex-col lg:flex-row gap-5 items-stretch min-h-[640px]">
              {/* Left: the glass greeting */}
              <div className="lg:w-[420px] shrink-0 rounded-[32px] p-7 text-on-surface bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/15 backdrop-blur-[26px] backdrop-saturate-[1.7] shadow-[0_20px_60px_rgba(60,20,120,0.12)] flex flex-col gap-5 self-start">
                <div className="space-y-1.5">
                  <p className="text-primary text-xl" style={{ fontFamily: "'Kalam','Caveat','Segoe Print',cursive" }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                  <h2 className="text-4xl md:text-[44px] font-bold tracking-tight leading-[1.05]">{greeting}.</h2>
                  <p className="text-sm text-on-surface-variant">{clients.length} client{clients.length > 1 ? 's' : ''} · {todo.length ? `${todo.length} thing${todo.length > 1 ? 's' : ''} need you today` : 'nothing urgent today'}</p>
                </div>
                {todo.length > 0 && (
                  <div className="space-y-2">
                    {todo.map((t, i) => (
                      <button key={i} onClick={t.onClick} className="w-full flex items-center gap-3 rounded-[16px] px-4 py-3 bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 text-left hover:bg-white transition-colors">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", t.tone)} />
                        <span className="flex-1 text-[15px] leading-snug">{t.text}</span>
                        <span className="text-xs font-semibold text-primary shrink-0">{t.action}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => go('audit')} className="h-12 rounded-full bg-primary text-white text-[15px] font-semibold hover:brightness-110 transition-all">New audit</button>
              </div>

              {/* Right: the numbers on glass */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 content-end">
                <div className={cn(glassTile, "sm:col-span-2 xl:col-span-3")}>
                  <span className="text-[13px] text-on-surface-variant">Revenue this month</span>
                  <span className="text-4xl md:text-[48px] font-bold tracking-tight text-primary tabular-nums">{money(usd, 'USD')}</span>
                  <span className="text-[13px] text-on-surface-variant">{Object.keys(local).length ? `from ${Object.entries(local).map(([c, a]) => money(a, c)).join(' + ')}` : monthSales.length ? `${monthSales.length} payment${monthSales.length > 1 ? 's' : ''}` : 'Record payments in Sales'}</span>
                </div>
                <div className={glassTile}>
                  <span className="text-[13px] text-on-surface-variant">Active clients</span>
                  <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{clients.length}</span>
                  <span className="text-[13px] text-on-surface-variant truncate">{clients.map(clientLabel).join(' · ')}</span>
                </div>
                <div className={glassTile}>
                  <span className="text-[13px] text-on-surface-variant">Leads</span>
                  <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{leads.length}</span>
                  <span className="text-[13px] text-on-surface-variant">{leadsThisWeek ? `+${leadsThisWeek} this week` : `${hot.length} hot`}</span>
                </div>
                <div className={glassTile}>
                  <span className="text-[13px] text-on-surface-variant">Audits this month</span>
                  <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{auditsThisMonth}<span className="text-base font-medium text-on-surface-variant/70"> / 100</span></span>
                  <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/15 mt-1"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, auditsThisMonth)}%` }} /></div>
                </div>
                <div className={glassTile}>
                  <span className="text-[13px] text-on-surface-variant">AI spend this month</span>
                  <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{budget ? `$${budget.spent.toFixed(2)}` : '—'}<span className="text-base font-medium text-on-surface-variant/70">{budget ? ` / $${budget.budget}` : ''}</span></span>
                  <span className="text-[13px] text-on-surface-variant">Audits not counted</span>
                </div>
                <div className={glassTile}>
                  <span className="text-[13px] text-on-surface-variant">Posts this week</span>
                  <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{weekPosts.length}</span>
                  <span className={cn("text-[13px] font-medium", needDesign.length ? "text-amber-700 dark:text-amber-300" : "text-on-surface-variant")}>{needDesign.length ? `${needDesign.length} need design` : 'All ready'}</span>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-on-surface">Clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map(c => {
            const posts = clientPosts(c);
            const ready = posts.filter(p => (p.status || 'draft') !== 'draft').length;
            const planned = hasPlan(c);
            return (
              <div key={c} className={`bg-surface-container-lowest rounded-[18px] p-6 ${SHADOW} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-on-surface">{clientLabel(c)}</span>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", planned ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{planned ? 'Plan active' : 'Set up'}</span>
                </div>
                {planned ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-on-surface-variant/70">This week</p><p className="text-xl font-semibold text-on-surface">{posts.length} posts</p></div>
                    <div><p className="text-xs text-on-surface-variant/70">Ready</p><p className="text-xl font-semibold text-on-surface">{ready}</p></div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    <p className="text-on-surface">✓ Client created</p>
                    <p className="text-on-surface-variant/70">○ Connect accounts (Creatives)</p>
                    <p className="text-on-surface-variant/70">○ Audit or quick brief</p>
                    <p className="text-on-surface-variant/70">○ 30-day plan</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setClientId(c); go('strategy'); }} className={cn("h-9 px-3.5 rounded-[10px] text-[13px] font-semibold", planned ? "bg-surface-container-low text-on-surface" : "bg-primary text-white")}>{planned ? 'Strategy' : 'Make a plan'}</button>
                  <button onClick={() => { setClientId(c); go('content'); }} className="h-9 px-3.5 rounded-[10px] text-[13px] font-semibold bg-surface-container-low text-on-surface">Creatives</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
