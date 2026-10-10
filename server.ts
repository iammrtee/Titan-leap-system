import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { executePublishingDaemon } from "./src/services/daemon.ts";
import { authRouter, setAccountStore } from "./src/services/auth.ts";
import { openCreds } from "./src/services/tokenVault.ts";
import { registerTikTokRoutes } from "./src/services/tiktokPost.ts";
import { twitterManualRouter } from "./src/services/twitter-manual.ts";
import { createClient } from '@supabase/supabase-js';
import { extractJsonObject } from "./src/lib/extractJson.ts";
import { fetchPlatformPosts, TREG_POST_PLATFORMS, type PlatformPosts } from "./src/services/platformPosts.ts";

// Initialize Supabase Client for Server-side (env vars only â no hardcoded keys)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Server] FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// --- Auth Middleware ---
// Internal API calls (from the SPA) are validated via the caller's own Supabase session
// token (Authorization: Bearer <access_token>), then checked against an email allowlist.
// External webhooks (n8n) are validated via a separate WEBHOOK_SECRET.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Comma-separated list of emails allowed to call protected internal routes, e.g.
// "founder@titanleap.co,teammate@titanleap.co". Set this in the environment.
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (ALLOWED_EMAILS.length === 0) {
  console.warn('[Auth] ALLOWED_EMAILS is not set — no one will be authorized to call protected routes. Set it in your environment (comma-separated emails).');
}

// Middleware: require a valid Supabase session token for the SPA's own logged-in user,
// and require that user's email to be on the ALLOWED_EMAILS allowlist.
const requireUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const email = data.user.email.toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).user = data.user;
    return next();
  } catch (err) {
    console.error('[Auth] Failed to verify session token:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Middleware: require x-webhook-secret header for external webhooks
const requireWebhookAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!WEBHOOK_SECRET) {
    console.warn('[Auth] WEBHOOK_SECRET not set â webhook endpoints are unprotected. Set it in your environment.');
    return next();
  }
  const secret = req.headers['x-webhook-secret'];
  if (secret === WEBHOOK_SECRET) return next();
  res.status(401).json({ error: 'Invalid webhook secret' });
};

