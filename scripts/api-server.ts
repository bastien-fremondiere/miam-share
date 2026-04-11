// scripts/api-server.ts — local Express dev server that wraps the Vercel route handlers.
// Run via `dev.sh` or directly with: npx tsx scripts/api-server.ts
// Reads credentials from .env.local (POSTGRES_URL + GEMINI_API_KEY).

// Load env BEFORE any imports so that api/_db.ts picks up POSTGRES_URL when the
// postgres client is lazily initialised on first request.
import { config } from 'dotenv';
config({ path: '.env.local' });

import express from 'express';
import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Route handlers (imported after env is set up)
import recipesIndex from '../api/recipes/index';
import recipesId from '../api/recipes/[id]';
import geminiAnalyze from '../api/gemini/analyze';
import geminiGenerate from '../api/gemini/generate';

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

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍽  Miam Share API  →  http://0.0.0.0:${PORT}\n`);
});
