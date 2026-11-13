// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
var VALID_SERVICES = /* @__PURE__ */ new Set([
  "patrol_tow",
  "tow_truck",
  "mobile_mech",
  "battery_swap",
  "flat_tyre",
  "fuel_delivery",
  "lockout"
]);
var VALID_SEVERITIES = /* @__PURE__ */ new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
var RATE_LIMIT_WINDOW_MS = 6e4;
var RATE_LIMIT_MAX_REQUESTS = 30;
var ipRequestLog = /* @__PURE__ */ new Map();
function apiRateLimiter(req, res, next) {
  const now = Date.now();
  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : Array.isArray(forwardedFor) ? forwardedFor[0] : "") || req.ip || req.socket.remoteAddress || "unknown";
  const recent = (ipRequestLog.get(clientIp) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1e3)
    );
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "Rate limit exceeded (30 requests/minute). Please try again shortly."
    });
    return;
  }
  recent.push(now);
  ipRequestLog.set(clientIp, recent);
  if (ipRequestLog.size > 500) {
    for (const [ip, hits] of ipRequestLog.entries()) {
      const active = hits.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        ipRequestLog.delete(ip);
      } else {
        ipRequestLog.set(ip, active);
      }
    }
  }
  next();
}
function getValidWorkforcePins() {
  const pins = /* @__PURE__ */ new Set(["4402", "1234"]);
  const envPin = process.env.WORKFORCE_ACCESS_PIN?.trim();
  if (envPin) {
    pins.add(envPin);
  }
  return pins;
}
async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3e3);
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", apiRateLimiter);
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/auth/verify-pin", (req, res) => {
    const pin = typeof req.body?.pin === "string" ? req.body.pin.trim() : "";
    if (!pin) {
      res.status(400).json({ valid: false, error: "PIN is required" });
      return;
    }
    const validPins = getValidWorkforcePins();
    if (validPins.has(pin)) {
      res.json({
        valid: true,
        role: "workforce",
        expiresInMs: 15 * 60 * 1e3
      });
      return;
    }
    res.status(401).json({
      valid: false,
      error: "Invalid workforce PIN"
    });
  });
  app.post("/api/gemini/diagnose", async (req, res) => {
    try {
      const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
      const vehicle = typeof req.body?.vehicle === "string" ? req.body.vehicle.trim() : "Perodua Myvi 1.5L";
      const plate = typeof req.body?.plate === "string" ? req.body.plate.trim() : "SAB 8821 X";
      const apiKeyOverride = typeof req.body?.apiKeyOverride === "string" ? req.body.apiKeyOverride.trim() : "";
      if (!query) {
        res.status(400).json({ error: "Missing diagnostic symptom query" });
        return;
      }
      const apiKey = process.env.GEMINI_API_KEY || apiKeyOverride;
      if (!apiKey) {
        res.status(503).json({ error: "GEMINI_API_KEY not configured" });
        return;
      }
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are RepairBah Sabah Roadside Automotive AI in Kota Kinabalu, Malaysia. Vehicle: ${vehicle} (${plate}). User symptom: "${query}". Reply concisely in 2 sentences with practical safety advice, a short likelyCause label, severity (LOW, MEDIUM, HIGH, or CRITICAL), and recommendedServiceId chosen strictly from: patrol_tow, tow_truck, mobile_mech, battery_swap, flat_tyre, fuel_delivery, lockout.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              severity: { type: Type.STRING },
              likelyCause: { type: Type.STRING },
              recommendedServiceId: { type: Type.STRING }
            },
            required: ["text", "severity", "likelyCause", "recommendedServiceId"]
          }
        }
      });
      const rawText = (response.text || "").trim();
      if (!rawText) {
        res.status(502).json({ error: "Empty response from Gemini API" });
        return;
      }
      const parsed = JSON.parse(rawText);
      const severity = VALID_SEVERITIES.has((parsed.severity || "").toUpperCase()) ? (parsed.severity || "").toUpperCase() : "MEDIUM";
      const recommendedServiceId = VALID_SERVICES.has(parsed.recommendedServiceId || "") ? parsed.recommendedServiceId : "mobile_mech";
      res.json({
        text: parsed.text || rawText,
        severity,
        likelyCause: parsed.likelyCause || "Sabah Roadside AI Triage",
        recommendedServiceId
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini diagnostic error";
      res.status(502).json({ error: message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`RepairBah Sabah SOS server listening on http://0.0.0.0:${port}`);
  });
}
startServer();