async function startServer() {
  const app = express();
app.get('/tiktokYpXZpQ9XONrgK65iJfPCyWLHPVQivOuX.txt', (req, res) => {
  res.type('text/plain').send('tiktok-developers-site-verification=YpXZpQ9XONrgK65iJfPCyWLHPVQivOuX');
});

  // Use DEFAULT_APP_PORT in AI Studio (3000), otherwise fallback to Cloud Run's PORT (8080)
  const PORT = Number(process.env.DEFAULT_APP_PORT || process.env.PORT || 3000);

  app.use(express.json({ limit: '50mb' })); // Increased limit for base64 media

  // Connect-account OAuth. Starting a flow (/url) requires a signed-in user, so nobody else
  // can attach their own account to one of our profiles; callbacks are checked by state.
  app.use("/api/auth", (req, res, next) => (req.path.endsWith('/url') ? requireUser(req, res, next) : next()), authRouter);
  setAccountStore(async (profileId, fields) => {
    const { error } = await supabase.from('user_settings').upsert({ profile_id: profileId, ...fields }, { onConflict: 'profile_id' });
    if (error) {
      throw new Error(/column/i.test(error.message)
        ? 'The database is missing account columns. Run section 12 of supabase-schema.sql in Supabase.'
        : error.message);
    }
  });

  // TikTok Direct Post (creator info, publish, status, media proxy). Tokens stay server-side.
  const tiktok = registerTikTokRoutes(app, { supabase, supabaseUrl: supabaseUrl || '', requireUser });
  
  // AI Automation Hub: real jobs behind play / pause / run.
  (await import("./src/services/automations.ts")).registerAutomationRoutes(app, { supabase, requireUser });

  // Mount Twitter Manual Router
  app.use("/api/twitter", twitterManualRouter);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Claude AI Proxy (protected)
  app.post("/api/ai/claude", requireUser, async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature, useWebSearch } = req.body;
      const { generateClaudeContent } = await import("./src/services/claude.ts");
      
      // Explicitly pass the API key from server environment
      const apiKey = process.env.CLAUDE_API_KEY;
      
      const result = await generateClaudeContent({ 
        prompt, 
        systemPrompt, 
        temperature,
        apiKey,
        useWebSearch
      });
      res.json(result);
    } catch (error: any) {
      console.error("[Claude Proxy] Critical Error:", error);
      
      let errorMessage = error.message || "Failed to process Claude request";
      
      // Extract Anthropic specific error message if it's a raw stringified JSON
      if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
        try {
          const jsonMatch = errorMessage.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error?.message) {
              errorMessage = parsed.error.message;
            }
          }
        } catch (e) {}
      }

      res.status(500).json({ 
        error: errorMessage,
        isAuthError: errorMessage.includes("API key") || errorMessage.includes("restricted") || errorMessage.includes("403")
      });
    }
  });

  // Gemini AI Proxy (protected)
  app.post("/api/ai/gemini", requireUser, async (req, res) => {
    try {
      const { prompt, systemPrompt, responseMimeType, temperature } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("Gemini API access restricted. Please add your 'GEMINI_API_KEY' in the Settings > Secrets panel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature ?? 0.7,
          responseMimeType: responseMimeType || "text/plain",
        }
      });

      // Based on the SDK structure seen in ai.ts
      const resData = result as any;
      const response = resData.response || resData;
      let text = '';
      if (typeof response.text === 'function') {
        text = response.text();
      } else {
        text = response.text || '';
      }
      
      res.json({ text });
    } catch (error: any) {
      console.error("[Gemini Proxy] Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to process Gemini request",
        isAuthError: error.message?.includes("API key") || error.message?.includes("Forbidden") || error.message?.includes("403")
      });
    }
  });

  // ── Social profile discovery ───────────────────────────────────────────────
  // Reads the brand's social links straight out of the page source (hrefs, JSON-LD
  // "sameAs", embedded JSON) — no AI call, so it's free and exact. Share buttons,
  // tracking pixels and embeds are filtered out; if a platform is linked several
  // times, the most-referenced account wins (usually the brand's own footer link).
  const SOCIAL_RESERVED = new Set(['embed', 'embed.js', 'about', 'legal', 'developer', 'developers', 'privacy', 'terms', 'help', 'login', 'signup', 'home', 'intent', 'share', 'sharer', 'sharer.php', 'hashtag', 'watch', 'results', 'feed', 'p', 'reel', 'reels', 'accounts', 'explore', 'stories', 'pages', 'groups', 'events', 'plugins', 'dialog', 'tr', 'business', 'policies', 'ads', 'static', 'images', 'i', 'search', 'settings', 'notifications', 'messages', 'tv', 'direct', 'legal', 'discover', 'tag', 'music', 'video', 'profile.php', 'people', 'watch?v', 'shorts', 'playlist', 'jobs', 'feed', 'widgets.js', 'favicon.ico']);
  const SOCIAL_RULES: Array<{ platform: string; re: RegExp; url: (m: RegExpMatchArray) => string; id: (m: RegExpMatchArray) => string }> = [
    { platform: 'Instagram', re: /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i, id: m => m[1], url: m => `https://www.instagram.com/${m[1]}/` },
    { platform: 'TikTok', re: /^https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{2,30})\/?(?:[?#].*)?$/i, id: m => m[1], url: m => `https://www.tiktok.com/@${m[1]}` },
    { platform: 'LinkedIn', re: /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(company|in|school|showcase)\/([^/?#\s]{2,})\/?(?:[?#].*)?$/i, id: m => `${m[1]}/${m[2]}`, url: m => `https://www.linkedin.com/${m[1].toLowerCase()}/${m[2]}/` },
    { platform: 'Twitter-X', re: /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i, id: m => m[1], url: m => `https://x.com/${m[1]}` },
    { platform: 'YouTube', re: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(@[\w.-]{2,}|channel\/[\w-]{10,}|c\/[\w.-]{2,}|user\/[\w.-]{2,})\/?(?:[?#].*)?$/i, id: m => m[1], url: m => `https://www.youtube.com/${m[1]}` },
    { platform: 'Facebook', re: /^https?:\/\/(?:www\.|m\.|web\.)?(?:facebook|fb)\.com\/([A-Za-z0-9.\-]{2,})\/?(?:[?#].*)?$/i, id: m => m[1], url: m => `https://www.facebook.com/${m[1]}` },
  ];

  function extractSocialLinks(html: string): Array<{ platform: string; url: string }> {
    if (!html) return [];
    const text = html.replace(/\\\//g, '/').replace(/&amp;/g, '&');
    const candidates = text.match(/https?:\/\/[^\s"'<>()\\]+/g) || [];
    const counts = new Map<string, { platform: string; url: string; n: number; order: number; rank: number }>();
    candidates.forEach((raw, order) => {
      const u = raw.replace(/[.,;]+$/, '');
      for (const rule of SOCIAL_RULES) {
        const m = u.match(rule.re);
        if (!m) continue;
        const id = rule.id(m);
        const last = id.split('/').pop()!.toLowerCase();
        if (SOCIAL_RESERVED.has(last) || SOCIAL_RESERVED.has(id.toLowerCase())) break;
        const key = `${rule.platform}|${id.toLowerCase()}`;
        // LinkedIn: a company page beats a founder's personal profile.
        const rank = rule.platform === 'LinkedIn' && !/^company\//i.test(id) ? 1 : 0;
        const prev = counts.get(key);
        if (prev) prev.n += 1;
        else counts.set(key, { platform: rule.platform, url: rule.url(m), n: 1, order, rank });
        break;
      }
    });
    const best = new Map<string, { platform: string; url: string; n: number; order: number; rank: number }>();
    for (const c of counts.values()) {
      const b = best.get(c.platform);
      if (!b || c.rank < b.rank || (c.rank === b.rank && (c.n > b.n || (c.n === b.n && c.order < b.order)))) best.set(c.platform, c);
    }
    return [...best.values()].sort((a, b) => a.order - b.order).map(({ platform, url }) => ({ platform, url }));
  }

  const socialDiscoveryCache = new Map<string, { data: Array<{ platform: string; url: string }>; expiresAt: number }>();
  async function fetchPageHtml(url: string, timeoutMs = 10000): Promise<string> {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) return '';
      return (await r.text()).slice(0, 2_000_000);
    } catch { return ''; }
  }
  async function discoverSocialProfiles(rawUrl: string, homepageHtml?: string): Promise<Array<{ platform: string; url: string }>> {
    let base: URL;
    try { base = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`); } catch { return []; }
    const cacheKey = base.hostname.replace(/^www\./, '').toLowerCase();
    const cached = socialDiscoveryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    let found = extractSocialLinks(homepageHtml ?? await fetchPageHtml(base.origin + (base.pathname || '/')));
    // Many sites only link socials on About/Contact, or render the footer with JS.
    if (found.length < 2) {
      const extra = await Promise.all(['/contact', '/about', '/contact-us', '/about-us'].map(p => fetchPageHtml(base.origin + p, 6000)));
      const merged = new Map(found.map(f => [f.platform, f]));
      for (const f of extractSocialLinks(extra.join('\n'))) if (!merged.has(f.platform)) merged.set(f.platform, f);
      found = [...merged.values()];
    }
    socialDiscoveryCache.set(cacheKey, { data: found, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
    return found;
  }

  app.post("/api/discover-socials", requireUser, async (req, res) => {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: "url is required" });
    try {
      res.json({ profiles: await discoverSocialProfiles(url) });
    } catch (e: any) {
      console.error("[DiscoverSocials] failed:", e?.message || e);
      res.json({ profiles: [] });
    }
  });

  // Market check via Treg: demand, Google visibility, local trust. Skips cleanly without TREG_TOKEN.
  app.post("/api/market-check", requireUser, async (req, res) => {
    const { keyword, location, domain } = req.body || {};
    if (!keyword || typeof keyword !== 'string' || !location || typeof location !== 'string') {
      return res.status(400).json({ error: "keyword and location are required" });
    }
    try {
      const { marketCheck } = await import("./src/services/treg.ts");
      res.json(await marketCheck({ keyword: keyword.slice(0, 120), location: location.slice(0, 120), domain }));
    } catch (e: any) {
      console.error("[MarketCheck] failed:", e?.message || e);
      res.json({ skipped: true, reason: "market check failed" });
    }
  });

  // Smart Fill (protected)
  app.post("/api/ai/smart-fill", requireUser, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      // Fetch the page server-side (avoids CORS, can actually read content)
      let pageText = '';
      let rawHtml = '';
      try {
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TitanLeap/1.0; +https://titanleap.ai)' },
          signal: AbortSignal.timeout(12000)
        });
        const html = await pageRes.text();
        rawHtml = html;
        // Strip scripts, styles, tags â keep readable text
        pageText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000);
      } catch (fetchErr: any) {
        console.warn("[SmartFill] Could not fetch URL:", fetchErr.message);
        pageText = `Website at ${url} (could not fetch â extract what you can from the URL itself)`;
      }

      const prompt = `You are a business intelligence analyst. Analyse the following website content and extract structured business information to pre-fill an audit form.

WEBSITE URL: ${url}
WEBSITE CONTENT:
${pageText}

Extract and return ONLY a valid JSON object with these exact keys. Use your best inference from the content â do not leave fields empty if you can make a reasonable guess:
{
  "businessName": "Official name of the business",
  "industry": "One of: B2B SaaS, E-commerce, Coaching/Consulting, Agency, Local Business, Other",
  "primaryPlatform": "Their main social media platform â one of: Instagram, LinkedIn, TikTok, YouTube, Twitter-X",
  "socialHandles": ["array of social handles or profile URLs found on site, e.g. '@handle' or 'instagram.com/handle'"],
  "monthlyReach": "Estimated monthly social media reach as a number string, e.g. '5000'. Use '1000' if unknown.",
  "mainOffer": "Their primary product or service described in one sentence",
  "pricePoint": "Numeric price of main offer in USD as string, e.g. '2997'. Use '0' if not found.",
  "differentiator": "What makes them unique or their main value proposition in one sentence",
  "currentRevenue": "0",
  "targetRevenue": "If pricePoint is known, set to pricePoint * 10 as string, else '0'",
  "currency": "USD",
  "timeline": "One of: 30 days, 60 days, 90 days, 6 months, 1 year â pick most appropriate for their business stage",
  "challenges": ["Array of 1-3 items from: Getting leads, Converting leads, Retaining clients, Content creation, Ads not working, No clear strategy, Other"],
  "tools": ["Array of tools they likely use from: Mailchimp, ConvertKit, ClickFunnels, Webflow, Shopify, Kajabi, None, Other"],
  "contentTypes": ["Array of content types they produce from: Short-form video, Long-form video, Carousels, Blogs, Emails, Podcasts"],
  "hasLandingPage": true,
  "hasUpsell": false,
  "runningAds": false,
  "emailSequence": "One of: Yes, No, In progress"
}
Return ONLY the JSON. No markdown. No explanation.`;

      const { generateClaudeContent } = await import("./src/services/claude.ts");
      const result = await generateClaudeContent({
        prompt,
        apiKey: process.env.CLAUDE_API_KEY,
        model: "claude-haiku-4-5-20251001"
      });
      const cleaned = (result.text || '').replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = extractJsonObject(cleaned);
      if (!parsed) throw new Error("Could not parse smart-fill response as JSON");
      // Social links come from the page source, not Claude's reading of the stripped text
      // (which never sees icon links). Found links replace Claude's guesses per platform.
      try {
        const found = await discoverSocialProfiles(url, rawHtml || undefined);
        if (found.length) {
          const foundPlatforms = new Set(found.map(f => f.platform));
          const platformOf = (h: string) => SOCIAL_RULES.find(r => r.re.test(h))?.platform;
          const kept = (Array.isArray(parsed.socialHandles) ? parsed.socialHandles : [])
            .filter((h: any) => typeof h === 'string' && /^https?:\/\//i.test(h) && !foundPlatforms.has(platformOf(h) || ''));
          parsed.socialHandles = [...found.map(f => f.url), ...kept].slice(0, 6);
          parsed.discoveredSocials = found;
          if (!parsed.primaryPlatform || !foundPlatforms.has(parsed.primaryPlatform)) {
            const pref = ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter-X', 'Facebook'];
            parsed.primaryPlatform = pref.find(p => foundPlatforms.has(p)) || parsed.primaryPlatform;
          }
        }
      } catch (e: any) {
        console.warn("[SmartFill] social discovery failed:", e?.message || e);
      }
      res.json(parsed);
    } catch (error: any) {
      const errMsg = error?.message || String(error) || "Smart fill failed";
      console.error("[SmartFill] Error:", errMsg, error?.stack);
      res.status(500).json({ error: errMsg });
    }
  });

  // Social Presence Research (protected) â real web_search-backed lookup, no guessing
  // Scrapes a real Instagram profile via Apify's Instagram Profile Scraper actor.
  // Returns null (never throws) if APIFY_API_TOKEN isn't set, the request fails, or the
  // profile can't be found/is private â callers must fall back to the web-search path.
  // In-memory cache so repeat clicks / re-renders on the same handle don't re-bill
  // Apify credits â a scrape is reused for 12 hours before we hit the API again.
  const instagramScrapeCache = new Map<string, { data: any; expiresAt: number }>();
  const INSTAGRAM_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

  async function scrapeInstagramProfile(handle: string): Promise<any | null> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return null;
    try {
      const usernameMatch = handle.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
      const username = (usernameMatch ? usernameMatch[1] : handle).replace(/^@/, '').replace(/\/$/, '').trim().toLowerCase();
      if (!username) return null;

      const cached = instagramScrapeCache.get(username);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      const apifyRes = await fetch(
        `https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
        }
      );
      if (!apifyRes.ok) {
        console.error("[ApifyInstagram] non-OK response:", apifyRes.status);
        return null;
      }
      const items = await apifyRes.json();
      if (!Array.isArray(items) || items.length === 0) return null;
      const profile = items[0];
      if (!profile || profile.private) return null;
      instagramScrapeCache.set(username, { data: profile, expiresAt: Date.now() + INSTAGRAM_CACHE_TTL_MS });
      return profile;
    } catch (err: any) {
      console.error("[ApifyInstagram] scrape failed:", err?.message || err);
      return null;
    }
  }

  // ── Post history (last 6 months, capped at 60 posts to keep Apify spend low) ──
  // ~60 posts × Apify's ~$2.30/1k ≈ $0.14 per profile. The cap means very active accounts
  // get a shorter window than 6 months; the history reports exactly what it covers.
  const POST_HISTORY_LIMIT = 60;
  const HISTORY_DAYS = 183;
  const instagramPostsCache = new Map<string, { data: any[]; expiresAt: number }>();

  async function scrapeInstagramPosts(username: string): Promise<any[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token || !username) return [];
    const key = username.toLowerCase();
    const cached = instagramPostsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    try {
      const r = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: [key], resultsLimit: POST_HISTORY_LIMIT, onlyPostsNewerThan: "6 months" }),
          signal: AbortSignal.timeout(120000),
        }
      );
      if (!r.ok) { console.error("[ApifyInstagramPosts] non-OK response:", r.status); return []; }
      const items = await r.json();
      const posts = (Array.isArray(items) ? items : []).filter((p: any) => p && p.timestamp && !p.error).slice(0, POST_HISTORY_LIMIT);
      instagramPostsCache.set(key, { data: posts, expiresAt: Date.now() + INSTAGRAM_CACHE_TTL_MS });
      return posts;
    } catch (err: any) {
      console.error("[ApifyInstagramPosts] scrape failed:", err?.message || err);
      return [];
    }
  }

  type HistoryItem = { ts: number; engagement: number; views: number | null };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pctChange = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  function computeHistory(all: HistoryItem[], sampleSize: number) {
    const DAY = 86_400_000;
    const now = Date.now();
    const items = all.filter(i => i.ts && now - i.ts <= HISTORY_DAYS * DAY).sort((a, b) => b.ts - a.ts);
    const oldestAll = all.length ? Math.max(...all.map(i => (now - i.ts) / DAY)) : 0;
    // If we hit the post cap, we only truly see back to the oldest post we got.
    const capped = sampleSize >= POST_HISTORY_LIMIT;
    const coverageDays = Math.max(7, Math.round(capped ? Math.min(HISTORY_DAYS, oldestAll) : HISTORY_DAYS));
    const inWindow = items.filter(i => now - i.ts <= coverageDays * DAY);
    const n = inWindow.length;

    const totalWeeks = Math.max(1, Math.floor(coverageDays / 7));
    const weekIdx = inWindow.map(i => Math.floor((now - i.ts) / (7 * DAY))).filter(w => w < totalWeeks);
    const activeWeeks = new Set(weekIdx).size;
    const recentWeeks = Math.max(1, Math.floor(totalWeeks / 2));
    const recentActiveWeeks = new Set(weekIdx.filter(w => w < recentWeeks)).size;
    let longestGapDays = n ? Math.round((now - inWindow[0].ts) / DAY) : coverageDays;
    for (let i = 1; i < n; i++) longestGapDays = Math.max(longestGapDays, Math.round((inWindow[i - 1].ts - inWindow[i].ts) / DAY));

    // Calendar months (oldest → newest), flagged when the sample doesn't reach back that far.
    const coverageStart = now - coverageDays * DAY;
    const monthly = [];
    const d = new Date();
    for (let k = 5; k >= 0; k--) {
      const start = new Date(d.getFullYear(), d.getMonth() - k, 1).getTime();
      const end = new Date(d.getFullYear(), d.getMonth() - k + 1, 1).getTime();
      const inMonth = inWindow.filter(i => i.ts >= start && i.ts < end);
      const views = inMonth.map(i => i.views).filter((v): v is number => v != null);
      monthly.push({
        month: MONTHS[new Date(start).getMonth()],
        posts: inMonth.length,
        avgEngagement: inMonth.length ? Math.round(avg(inMonth.map(i => i.engagement))) : null,
        avgViews: views.length ? Math.round(avg(views)) : null,
        covered: end > coverageStart,
        partial: start < coverageStart && end > coverageStart,
      });
    }

    // Recent half vs earlier half of the covered window.
    const half = (coverageDays / 2) * DAY;
    const recent = inWindow.filter(i => now - i.ts <= half);
    const earlier = inWindow.filter(i => now - i.ts > half);
    const enough = coverageDays >= 28 && recent.length >= 3 && earlier.length >= 3;
    const viewsOf = (xs: HistoryItem[]) => xs.map(i => i.views).filter((v): v is number => v != null);
    const rv = viewsOf(recent), ev = viewsOf(earlier);

    return {
      coverageDays,
      periodLabel: coverageDays >= 150 ? 'last 6 months' : coverageDays >= 45 ? `last ${Math.round(coverageDays / 30)} months` : `last ${coverageDays} days`,
      capped,
      postsInWindow: n,
      postsPerWeek: +(n / (coverageDays / 7)).toFixed(1),
      activeWeeks,
      totalWeeks,
      weeksActivePct: Math.round((activeWeeks / totalWeeks) * 100),
      recentWeeksActivePct: Math.round((recentActiveWeeks / recentWeeks) * 100),
      longestGapDays,
      monthly,
      halfLabel: `${Math.max(1, Math.round(coverageDays / 2 / 30))} mo`,
      postingTrendPct: coverageDays >= 28 && earlier.length ? pctChange(recent.length, earlier.length) : null,
      engagementTrendPct: enough ? pctChange(avg(recent.map(i => i.engagement)), avg(earlier.map(i => i.engagement))) : null,
      viewsTrendPct: coverageDays >= 28 && rv.length >= 3 && ev.length >= 3 ? pctChange(avg(rv), avg(ev)) : null,
    };
  }

  // Blend frequency with regularity, weighted toward the recent half: 3 posts in one
  // week then nothing scores worse than 3 posts spread over 3 weeks, and an account
  // that was busy months ago but has gone quiet scores on how it posts now.
  function applyHistoryToScores(scores: any, history: ReturnType<typeof computeHistory>, daysSinceLastPost: number | null) {
    if (history.totalWeeks < 4) return scores;
    const freq = scoreFromBands(history.postsPerWeek, [[4, 100], [3, 85], [2, 70], [1, 50], [0.5, 30]], 10) ?? 10;
    let consistency = Math.round(freq * 0.4 + history.weeksActivePct * 0.3 + history.recentWeeksActivePct * 0.3);
    if (daysSinceLastPost != null && daysSinceLastPost > 14) consistency = Math.min(consistency, 30);
    const next = { ...scores, consistency };
    const parts = [next.consistency, next.engagement, next.conversionPath, next.formatMix].filter((v: any): v is number => v != null);
    next.overall = parts.length ? Math.round(parts.reduce((a: number, b: number) => a + b, 0) / parts.length) : null;
    return next;
  }

  // Our own follower history: one snapshot per profile per day, saved on every audit.
  // Growth appears once a profile has been audited again 30/90/180 days later.
  async function followerGrowth(platform: string, handle: string, followers: number, totalPosts: number | null) {
    const DAY = 86_400_000;
    const h = handle.toLowerCase();
    const { data: rows, error } = await supabase
      .from('social_snapshots')
      .select('followers, captured_at')
      .eq('platform', platform)
      .eq('handle', h)
      .order('captured_at', { ascending: true })
      .limit(1000);
    if (error) { console.warn("[Snapshots] unavailable:", error.message); return null; }
    const list = (rows || []).map((r: any) => ({ followers: Number(r.followers), t: +new Date(r.captured_at) })).filter((r: any) => r.t);
    const last = list[list.length - 1];
    if (!last || Date.now() - last.t > 20 * 60 * 60 * 1000) {
      const { error: insErr } = await supabase.from('social_snapshots').insert({ platform, handle: h, followers, posts_count: totalPosts });
      if (insErr) console.warn("[Snapshots] insert failed:", insErr.message);
    }
    const at = (days: number) => {
      const target = Date.now() - days * DAY;
      let best: any = null;
      for (const r of list) if (Math.abs(r.t - target) <= 21 * DAY && (!best || Math.abs(r.t - target) < Math.abs(best.t - target))) best = r;
      return best;
    };
    const growth = (r: any) => r && r.followers ? {
      from: r.followers,
      change: followers - r.followers,
      pct: +(((followers - r.followers) / r.followers) * 100).toFixed(1),
      days: Math.round((Date.now() - r.t) / DAY),
    } : null;
    return {
      current: followers,
      d30: growth(at(30)),
      d90: growth(at(90)),
      d180: growth(at(180)),
      trackedSince: new Date(list[0]?.t || Date.now()).toISOString().slice(0, 10),
      snapshots: list.length || 1,
    };
  }

  // TikTok: same idea as scrapeInstagramProfile, using Apify's TikTok scraper actor.
  // Returns null (never throws) on any failure so the route falls back to the web-search path.
  const tiktokScrapeCache = new Map<string, { data: any; expiresAt: number }>();

  async function scrapeTikTokProfile(handle: string): Promise<any | null> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return null;
    try {
      const usernameMatch = handle.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
      const username = (usernameMatch ? usernameMatch[1] : handle).replace(/^@/, '').replace(/\/$/, '').trim().toLowerCase();
      if (!username) return null;

      const cached = tiktokScrapeCache.get(username);
      if (cached && cached.expiresAt > Date.now()) return cached.data;

      const apifyRes = await fetch(
        `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profiles: [username], resultsPerPage: POST_HISTORY_LIMIT, shouldDownloadCovers: false, shouldDownloadSlideshowImages: false, shouldDownloadVideos: false }),
        }
      );
      if (!apifyRes.ok) {
        console.error("[ApifyTikTok] non-OK response:", apifyRes.status);
        return null;
      }
      const items = await apifyRes.json();
      if (!Array.isArray(items) || items.length === 0) return null;
      // Actor returns one item per video; author info is repeated on each item as authorMeta.
      const authorMeta = items[0]?.authorMeta;
      if (!authorMeta) return null;
      const data = { authorMeta, videos: items };
      tiktokScrapeCache.set(username, { data, expiresAt: Date.now() + INSTAGRAM_CACHE_TTL_MS });
      return data;
    } catch (err: any) {
      console.error("[ApifyTikTok] scrape failed:", err?.message || err);
      return null;
    }
  }

  function computeTikTokContentMetrics(profile: any) {
    const DAY = 86_400_000;
    const now = Date.now();
    const videos = (Array.isArray(profile.videos) ? profile.videos : [])
      .filter((v: any) => v && (v.createTimeISO || v.createTime))
      .sort((a: any, b: any) => +new Date(b.createTimeISO || b.createTime * 1000) - +new Date(a.createTimeISO || a.createTime * 1000));
    const followers = Number(profile.authorMeta?.fans) || 0;
    const eng = (v: any) => (Number(v.diggCount) || 0) + (Number(v.commentCount) || 0) + (Number(v.shareCount) || 0);
    const n = videos.length;
    const tsOf = (v: any) => v.createTimeISO ? +new Date(v.createTimeISO) : (v.createTime ? v.createTime * 1000 : now);

    const ages = videos.map((v: any) => (now - tsOf(v)) / DAY);
    const postsLast30 = ages.filter((d: number) => d <= 30).length;
    const daysSinceLastPost = n ? Math.floor(ages[0]) : null;
    let longestGapDays = 0;
    for (let i = 1; i < n; i++) longestGapDays = Math.max(longestGapDays, Math.round(ages[i] - ages[i - 1]));
    const windowDays = n ? Math.max(7, ages[n - 1]) : 0;
    const postsPerWeek = n ? +(n / (windowDays / 7)).toFixed(1) : 0;

    const avgLikes = n ? Math.round(videos.reduce((s: number, v: any) => s + (Number(v.diggCount) || 0), 0) / n) : 0;
    const avgComments = n ? +(videos.reduce((s: number, v: any) => s + (Number(v.commentCount) || 0), 0) / n).toFixed(1) : 0;
    const avgEngagement = n ? videos.reduce((s: number, v: any) => s + eng(v), 0) / n : 0;
    const engagementRate = followers > 0 && n ? +((avgEngagement / followers) * 100).toFixed(2) : null;

    const summarise = (v: any) => v && ({
      format: 'Video',
      date: new Date(tsOf(v)).toISOString().slice(0, 10),
      engagement: eng(v),
      firstLine: String(v.text || '').split('\n')[0].slice(0, 140),
      url: v.webVideoUrl || null,
    });
    const ranked = videos.slice().sort((a: any, b: any) => eng(b) - eng(a));
    const captions = videos.map((v: any) => String(v.text || ''));
    const share = (pred: (c: string) => boolean) => (n ? Math.round((captions.filter(pred).length / n) * 100) : 0);
    const bio = String(profile.authorMeta?.signature || '');

    const metrics = {
      followers,
      totalPosts: Number(profile.authorMeta?.video) || null,
      postsAnalysed: n,
      postsLast30Days: postsLast30,
      postsPerWeek,
      daysSinceLastPost,
      longestGapDays,
      avgLikes,
      avgComments,
      engagementRatePct: engagementRate,
      captionsWithCtaPct: share(c => CONTENT_CTA_RE.test(c)),
      captionsWithQuestionPct: share(c => c.includes('?')),
      avgCaptionWords: n ? Math.round(captions.reduce((s: number, c: string) => s + (c.trim() ? c.trim().split(/\s+/).length : 0), 0) / n) : 0,
      bioHasLink: !!profile.authorMeta?.bioLink,
      bioLink: profile.authorMeta?.bioLink?.link || null,
      bioHasCta: CONTENT_CTA_RE.test(bio),
      bestPosts: ranked.slice(0, 3).map(summarise),
      weakestPosts: ranked.slice(-3).reverse().map(summarise),
    };

    let consistency = scoreFromBands(postsPerWeek, [[4, 100], [3, 85], [2, 70], [1, 50], [0.5, 30]], 10);
    if (consistency != null && daysSinceLastPost != null && daysSinceLastPost > 14) consistency = Math.min(consistency, 30);
    // TikTok's typical engagement rate runs well above Instagram's, so the bands are higher.
    const engagement = scoreFromBands(engagementRate, [[9, 100], [6, 85], [3, 65], [1, 40]], 15);
    const conversionPath = Math.round((metrics.bioHasLink ? 40 : 0) + (metrics.bioHasCta ? 20 : 0) + metrics.captionsWithCtaPct * 0.4);
    // TikTok is inherently single-format (video), so format mix isn't a meaningful signal here —
    // leave it null rather than invent one; the overall score averages only the non-null parts.
    const formatMix: number | null = null;
    const parts = [consistency, engagement, conversionPath, formatMix].filter((v): v is number => v != null);
    const scores = {
      overall: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
      consistency,
      engagement,
      conversionPath,
      formatMix,
    };
    return { metrics, scores, posts: videos };
  }

  // Real posts for X / LinkedIn / Facebook / YouTube (via Treg). Same shape as the Instagram and
  // TikTok computers so scores, history and the report all work unchanged. Anything the
  // provider does not return (dates, likes, views) is left null and not scored.
  function computePlatformPostMetrics(platform: string, data: PlatformPosts) {
    const DAY = 86_400_000;
    const now = Date.now();
    const posts = data.posts.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const n = posts.length;
    const dated = posts.filter(p => p.ts);
    const ages = dated.map(p => (now - (p.ts as number)) / DAY);
    const postsLast30 = data.datesAvailable ? ages.filter(d => d <= 30).length : null;
    const daysSinceLastPost = ages.length ? Math.floor(ages[0]) : null;
    let longestGapDays: number | null = null;
    if (ages.length > 1) { longestGapDays = 0; for (let i = 1; i < ages.length; i++) longestGapDays = Math.max(longestGapDays, Math.round(ages[i] - ages[i - 1])); }
    const windowDays = ages.length ? Math.max(7, ages[ages.length - 1]) : 0;
    const postsPerWeek = ages.length >= 3 ? +(ages.length / (windowDays / 7)).toFixed(1) : null;

    const withEng = posts.filter(p => p.engagement != null);
    const avgEngagement = withEng.length ? withEng.reduce((s, p) => s + (p.engagement as number), 0) / withEng.length : null;
    const followers = data.followers || 0;
    const views = posts.filter(p => p.views != null).map(p => p.views as number);
    const avgViews = views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : null;
    // Engagement rate: interactions per post vs followers; YouTube has views only, so views per post vs subscribers.
    const engagementRate = data.engagementAvailable && avgEngagement != null && followers > 0 ? +((avgEngagement / followers) * 100).toFixed(2)
      : platform === 'YouTube' && avgViews != null && followers > 0 ? +((avgViews / followers) * 100).toFixed(1) : null;

    const URL_RE = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co|io|ai|net|org)\b/i;
    const texts = posts.map(p => p.text);
    const share = (pred: (t: string) => boolean) => (n ? Math.round((texts.filter(pred).length / n) * 100) : 0);
    const ctaOrLinkPct = share(t => CONTENT_CTA_RE.test(t) || URL_RE.test(t));
    const rankKey = (p: any) => p.engagement ?? p.views ?? 0;
    const ranked = posts.slice().sort((a, b) => rankKey(b) - rankKey(a));
    const summarise = (p: any) => p && ({
      format: platform === 'YouTube' ? 'Video' : 'Post',
      date: p.ts ? new Date(p.ts).toISOString().slice(0, 10) : '',
      engagement: p.engagement ?? p.views ?? null,
      firstLine: String(p.text || '').split('\n')[0].slice(0, 140),
      url: p.url,
    });

    const metrics: any = {
      followers: followers || null,
      totalPosts: null,
      postsAnalysed: n,
      postsLast30Days: postsLast30,
      postsPerWeek,
      daysSinceLastPost,
      longestGapDays,
      avgViews,
      engagementRatePct: engagementRate,
      captionsWithCtaPct: share(t => CONTENT_CTA_RE.test(t)),
      captionsWithLinkPct: share(t => URL_RE.test(t)),
      captionsWithQuestionPct: share(t => t.includes('?')),
      avgCaptionWords: n ? Math.round(texts.reduce((s, t) => s + (t.trim() ? t.trim().split(/\s+/).length : 0), 0) / n) : 0,
      bestPosts: ranked.slice(0, 3).map(summarise),
      weakestPosts: ranked.slice(-3).reverse().map(summarise),
      dataNotes: data.note,
    };

    let consistency = postsPerWeek != null ? scoreFromBands(postsPerWeek, [[4, 100], [3, 85], [2, 70], [1, 50], [0.5, 30]], 10) : null;
    if (consistency != null && daysSinceLastPost != null && daysSinceLastPost > 14) consistency = Math.min(consistency, 30);
    const b = ENGAGEMENT_BENCHMARKS[platform] || 1;
    const engagement = engagementRate != null && platform !== 'YouTube'
      ? scoreFromBands(engagementRate, [[b * 2, 100], [b * 1.4, 80], [b, 60], [b * 0.5, 40]], 20)
      : engagementRate != null ? scoreFromBands(engagementRate, [[5, 100], [2, 80], [1, 60], [0.3, 40]], 20) : null;
    const conversionPath = Math.min(100, ctaOrLinkPct);
    const parts = [consistency, engagement, conversionPath].filter((v): v is number => v != null);
    const scores = {
      overall: parts.length ? Math.round(parts.reduce((a, c) => a + c, 0) / parts.length) : null,
      consistency, engagement, conversionPath, formatMix: null as number | null,
    };
    return { metrics, scores, posts };
  }

  // Keeps only what the prompt actually needs so JSON.stringify() never has to be
  // truncated mid-object â huge profiles (millions of followers, dozens of posts with
  // images/comments) were breaking the JSON sent to Claude before this trim existed.
  function trimInstagramProfileForPrompt(profile: any) {
    const posts = Array.isArray(profile.latestPosts) ? profile.latestPosts.slice(0, 6) : [];
    return {
      username: profile.username,
      fullName: profile.fullName,
      biography: profile.biography,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      isBusinessAccount: profile.isBusinessAccount,
      businessCategoryName: profile.businessCategoryName,
      verified: profile.verified,
      externalUrl: profile.externalUrl,
      latestPosts: posts.map((p: any) => ({
        type: p.type,
        caption: typeof p.caption === "string" ? p.caption.slice(0, 300) : null,
        timestamp: p.timestamp,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 8) : [],
      })),
    };
  }

  app.post("/api/ai/social-research", requireUser, async (req, res) => {
    try {
      const { platform, handle } = req.body;
      if (!platform || !handle) {
        return res.status(400).json({ error: "platform and profile link are required" });
      }

      const scrapedProfile = platform === "Instagram" ? await scrapeInstagramProfile(handle) : null;

      // Shared instructions + output schema used by BOTH the scraped-data path and the
      // web-search path, so the model always returns the exact field names the frontend
      // (AuditView.tsx) reads: follower_count, posts_last_30_days, etc. This used to only
      // live in the web-search branch's template literal, which meant the scraped-data
      // branch never told the model what shape to return â it produced plausible-looking
      // but differently-keyed JSON that silently rendered as "Not visible" in the UI.
      const outputSchemaInstructions = `WHAT TO LOOK FOR:
1. Posting cadence â how many posts in the last 30 days? (fills "posting consistently:
   yes/no/sometimes")
2. Approximate reach signal â follower count, and typical engagement (likes/comments/reposts)
   on their last 5 posts, if visible. Only fill "average monthly reach" if you can point to a
   real number or a defensible range from what's shown on the profile â otherwise leave null.
3. Content themes â what do they actually post about? (product updates, personal takes,
   industry commentary, memes, customer wins, hiring, etc.)
4. ONE specific, recent, real post or activity (within last 60 days) that could open a
   conversation â a launch, an opinion they shared, a milestone, a complaint, a question they
   asked their audience.
5. Tone â how do they write? (direct, casual, data-heavy, funny, formal) â this should shape
   how the outreach email is voiced, not just what it references.

STRICT RULES:
1. Every field must trace back to something you actually saw on the profile. If you cannot
   access the profile (private, handle wrong, platform not supported, no recent activity),
   return that field as null and set "data_quality" to "insufficient" â never fill a field
   with a plausible guess.
2. Do not round up or embellish reach numbers. If the profile shows 340 followers, report
   340, not "a few hundred" rounded favorably or "over 1,000."
3. The "specific_signal" field must be something a stranger reading their profile cold would
   also find within 2 minutes â if it took inference or speculation to construct, it doesn't
   qualify.
4. Do not comment on their website, funnel, or business metrics here â this step is social
   presence only, feeds the relatability angle, not the revenue-leak audit.

OUTPUT FORMAT (JSON):
{
  "platform": "...",
  "handle": "...",
  "data_quality": "sufficient / insufficient / partial",
  "posting_consistency": "yes / no / sometimes / unknown",
  "posts_last_30_days": <number or null>,
  "follower_count": <number or null>,
  "avg_engagement_per_post": <number or null>,
  "content_themes": ["...", "..."],
  "tone": "...",
  "specific_signal": {
    "found": true/false,
    "description": "one factual sentence, in your own words",
    "post_url_or_reference": "...",
    "date": "YYYY-MM-DD"
  },
  "relatability_hook": "one warm, specific line referencing the signal above â only generate
   this if specific_signal.found is true; otherwise null"
}
CRITICAL OUTPUT RULE: Your entire response must be nothing but the raw JSON object above.
No markdown heading, no title, no bullet points, no commentary before or after, no code fence.
The very first character of your response must be "{" and the very last character must be "}".

Return ONLY the JSON. No markdown. No explanation.`;

      const prompt = scrapedProfile ? `You are the Smart Fill research step for TitanLeap's Audit intake form. You have been
given REAL, freshly-scraped Instagram profile data below â pulled directly from the profile via
API, not a guess. Use ONLY what is present in this data. Do not invent or estimate anything not
shown here.

Primary Platform: ${platform}
Profile Link: ${handle}

SCRAPED PROFILE DATA (JSON):
${JSON.stringify(trimInstagramProfileForPrompt(scrapedProfile))}

${outputSchemaInstructions}` : `You are the Smart Fill research step for TitanLeap's Audit intake form. You will be given:
- Primary Platform (e.g. LinkedIn, X/Twitter, Instagram)
- A Profile Link (a full URL to the person or business's profile â open it directly. If what's
  given is a bare handle instead of a URL, search for and open the matching profile on the stated
  platform.)

TASK: Actually visit and read the given profile on the given platform using web search. Extract what is
genuinely there â do not infer or estimate anything you have not directly observed on the
profile/feed.

Primary Platform: ${platform}
Profile Link: ${handle}

${outputSchemaInstructions}`;

      const { generateClaudeContent } = await import("./src/services/claude.ts");
      const result = await generateClaudeContent({
        prompt,
        apiKey: process.env.CLAUDE_API_KEY,
        useWebSearch: !scrapedProfile,
        prefillAssistant: scrapedProfile ? "{" : undefined,
        temperature: 0.3,
      });

      const cleaned = (result.text || '').replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const parsed = extractJsonObject(cleaned);
      if (!parsed) {
        console.error("[SocialResearch] Unparseable raw text:", cleaned.slice(0, 2000));
        throw new Error("Could not parse research response as JSON");
      }
      res.json(parsed);
    } catch (error: any) {
      const errMsg = error?.message || String(error) || "Social research failed";
      console.error("[SocialResearch] Error:", errMsg, error?.stack);
      res.status(500).json({ error: errMsg });
    }
  });

  // ── Content Audit (protected) ──────────────────────────────────────────────
  // Instagram: real numbers from the Apify scrape, scored by fixed rules in code so the
  // same profile always gets the same score. Claude only writes the diagnosis and must
  // cite the measured numbers. Other platforms: Claude web search, marked "partial".
  const CONTENT_CTA_RE = /(link in (my |our )?bio|comment\b|\bdm\b|send (me|us)|sign ?up|free trial|\bbook\b|\bjoin\b|download|register|\bshop\b|get (it|yours|started|access)|try (it|free|now)|learn more|\bapply\b|waitlist)/i;
  const IG_FORMAT_LABELS: Record<string, string> = { Video: 'Reels / video', Image: 'Single image', Sidecar: 'Carousel' };

  function scoreFromBands(value: number | null, bands: Array<[number, number]>, floor: number): number | null {
    if (value == null || Number.isNaN(value)) return null;
    for (const [threshold, score] of bands) if (value >= threshold) return score;
    return floor;
  }

  function computeInstagramContentMetrics(profile: any) {
    const DAY = 86_400_000;
    const now = Date.now();
    const posts = (Array.isArray(profile.latestPosts) ? profile.latestPosts : [])
      .filter((p: any) => p && p.timestamp)
      .sort((a: any, b: any) => +new Date(b.timestamp) - +new Date(a.timestamp));
    const followers = Number(profile.followersCount) || 0;
    // Apify reports -1 likes when the owner hides like counts.
    const likes = (p: any) => Math.max(0, Number(p.likesCount) || 0);
    const comments = (p: any) => Math.max(0, Number(p.commentsCount) || 0);
    const eng = (p: any) => likes(p) + comments(p);
    const n = posts.length;
    const hiddenLikes = posts.filter((p: any) => Number(p.likesCount) < 0).length;

    const ages = posts.map((p: any) => (now - +new Date(p.timestamp)) / DAY);
    const postsLast30 = ages.filter((d: number) => d <= 30).length;
    const daysSinceLastPost = n ? Math.floor(ages[0]) : null;
    let longestGapDays = 0;
    for (let i = 1; i < n; i++) longestGapDays = Math.max(longestGapDays, Math.round(ages[i] - ages[i - 1]));
    const windowDays = n ? Math.max(7, ages[n - 1]) : 0;
    const postsPerWeek = n ? +(n / (windowDays / 7)).toFixed(1) : 0;

    const avgLikes = n ? Math.round(posts.reduce((s: number, p: any) => s + likes(p), 0) / n) : 0;
    const avgComments = n ? +(posts.reduce((s: number, p: any) => s + comments(p), 0) / n).toFixed(1) : 0;
    const avgEngagement = n ? posts.reduce((s: number, p: any) => s + eng(p), 0) / n : 0;
    const engagementRate = followers > 0 && n ? +((avgEngagement / followers) * 100).toFixed(2) : null;

    const byFormat: Record<string, { posts: number; avgEngagement: number }> = {};
    for (const p of posts) {
      const label = IG_FORMAT_LABELS[p.type] || p.type || 'Other';
      byFormat[label] = byFormat[label] || { posts: 0, avgEngagement: 0 };
      byFormat[label].posts += 1;
      byFormat[label].avgEngagement += eng(p);
    }
    for (const k of Object.keys(byFormat)) byFormat[k].avgEngagement = Math.round(byFormat[k].avgEngagement / byFormat[k].posts);

    const summarise = (p: any) => p && ({
      format: IG_FORMAT_LABELS[p.type] || p.type,
      date: String(p.timestamp).slice(0, 10),
      engagement: eng(p),
      firstLine: String(p.caption || '').split('\n')[0].slice(0, 140),
      url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : null),
    });
    const ranked = posts.slice().sort((a: any, b: any) => eng(b) - eng(a));
    const captions = posts.map((p: any) => String(p.caption || ''));
    const share = (pred: (c: string) => boolean) => (n ? Math.round((captions.filter(pred).length / n) * 100) : 0);

    const metrics = {
      followers,
      totalPosts: Number(profile.postsCount) || null,
      postsAnalysed: n,
      postsLast30Days: postsLast30,
      postsPerWeek,
      daysSinceLastPost,
      longestGapDays,
      avgLikes,
      avgComments,
      engagementRatePct: engagementRate,
      hiddenLikeCounts: hiddenLikes,
      formats: byFormat,
      captionsWithCtaPct: share(c => CONTENT_CTA_RE.test(c)),
      captionsWithQuestionPct: share(c => c.includes('?')),
      avgCaptionWords: n ? Math.round(captions.reduce((s: number, c: string) => s + (c.trim() ? c.trim().split(/\s+/).length : 0), 0) / n) : 0,
      bioHasLink: !!profile.externalUrl,
      bioLink: profile.externalUrl || null,
      bioHasCta: CONTENT_CTA_RE.test(String(profile.biography || '')),
      isBusinessAccount: !!profile.isBusinessAccount,
      bestPosts: ranked.slice(0, 3).map(summarise),
      weakestPosts: ranked.slice(-3).reverse().map(summarise),
    };

    // Fixed scoring rules (0–100). Shown in the UI so the client can see how we scored.
    let consistency = scoreFromBands(postsPerWeek, [[4, 100], [3, 85], [2, 70], [1, 50], [0.5, 30]], 10);
    if (consistency != null && daysSinceLastPost != null && daysSinceLastPost > 14) consistency = Math.min(consistency, 30);
    const engagement = scoreFromBands(engagementRate, [[3, 100], [2, 80], [1, 60], [0.5, 40]], 20);
    const conversionPath = Math.round((metrics.bioHasLink ? 40 : 0) + (metrics.bioHasCta ? 20 : 0) + metrics.captionsWithCtaPct * 0.4);
    const formatCount = Object.keys(byFormat).length;
    const formatMix = formatCount >= 3 ? 100 : formatCount === 2 ? 75 : formatCount === 1 ? 40 : null;
    const parts = [consistency, engagement, conversionPath, formatMix].filter((v): v is number => v != null);
    const scores = {
      overall: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
      consistency,
      engagement,
      conversionPath,
      formatMix,
    };
    return { metrics, scores, posts };
  }

  // Industry-typical engagement-rate benchmarks, used to give the client something to
  // compare their own number against instead of a bare percentage.
  const ENGAGEMENT_BENCHMARKS: Record<string, number> = {
    Instagram: 1.5, TikTok: 5.5, LinkedIn: 2, 'Twitter-X': 0.5, YouTube: 3, Facebook: 0.5,
  };
  function gradeFromScore(score: number | null): string | null {
    if (score == null) return null;
    if (score >= 90) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
  }
  function benchmarkFor(platform: string) {
    const v = ENGAGEMENT_BENCHMARKS[platform];
    return v == null ? null : { engagementRatePct: v, label: `Typical ${platform} engagement rate is around ${v}%.` };
  }

  const CONTENT_ANALYSIS_SCHEMA = `Return ONLY this JSON object:
{
  "verdict": "One plain sentence a founder would understand, e.g. 'You post often, but almost nothing points people to your offer.'",
  "whatsWorking": ["1-2 items, each quoting a real number or a specific post"],
  "leaks": [
    {
      "title": "Short name for the problem",
      "evidence": "Quote the measured number or the specific post that proves it",
      "fix": "Exactly what to change, specific to this account",
      "effort": "Low | Medium | High",
      "impact": "High | Medium | Low"
    }
  ],
  "contentToOffer": "1-2 sentences: does their content lead people toward what they sell? Be specific.",
  "nextPosts": [
    { "format": "Reel / Carousel / Single image / Text post / Video", "hook": "The first line, written out", "why": "Which post or number this is based on" }
  ],
  "summaryForMainAudit": "3-4 plain sentences summarising the content findings, used inside the full system audit"
}
Rules: at most 3 leaks, ranked by impact. Exactly 3 nextPosts. Never invent a number that is not in the data.
If the data is too thin to judge something, say so instead of guessing.
The first character of your response must be "{" and the last must be "}".`;

  app.post("/api/ai/content-audit", requireUser, async (req, res) => {
    try {
      const { platform, handle, businessName, offer, audience } = req.body || {};
      if (!platform || !handle) return res.status(400).json({ error: "platform and profile link are required" });
      const context = `Business: ${businessName || 'unknown'}\nWhat they sell: ${offer || 'unknown'}\nWho they sell to: ${audience || 'unknown'}`;

      const { generateClaudeContent } = await import("./src/services/claude.ts");
      const parse = (text: string) => {
        const obj = extractJsonObject(text);
        if (!obj) throw new Error("Could not parse content audit response");
        return obj;
      };

      const isInstagram = platform === "Instagram";
      const isTikTok = platform === "TikTok";
      let profile = isInstagram ? await scrapeInstagramProfile(handle) : isTikTok ? await scrapeTikTokProfile(handle) : null;
      // Instagram's profile scrape only carries ~12 latest posts; pull up to 60 from the
      // last 6 months for real history. Falls back to the 12 if the post scrape fails.
      let historySampleSize = 0;
      if (profile && isInstagram) {
        const recent = await scrapeInstagramPosts(profile.username);
        historySampleSize = recent.length;
        if (recent.length > (profile.latestPosts?.length || 0)) profile = { ...profile, latestPosts: recent };
        else historySampleSize = profile.latestPosts?.length || 0;
      } else if (profile && isTikTok) {
        historySampleSize = profile.videos?.length || 0;
      }

      if (profile) {
        const computed = isInstagram ? computeInstagramContentMetrics(profile) : computeTikTokContentMetrics(profile);
        const { metrics, posts } = computed;
        let { scores } = computed;
        const historyItems: HistoryItem[] = posts.map((p: any) => isInstagram
          ? { ts: +new Date(p.timestamp), engagement: Math.max(0, Number(p.likesCount) || 0) + Math.max(0, Number(p.commentsCount) || 0), views: p.type === 'Video' ? (Number(p.videoPlayCount ?? p.videoViewCount) || null) : null }
          : { ts: p.createTimeISO ? +new Date(p.createTimeISO) : (p.createTime ? p.createTime * 1000 : 0), engagement: (Number(p.diggCount) || 0) + (Number(p.commentCount) || 0) + (Number(p.shareCount) || 0), views: Number(p.playCount) || null });
        const history = computeHistory(historyItems, historySampleSize);
        scores = applyHistoryToScores(scores, history, metrics.daysSinceLastPost);
        const username = isInstagram ? profile.username : profile.authorMeta?.name;
        const growth = username && metrics.followers ? await followerGrowth(platform, username, metrics.followers, metrics.totalPosts).catch(() => null) : null;
        Object.assign(metrics, { history, growth });
        const dataSource = isInstagram ? 'instagram_api' : 'tiktok_api';
        const grade = gradeFromScore(scores.overall);
        const benchmark = benchmarkFor(platform);
        if (!metrics.postsAnalysed) {
          return res.json({ platform, handle, dataSource, dataQuality: 'insufficient', metrics, scores, grade, benchmark, analysis: null });
        }
        const trimmedPosts = posts.slice(0, 12).map((p: any) => ({
          format: isInstagram ? (IG_FORMAT_LABELS[p.type] || p.type) : 'Video',
          date: isInstagram ? String(p.timestamp).slice(0, 10) : (p.createTimeISO ? String(p.createTimeISO).slice(0, 10) : ''),
          likes: isInstagram ? p.likesCount : p.diggCount,
          comments: isInstagram ? p.commentsCount : p.commentCount,
          caption: String((isInstagram ? p.caption : p.text) || '').slice(0, 400),
        }));
        const profileHandle = isInstagram ? profile.username : profile.authorMeta?.name;
        const profileName = isInstagram ? profile.fullName : profile.authorMeta?.nickName;
        const profileBio = isInstagram ? profile.biography : profile.authorMeta?.signature;
        const prompt = `You are TitanLeap's content auditor. You are looking at REAL data scraped from a ${platform} account today.
Judge whether their content is bringing them customers, not whether it looks nice. This is a professional audit: be specific,
cite the actual numbers below, and compare against the benchmark where relevant.

${context}

PROFILE: @${profileHandle} — ${profileName || ''}
BIO: ${String(profileBio || '').slice(0, 300)}

MEASURED METRICS (computed in code, treat as facts):
${JSON.stringify(metrics)}

SCORES (fixed rules, 0-100): ${JSON.stringify(scores)}
GRADE: ${grade}
HISTORY: metrics.history covers the ${history.periodLabel} (${history.postsInWindow} posts). Use its monthly
counts and trends (posting, engagement per post, views; recent half vs earlier half) to say whether the account is gaining or
losing momentum. metrics.growth is follower change from our own records; if it is null or its d90/d180 are null, do not
claim any follower growth number.
BENCHMARK: ${benchmark?.label || 'n/a'}

LATEST POSTS:
${JSON.stringify(trimmedPosts)}

${CONTENT_ANALYSIS_SCHEMA}`;
        const result = await generateClaudeContent({ prompt, apiKey: process.env.CLAUDE_API_KEY, prefillAssistant: "{", temperature: 0.3 });
        return res.json({ platform, handle, dataSource, dataQuality: 'sufficient', metrics, scores, grade, benchmark, analysis: parse(result.text) });
      }

      // Real posts via Treg for X, LinkedIn, Facebook and YouTube. Falls through to the web-read
      // audit below when Treg is off or the platform returns too little.
      if (!profile && TREG_POST_PLATFORMS.includes(platform)) {
       try {
        const platformData = await fetchPlatformPosts(platform, handle).catch(() => null);
        if (platformData) {
          const { metrics, scores: baseScores, posts } = computePlatformPostMetrics(platform, platformData);
          let scores = baseScores;
          const datedPosts = posts.filter(p => p.ts);
          if (datedPosts.length >= 8) {
            const history = computeHistory(datedPosts.map(p => ({ ts: p.ts as number, engagement: p.engagement ?? 0, views: p.views })), datedPosts.length);
            scores = applyHistoryToScores(scores, history, metrics.daysSinceLastPost);
            metrics.history = history;
          }
          const grade = gradeFromScore(scores.overall);
          const benchmark = benchmarkFor(platform);
          const trimmed = posts.slice(0, 12).map(p => ({
            date: p.ts ? new Date(p.ts).toISOString().slice(0, 10) : 'n/a',
            interactions: p.engagement, views: p.views, text: p.text.slice(0, 400),
          }));
          const prompt = `You are TitanLeap's content auditor. You are looking at REAL posts pulled from a ${platform} account today.
Judge whether their content is bringing them customers, not whether it looks nice. Be specific, cite the actual numbers below, and compare against the benchmark where relevant.

${context}

PROFILE: ${handle}
DATA LIMITS: ${platformData.note}. Fields shown as null were not available; never estimate them.

MEASURED METRICS (computed in code, treat as facts):
${JSON.stringify(metrics)}

SCORES (fixed rules, 0-100; null parts are not scored): ${JSON.stringify(scores)}
GRADE: ${grade}
BENCHMARK: ${benchmark?.label || 'n/a'}

LATEST POSTS:
${JSON.stringify(trimmed)}

${CONTENT_ANALYSIS_SCHEMA}`;
          const result = await generateClaudeContent({ prompt, apiKey: process.env.CLAUDE_API_KEY, prefillAssistant: "{", temperature: 0.3 });
          return res.json({ platform, handle, dataSource: 'platform_posts', dataQuality: 'sufficient', metrics, scores, grade, benchmark, analysis: parse(result.text) });
        }
       } catch (e: any) {
        console.error(`[ContentAudit] ${platform} real-posts path failed, using web read:`, e?.message || e);
       }
      }

      // Web-search path: LinkedIn, X, TikTok, YouTube, or Instagram when Apify is unavailable.
      const prompt = `You are TitanLeap's content auditor. Open this profile with web search and audit the content you can actually see.
Judge whether their content is bringing them customers, not whether it looks nice.

Platform: ${platform}
Profile: ${handle}
${context}

First report what you observed. Use null for anything you could not see; never estimate.
Then the analysis. Return ONLY this JSON:
{
  "dataQuality": "sufficient | partial | insufficient",
  "observed": {
    "followers": <number or null>,
    "postsLast30Days": <number or null>,
    "avgEngagementPerPost": <number or null>,
    "formats": ["formats you saw"],
    "bioHasLink": <true/false/null>,
    "postsWithCtaPct": <number or null>
  },
  "judgement": { "score": <0-100 or null>, "basis": "one line: what you saw that justifies the score" },
  "analysis": ${CONTENT_ANALYSIS_SCHEMA.replace('Return ONLY this JSON object:\n', '').split('\nRules:')[0]}
}
Rules: at most 3 leaks, exactly 3 nextPosts, no invented numbers. If you cannot open the profile, set dataQuality to "insufficient", analysis to null and judgement.score to null.
JUDGEMENT: score how well this profile works as a channel that brings customers, from 0 to 100, using only what you actually saw: how recently and consistently they post (35 points), how the audience responds relative to their size (30 points), and whether the bio, links and posts give a clear offer and next step (35 points). If you saw too little to judge fairly, use null instead of guessing.
The first character of your response must be "{" and the last must be "}".`;
      const result = await generateClaudeContent({ prompt, apiKey: process.env.CLAUDE_API_KEY, useWebSearch: true, webSearchMaxUses: 3, temperature: 0.3 });
      const parsed = parse(result.text);
      const rawScore = Number(parsed.judgement?.score);
      const judgedScore = parsed.dataQuality === 'insufficient' || parsed.judgement?.score == null || !Number.isFinite(rawScore)
        ? null : Math.max(0, Math.min(100, Math.round(rawScore)));
      return res.json({
        platform, handle, dataSource: 'web_search',
        dataQuality: parsed.dataQuality || 'partial',
        metrics: parsed.observed || null,
        scores: judgedScore != null ? { overall: judgedScore, consistency: null, engagement: null, conversionPath: null, formatMix: null, judged: true } : null,
        grade: gradeFromScore(judgedScore),
        judgementBasis: judgedScore != null ? String(parsed.judgement?.basis || '').slice(0, 240) : null,
        benchmark: benchmarkFor(platform),
        analysis: parsed.analysis || null,
      });
    } catch (error: any) {
      const errMsg = error?.message || String(error) || "Content audit failed";
      console.error("[ContentAudit] Error:", errMsg, error?.stack);
      res.status(500).json({ error: errMsg });
    }
  });

  // ── Customer Leak Audit (the $297 deliverable) ─────────────────────────────
  // Funnel maths is done in code from the client's own numbers. Claude reads the real
  // pages and writes the leaks, but only says what share of the customer gap each leak
  // explains; the customer and revenue ranges are computed here, never invented.
  const LEAK_TARGET_SIGNUP_PCT = 3;
  const LEAK_TARGET_PAID_PCT = 18;
  // Monthly churn we treat as realistic for an early SaaS; above it, churn is priced as a leak.
  const LEAK_TARGET_CHURN_PCT = 5;

  async function fetchPageTextForAudit(url: string | undefined, limit = 7000): Promise<string | null> {
    if (!url || !String(url).trim()) return null;
    let u = String(url).trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TitanLeap/1.0; +https://titanleap.co)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return null;
      const html = await r.text();
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<(h1|h2|h3|button|a)\b[^>]*>/gi, ' [$1] ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      return `TITLE: ${title}\n${text}`.slice(0, limit);
    } catch {
      return null;
    }
  }

  // Marks an uploaded screenshot: Claude looks at the image and returns where the
  // problem is; the browser draws the mark. No headless browser on the server.
  app.post("/api/ai/annotate-shot", requireUser, async (req, res) => {
    try {
      const { image, width, height, title, whatWeSaw, quote, whatsWrong } = req.body || {};
      const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(image || ''));
      const W = Math.round(Number(width)), H = Math.round(Number(height));
      if (!m || !(W > 0) || !(H > 0)) return res.status(400).json({ error: "A screenshot and its size are required" });
      if (m[2].length > 7_000_000) return res.status(413).json({ error: "Screenshot is too large" });
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "CLAUDE_API_KEY is not set" });

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const prompt = `This is a ${W}x${H} px screenshot of a client's website, attached to one finding in a conversion audit.
FINDING: ${String(title || '').slice(0, 300)}
WHAT WE SAW: ${String(whatWeSaw || '').slice(0, 500)}
EXACT WORDS ON THE PAGE (if any): ${String(quote || '').slice(0, 300) || 'none'}
WHY IT'S A PROBLEM: ${String(whatsWrong || '').slice(0, 600)}

Find the one area of this screenshot that shows the problem: the quoted words, the confusing button, the weak headline,
or the spot where the missing thing should be. Box the smallest region that makes the point clear.
Return ONLY this JSON, pixel coordinates in the ${W}x${H} image:
{"found": true, "box": {"x": <left>, "y": <top>, "w": <width>, "h": <height>}, "note": "<pen note, max 5 words>"}
If the screenshot does not show anything related to the finding, return {"found": false, "box": null, "note": ""}.`;
      const r = await client.messages.create({
        model: (await import('./src/services/claude.ts')).VISION_CLAUDE_MODEL,
        max_tokens: 1500,
        output_config: { effort: 'low' } as any,
        messages: [
          { role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: m[1] as any, data: m[2] } },
            { type: 'text', text: prompt },
          ] },
        ],
      } as any);
      const text = (r as any).content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      const json = extractJsonObject(text);
      if (!json) throw new Error("Could not parse screenshot mark response");
      const b = json?.box;
      if (!json?.found || !b) return res.json({ found: false, box: null, note: '' });
      // Clamp to the image and return fractions so the browser can draw at any size.
      const x = Math.max(0, Math.min(W - 1, Number(b.x) || 0)), y = Math.max(0, Math.min(H - 1, Number(b.y) || 0));
      const w = Math.max(8, Math.min(W - x, Number(b.w) || 0)), h = Math.max(8, Math.min(H - y, Number(b.h) || 0));
      res.json({ found: true, box: { x: x / W, y: y / H, w: w / W, h: h / H }, note: String(json.note || '').slice(0, 40) });
    } catch (e: any) {
      console.error("[AnnotateShot] failed:", e?.message || e);
      res.status(500).json({ error: "Could not mark this screenshot. Draw the mark yourself instead." });
    }
  });

  app.post("/api/ai/leak-audit", requireUser, async (req, res) => {
    try {
      const b = req.body || {};
      const visitors = Number(b.visitors);
      const signupRate = Number(b.signupRate);
      const paidRate = Number(b.paidRate);
      const revenuePerCustomer = Number(b.revenuePerCustomer);
      if (!b.websiteUrl) return res.status(400).json({ error: "Website URL is required" });
      if (!(visitors > 0) || !(signupRate > 0) || !(paidRate > 0) || !(revenuePerCustomer > 0)) {
        return res.status(400).json({ error: "Visitors, signup rate, trial-to-paid rate and revenue per customer are all required" });
      }

      const trials = visitors * signupRate / 100;
      const customers = trials * paidRate / 100;
      const targetCustomers = visitors * Math.max(signupRate, LEAK_TARGET_SIGNUP_PCT) / 100 * Math.max(paidRate, LEAK_TARGET_PAID_PCT) / 100;

      // ── Spec v2: price each step of the path to paying, then pick the bottleneck.
      // customers lost = people reaching the step × (target rate − their rate) × share who go on to pay.
      // High end = they close the whole gap to target, low end = half of it.
      const paying = Number(b.payingCustomers) > 0 ? Number(b.payingCustomers) : null;
      const cancelled = Number(b.cancelledLastMonth) >= 0 && b.cancelledLastMonth !== '' && b.cancelledLastMonth != null ? Number(b.cancelledLastMonth) : null;
      const churnRate = paying && cancelled != null ? (cancelled / paying) * 100 : null;
      const stepRange = (high: number) => ({ low: Math.round(high * 0.5), high: Math.round(high) });
      const steps: Array<{ key: 'signup' | 'paid' | 'churn'; label: string; rate: number | null; target: number; low: number; high: number; known: boolean }> = [
        { key: 'signup', label: 'Visitor to signup', rate: signupRate, target: LEAK_TARGET_SIGNUP_PCT,
          ...stepRange(visitors * Math.max(0, LEAK_TARGET_SIGNUP_PCT - signupRate) / 100 * paidRate / 100), known: true },
        { key: 'paid', label: 'Signup to paying', rate: paidRate, target: LEAK_TARGET_PAID_PCT,
          ...stepRange(trials * Math.max(0, LEAK_TARGET_PAID_PCT - paidRate) / 100), known: true },
        { key: 'churn', label: 'Keeping customers', rate: churnRate, target: LEAK_TARGET_CHURN_PCT,
          ...stepRange(paying && churnRate != null ? paying * Math.max(0, churnRate - LEAK_TARGET_CHURN_PCT) / 100 : 0), known: churnRate != null },
      ];
      const ranked = steps.filter(s => s.known && s.high >= 1).sort((x, y) => y.high - x.high);
      const bottleneckKey: 'signup' | 'paid' | 'churn' | 'traffic' = ranked[0]?.key || 'traffic';
      const bottleneckStep = steps.find(s => s.key === bottleneckKey) || null;
      // The fixes are sized against the bottleneck's loss (or the old whole-funnel gap when traffic is the issue).
      const gap = bottleneckStep ? bottleneckStep.high : 0;

      const [home, pricing, signup] = await Promise.all([
        fetchPageTextForAudit(b.websiteUrl),
        fetchPageTextForAudit(b.pricingPageUrl),
        fetchPageTextForAudit(b.signupUrl),
      ]);
      const pageUrls: Record<'home' | 'pricing' | 'signup', string | undefined> = { home: b.websiteUrl, pricing: b.pricingPageUrl, signup: b.signupUrl };
      const onboarding = String(b.onboardingNotes || '').trim();

      const stepLines = steps.map(s => s.known
        ? `- ${s.label}: ${s.key === 'churn' ? `${s.rate!.toFixed(1)}% of paying customers cancel a month (target ${s.target}% or less)` : `${s.rate}% (target ${s.target}%)`} -> losing ${s.low}-${s.high} paying customers a month`
        : `- ${s.label}: not known (no churn numbers given). Never call this the bottleneck; flag it as "check this next".`).join('\n');
      const bottleneckLine = bottleneckKey === 'traffic'
        ? 'BOTTLENECK: TRAFFIC. Signup and paying rates are at or above target, so the fixes are about who they talk to and where (positioning and channels), not page tweaks.'
        : `BOTTLENECK: ${bottleneckStep!.label.toUpperCase()} (losing ${bottleneckStep!.low}-${bottleneckStep!.high} paying customers a month, the biggest of the steps). All three fixes must attack this step.`;

      const prompt = `You are writing TitanLeap's Customer Leak Audit for a SaaS founder. It is a paid report.
It follows the customer from stranger to paying customer, finds the ONE step losing the most customers, and gives the 3 fixes for that step.
Write like a sharp, honest operator talking to the founder: plain English, specific, no jargon, no filler.

BUSINESS: ${b.businessName || 'unknown'}
WHAT THEY SELL: ${b.mainOffer || 'unknown'}
WHO BUYS: ${b.audience || 'unknown'}
WHERE CUSTOMERS COME FROM TODAY (founder's words): ${b.currentChannels || 'not given'}
COMPETITOR THEY LOSE TO: ${b.competitor || 'not given'}
FOUNDER NOTES: ${b.notes || 'none'}

THEIR NUMBERS (their own, treat as facts):
- ${Math.round(visitors)} visitors a month -> ${Math.round(trials)} signups (${signupRate}%) -> ${Math.round(customers)} new paying customers a month (${paidRate}% of signups)
${paying ? `- ${Math.round(paying)} paying customers today${cancelled != null ? `, ${Math.round(cancelled)} cancelled last month` : ''}` : '- Paying customers today: not given'}

WHAT EACH STEP COSTS (computed by TitanLeap, do not change these numbers):
${stepLines}
${bottleneckLine}

TRIUMPH'S NEW-USER WALKTHROUGH (he signed up as a real user; his notes, treat as facts):
${onboarding || '(not done yet. Do not describe their onboarding; set onboarding.done to false.)'}

CONTENT AUDIT SUMMARY: ${b.contentSummary || 'not run'}

HOME PAGE (real text, fetched today):
${home || '(could not fetch)'}

PRICING PAGE:
${pricing || '(not provided or could not fetch)'}

SIGNUP PAGE:
${signup || '(not provided or could not fetch)'}

THE FIVE CHECKS (score each "leaking", "weak" or "fine", or "unknown" if there is no evidence):
1. positioning: does a stranger know in 5 seconds who this is for and why they'd switch? Judge the headline against the buyer's problem.
2. channels: is effort going where their buyers actually are?
3. signup: do interested visitors sign up? (pages + the signup rate)
4. paying: do new users reach the first useful moment and pay? (walkthrough + trial-to-paid rate)
5. keeping: do customers stay, and does pricing let them pay more? (churn, annual plan, tiers, upgrade path on the pricing page)

RULES:
1. Every claim must point to something actually on their pages, in the walkthrough notes, or to a number above. If a page could not be fetched, say what you would check instead of pretending.
   quoteOnPage must be words that are really on that page; the report circles them on a screenshot.
2. Never invent statistics (exit rates, bounce rates, benchmarks, competitor traffic, review quotes). Only use what is given here.
3. The three "leaks" are the 3 fixes for the bottleneck, biggest first. "gapShare" is the fraction of the bottleneck's loss each fix wins back (0 to 1, the three add up to 1 or less).
4. Fixes must be concrete enough to do this week: exact copy, exact change, where.
5. No page-speed, SEO or design-taste points unless they directly lose customers. Nothing generic that fits any SaaS ("add social proof", "improve your CTA").
6. The onboarding timeline only uses Triumph's notes. If there are no notes, return "onboarding": {"done": false, "summary": "", "timeline": []}.

Return ONLY this JSON (first character "{", last character "}"):
{
  "headline": "One sentence with their numbers and the bottleneck, e.g. 'You lose 8-16 customers a month between visit and signup.'",
  "verdict": "2-3 sentences. The honest read on why visitors are not becoming customers.",
  "bottleneck": { "whatsHappening": "2-3 sentences on what goes wrong at this step", "evidence": ["short exact quote, walkthrough moment, or number", "..."] },
  "checks": [
    { "key": "positioning", "score": "leaking | weak | fine | unknown", "finding": "One line." },
    { "key": "channels", "score": "...", "finding": "..." },
    { "key": "signup", "score": "...", "finding": "..." },
    { "key": "paying", "score": "...", "finding": "..." },
    { "key": "keeping", "score": "...", "finding": "..." }
  ],
  "leaks": [
    {
      "title": "The fix's problem in plain words",
      "where": "Home page / Pricing page / Signup flow / Onboarding / Emails / Positioning / Channels",
      "page": "home | pricing | signup | none  (which fetched page the screenshot should show; none if not about a page)",
      "quoteOnPage": "3-15 words copied character-for-character from that page's text above. Never include [h1]/[a]/[button] markers. Empty string if nothing to circle.",
      "whatWeSaw": "Short exact quote, walkthrough moment or number that shows the problem",
      "whatsWrong": "2-3 sentences",
      "fixes": ["exact change 1", "exact change 2", "exact change 3"],
      "before": "Current copy if the fix is a copy change, else empty string",
      "after": "Suggested replacement copy, else empty string",
      "effort": "e.g. 1 hour, 2 hours, 1 day",
      "howToKnow": "The metric that should move, and roughly when",
      "gapShare": 0.4
    }
  ],
  "onboarding": { "done": true, "summary": "1-2 sentences: how long to the first useful moment and the biggest stall", "timeline": [ { "when": "e.g. 0 min / Day 2", "what": "what happened", "problem": "what went wrong, or empty string" } ] },
  "channels": [
    { "name": "Channel name", "who": "Exactly who to reach", "why": "Why it fits their buyers", "firstStep": "What to do this week" }
  ],
  "uncomfortableTruth": "One honest thing the founder probably doesn't want to hear, 2-3 sentences.",
  "plan": { "week1": ["..."], "week2": ["..."], "week3": ["..."], "week4": ["..."] }
}
Exactly 3 leaks, exactly 5 checks and exactly 2 channels.`;

      const { generateClaudeContent } = await import("./src/services/claude.ts");
      const result = await generateClaudeContent({ prompt, apiKey: process.env.CLAUDE_API_KEY, prefillAssistant: "{", temperature: 0.4 });
      const cleaned = (result.text || '').replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const ai: any = extractJsonObject(cleaned);
      if (!ai) throw new Error("Could not parse leak audit response");

      // Customer and revenue ranges come from the bottleneck's loss, not from the model.
      const leaks = (Array.isArray(ai.leaks) ? ai.leaks : []).slice(0, 3);
      const shares = leaks.map((l: any) => Math.max(0, Math.min(1, Number(l.gapShare) || 0)));
      const shareSum = shares.reduce((a: number, v: number) => a + v, 0);
      const scale = shareSum > 1 ? 1 / shareSum : 1;
      const withNumbers = leaks.map((l: any, i: number) => {
        const high = Math.round(gap * shares[i] * scale);
        const low = Math.round(high * 0.5);
        return {
          ...l,
          customersLow: low,
          customersHigh: high,
          revenueLow: Math.round(low * revenuePerCustomer),
          revenueHigh: Math.round(high * revenuePerCustomer),
        };
      });
      // Screenshots are added by the user in the Leak Report panel (then marked by
      // /api/ai/annotate-shot). Attach each leak's page URL for the screenshot frame.
      withNumbers.forEach((l: any) => { const k = String(l.page || '').toLowerCase().trim() as 'home' | 'pricing' | 'signup'; l.pageUrl = pageUrls[k] || null; });

      const totalLow = withNumbers.reduce((a: number, l: any) => a + l.customersLow, 0);
      const totalHigh = withNumbers.reduce((a: number, l: any) => a + l.customersHigh, 0);
      const SCORES = ['leaking', 'weak', 'fine', 'unknown'];
      const CHECK_KEYS = ['positioning', 'channels', 'signup', 'paying', 'keeping'];
      const checks = CHECK_KEYS.map(k => {
        const c = (Array.isArray(ai.checks) ? ai.checks : []).find((x: any) => String(x?.key).toLowerCase() === k) || {};
        const score = SCORES.includes(String(c.score).toLowerCase()) ? String(c.score).toLowerCase() : 'unknown';
        return { key: k, score, finding: String(c.finding || '') };
      });
      const ob = ai.onboarding || {};

      res.json({
        version: 2,
        businessName: b.businessName || '',
        websiteUrl: b.websiteUrl,
        generatedAt: new Date().toISOString(),
        pagesRead: { home: !!home, pricing: !!pricing, signup: !!signup },
        funnel: {
          visitors: Math.round(visitors), signupRate, trials: Math.round(trials), paidRate,
          customers: Math.round(customers), targetSignupRate: LEAK_TARGET_SIGNUP_PCT, targetPaidRate: LEAK_TARGET_PAID_PCT,
          targetCustomers: Math.round(targetCustomers), gap: Math.round(gap), revenuePerCustomer,
          payingCustomers: paying, cancelledLastMonth: cancelled,
          churnRate: churnRate != null ? Math.round(churnRate * 10) / 10 : null, targetChurnRate: LEAK_TARGET_CHURN_PCT,
        },
        steps: steps.map(s => ({ ...s, revenueLow: Math.round(s.low * revenuePerCustomer), revenueHigh: Math.round(s.high * revenuePerCustomer) })),
        bottleneck: {
          key: bottleneckKey,
          label: bottleneckStep ? bottleneckStep.label : 'Traffic',
          customersLow: bottleneckStep?.low ?? 0, customersHigh: bottleneckStep?.high ?? 0,
          revenueLow: Math.round((bottleneckStep?.low ?? 0) * revenuePerCustomer), revenueHigh: Math.round((bottleneckStep?.high ?? 0) * revenuePerCustomer),
          whatsHappening: String(ai.bottleneck?.whatsHappening || ''),
          evidence: (Array.isArray(ai.bottleneck?.evidence) ? ai.bottleneck.evidence : []).slice(0, 4).map(String),
        },
        headline: String(ai.headline || ''),
        checks,
        onboarding: {
          done: !!onboarding && ob.done !== false,
          summary: String(ob.summary || ''),
          timeline: (Array.isArray(ob.timeline) ? ob.timeline : []).slice(0, 10).map((s: any) => ({ when: String(s?.when || ''), what: String(s?.what || ''), problem: String(s?.problem || '') })),
        },
        totals: {
          customersLow: totalLow, customersHigh: totalHigh,
          revenueLow: Math.round(totalLow * revenuePerCustomer), revenueHigh: Math.round(totalHigh * revenuePerCustomer),
          effort: withNumbers.map((l: any) => l.effort).filter(Boolean).join(' + '),
        },
        verdict: ai.verdict || '',
        leaks: withNumbers,
        channels: (Array.isArray(ai.channels) ? ai.channels : []).slice(0, 2),
        uncomfortableTruth: ai.uncomfortableTruth || '',
        plan: {
          week1: ai.plan?.week1 || [], week2: ai.plan?.week2 || [], week3: ai.plan?.week3 || [], week4: ai.plan?.week4 || [],
        },
        contentSummary: b.contentSummary || null,
        contentScore: b.contentScore ?? null,
      });
    } catch (error: any) {
      const errMsg = error?.message || String(error) || "Leak audit failed";
      console.error("[LeakAudit] Error:", errMsg, error?.stack);
      res.status(500).json({ error: errMsg });
    }
  });

  // n8n Webhook for Leads (webhook auth)
  app.post("/api/webhooks/n8n/leads", requireWebhookAuth, async (req, res) => {
    try {
      const { name, email, phone, company, source, product, status, score, score_reason } = req.body;
      
      console.log(`[n8n Webhook] Received lead: ${email}`);

      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: name || 'n8n Prospect',
          email: email,
          phone: phone,
          company: company,
          source: source || 'n8n Automation',
          product: product || 'General Inquiry',
          status: status || 'HOT',
          score: score || 0,
          score_reason: score_reason || 'Inbound via n8n'
        });

      if (error) throw error;
      
      res.status(200).json({ success: true, message: "Lead captured successfully" });
    } catch (err) {
      console.error("[n8n Webhook] Error:", err);
      res.status(500).json({ success: false, error: "Failed to process lead" });
    }
  });

  // n8n Webhook for Sales/Revenue (webhook auth)
  app.post("/api/webhooks/n8n/sales", requireWebhookAuth, async (req, res) => {
    try {
      const { amount, customer_email, product_name, status } = req.body;
      
      console.log(`[n8n Webhook] Received sale: ${amount} from ${customer_email}`);

      // 1. Find the lead by email
      const { data: leadData } = await supabase
        .from('leads')
        .select('id')
        .eq('email', customer_email)
        .single();

      // 2. Insert transaction
      const { error: txError } = await supabase
        .from('sales_transactions')
        .insert({
          lead_id: leadData?.id,
          amount: parseFloat(amount) || 0,
          product_name: product_name || 'Service Purchase',
          status: status || 'COMPLETED'
        });

      if (txError) throw txError;

      // 3. Update lead status to 'CONVERTED'
      if (leadData?.id) {
        await supabase
          .from('leads')
          .update({ status: 'CONVERTED' })
          .eq('id', leadData.id);
      }

      res.status(200).json({ success: true, message: "Sale processed successfully" });
    } catch (err) {
      console.error("[n8n Webhook Sales] Error:", err);
      res.status(500).json({ success: false, error: "Failed to process sale" });
    }
  });

  app.get("/api/system/export-text", (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'codebase.txt');
    if (fs.existsSync(filePath)) {
      res.download(filePath, "titanleap-codebase.txt");
    } else {
      res.status(404).send("Codebase text file not generated yet.");
    }
  });

  app.get("/api/extension/download", (req, res) => {
    try {
      const zip = new AdmZip();
      const extFolder = path.join(process.cwd(), 'public', 'titanleap-extension');
      if (fs.existsSync(extFolder)) {
        zip.addLocalFolder(extFolder);
        const zipBuffer = zip.toBuffer();
        res.set({
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="titanleap-extension-v21.zip"',
          'Content-Length': zipBuffer.length
        });
        res.send(zipBuffer);
      } else {
        res.status(404).send("Extension files not found.");
      }
    } catch (e) {
      console.error("Zip generation error:", e);
      res.status(500).send("Error generating zip");
    }
  });

  // Daemon publish endpoint (protected)
  app.post("/api/daemon/publish", requireUser, async (req, res) => {
    const { platforms, mediaUrls, caption, scheduledTime, tokens, credentials, linkedinCompanyId } = req.body;
    
    console.log(`[DAEMON] Received request to publish to ${platforms.join(', ')}`);
    
    const result = await executePublishingDaemon({
      platforms,
      mediaUrls,
      caption,
      tokens: tokens || credentials,
      scheduledTime,
      linkedinCompanyId
    });

    res.json({
      success: result.success,
      message: result.success ? "Successfully processed by backend daemon" : "Daemon execution failed",
      logs: result.logs,
      error: result.error,
      jobId: Math.random().toString(36).substring(7)
    });
  });

  // Schedule a post from the Content Manager's "Schedule & Publish" screen.
  // Inserts a row with status "pending" — a separate n8n workflow polls scheduled_posts
  // for due rows and does the actual per-platform publishing (see n8n workflow docs).
  app.post("/api/posts/schedule", requireUser, async (req, res) => {
    try {
      const { platforms, mediaUrls, caption, scheduledTime, linkedinCompanyId, profile_id } = req.body;

      if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ error: "Select at least one platform." });
      }
      if (!scheduledTime || isNaN(new Date(scheduledTime).getTime())) {
        return res.status(400).json({ error: "A valid scheduledTime is required." });
      }

      // TikTok needs per-post choices and consent (its Content Sharing Guidelines), so it posts
      // from its own panel rather than the scheduler.
      if (platforms.includes('tiktok')) {
        return res.status(400).json({ error: "Post to TikTok from the TikTok panel; it needs your privacy and disclosure choices." });
      }

      // Instagram, TikTok and YouTube reject/silently drop text-only posts — require media upfront.
      const MEDIA_REQUIRED_PLATFORMS = ['instagram', 'tiktok', 'youtube'];
      const missingMedia = platforms.filter((p: string) => MEDIA_REQUIRED_PLATFORMS.includes(p));
      if (missingMedia.length > 0 && (!Array.isArray(mediaUrls) || mediaUrls.length === 0)) {
        return res.status(400).json({
          error: `${missingMedia.join(', ')} require at least one photo or video attached — text-only posts fail silently on these platforms.`
        });
      }

      // Platforms fetch media by URL, so browser-only blob:/data: links would fail at publish time.
      if (Array.isArray(mediaUrls) && mediaUrls.some((u: any) => typeof u !== 'string' || !/^https?:\/\//i.test(u))) {
        return res.status(400).json({ error: "A media file didn't upload to storage. Remove it and upload it again." });
      }

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          profile_id: profile_id || 'default',
          caption: caption || '',
          media_urls: mediaUrls || [],
          platforms,
          scheduled_for: new Date(scheduledTime).toISOString(),
          status: 'pending',
          platform_results: {},
          linkedin_company_id: linkedinCompanyId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Due now (or in the past): publish straight away instead of waiting for the next poll.
      if (new Date(data.scheduled_for).getTime() <= Date.now()) void publishScheduledPosts();

      res.status(201).json({ success: true, post: data });
    } catch (err: any) {
      console.error('[Posts] Schedule error:', err);
      res.status(500).json({ error: err.message || 'Failed to schedule post' });
    }
  });

  // Recent scheduled posts with per-platform results, so the Auto Post screen can show what happened.
  app.get("/api/posts/recent", requireUser, async (req, res) => {
    try {
      const profileId = String(req.query.profile_id || 'default');
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('id, caption, media_urls, platforms, scheduled_for, status, platform_results, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      res.json({ posts: (data || []).map((p: any) => ({
        ...p, caption: String(p.caption || '').slice(0, 120), media_count: (p.media_urls || []).length, media_urls: undefined,
      })) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Could not load posts' });
    }
  });

  // Which platforms have working credentials. Returns account names and errors only, never tokens.
  const connectionsCache = new Map<string, { at: number; data: any }>();
  app.get("/api/posts/connections", requireUser, async (req, res) => {
    const profileId = String(req.query.profile_id || 'default');
    const cacheKey = `${profileId}|${req.query.linkedin_company_id || ''}`;
    const cached = connectionsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 5 * 60 * 1000 && req.query.refresh !== '1') return res.json(cached.data);

    let creds: any = null;
    try {
      const { data } = await supabase.from('user_settings').select('*').eq('profile_id', profileId).maybeSingle();
      creds = openCreds(data);
    } catch {}

    const check = async (fn: () => Promise<string | null>) => {
      try { return { connected: true, account: await fn() }; }
      catch (e: any) { return { connected: false, error: String(e?.message || e).slice(0, 200) }; }
    };

    const igToken = creds?.facebook_token || process.env.META_ACCESS_TOKEN;
    const igUserId = creds?.meta_ig_user_id || process.env.META_IG_USER_ID;
    const fbToken = creds?.facebook_token || process.env.META_PAGE_ACCESS_TOKEN;
    const fbPageId = creds?.meta_fb_page_id || process.env.META_FB_PAGE_ID;
    const liToken = creds?.linkedin_token || process.env.LINKEDIN_ACCESS_TOKEN;

    const [instagram, facebook, linkedin] = await Promise.all([
      check(async () => {
        if (!igToken || !igUserId) throw new Error('Not connected: set META_ACCESS_TOKEN and META_IG_USER_ID');
        const me = await igGraph(igToken, igUserId, { fields: 'username' }, 'GET');
        return me.username ? `@${me.username}` : null;
      }),
      check(async () => {
        if (!fbToken || !fbPageId) throw new Error('Not connected: set META_PAGE_ACCESS_TOKEN and META_FB_PAGE_ID');
        const r = await fetch(`https://graph.facebook.com/v21.0/${fbPageId}?` + new URLSearchParams({ fields: 'name', access_token: fbToken }));
        const d: any = await r.json().catch(() => ({}));
        if (!r.ok || d.error) throw new Error(d?.error?.message || `Facebook error ${r.status}`);
        return d.name || null;
      }),
      check(async () => {
        if (process.env.LINKEDIN_COMPANY_WEBHOOK_URL && !creds?.linkedin_org_id) return 'Company page (via Make)';
        if (!liToken) throw new Error('Not connected: set LINKEDIN_ACCESS_TOKEN');
        const who = await resolveLinkedinAuthor(liToken, creds, String(req.query.linkedin_company_id || ''));
        // Token introspection works for any scope set, unlike /me or /userinfo.
        const r = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: liToken, client_id: process.env.LINKEDIN_CLIENT_ID || '', client_secret: process.env.LINKEDIN_CLIENT_SECRET || '' }),
        });
        const d: any = await r.json().catch(() => ({}));
        if (r.ok && d.active === false) throw new Error('LinkedIn token has expired. Reconnect LinkedIn');
        const days = r.ok && d.expires_at ? Math.round((d.expires_at * 1000 - Date.now()) / 86400000) : null;
        // Company posting needs w_organization_social, which only LinkedIn's Community Management API grants.
        const scopes = r.ok && typeof d.scope === 'string' ? d.scope : '';
        const canPostAsCompany = scopes ? /w_organization_social/.test(scopes) : null;
        if (who.author.includes(':organization:') && canPostAsCompany === false) {
          throw new Error(`This token can't post as a company page yet (needs LinkedIn's Community Management API approval). Clear the Company ID to post to your profile`);
        }
        const note = !who.author.includes(':organization:') && canPostAsCompany === false ? ' · company page posting awaits LinkedIn approval' : '';
        return `${who.label}${days !== null ? ` · token valid ${days}d` : ''}${note}`;
      }),
    ]);
    const tiktokStatus = await tiktok.status(profileId);
    // Where each connection comes from: connected in the app (removable) or env vars in Render.
    const source = (appField: any, envField: any) => (appField ? 'app' : envField ? 'env' : null);
    const has = (...names: string[]) => names.every(n => !!process.env[n]);
    const data = {
      instagram: { ...instagram, source: source(creds?.facebook_token && creds?.meta_ig_user_id, process.env.META_ACCESS_TOKEN), connectVia: 'meta', canConnect: has('META_APP_ID', 'META_APP_SECRET'), setup: 'Add META_APP_ID and META_APP_SECRET in Render to connect from here' },
      facebook: { ...facebook, source: source(creds?.facebook_token && creds?.meta_fb_page_id, process.env.META_PAGE_ACCESS_TOKEN), connectVia: 'meta', canConnect: has('META_APP_ID', 'META_APP_SECRET'), setup: 'Add META_APP_ID and META_APP_SECRET in Render to connect from here' },
      linkedin: { ...linkedin, source: source(creds?.linkedin_token, process.env.LINKEDIN_ACCESS_TOKEN), connectVia: 'linkedin', canConnect: has('LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'), setup: 'Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in Render' },
      tiktok: { ...tiktokStatus, source: source(creds?.tiktok_token, process.env.TIKTOK_ACCESS_TOKEN), connectVia: 'tiktok', canConnect: has('TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'), setup: 'Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Render' },
      twitter: { connected: false, error: 'Images need the paid X API', source: source(creds?.twitter_token, process.env.TWITTER_BEARER_TOKEN), connectVia: null, canConnect: false },
      youtube: { connected: false, error: 'Video upload not built yet', source: null, connectVia: null, canConnect: false },
    };
    connectionsCache.set(cacheKey, { at: Date.now(), data });
    res.json(data);
  });

  // Remove an account connected in the app (env-var connections are managed in Render).
  const DISCONNECT_FIELDS: Record<string, string[]> = {
    meta: ['facebook_token', 'facebook_refresh_token', 'meta_fb_page_id', 'meta_ig_user_id'],
    linkedin: ['linkedin_token', 'linkedin_refresh_token', 'linkedin_org_id', 'linkedin_person_id'],
    tiktok: ['tiktok_token', 'tiktok_refresh_token', 'tiktok_open_id'],
    twitter: ['twitter_token', 'twitter_refresh_token'],
  };
  app.post("/api/accounts/:platform/disconnect", requireUser, async (req, res) => {
    const fields = DISCONNECT_FIELDS[req.params.platform];
    if (!fields) return res.status(400).json({ error: 'Unknown platform' });
    const profileId = String(req.body?.profile_id || 'default');
    const { error } = await supabase.from('user_settings')
      .update({ ...Object.fromEntries(fields.map(f => [f, null])), updated_at: new Date().toISOString() })
      .eq('profile_id', profileId);
    if (error) return res.status(500).json({ error: error.message });
    for (const k of connectionsCache.keys()) if (k.startsWith(`${profileId}|`)) connectionsCache.delete(k);
    res.json({ success: true });
  });

  // ─── Scheduled Post Publisher ───
  // Polls scheduled_posts for due, pending rows and publishes them directly to each
  // platform's API. Runs in-process (no separate n8n service needed). TikTok is disabled
  // until Content Posting API review is approved; YouTube needs a resumable upload step
  // that isn't wired yet, so both just record a clear failure reason.
  const esc = (s: string) => String(s);

  const isVideoUrl = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);

  // Instagram Login tokens (IG…) use graph.instagram.com; Facebook Login tokens (EA…) use graph.facebook.com.
  async function igGraph(token: string, path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'POST') {
    const host = token.startsWith('IG') ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0';
    const res = await fetch(`${host}/${path}?` + new URLSearchParams({ access_token: token, ...params }), { method });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) throw new Error(data?.error?.error_user_msg || data?.error?.message || `Instagram API error ${res.status}`);
    return data;
  }

  // Containers must finish processing before they can be published (always true for video, sometimes for images).
  async function igWaitReady(token: string, containerId: string) {
    for (let i = 0; i < 30; i++) {
      const { status_code } = await igGraph(token, containerId, { fields: 'status_code' }, 'GET');
      if (status_code === 'FINISHED' || status_code === 'PUBLISHED') return;
      if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram could not process the media (${status_code})`);
      await new Promise(r => setTimeout(r, 4000));
    }
    throw new Error('Instagram took too long to process the media');
  }

  async function publishToInstagram(post: any, creds: any) {
    const token = creds?.facebook_token || process.env.META_ACCESS_TOKEN;
    const igUserId = creds?.meta_ig_user_id || process.env.META_IG_USER_ID;
    if (!token || !igUserId) throw new Error('Missing Instagram token / IG user ID for this client');
    const urls: string[] = (post.media_urls || []).filter(Boolean);
    if (urls.length === 0) throw new Error('Instagram requires at least one media URL');
    const caption = post.caption || '';

    let creationId: string;
    if (urls.length === 1) {
      const url = urls[0];
      const created = await igGraph(token, `${igUserId}/media`, isVideoUrl(url)
        ? { caption, video_url: url, media_type: 'REELS' }
        : { caption, image_url: url });
      creationId = created.id;
    } else {
      // Carousel: one child container per slide (max 10), then a parent container.
      const children: string[] = [];
      for (const url of urls.slice(0, 10)) {
        const child = await igGraph(token, `${igUserId}/media`, isVideoUrl(url)
          ? { is_carousel_item: 'true', video_url: url, media_type: 'VIDEO' }
          : { is_carousel_item: 'true', image_url: url });
        await igWaitReady(token, child.id);
        children.push(child.id);
      }
      const parent = await igGraph(token, `${igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption });
      creationId = parent.id;
    }
    await igWaitReady(token, creationId);
    const published = await igGraph(token, `${igUserId}/media_publish`, { creation_id: creationId });
    return { success: true, id: published.id, slides: Math.min(urls.length, 10) };
  }

  async function publishToFacebook(post: any, creds: any) {
    const token = creds?.facebook_token || process.env.META_PAGE_ACCESS_TOKEN;
    const pageId = creds?.meta_fb_page_id || process.env.META_FB_PAGE_ID;
    if (!token || !pageId) throw new Error('Missing Facebook token / Page ID for this client');
    const fb = async (path: string, params: Record<string, string>) => {
      const res = await fetch(`https://graph.facebook.com/v21.0/${path}?` + new URLSearchParams({ access_token: token, ...params }), { method: 'POST' });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error?.message || 'Facebook publish failed');
      return data;
    };
    const images: string[] = (post.media_urls || []).filter((u: string) => u && !isVideoUrl(u));
    const message = post.caption || '';

    if (images.length === 0) {
      const data = await fb(`${pageId}/feed`, { message });
      return { success: true, id: data.id };
    }
    if (images.length === 1) {
      const data = await fb(`${pageId}/photos`, { message, url: images[0] });
      return { success: true, id: data.post_id || data.id };
    }
    // Multi-photo post: upload each photo unpublished, then attach them all to one feed post.
    const attached: Record<string, string> = {};
    for (const [i, url] of images.slice(0, 10).entries()) {
      const photo = await fb(`${pageId}/photos`, { url, published: 'false' });
      attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: photo.id });
    }
    const data = await fb(`${pageId}/feed`, { message, ...attached });
    return { success: true, id: data.id, photos: Object.keys(attached).length };
  }

  // Who LinkedIn posts are published as: an explicit company ID, then configured IDs, then
  // whatever the token itself can post as (first company page it administers, else the member).
  const linkedinAuthorCache = new Map<string, { author: string; label: string }>();
  async function resolveLinkedinAuthor(token: string, creds: any, explicitOrgId?: string | null) {
    const orgId = (explicitOrgId || '').trim() || creds?.linkedin_org_id || process.env.LINKEDIN_DEFAULT_ORG_ID;
    if (orgId) return { author: `urn:li:organization:${orgId}`, label: `Company ${orgId}` };
    const personId = creds?.linkedin_person_id || process.env.LINKEDIN_PERSON_ID;
    if (personId) return { author: `urn:li:person:${personId}`, label: 'Personal profile' };

    const cached = linkedinAuthorCache.get(token);
    if (cached) return cached;
    const headers = { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' };
    const acl = await fetch('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', { headers });
    if (acl.ok) {
      const d: any = await acl.json().catch(() => ({}));
      const orgUrn = d?.elements?.[0]?.organization || d?.elements?.[0]?.organizationTarget;
      if (orgUrn) {
        let label = `Company ${orgUrn.split(':').pop()}`;
        const org = await fetch(`https://api.linkedin.com/v2/organizations/${orgUrn.split(':').pop()}`, { headers }).catch(() => null);
        if (org?.ok) { const o: any = await org.json().catch(() => ({})); if (o.localizedName) label = o.localizedName; }
        const found = { author: orgUrn, label };
        linkedinAuthorCache.set(token, found);
        return found;
      }
    }
    const me = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    if (me.ok) {
      const u: any = await me.json().catch(() => ({}));
      if (u.sub) {
        const found = { author: `urn:li:person:${u.sub}`, label: u.name ? `${u.name} (personal)` : 'Personal profile' };
        linkedinAuthorCache.set(token, found);
        return found;
      }
    }
    throw new Error(`LinkedIn token can't see a company page or profile (company lookup ${acl.status}, profile ${me.status}). Add the Company ID in Advanced Settings`);
  }

  // Until LinkedIn approves our Community Management API access, company page posts can go
  // through a Make.com scenario (Webhook -> LinkedIn "Create a Company Image Post").
  async function publishToLinkedinViaWebhook(post: any, hook: string) {
    const images: string[] = (post.media_urls || []).filter((u: string) => u && !isVideoUrl(u)).slice(0, 9);
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: post.caption || '',
        image_urls: images,
        image_count: images.length,
        first_image_url: images[0] || null,
        company_id: post.linkedin_company_id || process.env.LINKEDIN_DEFAULT_ORG_ID || null,
        post_id: post.id,
      }),
    });
    const body = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`LinkedIn via Make failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
    return { success: true, via: 'make', images: images.length };
  }

  async function publishToLinkedin(post: any, creds: any) {
    const hook = process.env.LINKEDIN_COMPANY_WEBHOOK_URL;
    if (hook && !creds?.linkedin_org_id) return publishToLinkedinViaWebhook(post, hook);
    const token = creds?.linkedin_token || process.env.LINKEDIN_ACCESS_TOKEN;
    if (!token) throw new Error('Missing LinkedIn token for this client');
    const { author } = await resolveLinkedinAuthor(token, creds, post.linkedin_company_id);
    const headers = { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' };
    const liError = async (res: Response, what: string) => {
      const text = await res.text().catch(() => '');
      let msg = text;
      try { msg = JSON.parse(text)?.message || text; } catch {}
      return new Error(`${what} (${res.status})${msg ? `: ${msg.slice(0, 300)}` : ''}`);
    };

    // Images: register an upload per image, PUT the bytes, then reference the asset URNs (max 9).
    const images: string[] = (post.media_urls || []).filter((u: string) => u && !isVideoUrl(u)).slice(0, 9);
    const assets: string[] = [];
    for (const url of images) {
      const reg = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST', headers,
        body: JSON.stringify({ registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'], owner: author,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
        } }),
      });
      if (!reg.ok) throw await liError(reg, 'LinkedIn image registration failed');
      const regData: any = await reg.json();
      const uploadUrl = regData?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploadMechanism.MediaUploadHttpRequest']?.uploadUrl;
      if (!uploadUrl) throw new Error('LinkedIn did not return an upload URL');
      const img = await fetch(url);
      if (!img.ok) throw new Error(`Could not download media for LinkedIn (${img.status})`);
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': img.headers.get('content-type') || 'image/jpeg' },
        body: Buffer.from(await img.arrayBuffer()),
      });
      if (!put.ok) throw await liError(put, 'LinkedIn image upload failed');
      assets.push(regData.value.asset);
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST', headers,
      body: JSON.stringify({
        author, lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.caption || '' },
          shareMediaCategory: assets.length ? 'IMAGE' : 'NONE',
          ...(assets.length ? { media: assets.map(media => ({ status: 'READY', media })) } : {}),
        } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) throw await liError(res, 'LinkedIn publish failed');
    const data = await res.json().catch(() => ({}));
    return { success: true, id: data.id || res.headers.get('x-restli-id'), images: assets.length };
  }

  async function publishToTwitter(post: any, creds: any) {
    const token = creds?.twitter_token || process.env.TWITTER_BEARER_TOKEN;
    if (!token) throw new Error('Missing Twitter/X token for this client');
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: post.caption || '' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || data?.title || 'Twitter publish failed');
    return { success: true, id: data.data?.id };
  }

  async function publishToTiktok(post: any, creds: any) {
    const token = creds?.tiktok_token || process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) throw new Error('Missing TikTok token for this client');
    const mediaUrl = (post.media_urls || [])[0];
    if (!mediaUrl) throw new Error('TikTok requires a video URL');
    // SELF_ONLY is required by TikTok for apps that have not yet passed Content Posting API
    // review — public posting will be rejected by TikTok until the app is approved.
    const privacyLevel = creds?.tiktok_privacy_level || process.env.TIKTOK_PRIVACY_LEVEL || 'SELF_ONLY';
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_info: {
          title: post.caption || '',
          privacy_level: privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || initData?.error?.code !== 'ok') {
      throw new Error(initData?.error?.message || 'TikTok publish init failed');
    }
    // TikTok processes the video asynchronously after init — publish_id can be polled via
    // /v2/post/publish/status/fetch/ for final status, but init success is enough to record
    // the post as sent for our purposes here.
    return { success: true, id: initData.data?.publish_id, status: 'processing' };
  }

  async function publishToYoutube(): Promise<any> {
    throw new Error('YouTube publishing needs a resumable video upload step \u2014 not implemented yet.');
  }

  const PLATFORM_PUBLISHERS: Record<string, (post: any, creds: any) => Promise<any>> = {
    instagram: publishToInstagram,
    facebook: publishToFacebook,
    linkedin: publishToLinkedin,
    twitter: publishToTwitter,
    tiktok: publishToTiktok,
    youtube: (post: any) => publishToYoutube(),
  };

  async function publishScheduledPosts() {
    try {
      const { data: duePosts, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(20);

      if (error) throw error;
      if (!duePosts || duePosts.length === 0) return;

      console.log(`[Scheduler] Publishing ${duePosts.length} due post(s)`);

      for (const post of duePosts) {
        // Claim the row first so an overlapping poll can never publish the same post twice.
        const { data: claimed } = await supabase
          .from('scheduled_posts')
          .update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('status', 'pending')
          .select('id');
        if (!claimed || claimed.length === 0) continue;

        const platforms: string[] = Array.isArray(post.platforms) ? post.platforms : [];
        const platform_results: Record<string, any> = {};
        let anyFailure = false;

        // Per-client credentials: each client's tokens live in user_settings, keyed by
        // the same profile_id stored on the post. Falls back to the env-var tokens above
        // (the "default" client) when no per-client row exists yet.
        let creds: any = null;
        try {
          const { data: credsRow } = await supabase
            .from('user_settings')
            .select('*')
            .eq('profile_id', post.profile_id || 'default')
            .maybeSingle();
          creds = openCreds(credsRow);
        } catch (credsErr: any) {
          console.warn('[Scheduler] Could not load per-client credentials, falling back to env vars:', credsErr?.message || credsErr);
        }

        for (const platform of platforms) {
          try {
            const publisher = PLATFORM_PUBLISHERS[platform];
            if (!publisher) throw new Error(`No publisher for platform: ${platform}`);
            platform_results[platform] = await publisher(post, creds);
          } catch (err: any) {
            platform_results[platform] = { success: false, error: esc(err?.message || String(err)) };
            anyFailure = true;
          }
        }

        const status = anyFailure ? 'failed' : 'sent';
        await supabase
          .from('scheduled_posts')
          .update({ status, platform_results, updated_at: new Date().toISOString() })
          .eq('id', post.id);

        console.log(`[Scheduler] Post ${post.id} -> ${status}`, platform_results);
      }
    } catch (err: any) {
      console.error('[Scheduler] Error polling scheduled posts:', err?.message || err);
    }
  }

  // Poll every 3 minutes for due posts.
  setInterval(publishScheduledPosts, 3 * 60 * 1000);
  publishScheduledPosts();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!WEBHOOK_SECRET) {
      console.warn('[Server] WARNING: WEBHOOK_SECRET is not set. Set it in your environment to protect webhook endpoints.');
    }
  });
}

startServer();
