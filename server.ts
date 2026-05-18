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
    const { platforms, mediaUrls, caption, scheduledTime, credentials } = req.body;
    
    console.log(`[DAEMON] Received request to publish to ${platforms.join(', ')}`);
    
    // Execute the actual headless browser daemon
    const result = await executePublishingDaemon({
      platforms,
      mediaUrls,
      caption,
      credentials
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
  });
}

startServer();
