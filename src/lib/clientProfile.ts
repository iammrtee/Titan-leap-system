import { useEffect, useState } from 'react';

// The client (workspace) whose accounts, posts and media you're working on. 'default' is
// TitanLeap itself. Stored per browser; every screen that posts reads the same value.
const KEY = 'titanleap_client';
export const getClientId = () => { try { return localStorage.getItem(KEY) || 'default'; } catch { return 'default'; } };
export const setClientId = (id: string) => {
  try { localStorage.setItem(KEY, id); } catch {}
  window.dispatchEvent(new Event('client-changed'));
};
export const useClientId = () => {
  const [id, setId] = useState(getClientId);
  useEffect(() => {
    const f = () => setId(getClientId());
    window.addEventListener('client-changed', f);
    return () => window.removeEventListener('client-changed', f);
  }, []);
  return id;
};
export const clientSlug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const clientLabel = (id: string) => id === 'default' ? 'TitanLeap' : id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
