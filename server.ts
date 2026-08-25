import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { executePublishingDaemon } from "./src/services/daemon.ts";
import { authRouter } from "./src/services/auth.ts";
import { twitterManualRouter } from "./src/services/twitter-manual.ts";
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase Client for Server-side (env vars only â no hardcoded keys)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Server] FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// --- Auth Middleware ---
// Internal API calls (from the SPA on the same origin) are validated via a session token.
// External webhooks (n8n) are validated via a separate WEBHOOK_SECRET.
// Set INTERNAL_API_SECRET in your env (auto-generated at boot if missing).

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || crypto.randomBytes(32).toString('hex');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Middleware: require x-api-key header matching INTERNAL_API_SECRET
const requireInternalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = req.headers['x-api-key'];
  if (key === INTERNAL_API_SECRET) return next();
  // Also allow same-origin requests in dev (Referer/Origin check)
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) return next();
  res.status(401).json({ error: 'Unauthorized' });
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
  // Use DEFAULT_APP_PORT in AI Studio (3000), otherwise fallback to Cloud Run's PORT (8080)
  const PORT = Number(process.env.DEFAULT_APP_PORT || process.env.PORT || 3000);

  app.use(express.json({ limit: '50mb' })); // Increased limit for base64 media

  // Expose the internal API secret to the SPA via a meta endpoint (dev only / same-origin)
  app.get("/api/config", (req, res) => {
    res.json({ apiSecret: INTERNAL_API_SECRET });
  });

  // Mount Auth Router
  app.use("/api/auth", authRouter);
  
  // Mount Twitter Manual Router
  app.use("/api/twitter", twitterManualRouter);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Claude AI Proxy (protected)
  app.post("/api/ai/claude", requireInternalAuth, async (req, res) => {
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
  app.post("/api/ai/gemini", requireInternalAuth, async (req, res) => {
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

  // Smart Fill (protected)
  app.post("/api/ai/smart-fill", requireInternalAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      // Fetch the page server-side (avoids CORS, can actually read content)
      let pageText = '';
      try {
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TitanLeap/1.0; +https://titanleap.ai)' },
          signal: AbortSignal.timeout(12000)
        });
        const html = await pageRes.text();
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
      const parsed = JSON.parse(cleaned);
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
  async function scrapeInstagramProfile(handle: string): Promise<any | null> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return null;
    try {
      const usernameMatch = handle.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
      const username = (usernameMatch ? usernameMatch[1] : handle).replace(/^@/, '').replace(/\/$/, '').trim();
      if (!username) return null;

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
      return profile;
    } catch (err: any) {
      console.error("[ApifyInstagram] scrape failed:", err?.message || err);
      return null;
    }
  }

  app.post("/api/ai/social-research", requireInternalAuth, async (req, res) => {
    try {
      const { platform, handle } = req.body;
      if (!platform || !handle) {
        return res.status(400).json({ error: "platform and profile link are required" });
      }

      const scrapedProfile = platform === "Instagram" ? await scrapeInstagramProfile(handle) : null;

      const prompt = scrapedProfile ? `You are the Smart Fill research step for TitanLeap's Audit intake form. You have been
given REAL, freshly-scraped Instagram profile data below â pulled directly from the profile via
API, not a guess. Use ONLY what is present in this data. Do not invent or estimate anything not
shown here.

Primary Platform: ${platform}
Profile Link: ${handle}

SCRAPED PROFILE DATA (JSON):
${JSON.stringify(scrapedProfile).slice(0, 12000)}

WHAT TO LOOK FOR:` : `You are the Smart Fill research step for TitanLeap's Audit intake form. You will be given:
- Primary Platform (e.g. LinkedIn, X/Twitter, Instagram)
- A Profile Link (a full URL to the person or business's profile â open it directly. If what's
  given is a bare handle instead of a URL, search for and open the matching profile on the stated
  platform.)

TASK: Actually visit and read the given profile on the given platform using web search. Extract what is
genuinely there â do not infer or estimate anything you have not directly observed on the
profile/feed.

Primary Platform: ${platform}
Profile Link: ${handle}

WHAT TO LOOK FOR:
1. Posting cadence â how many posts in the last 30 days? (fills "posting consistently:
   yes/no/sometimes")
2. Approximate reach signal â follower count, and typical engagement (likes/comments/reposts)
   on their last 5 posts, if visible. Only fill "average monthly reach" if you can point to a
   real number or a defensible range from what's shown on the profile â otherwise leave null.
3. Content themes â what do they actually post about? (product updates, personal takes,
   industry commentary, memes, customer wins, hiring, etc.)
4. ONE specific, recent, real post or activity (within last 60 days) that could open a
   conversation â a launch, an opinion they shared, a milestone, a complaint, a question they
   asked their audience.
5. Tone â how do they write? (direct, casual, data-heavy, funny, formal) â this should shape
   how the outreach email is voiced, not just what it references.

STRICT RULES:
1. Every field must trace back to something you actually saw on the profile. If you cannot
   access the profile (private, handle wrong, platform not supported, no recent activity),
   return that field as null and set "data_quality" to "insufficient" â never fill a field
   with a plausible guess.
2. Do not round up or embellish reach numbers. If the profile shows 340 followers, report
   340, not "a few hundred" rounded favorably or "over 1,000."
3. The "specific_signal" field must be something a stranger reading their profile cold would
   also find within 2 minutes â if it took inference or speculation to construct, it doesn't
   qualify.
4. Do not comment on their website, funnel, or business metrics here â this step is social
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
  "relatability_hook": "one warm, specific line referencing the signal above â only generate
   this if specific_signal.found is true; otherwise null"
}
Return ONLY the JSON. No markdown. No explanation.`;

      const { generateClaudeContent } = await import("./src/services/claude.ts");
      const result = await generateClaudeContent({
        prompt,
        apiKey: process.env.CLAUDE_API_KEY,
        useWebSearch: !scrapedProfile,
        temperature: 0.3,
      });

      const cleaned = (result.text || '').replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const firstBracket = cleaned.search(/[\[{]/);
        const lastBracket = cleaned.lastIndexOf('}');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
        } else {
          throw new Error("Could not parse research response as JSON");
        }
      }
      res.json(parsed);
    } catch (error: any) {
      const errMsg = error?.message || String(error) || "Social research failed";
      console.error("[SocialResearch] Error:", errMsg, error?.stack);
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
  app.post("/api/daemon/publish", requireInternalAuth, async (req, res) => {
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
