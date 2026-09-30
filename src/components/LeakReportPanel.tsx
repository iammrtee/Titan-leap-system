import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, FileText, Download, ExternalLink, ImagePlus, Trash2, Image as ImageIcon } from 'lucide-react';
import { generateLeakAudit, type ContentAuditResult } from '@/src/services/ai';
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

  // Your own screenshot for a leak: replaces (or fills in) the automatic one.
  // Downscaled to 1400px wide JPEG so the downloadable report stays light.
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1400 / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not read image')); return; }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image')); };
    img.src = url;
  });
  const pageUrlFor = (page?: string) =>
    page === 'pricing' ? f.pricingPageUrl : page === 'signup' ? f.signupUrl : f.websiteUrl;
  const setShot = async (i: number, file: File | null) => {
    if (!report) return;
    try {
      const shot = file ? { image: await fileToDataUrl(file), url: pageUrlFor((report.leaks[i] as any).page) || '', highlighted: false } : null;
      onReport({ ...report, leaks: report.leaks.map((l, j) => (j === i ? { ...l, shot } : l)) });
      toast.success(file ? `Screenshot added to leak ${i + 1}` : `Screenshot removed from leak ${i + 1}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not use that image');
    }
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
            {report.leaks.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest px-3 py-2.5">
                {l.shot?.image
                  ? <img src={l.shot.image} alt="" className="w-20 h-12 object-cover object-top rounded-md border border-outline-variant/20" />
                  : <div className="w-20 h-12 rounded-md border border-dashed border-outline-variant/40 grid place-items-center text-on-surface-variant/40"><ImageIcon size={16} /></div>}
                <div className="flex-1 min-w-[180px]">
                  <div className="text-sm font-bold text-on-surface">{i + 1}. {l.title}</div>
                  <div className="text-xs text-on-surface-variant">
                    {l.shot?.image ? (l.shot.highlighted ? 'Screenshot taken automatically, problem circled' : 'Screenshot added') : 'No screenshot yet. The report shows the quote instead.'}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20">
                  <ImagePlus size={14} />{l.shot?.image ? 'Replace' : 'Upload screenshot'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) setShot(i, file); }} />
                </label>
                {l.shot?.image && (
                  <button onClick={() => setShot(i, null)} className="p-2 rounded-lg text-on-surface-variant/60 hover:text-rose-500" aria-label="Remove screenshot"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
          <iframe title="Customer Leak Audit preview" srcDoc={html} className="w-full rounded-xl bg-white" style={{ height: '75vh', border: 0 }} />
        </div>
      )}
    </div>
  );
}
