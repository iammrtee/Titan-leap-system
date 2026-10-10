import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Cpu, Play, Pause, Clock, Zap, CheckCircle2, AlertCircle, RefreshCw, TrendingUp, Loader2, X, Settings, Plug } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getAuthHeader } from '@/src/lib/supabase';

interface Item {
  id: string; name: string; description: string; needsTreg: boolean;
  configField?: { key: string; label: string; placeholder: string };
  unavailable?: string;
  status: 'Active' | 'Paused';
  config: Record<string, any>;
  lastRun: string | null;
  lastResult: any;
}

const ICONS: Record<string, { icon: any; color: string }> = {
  'competitor-hooks': { icon: Zap, color: 'bg-primary/10 text-primary' },
  'lead-enrichment': { icon: Cpu, color: 'bg-secondary/10 text-secondary' },
  'content-repurposer': { icon: RefreshCw, color: 'bg-tertiary/10 text-tertiary' },
  'trend-monitor': { icon: TrendingUp, color: 'bg-primary/10 text-primary' },
  'ad-scaler': { icon: TrendingUp, color: 'bg-surface-container-highest text-on-surface-variant' },
};

const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

async function api(path: string, body?: any) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const ResultBody: React.FC<{ id: string; result: any }> = ({ id, result }) => {
  if (!result) return <p className="text-sm text-on-surface-variant">No result yet. Press run.</p>;
  if (result.ok === false) return <p className="text-sm text-error font-medium">{result.error}</p>;
  const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 text-sm space-y-1">{children}</div>
  );
  if (id === 'competitor-hooks') return (
    <div className="space-y-3">
      <p className="text-[11px] text-on-surface-variant/70">Checked {result.checked} profile(s){result.skipped?.length ? ` · skipped ${result.skipped.length}` : ''}</p>
      {(result.hooks || []).map((h: any, i: number) => (
        <Box key={i}><p className="font-black text-on-surface">{h.hook}</p><p className="text-on-surface-variant">{h.why}</p>{h.pattern && <p className="text-primary text-xs font-bold">Pattern: {h.pattern}</p>}</Box>
      ))}
    </div>
  );
  if (id === 'lead-enrichment') return (
    <div className="space-y-3">
      {result.note && <p className="text-sm text-on-surface-variant">{result.note}</p>}
      {(result.enriched || []).map((e: any, i: number) => <Box key={i}><p className="font-black">{e.lead}</p><p className="text-on-surface-variant">{e.result}</p></Box>)}
    </div>
  );
  if (id === 'content-repurposer') return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Hooks</p>
      {(result.hooks || []).map((h: string, i: number) => <Box key={i}>{h}</Box>)}
      <p className="text-[10px] font-black uppercase tracking-widest text-primary pt-2">LinkedIn posts</p>
      {(result.linkedin || []).map((h: string, i: number) => <Box key={i}><span className="whitespace-pre-wrap">{h}</span></Box>)}
    </div>
  );
  if (id === 'trend-monitor') return (
    <div className="space-y-3">
      {(result.trends || []).map((t: any, i: number) => <Box key={i}><p className="font-black">{t.topic}</p><p className="text-on-surface-variant">{t.strategy}</p></Box>)}
    </div>
  );
  return <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>;
};

