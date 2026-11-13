import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_SERVICES = new Set([
  'patrol_tow',
  'tow_truck',
  'mobile_mech',
  'battery_swap',
  'flat_tyre',
  'fuel_delivery',
  'lockout',
]);

const VALID_SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json());

  app.post('/api/gemini/diagnose', async (req, res) => {
    try {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      const vehicle =
        typeof req.body?.vehicle === 'string' ? req.body.vehicle.trim() : 'Perodua Myvi 1.5L';
      const plate =
        typeof req.body?.plate === 'string' ? req.body.plate.trim() : 'SAB 8821 X';
      const apiKeyOverride =
        typeof req.body?.apiKeyOverride === 'string' ? req.body.apiKeyOverride.trim() : '';

      if (!query) {
        res.status(400).json({ error: 'Missing diagnostic symptom query' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY || apiKeyOverride;
      if (!apiKey) {
        res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are RepairBah Sabah Roadside Automotive AI in Kota Kinabalu, Malaysia. Vehicle: ${vehicle} (${plate}). User symptom: "${query}". Reply concisely in 2 sentences with practical safety advice, a short likelyCause label, severity (LOW, MEDIUM, HIGH, or CRITICAL), and recommendedServiceId chosen strictly from: patrol_tow, tow_truck, mobile_mech, battery_swap, flat_tyre, fuel_delivery, lockout.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              severity: { type: Type.STRING },
              likelyCause: { type: Type.STRING },
              recommendedServiceId: { type: Type.STRING },
            },
            required: ['text', 'severity', 'likelyCause', 'recommendedServiceId'],
          },
        },
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from Gemini API' });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        text?: string;
        severity?: string;
        likelyCause?: string;
        recommendedServiceId?: string;
      };

      const severity = VALID_SEVERITIES.has((parsed.severity || '').toUpperCase())
        ? (parsed.severity || '').toUpperCase()
        : 'MEDIUM';
      const recommendedServiceId = VALID_SERVICES.has(parsed.recommendedServiceId || '')
        ? parsed.recommendedServiceId
        : 'mobile_mech';

      res.json({
        text: parsed.text || rawText,
        severity,
        likelyCause: parsed.likelyCause || 'Sabah Roadside AI Triage',
        recommendedServiceId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini diagnostic error';
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`RepairBah Sabah SOS server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
