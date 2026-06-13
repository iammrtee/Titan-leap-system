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

// Initialize Supabase Client for Server-side
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vchdaboijdpvbmwgmfxo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaGRhYm9pamRwdmJtd2dtZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTgyMzUsImV4cCI6MjA5MDIzNDIzNX0.PLhkYVJSQvYtB_GBKPgvBQZKR7_md0-3GNyOqI0P7zA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  // Use DEFAULT_APP_PORT in AI Studio (3000), otherwise fallback to Cloud Run's PORT (8080)
  const PORT = Number(process.env.DEFAULT_APP_PORT || process.env.PORT || 3000);

  app.use(express.json({ limit: '50mb' })); // Increased limit for base64 media

  // Mount Auth Router
  app.use("/api/auth", authRouter);
  
  // Mount Twitter Manual Router
  app.use("/api/twitter", twitterManualRouter);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Claude AI Proxy
  app.post("/api/ai/claude", async (req, res) => {
    try {
      const { prompt, systemPrompt, temperature } = req.body;
      const { generateClaudeContent } = await import("./src/services/claude.ts");
      
      // Explicitly pass the API key from server environment
      const apiKey = process.env.CLAUDE_API_KEY;
      
      const result = await generateClaudeContent({ 
        prompt, 
        systemPrompt, 
        temperature,
        apiKey
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

  // Gemini AI Proxy
  app.post("/api/ai/gemini", async (req, res) => {
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

  // Smart Fill — fetches website server-side, extracts business info via Claude
  app.post("/api/ai/smart-fill", async (req, res) => {
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
        // Strip scripts, styles, tags — keep readable text
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
        pageText = `Website at ${url} (could not fetch — extract what you can from the URL itself)`;
      }

      const prompt = `You are a business intelligence analyst. Analyse the following website content and extract structured business information to pre-fill an audit form.

WEBSITE URL: ${url}
WEBSITE CONTENT:
${pageText}

Extract and return ONLY a valid JSON object with these exact keys. Use your best inference from the content — do not leave fields empty if you can make a reasonable guess:
{
  "businessName": "Official name of the business",
  "industry": "One of: B2B SaaS, E-commerce, Coaching/Consulting, Agency, Local Business, Other",
  "primaryPlatform": "Their main social media platform — one of: Instagram, LinkedIn, TikTok, YouTube, Twitter-X",
  "socialHandles": ["array of social handles or profile URLs found on site, e.g. '@handle' or 'instagram.com/handle'"],
  "monthlyReach": "Estimated monthly social media reach as a number string, e.g. '5000'. Use '1000' if unknown.",
  "mainOffer": "Their primary product or service described in one sentence",
  "pricePoint": "Numeric price of main offer in USD as string, e.g. '2997'. Use '0' if not found.",
  "differentiator": "What makes them unique or their main value proposition in one sentence",
  "currentRevenue": "0",
  "targetRevenue": "If pricePoint is known, set to pricePoint * 10 as string, else '0'",
  "currency": "USD",
  "timeline": "One of: 30 days, 60 days, 90 days, 6 months, 1 year — pick most appropriate for their business stage",
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
        model: "claude-haiku-4-5-20251001"  // cheapest model — smart fill doesn't need heavy reasoning
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

  // n8n Webhook for Leads
  app.post("/api/webhooks/n8n/leads", async (req, res) => {
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

  // n8n Webhook for Sales/Revenue
  app.post("/api/webhooks/n8n/sales", async (req, res) => {
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
          lead_id: leadData?.id, // Link if found
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

  // Endpoint for the daemon to "post" to
  app.post("/api/daemon/publish", async (req, res) => {
    const { platforms, mediaUrls, caption, scheduledTime, tokens, credentials, linkedinCompanyId } = req.body;
    
    console.log(`[DAEMON] Received request to publish to ${platforms.join(', ')}`);
    
    // Execute the actual headless browser daemon
    const result = await ex