const AutomationCard: React.FC<{ item: Item; tregOn: boolean; onChange: () => void; onView: (i: Item) => void }> = ({ item, tregOn, onChange, onView }) => {
  const [busy, setBusy] = useState<'run' | 'toggle' | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(item.configField ? String(item.config?.[item.configField.key] ?? '') : '');
  const meta = ICONS[item.id] || ICONS['trend-monitor'];
  const Icon = meta.icon;
  const blocked = item.needsTreg && !tregOn;

  const toggle = async () => {
    const next = item.status === 'Active' ? 'Paused' : 'Active';
    setBusy('toggle');
    try {
      if (item.configField && value !== String(item.config?.[item.configField.key] ?? '')) await api(`/api/automations/${item.id}/config`, { value });
      await api(`/api/automations/${item.id}/status`, { status: next });
      toast.success(next === 'Active' ? `${item.name} is on` : `${item.name} paused`, {
        description: next === 'Active' ? 'It runs once a day by itself. You can also run it any time with the refresh button.' : 'It will not run until you turn it back on.',
      });
      onChange();
    } catch (e: any) {
      toast.error(e.message);
      if (item.configField) setOpen(true);
    } finally { setBusy(null); }
  };

  const run = async () => {
    setBusy('run');
    try {
      if (item.configField && value !== String(item.config?.[item.configField.key] ?? '')) await api(`/api/automations/${item.id}/config`, { value });
      await api(`/api/automations/${item.id}/run`, {});
      toast.success(`${item.name} finished`);
      await onChange();
      onView({ ...item });
    } catch (e: any) {
      toast.error(`${item.name} failed`, { description: e.message });
      onChange();
      if (item.configField && /first|Add at least|Paste/.test(e.message)) setOpen(true);
    } finally { setBusy(null); }
  };

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      {busy === 'run' && (
        <div className="absolute inset-0 bg-surface-container-low/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="text-primary animate-spin mb-3" size={30} />
          <p className="text-sm font-black text-on-surface">Running…</p>
          <p className="text-[10px] font-bold text-on-surface-variant/60 mt-1 uppercase tracking-widest">This can take up to a minute</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5", meta.color)}><Icon size={24} /></div>
        <div className="flex items-center gap-2">
          {item.needsTreg && (
            <span className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", tregOn ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500")}>Treg</span>
          )}
          <div className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
            item.status === 'Active' ? "bg-success-container text-on-success-container" : "bg-surface-container-highest text-on-surface-variant")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", item.status === 'Active' ? "bg-success animate-pulse" : "bg-on-surface-variant/40")} />
            {item.unavailable ? 'Not available' : item.status}
          </div>
        </div>
      </div>

      <h4 className="font-black text-lg text-on-surface tracking-tight mb-2">{item.name}</h4>
      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{item.description}</p>
      {item.unavailable && <p className="text-xs font-bold text-amber-500 mb-4">{item.unavailable}</p>}
      {blocked && !item.unavailable && <p className="text-xs font-bold text-amber-500 mb-4">Add TREG_TOKEN in Render to use this.</p>}

      {item.configField && !item.unavailable && (
        <div className="mb-4">
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            <Settings size={12} /> {open ? 'Hide settings' : 'Settings'}
          </button>
          {open && (
            <div className="mt-2 space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant/70">{item.configField.label}</label>
              <textarea value={value} onChange={e => setValue(e.target.value)} rows={4} placeholder={item.configField.placeholder}
                className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-xl p-3 text-xs outline-none focus:border-primary" />
              <button
                onClick={async () => { try { await api(`/api/automations/${item.id}/config`, { value }); toast.success('Saved'); onChange(); } catch (e: any) { toast.error(e.message); } }}
                className="text-[10px] font-black uppercase tracking-widest text-primary">Save</button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
        <button onClick={() => item.lastResult && onView(item)} disabled={!item.lastResult}
          className="flex items-center gap-2 text-on-surface-variant/60 hover:text-primary disabled:hover:text-on-surface-variant/60 text-left">
          <Clock size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Last run: {ago(item.lastRun)}{item.lastResult?.ok === false ? ' · failed' : item.lastResult ? ' · view' : ''}
          </span>
        </button>
        <div className="flex gap-2">
          <button onClick={run} disabled={!!busy || !!item.unavailable || blocked}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary disabled:opacity-30" title="Run now">
            <RefreshCw size={16} />
          </button>
          <button onClick={toggle} disabled={!!busy || !!item.unavailable || (blocked && item.status !== 'Active')}
            title={item.status === 'Active' ? 'Pause' : 'Turn on'}
            className={cn("p-2 rounded-lg transition-all disabled:opacity-30",
              item.status === 'Active' ? "bg-error/10 text-error hover:bg-error/20" : "bg-success/10 text-success hover:bg-success/20")}>
            {busy === 'toggle' ? <Loader2 size={16} className="animate-spin" /> : item.status === 'Active' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AIAutomation: React.FC = () => {
  const [items, setItems] = useState<Item[] | null>(null);
  const [treg, setTreg] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [viewing, setViewing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      const d = await api('/api/automations');
      setItems(d.items); setTreg(!!d.treg?.connected); setPersisted(d.persisted !== false); setLoadError(null);
    } catch (e: any) { setLoadError(e.message); }
  };
  useEffect(() => { load(); }, []);

  const view = items?.find(i => i.id === viewing);
  const active = (items || []).filter(i => i.status === 'Active').length;
  const failed = (items || []).filter(i => i.lastResult?.ok === false).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Automation Hub</h2>
          <p className="text-sm font-medium text-on-surface-variant">Jobs that run on real data. Turn one on and it runs daily; press refresh to run it now.</p>
        </div>
        <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black",
          treg ? "border-success/30 bg-success/10 text-success" : "border-amber-500/30 bg-amber-500/10 text-amber-500")}>
          <Plug size={14} />
          {treg ? 'Treg connected' : 'Treg not connected: add TREG_TOKEN in Render'}
        </div>
      </div>

      {loadError && <p className="text-sm text-error font-medium">Could not load automations: {loadError}</p>}
      {!items && !loadError && <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(items || []).map(item => (
          <AutomationCard key={item.id} item={item} tregOn={treg} onChange={load} onView={i => setViewing(i.id)} />
        ))}
      </div>

      {typeof document !== 'undefined' && view && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl border border-outline-variant/10 p-8 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-on-surface">{view.name}</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Last run {ago(view.lastRun)}</p>
              </div>
              <button onClick={() => setViewing(null)} className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center"><X size={18} /></button>
            </div>
            <ResultBody id={view.id} result={view.lastResult} />
          </div>
        </div>,
        document.body
      )}

      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", failed ? "bg-error/10 text-error" : "bg-success-container/10 text-success")}>
            {failed ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h3 className="font-black text-on-surface tracking-tight">System status</h3>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Live</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
          {[
            { label: 'Treg', value: treg ? 'Connected' : 'Not connected' },
            { label: 'Running daily', value: `${active} of ${(items || []).filter(i => !i.unavailable).length}` },
            { label: 'Failed last run', value: String(failed) },
            { label: 'Saved settings', value: persisted ? 'Saved' : 'Run section 13 of supabase-schema.sql' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">{s.label}</p>
              <p className="text-base font-black text-on-surface mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
