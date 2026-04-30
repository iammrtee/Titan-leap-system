import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { executePublishingDaemon } from "./src/services/daemon.ts";
import { authRouter } from "./src/services/auth.ts";
import { twitterManualRouter } from "./src/services/twitter-manual.ts";

async function startServer() {
  const app = express();
  // Use DEFAULT_APP_PORT in AI Studio (3000), otherwise fallback to Cloud Run's PORT (8080)
  const PORT = process.env.DEFAULT_APP_PORT || process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' })); // Increased limit for base64 media

  // Mount Auth Router
  app.use("/api/auth", authRouter);
  
  // Mount Twitter Manual Router
  app.use("/api/twitter", twitterManualRouter);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
