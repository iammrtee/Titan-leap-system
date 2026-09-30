import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, FileText, Download, ExternalLink, ImagePlus, Trash2, Image as ImageIcon, PenLine, Sparkles, X } from 'lucide-react';
import { generateLeakAudit, annotateShot, type ContentAuditResult } from '@/src/services/ai';
import { readScreenshot, drawMark, type MarkBox } from '@/src/lib/markShot';
import { renderLeakReportHtml, type LeakAuditReport } from '@/src/lib/leakReportTemplate';

type Props = {
  formData: any;
  contentAudit: ContentAuditResult | null;
  // Runs (or reuses) the content audit for the assessment's profiles before building.
  ensureContentAudit?: () => Promise<ContentAuditResult | null>;
  report: LeakAuditReport | null;
  onReport: (r: LeakAuditReport | null) => void;
};

const field = "w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface";
const label = "block text-[11px] font-bold text-on-surface-variant/70 mb-1.5";

export function LeakReportPanel({ formData, contentAudit, ensureContentAudit, report, onReport }: Props) {
  const [f, setF] = useState({
    businessName: formData.businessName || '',
    websiteUrl: formData.websiteUrl || '',
    pricingPageUrl: formData.pricingPageUrl || '',
    signupUrl: formData.landingPageUrl || '',
    mainOffer: formData.mainOffer || '',
    audience: formData.industry || '',
    notes: '',
    visitors: '',
    signupRate: '',
    paidRate: '',
    revenuePerCustomer: formData.pricePoint || '',
  });
  const [running, setRunning] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const html = useMemo(() => (report ? renderLeakReportHtml(report) : ''), [report]);

  const run = async () => {
    const nums = [f.visitors, f.signupRate, f.paidRate, f.revenuePerCustomer].map(Number);
    if (!f.websiteUrl.trim()) { toast.error('Add the website URL.'); return; }
    if (nums.some(v => !(v > 0))) { toast.error('Fill in visitors, signup %, trial-to-paid % and revenue per customer. Ask the client for these on the intake form.'); return; }
    setRunning(true);
    const t = toast.loading('Building the Customer Leak Audit…', { description: 'Reading their pages and working out the customer gap.' });
    try {
      let ca = contentAudit;
      if (ensureContentAudit) {
        try { ca = (await ensureContentAudit()) ?? contentAudit; } catch { /* build without it */ }
      }
      const r = await generateLeakAudit({
        ...f,
        visitors: nums[0], signupRate: nums[1], paidRate: nums[2], revenuePerCustomer: nums[3],
        contentSummary: ca?.analysis?.summaryForMainAudit,
        contentScore: ca?.scores?.overall ?? null,
      });
      onReport(r);
      const unread = Object.entries(r.pagesRead || {}).filter(([, ok]) => !ok).map(([k]) => k);
      toast.success('Report ready. Read every line before sending.', {
        id: t,
        description: unread.length ? `Couldn't read: ${unread.join(', ')} page. Check those leaks by hand.` : undefined,
      });
    } catch (e: any) {
      toast.error('Leak audit failed', { id: t, description: e?.message });
    } finally {
      setRunning(false);
    }
  };

  // ── Screenshots: you add them (upload, drop or paste), the AI marks the problem,
  // your browser draws the mark. Nothing runs on the server except one AI call.
  const [marking, setMarking] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const reportRef = useRef(report);
  reportRef.current = report;
  const pageUrlFor = (l: any) =>
    l?.pageUrl || (l?.page === 'pricing' ? f.pricingPageUrl : l?.page === 'signup' ? f.signupUrl : f.websiteUrl) || '';

  const updateLeak = (i: number, patch: Record<string, any>) => {
    const r = reportRef.current;
    if (!r) return;
    const next = { ...r, leaks: r.leaks.map((l, j) => (j === i ? { ...l, ...patch } : l)) };
    reportRef.current = next;
    onReport(next);
  };

  const addShot = async (i: number, file: File | Blob) => {
    const leak: any = reportRef.current?.leaks[i];
    if (!leak) return;
    try {
      const { dataUrl, width, height } = await readScreenshot(file);
      const base = { image: dataUrl, raw: dataUrl, url: pageUrlFor(leak), highlighted: false, box: null, note: '', markedBy: null };
      updateLeak(i, { shot: base });
      setMarking(m => ({ ...m, [i]: true }));
      try {
        const a = await annotateShot({ image: dataUrl, width, height, title: leak.title, whatWeSaw: leak.whatWeSaw, quote: leak.quoteOnPage, whatsWrong: leak.whatsWrong });
        if (a.found && a.box) {
          updateLeak(i, { shot: { ...base, image: await drawMark(dataUrl, a.box), highlighted: true, box: a.box, markedBy: 'ai' } });
          toast.success(`Leak ${i + 1}: proof circled`, { description: 'Not quite right? Use "Draw mark" to fix it.' });
        } else {
          toast.info(`Leak ${i + 1}: couldn't spot the problem in this screenshot`, { description: 'Use "Draw mark" to circle it yourself.' });
        }
      } catch (e: any) {
        toast.error(`Leak ${i + 1}: automatic marking failed`, { description: 'Use "Draw mark" to circle it yourself.' });
      } finally {
        setMarking(m => ({ ...m, [i]: false }));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not use that image');
    }
  };

  const saveMark = async (i: number, box: MarkBox | null) => {
    const shot: any = (reportRef.current?.leaks[i] as any)?.shot;
    if (!shot?.raw) return;
    updateLeak(i, { shot: { ...shot, image: await drawMark(shot.raw, box), highlighted: !!box, box, note: '', markedBy: box ? 'you' : null } });
    setEditing(null);
  };

  const pasteInto = (i: number) => (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(it => it.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) { e.preventDefault(); addShot(i, file); }
  };
  const dropInto = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) addShot(i, file);
  };

  const download = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Customer-Leak-Audit-${(report?.businessName || 'client').replace(/[^a-z0-9]+/gi, '-')}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const open = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6 space-y-5">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Customer Leak Audit</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            The $297 report, in the same format as titanleap.co/sample-report. We read their real pages and do the maths from their numbers. Run the Content Audit first if you want it included.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={label}>Business name</label><input className={field} value={f.businessName} onChange={set('businessName')} /></div>
          <div><label className={label}>Website URL *</label><input className={field} value={f.websiteUrl} onChange={set('websiteUrl')} placeholder="yoursaas.com" /></div>
          <div><label className={label}>Pricing page URL</label><input className={field} value={f.pricingPageUrl} onChange={set('pricingPageUrl')} /></div>
          <div><label className={label}>Signup page URL</label><input className={field} value={f.signupUrl} onChange={set('signupUrl')} /></div>
          <div><label className={label}>What they sell</label><input className={field} value={f.mainOffer} onChange={set('mainOffer')} /></div>
          <div><label className={label}>Who buys it</label><input className={field} value={f.audience} onChange={set('audience')} /></div>
        </div>

        <div>
          <div className="text-sm font-bold text-on-surface mb-2">Their funnel numbers (from the client)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className={label}>Visitors a month *</label><input className={field} inputMode="numeric" value={f.visitors} onChange={set('visitors')} placeholder="8000" /></div>
            <div><label className={label}>Sign up / trial % *</label><input className={field} inputMode="decimal" value={f.signupRate} onChange={set('signupRate')} placeholder="1.2" /></div>
            <div><label className={label}>Trial to paid % *</label><input className={field} inputMode="decimal" value={f.paidRate} onChange={set('paidRate')} placeholder="9" /></div>
            <div><label className={label}>Revenue per customer / mo *</label><input className={field} inputMode="decimal" value={f.revenuePerCustomer} onChange={set('revenuePerCustomer')} placeholder="49" /></div>
          </div>
        </div>

        <div><label className={label}>Your notes (anything the client told you)</label><textarea className={field} rows={3} value={f.notes} onChange={set('notes')} /></div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={running} className="flex items-center gap-2 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-60">
            {running ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {running ? 'Building…' : report ? 'Build again' : 'Build the report'}
          </button>
          {contentAudit?.analysis && <span className="text-xs text-on-surface-variant">Content audit ({contentAudit.scores?.overall ?? 'partial'}) will be included.</span>}
        </div>
      </div>

      {report && (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-3 md:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="text-sm text-on-surface-variant">
              <b className="text-on-surface">Check before sending:</b> every quote is really on their page, the fixes make sense for them, nothing sounds generic.
            </div>
            <div className="flex gap-2">
              <button onClick={open} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border border-outline-variant/30 text-on-surface"><ExternalLink size={15} />Open</button>
              <button onClick={download} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-primary text-on-primary"><Download size={15} />Download for client</button>
            </div>
          </div>
          <div className="px-2 grid gap-2">
            <div className="text-xs text-on-surface-variant">
              <b className="text-on-surface">Screenshots:</b> add one per leak (upload, drag it onto the row, or click the row and paste). The AI circles the proof; adjust it with "Draw mark" if needed.
            </div>
            {report.leaks.map((l: any, i) => (
              <div
                key={i}
                tabIndex={0}
                onPaste={pasteInto(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={dropInto(i)}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest px-3 py-2.5 outline-none focus:border-primary/50"
              >
                {l.shot?.image
                  ? <img src={l.shot.image} alt="" className="w-24 h-14 object-cover object-top rounded-md border border-outline-variant/20" />
                  : <div className="w-24 h-14 rounded-md border border-dashed border-outline-variant/40 grid place-items-center text-on-surface-variant/40"><ImageIcon size={16} /></div>}
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-bold text-on-surface">{i + 1}. {l.title}</div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                    {marking[i] ? <><Loader2 size={12} className="animate-spin" />Marking the problem…</>
                      : !l.shot?.image ? `Add a screenshot of the ${String(l.where || 'page').toLowerCase()}. Until then the report shows the quote.`
                      : l.shot.markedBy === 'ai' ? <><Sparkles size={12} className="text-primary" />Circled by AI</>
                      : l.shot.markedBy === 'you' ? 'Marked by you'
                      : 'No mark yet'}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20">
                  <ImagePlus size={14} />{l.shot?.image ? 'Replace' : 'Upload screenshot'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) addShot(i, file); }} />
                </label>
                {l.shot?.raw && (
                  <button onClick={() => setEditing(i)} disabled={marking[i]} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border border-outline-variant/30 text-on-surface disabled:opacity-40">
                    <PenLine size={14} />Draw mark
                  </button>
                )}
                {l.shot?.image && (
                  <button onClick={() => updateLeak(i, { shot: null })} className="p-2 rounded-lg text-on-surface-variant/60 hover:text-rose-500" aria-label="Remove screenshot"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
          {editing != null && (report.leaks[editing] as any)?.shot?.raw && (
            <MarkEditor
              title={`${editing + 1}. ${report.leaks[editing].title}`}
              raw={(report.leaks[editing] as any).shot.raw}
              initialBox={(report.leaks[editing] as any).shot.box || null}
              onCancel={() => setEditing(null)}
              onSave={box => saveMark(editing, box)}
            />
          )}
          <iframe title="Customer Leak Audit preview" srcDoc={html} className="w-full rounded-xl bg-white" style={{ height: '75vh', border: 0 }} />
        </div>
      )}
    </div>
  );
}

// Drag on the screenshot to draw the mark. Stores the box as fractions of the image.
function MarkEditor({ title, raw, initialBox, onCancel, onSave }: {
  title: string; raw: string; initialBox: MarkBox | null;
  onCancel: () => void; onSave: (box: MarkBox | null) => void | Promise<void>;
}) {
  const [box, setBox] = useState<MarkBox | null>(initialBox);
  const [saving, setSaving] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const pos = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  };
  const down = (e: React.PointerEvent) => { e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); start.current = pos(e); setBox({ ...start.current, w: 0, h: 0 }); };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = pos(e), s = start.current;
    setBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => { start.current = null; setBox(b => (b && (b.w < 0.01 || b.h < 0.01) ? null : b)); };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-container-lowest rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-outline-variant/15">
          <div>
            <div className="text-sm font-bold text-on-surface">{title}</div>
            <div className="text-xs text-on-surface-variant">Drag over the problem to mark it.</div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-auto p-4 bg-surface-container">
          <div ref={wrap} className="relative mx-auto select-none touch-none cursor-crosshair" style={{ maxWidth: 1000 }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <img src={raw} alt="" draggable={false} className="block w-full h-auto rounded-md" />
            {box && (
              <div className="absolute rounded-xl pointer-events-none" style={{
                left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`,
                border: '3px solid #6B21E8', background: 'rgba(245,197,24,.18)', boxShadow: '0 0 0 3px rgba(255,255,255,.9)',
              }} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-outline-variant/15">
          <div className="flex-1 text-xs text-on-surface-variant">The report explains the problem; the circle just points to the proof.</div>
          <button onClick={() => setBox(null)} className="rounded-lg px-3 py-2 text-xs font-bold border border-outline-variant/30 text-on-surface">Clear mark</button>
          <button disabled={saving} onClick={async () => { setSaving(true); try { await onSave(box); } finally { setSaving(false); } }}
            className="rounded-lg px-4 py-2 text-xs font-bold bg-primary text-on-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save mark'}</button>
        </div>
      </div>
    </div>
  );
}
