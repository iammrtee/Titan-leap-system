import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getAuthHeader } from '@/src/lib/supabase';
import { useClientId, setClientId, clientSlug, clientLabel } from '@/src/lib/clientProfile';

// Pick which client you're working on (TitanLeap or a client like Oqevira), or add one.
// Shared by Creatives and Strategy so both always show the same client.
export const ClientSwitcher: React.FC<{ onCreated?: (id: string) => void }> = ({ onCreated }) => {
  const clientId = useClientId();
  const [clients, setClients] = useState<string[]>(['default']);
  const [newClient, setNewClient] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/clients', { headers: await getAuthHeader() });
        if (r.ok) { const d = await r.json(); setClients(d.clients?.length ? d.clients : ['default']); }
      } catch {}
    })();
  }, []);
  const create = async () => {
    const id = clientSlug(newClient || '');
    if (!id) { toast.error('Enter the client name'); return; }
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not create the client');
      setClients(prev => prev.includes(id) ? prev : [...prev, id]);
      setClientId(id);
      setNewClient(null);
      toast.success(`${clientLabel(id)} created`);
      onCreated?.(id);
    } catch (err: any) { toast.error(err.message); }
  };
  if (newClient !== null) {
    return (
      <div className="flex items-center gap-2">
        <input id="new-client-name" autoFocus value={newClient} onChange={e => setNewClient(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setNewClient(null); }}
          placeholder="Client name, e.g. Oqevira" className="h-10 w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 text-sm font-medium focus:outline-none focus:border-primary" />
        <button onClick={create} className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-bold">Create</button>
        <button onClick={() => setNewClient(null)} className="h-10 px-2 text-sm font-bold text-on-surface-variant/60">Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 h-10 pl-3 pr-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Client</span>
      <select id="client-select" value={clientId} onChange={e => e.target.value === '__new' ? setNewClient('') : setClientId(e.target.value)}
        className="bg-transparent text-sm font-bold text-on-surface focus:outline-none pr-1 cursor-pointer">
        {[...new Set([...clients, clientId])].map(c => <option key={c} value={c}>{clientLabel(c)}</option>)}
        <option value="__new">+ New client</option>
      </select>
    </div>
  );
};
