import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Loader2, Instagram, Twitter, Linkedin, Youtube, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { parseContentImport } from '@/src/services/ai';

export type ImportedPost = {
  date: Date; platform: string; type: 'video' | 'article' | 'post'; title: string; description: string; time: string;
};

const PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', icon: <Instagram size={13} /> },
  { id: 'Twitter', label: 'X', icon: <Twitter size={13} /> },
  { id: 'TikTok', label: 'TikTok', icon: <Play size={13} /> },
  { id: 'LinkedIn', label: 'LinkedIn', icon: <Linkedin size={13} /> },
  { id: 'YouTube', label: 'YouTube', icon: <Youtube size={13} /> },
];
const VALID = PLATFORMS.map(p => p.id);
const field = "w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20";
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

// Paste or upload content (e.g. what Claude wrote in a chat), and it lands on the calendar,
// one post per day, tagged with the brand it belongs to. Words are kept as written.
export const ContentImport: React.FC<{
  brands: string[];
  defaultBrand: string;
  onAddBrand: (name: string) => void;
  onImport: (posts: ImportedPost[], brand: string, replace: boolean) => void;
  onClose: () => void;
}> = ({ brands, defaultBrand, onAddBrand, onImport, onClose }) => {
  const [text, setText] = useState('');
  const [brand, setBrand] = useState(defaultBrand);
  const [newBrand, setNewBrand] = useState('');
  const [start, setStart] = useState(tomorrow());
  const [days, setDays] = useState(30);
  const [keepDays, setKeepDays] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>(['Instagram', 'Twitter']);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportedPost[] | null>(null);

  const readFile = async (f: File) => {
    if (/\.(docx?|pdf|pages)$/i.test(f.name)) { toast.error('Open that file, copy the text and paste it here.'); return; }
    if (f.size > 2_000_000) { toast.error('That file is too big. Paste the posts instead.'); return; }
    setText(await f.text());
  };

  const organise = async () => {
    if (!text.trim()) { toast.error('Paste your content first'); return; }
    setBusy(true);
    try {
      const posts = await parseContentImport(text, { days, keepDays, platforms });
      const base = new Date(`${start}T00:00:00`);
      setPreview(posts.map((p: any, i: number) => {
        const date = new Date(base);
        date.setDate(base.getDate() + Math.max(0, Math.min(365, Number.isFinite(Number(p.dayOffset)) ? Number(p.dayOffset) : i)));
        const description = [
          p.hook && `HOOK: ${p.hook}`,
          p.body && `BODY: ${p.body}`,
          p.caption && `CAPTION: ${p.caption}`,
          p.cta && `CTA: ${p.cta}`,
          p.hashtags,
        ].filter(Boolean).join('\n');
        return {
          date,
          platform: VALID.includes(p.platform) ? p.platform : (platforms[0] || 'Instagram'),
          type: p.type === 'video' || p.type === 'article' ? p.type : 'post',
          title: String(p.title || p.hook || 'Post').slice(0, 120),
          description,
          time: /\d{1,2}:\d{2}\s*(AM|PM)/i.test(p.time || '') ? p.time.toUpperCase() : '09:00 AM',
        } as ImportedPost;
      }).sort((a: ImportedPost, b: ImportedPost) => +a.date - +b.date));
    } catch (err: any) {
      toast.error(err.message || 'Could not organise that content');
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const span = preview?.length ? `${fmtDate(preview[0].date)} – ${fmtDate(preview[preview.length - 1].date)}` : '';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-[22px] shadow-[0_8px_20px_rgba(0,0,0,0.08),0_20px_60px_rgba(0,0,0,0.16)] overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 md:p-8 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-on-surface">Import content</h3>
            <p className="text-sm text-on-surface-variant/70">Paste posts from Claude, a doc or a list. We split them into days and keep your words exactly.</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-9 h-9 rounded-full bg-surface-container-highest/60 flex items-center justify-center text-on-surface-variant hover:text-on-surface"><X size={16} /></button>
        </div>

        <div className="px-6 md:px-8 pb-6 overflow-y-auto space-y-5">
          {!preview ? (
            <>
              <div className="space-y-2">
                <textarea id="import-text" value={text} onChange={e => setText(e.target.value)} rows={9}
                  placeholder={"Day 1 — Hook: ...\nCaption: ...\n\nDay 2 — ..."}
                  className={cn(field, "resize-y font-normal leading-relaxed")} />
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer hover:underline">
                  <Upload size={13} /> Or upload a .txt, .md or .csv file
                  <input type="file" accept=".txt,.md,.csv,.json,text/plain" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-on-surface-variant/70">Brand</p>
                <div className="flex flex-wrap items-center gap-2">
                  {brands.map(b => (
                    <button key={b} type="button" onClick={() => setBrand(b)}
                      className={cn("text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                        brand === b ? "bg-primary text-white border-primary" : "border-outline-variant/20 text-on-surface-variant/70 hover:text-on-surface")}>{b}</button>
                  ))}
                  <input id="import-new-brand" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="+ New brand"
                    onKeyDown={e => { if (e.key === 'Enter' && newBrand.trim()) { onAddBrand(newBrand.trim()); setBrand(newBrand.trim()); setNewBrand(''); } }}
                    className="text-xs px-3 py-1.5 rounded-full border border-dashed border-outline-variant/30 bg-transparent w-32 focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1.5"><span className="text-xs font-medium text-on-surface-variant/70">Start on</span>
                  <input id="import-start" type="date" value={start} onChange={e => setStart(e.target.value)} className={field} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-on-surface-variant/70">Spread over</span>
                  <select id="import-days" value={days} onChange={e => setDays(Number(e.target.value))} className={field}>
                    {[7, 14, 30, 60, 90].map(n => <option key={n} value={n}>{n} days</option>)}
                  </select></label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-on-surface-variant/70">Platforms when the text doesn't say</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} type="button" onClick={() => setPlatforms(prev => prev.includes(p.id) ? (prev.length > 1 ? prev.filter(x => x !== p.id) : prev) : [...prev, p.id])}
                      className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                        platforms.includes(p.id) ? "bg-primary text-white border-primary" : "border-outline-variant/20 text-on-surface-variant/60 hover:text-on-surface")}>
                      {p.icon}{p.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                <input type="checkbox" checked={keepDays} onChange={e => setKeepDays(e.target.checked)} className="accent-[var(--color-primary,#4b12c9)]" />
                Use the days written in the text (Day 1, Monday…) when there are any
              </label>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-on-surface">{preview.length} posts for {brand} · {span}</p>
              <div className="rounded-[14px] border border-outline-variant/10 divide-y divide-outline-variant/10 max-h-[45vh] overflow-y-auto">
                {preview.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-28 shrink-0 text-xs font-medium text-on-surface-variant/70">{fmtDate(p.date)}</span>
                    <span className="w-20 shrink-0 text-xs font-semibold text-primary">{p.platform === 'Twitter' ? 'X' : p.platform}</span>
                    <span className="flex-1 min-w-0 truncate text-on-surface">{p.title}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
                Replace {brand}'s existing posts on these dates
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4 md:px-8 border-t border-outline-variant/10 bg-surface-container-low/50">
          {!preview ? (
            <button onClick={organise} disabled={busy || !text.trim()} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}{busy ? 'Organising…' : 'Organise into days'}
            </button>
          ) : (
            <>
              <button onClick={() => { onImport(preview, brand, replace); onClose(); }} className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold">
                Add {preview.length} posts to calendar
              </button>
              <button onClick={() => setPreview(null)} className="px-4 py-2.5 rounded-full text-sm font-semibold text-on-surface-variant hover:text-on-surface">Back</button>
            </>
          )}
          <span className="ml-auto text-[11px] text-on-surface-variant/50">About 1–3¢ from the AI budget</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
