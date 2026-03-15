import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Start AI session
  app.post("/api/agent/start", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      // We'll simulate starting a task
      const taskId = `task_${Date.now()}`;
      res.json({ taskId, status: "started", message: "Agent initialized" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send screenshot to agent (Mock backend, actual call moved to frontend)
  app.post("/api/agent/vision", async (req, res) => {
    try {
      const { taskId, imageBase64, command } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      // The actual Gemini call is now done on the frontend as per guidelines.
      // This endpoint is just a placeholder if needed, but we'll bypass it in the frontend.
      res.json({ taskId, status: "received" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Execute UI action (Mock)
  app.post("/api/agent/action", (req, res) => {
    const { taskId, action } = req.body;
    // In a real app, this would trigger Playwright
    res.json({ taskId, status: "success", executedAction: action });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
