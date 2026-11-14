import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/services/supabase';
import { getAuthHeader } from '@/src/lib/supabase';
import { clientLabel, clientKey, setClientId } from '@/src/lib/clientProfile';

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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface">{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}</h2>
          <p className="text-sm text-on-surface-variant/70">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · {clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => go('audit')} className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:brightness-110"><Plus size={16} /> New audit</button>
      </header>

      {todo.length > 0 && (
        <section className={`bg-surface-container-lowest rounded-[18px] p-6 ${SHADOW} space-y-2`}>
          <h3 className="text-xl font-semibold tracking-tight text-on-surface">Needs you today</h3>
          <div className="divide-y divide-outline-variant/10">
            {todo.map((t, i) => (
              <div key={i} className="flex items-center gap-3.5 py-3">
                <span className={cn("w-2 h-2 rounded-full shrink-0", t.tone)} />
                <span className="flex-1 text-[15px] text-on-surface">{t.text}</span>
                <span className="text-[13px] text-on-surface-variant/60 hidden sm:inline">{t.where}</span>
                <button onClick={t.onClick} className="text-sm font-semibold text-primary hover:underline">{t.action}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(() => {
        const monthSales = sales.filter(x => +new Date(x.created_at) >= +monthStart);
        const usd = monthSales.reduce((a, x) => a + toUsd(Number(x.amount || 0), x.currency || 'USD'), 0);
        const local = monthSales.filter(x => (x.currency || 'USD') !== 'USD').reduce<Record<string, number>>((m, x) => { m[x.currency] = (m[x.currency] || 0) + Number(x.amount || 0); return m; }, {});
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-4">
            <div className={`bg-primary text-white rounded-[18px] p-6 flex flex-col gap-1`}>
              <span className="text-[13px] text-white/75">Revenue this month</span>
              <span className="text-4xl md:text-[44px] font-bold tracking-tight tabular-nums">{money(usd, 'USD')}</span>
              <span className="text-[13px] text-white/75">{Object.keys(local).length ? `from ${Object.entries(local).map(([c, a]) => money(a, c)).join(' + ')}` : monthSales.length ? `${monthSales.length} payment${monthSales.length > 1 ? 's' : ''}` : 'Record payments in Sales'}</span>
            </div>
            <div className={tile}>
              <span className="text-[13px] text-on-surface-variant/70">Active clients</span>
              <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{clients.length}</span>
              <span className="text-[13px] text-on-surface-variant/70 truncate">{clients.map(clientLabel).join(' · ')}</span>
            </div>
            <div className={tile}>
              <span className="text-[13px] text-on-surface-variant/70">Leads</span>
              <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{leads.length}</span>
              <span className="text-[13px] text-on-surface-variant/70">{leadsThisWeek ? `+${leadsThisWeek} this week` : `${hot.length} hot`}</span>
            </div>
            <div className={tile}>
              <span className="text-[13px] text-on-surface-variant/70">Posts this week</span>
              <span className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{weekPosts.length}</span>
              <span className={cn("text-[13px] font-medium", needDesign.length ? "text-amber-600" : "text-on-surface-variant/70")}>{needDesign.length ? `${needDesign.length} need design` : 'All ready'}</span>
            </div>
          </div>
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
