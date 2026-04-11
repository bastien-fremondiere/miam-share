// api/gemini/analyze.ts — POST /api/gemini/analyze
// Receives raw text / URL from the mobile app and returns a structured recipe.
// The GEMINI_API_KEY never leaves the server.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';
import { setCors } from '../_cors';
import { analyzeRecipeServer } from '../_gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const { text } = req.body as { text?: string };
  if (!text?.trim()) return res.status(400).json({ error: '`text` field is required' });

  try {
    const recipe = await analyzeRecipeServer(text.trim());
    return res.status(200).json(recipe);
  } catch (err) {
    console.error('[POST /api/gemini/analyze]', err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'AI analysis failed' });
  }
}
