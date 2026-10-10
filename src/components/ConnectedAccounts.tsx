import React, { useState, useEffect } from 'react';
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Play, Loader2, Link as LinkIcon, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { getAuthHeader } from '@/src/lib/supabase';

export interface Connection {
  connected: boolean;
  account?: string | null;
  error?: string;
  source?: 'app' | 'env' | null;
  connectVia?: string | null;
  canConnect?: boolean;
  setup?: string;
}

// One row per login. Instagram and Facebook share a single Meta login.
const ACCOUNTS: { id: string; label: string; icon: React.ReactNode; platforms: string[]; note?: string }[] = [
  { id: 'meta', label: 'Instagram + Facebook', icon: <span className="flex -space-x-1"><Instagram size={15} /><Facebook size={15} /></span>, platforms: ['instagram', 'facebook'] },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={15} />, platforms: ['linkedin'] },
  { id: 'tiktok', label: 'TikTok', icon: <Play size={15} />, platforms: ['tiktok'] },
  { id: 'twitter', label: 'X (Twitter)', icon: <Twitter size={15} />, platforms: ['twitter'], note: 'Needs the paid X API' },
  { id: 'youtube', label: 'YouTube', icon: <Youtube size={15} />, platforms: ['youtube'], note: 'Coming soon' },
];

export const ConnectedAccounts: React.FC<{
  connections: Record<string, Connection>;
  profileId: string;
  onChanged: () => void;
}> = ({ connections, profileId, onChanged }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const connect = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/auth/${id}/url?profile_id=${encodeURIComponent(profileId)}`, { headers: await getAuthHeader() });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start the connection');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
      setBusy(null);
    }
  };

  const disconnect = async (id: string, label: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/accounts/${id}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Disconnect failed');
      toast.success(`${label} disconnected`);
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2">
        <LinkIcon size={12} /> Connected Accounts
        {profileId !== 'default' && <span className="normal-case tracking-normal font-bold text-primary">· {profileId}</span>}
      </div>
      <div className="space-y-2">
        {ACCOUNTS.map(acc => {
          const conns = acc.platforms.map(p => ({ p, c: connections[p] })).filter(x => x.c);
          const loading = conns.length === 0 && !acc.note;
          const anyConnected = conns.some(x => x.c.connected);
          const fromApp = conns.some(x => x.c.source === 'app');
          const fromEnv = !fromApp && conns.some(x => x.c.source === 'env');
          const canConnect = !acc.note && conns.some(x => x.c.canConnect);
          const setup = conns.find(x => x.c.setup)?.c.setup;
          return (
            <div key={acc.id} className="p-3 rounded-xl border border-outline-variant/10 bg-surface-container-highest/20">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(open === acc.id ? null : acc.id)}>
                <span className={cn("shrink-0", anyConnected ? "text-on-surface" : "text-on-surface-variant/50")}>{acc.icon}</span>
                <span className="text-sm font-bold flex-1 min-w-0 truncate">{acc.label}</span>
                <ChevronDown size={14} className={cn("shrink-0 text-on-surface-variant/50 transition-transform", open === acc.id && "rotate-180")} />
                {busy === acc.id ? <Loader2 size={14} className="animate-spin text-on-surface-variant" />
                  : acc.note ? <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant/50">{acc.note}</span>
                  : canConnect ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {fromApp && (
                        <button onClick={() => disconnect(acc.id, acc.label)} className="text-[10px] font-bold text-on-surface-variant/60 hover:text-red-500">Disconnect</button>
                      )}
                      <button onClick={() => connect(acc.id)}
                        className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all",
                          anyConnected ? "bg-surface-container-highest text-on-surface hover:bg-surface-container-highest/70" : "bg-primary text-white hover:bg-primary/90")}>
                        {anyConnected ? 'Reconnect' : 'Connect'}
                      </button>
                    </div>
                  ) : null}
              </div>
              {loading ? (
                <p className="text-[10px] text-on-surface-variant/50 mt-1.5 ml-7">Checking…</p>
              ) : (
                <div className="mt-1.5 ml-7 space-y-0.5">
                  {conns.map(({ p, c }) => (
                    <p key={p} className={cn("text-[10px] font-medium", open !== acc.id && "truncate", c.connected ? "text-green-500" : "text-on-surface-variant/60")}
                      title={c.connected ? c.account || '' : c.error}>
                      {acc.platforms.length > 1 && <span className="capitalize font-bold">{p}: </span>}
                      {c.connected ? `● ${c.account || 'Connected'}` : `○ ${c.error || 'Not connected'}`}
                    </p>
                  ))}
                  {open === acc.id && conns.some(x => x.c.connected) && (
                    <p className="text-[10px] text-on-surface-variant/60 pt-1">
                      Posts go to the account{acc.platforms.length > 1 ? 's' : ''} above. Connected {fromApp ? 'from this app' : 'through a Render setting'}.
                    </p>
                  )}
                  {fromEnv && <p className="text-[10px] text-on-surface-variant/40">Set in Render settings</p>}
                  {!acc.note && !canConnect && setup && <p className="text-[10px] text-amber-500/80">{setup}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Creatives-level panel: opens from the header and loads its own status.
export const ConnectedAccountsPanel: React.FC<{ profileId?: string; onClose: () => void }> = ({ profileId = 'default', onClose }) => {
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const load = async (refresh = false) => {
    try {
      const res = await fetch(`/api/posts/connections?profile_id=${encodeURIComponent(profileId)}${refresh ? '&refresh=1' : ''}`, { headers: await getAuthHeader() });
      if (res.ok) setConnections(await res.json());
    } catch {}
  };
  useEffect(() => { load(true); }, [profileId]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md h-full overflow-y-auto bg-surface p-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container-low text-on-surface-variant"><X size={16} /></button>
        </div>
        <ConnectedAccounts connections={connections} profileId={profileId}
          onChanged={() => { load(true); window.dispatchEvent(new Event('connections-changed')); }} />
      </div>
    </div>
  );
};
