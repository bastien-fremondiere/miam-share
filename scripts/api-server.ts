// scripts/api-server.ts — local Express dev server that wraps the Vercel route handlers.
// Run via `dev.sh` or directly with: npx tsx scripts/api-server.ts
// Reads credentials from .env.local (POSTGRES_URL + GEMINI_API_KEY).

// Load env BEFORE any imports so that api/_db.ts picks up POSTGRES_URL when the
// postgres client is lazily initialised on first request.
import { config } from 'dotenv';
config({ path: '.env.local' });

if (!process.env.DB_BACKEND && !process.env.POSTGRES_URL) {
  process.env.DB_BACKEND = 'pglite';
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Request, Response } from 'express';
import express from 'express';

// Route handlers (imported after env is set up)
import geminiAnalyze from '../api/gemini/analyze';
import geminiGenerate from '../api/gemini/generate';
import recipesId from '../api/recipes/[id]';
import recipesIndex from '../api/recipes/index';

const app = express();
app.use(express.json());

// Thin adapter: Express req/res satisfies the connect-compatible VercelRequest/VercelResponse
// interface for the subset of methods our handlers use (.status, .json, .end, .query, .body).
type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
const adapt = (handler: Handler) => (req: Request, res: Response) =>
  handler(req as unknown as VercelRequest, res as unknown as VercelResponse);

app.all('/api/recipes', adapt(recipesIndex));

app.all('/api/recipes/:id', (req, res) => {
  // Merge the Express route param into req.query so the handler finds req.query.id
  (req as unknown as Record<string, unknown>).query = { ...req.query, id: req.params.id };
  adapt(recipesId)(req, res);
});

app.all('/api/gemini/analyze', adapt(geminiAnalyze));
app.all('/api/gemini/generate', adapt(geminiGenerate));

function resolvePort(): number {
  const argIndex = process.argv.indexOf('--port');
  if (argIndex >= 0 && process.argv[argIndex + 1]) {
    const parsed = Number(process.argv[argIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const envPort = Number(process.env.PORT ?? 3000);
  if (Number.isFinite(envPort) && envPort > 0) return envPort;
  return 3000;
}

const PORT = resolvePort();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍽  Miam Share API  →  http://0.0.0.0:${PORT} (${process.env.DB_BACKEND ?? 'auto'})\n`);
});
