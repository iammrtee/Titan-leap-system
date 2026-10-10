// Automation Hub: real jobs behind the play / pause / run buttons. State lives in the
// `automations` table (section 13 of supabase-schema.sql), with an in-memory fallback so the
// page still works before that SQL has been run. Server-only.
import type { Express, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { tregEnabled, serpLocal } from './treg.ts';
import { fetchPlatformPosts } from './platformPosts.ts';
import { extractJsonObject } from '../lib/extractJson.ts';

type Status = 'Active' | 'Paused';
interface Def {
  id: string;
  name: string;
  description: string;
  needsTreg: boolean;
  /** What the owner has to provide before it can run, shown on the card. */
  configField?: { key: string; label: string; placeholder: string };
  /** Not runnable yet; reason shown on the card. */
  unavailable?: string;
}
interface Row { id: string; status: Status; config: Record<string, any>; last_run: string | null; last_result: any }

export const AUTOMATIONS: Def[] = [
  {
    id: 'competitor-hooks', needsTreg: true,
    name: 'Competitor Hook Scraper',
    description: 'Reads the latest posts from competitor profiles (X, LinkedIn, Facebook, YouTube) through Treg and pulls out the hooks that got the most engagement.',
    configField: { key: 'urls', label: 'Competitor profile links (one per line, up to 5)', placeholder: 'https://www.linkedin.com/company/…\nhttps://x.com/…' },
  },
  {
    id: 'lead-enrichment', needsTreg: true,
    name: 'Lead Enrichment Bot',
    description: 'Looks up new leads on Google through Treg (rating and review count) and writes the result into the lead\'s notes. Five leads per run.',
    configField: { key: 'location', label: 'Where your leads are (city, country)', placeholder: 'United States' },
  },
  {
    id: 'content-repurposer', needsTreg: false,
    name: 'Content Repurposer',
    description: 'Turns a script or long post into 10 short hooks and 3 LinkedIn posts with Claude.',
    configField: { key: 'script', label: 'Script or post to repurpose', placeholder: 'Paste the script here…' },
  },
  {
    id: 'trend-monitor', needsTreg: false,
    name: 'Social Trend Monitor',
    description: 'Asks Claude (with live web search) for what is trending in your niche this week, with a content angle for each.',
    configField: { key: 'niche', label: 'Your niche', placeholder: 'digital marketing for local service businesses' },
  },
  {
    id: 'ad-scaler', needsTreg: false,
    name: 'Ad Performance Scaler',
    description: 'Raises budget 20% on ads hitting ROAS above 4.5x.',
    unavailable: 'Needs a Meta Ads account connected. Not available yet.',
  },
];

const mem = new Map<string, Row>();
let tableMissing = false;

export function registerAutomationRoutes(app: Express, opts: { supabase: SupabaseClient; requireUser: RequestHandler }) {
  const { supabase, requireUser } = opts;

  async function load(id: string): Promise<Row> {
    const fallback = mem.get(id) || { id, status: (id === 'ad-scaler' ? 'Paused' : 'Paused') as Status, config: {}, last_run: null, last_result: null };
    if (tableMissing) return fallback;
    const { data, error } = await supabase.from('automations').select('*').eq('id', id).maybeSingle();
    if (error) { if (/relation|does not exist|schema cache/i.test(error.message)) tableMissing = true; return fallback; }
    return (data as Row) || fallback;
  }
  async function save(row: Row) {
    mem.set(row.id, row);
    if (tableMissing) return;
    const { error } = await supabase.from('automations').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error && /relation|does not exist|schema cache/i.test(error.message)) tableMissing = true;
  }

  async function ask(prompt: string, webSearch = false) {
    const key = process.env.CLAUDE_API_KEY;
    if (!key) throw new Error('CLAUDE_API_KEY is not set in Render');
    const { generateClaudeContent } = await import('./claude.ts');
    const r: any = await generateClaudeContent({ prompt, apiKey: key, useWebSearch: webSearch, webSearchMaxUses: 2, effort: 'low' } as any);
    const json = extractJsonObject(String(r?.text ?? ''));
    if (!json) throw new Error('Claude returned something unreadable. Try again.');
    return json;
  }

  const platformOf = (url: string) =>
    /(^|\.)(x|twitter)\.com/i.test(url) ? 'Twitter-X'
    : /linkedin\.com/i.test(url) ? 'LinkedIn'
    : /facebook\.com|fb\.com/i.test(url) ? 'Facebook'
    : /youtube\.com|youtu\.be/i.test(url) ? 'YouTube' : null;

  const jobs: Record<string, (cfg: Record<string, any>) => Promise<any>> = {
    'competitor-hooks': async cfg => {
      const urls = String(cfg.urls || '').split(/\s+/).map(s => s.trim()).filter(u => /^https?:\/\//i.test(u)).slice(0, 5);
      if (urls.length === 0) throw new Error('Add at least one competitor profile link first.');
      const found: { source: string; text: string; engagement: number | null }[] = [];
      const skipped: string[] = [];
      for (const u of urls) {
        const p = platformOf(u);
        const data = p ? await fetchPlatformPosts(p, u) : null;
        if (!data) { skipped.push(u); continue; }
        for (const post of data.posts.slice(0, 15)) if (post.text) found.push({ source: u, text: post.text.slice(0, 400), engagement: post.engagement });
      }
      if (found.length === 0) throw new Error('Treg returned no posts for those links. Use X, LinkedIn, Facebook or YouTube profile links.');
      found.sort((a, b) => (b.engagement ?? -1) - (a.engagement ?? -1));
      const top = found.slice(0, 25);
      const out = await ask(`Here are real recent posts from competitors, best-performing first:\n${top.map((p, i) => `${i + 1}. [${p.engagement ?? '?'} engagement] ${p.text}`).join('\n')}\n\nPull out the 8 strongest hooks (the opening line or idea that earns attention), say why each works in one short sentence, and give a pattern we can reuse. Return ONLY JSON: {"hooks":[{"hook":"","why":"","pattern":""}]}`);
      return { checked: urls.length - skipped.length, skipped, hooks: (out as any).hooks || [] };
    },

    'lead-enrichment': async cfg => {
      const location = String(cfg.location || 'United States');
      const { data: leads, error } = await supabase.from('leads').select('id,name,company,score_reason').order('created_at', { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      const todo = (leads || []).filter((l: any) => (l.company || l.name) && !String(l.score_reason || '').includes('[google]')).slice(0, 5);
      if (todo.length === 0) return { enriched: [], note: 'Every recent lead has already been looked up.' };
      const enriched: any[] = [];
      for (const l of todo as any[]) {
        const q = String(l.company || l.name);
        const r = await serpLocal(q, location, 3);
        if (r.skipped) throw new Error(r.reason);
        const rows: any[] = (r as any).data?.results || [];
        const hit = rows.find((x: any) => String(x.title || '').toLowerCase().includes(q.toLowerCase().slice(0, 8))) || rows[0];
        const note = hit?.rating?.value
          ? `[google] ${hit.title}: ${hit.rating.value}★ from ${hit.rating.votes_count ?? '?'} reviews`
          : '[google] no Google listing found';
        await supabase.from('leads').update({ score_reason: [l.score_reason, note].filter(Boolean).join(' | ') }).eq('id', l.id);
        enriched.push({ lead: q, result: note.replace('[google] ', '') });
      }
      return { enriched };
    },

    'content-repurposer': async cfg => {
      const script = String(cfg.script || '').trim();
      if (script.length < 80) throw new Error('Paste a script or post (at least a few sentences) first.');
      const out: any = await ask(`Repurpose this into short-form content.\n\n${script.slice(0, 6000)}\n\nReturn ONLY JSON: {"hooks":["10 punchy hook lines for TikTok/Reels, each under 15 words"],"linkedin":["3 LinkedIn posts, 80-140 words each, first line is the hook"]}`);
      return { hooks: out.hooks || [], linkedin: out.linkedin || [] };
    },

    'trend-monitor': async cfg => {
      const niche = String(cfg.niche || 'digital marketing for local service businesses');
      const out: any = await ask(`What is genuinely trending this week on Instagram, TikTok and LinkedIn for: ${niche}? Give 3 topics, each with a concrete content angle we can post. Return ONLY JSON: {"trends":[{"topic":"","strategy":""}]}`, true);
      return { trends: out.trends || [] };
    },
  };

  async function runOne(id: string) {
    const def = AUTOMATIONS.find(a => a.id === id);
    if (!def) throw new Error('Unknown automation');
    if (def.unavailable) throw new Error(def.unavailable);
    if (def.needsTreg && !tregEnabled()) throw new Error('Treg is not connected. Add TREG_TOKEN in Render.');
    const row = await load(id);
    const result = await jobs[id](row.config || {});
    await save({ ...row, last_run: new Date().toISOString(), last_result: { ok: true, ...result } });
    return result;
  }

  app.get('/api/automations', requireUser, async (_req, res) => {
    const items = await Promise.all(AUTOMATIONS.map(async d => {
      const r = await load(d.id);
      return { ...d, status: d.unavailable ? 'Paused' : r.status, config: r.config || {}, lastRun: r.last_run, lastResult: r.last_result };
    }));
    res.json({ treg: { connected: tregEnabled() }, persisted: !tableMissing, items });
  });

  app.post('/api/automations/:id/status', requireUser, async (req, res) => {
    const def = AUTOMATIONS.find(a => a.id === req.params.id);
    if (!def) return res.status(404).json({ error: 'Unknown automation' });
    if (def.unavailable) return res.status(400).json({ error: def.unavailable });
    const status: Status = req.body?.status === 'Active' ? 'Active' : 'Paused';
    if (status === 'Active' && def.needsTreg && !tregEnabled()) return res.status(400).json({ error: 'Treg is not connected. Add TREG_TOKEN in Render, then turn this on.' });
    const row = await load(def.id);
    if (status === 'Active' && def.configField && !String(row.config?.[def.configField.key] || '').trim() && def.id !== 'trend-monitor' && def.id !== 'lead-enrichment') {
      return res.status(400).json({ error: `Fill in "${def.configField.label}" first.` });
    }
    await save({ ...row, status });
    res.json({ status });
  });

  app.post('/api/automations/:id/config', requireUser, async (req, res) => {
    const def = AUTOMATIONS.find(a => a.id === req.params.id);
    if (!def?.configField) return res.status(404).json({ error: 'Nothing to configure' });
    const row = await load(def.id);
    const value = String(req.body?.value ?? '').slice(0, 8000);
    await save({ ...row, config: { ...row.config, [def.configField.key]: value } });
    res.json({ ok: true });
  });

  app.post('/api/automations/:id/run', requireUser, async (req, res) => {
    try {
      const result = await runOne(req.params.id);
      res.json({ ok: true, result, ranAt: new Date().toISOString() });
    } catch (e: any) {
      const row = await load(req.params.id);
      await save({ ...row, last_run: new Date().toISOString(), last_result: { ok: false, error: e?.message || 'Failed' } });
      res.status(400).json({ error: e?.message || 'The run failed' });
    }
  });

  // Active automations run once a day on their own (Treg-backed ones are capped per run, so
  // the cost stays at a few cents). Checked hourly; one run at a time to keep memory low.
  setInterval(async () => {
    for (const d of AUTOMATIONS) {
      if (d.unavailable) continue;
      try {
        const r = await load(d.id);
        if (r.status !== 'Active') continue;
        if (r.last_run && Date.now() - new Date(r.last_run).getTime() < 23 * 3600 * 1000) continue;
        await runOne(d.id);
      } catch (e: any) { console.warn(`[Automations] ${d.id} scheduled run failed:`, e?.message || e); }
    }
  }, 60 * 60 * 1000).unref?.();
}
