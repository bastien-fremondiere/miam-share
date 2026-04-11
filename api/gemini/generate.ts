// api/gemini/generate.ts — POST /api/gemini/generate
// Generates a brand-new recipe from a natural-language prompt.
// The GEMINI_API_KEY never leaves the server.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';
import { setCors } from '../_cors';
import { generateRecipeServer } from '../_gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await requireAuth(req, res);
  if (!authed) return;

  const { prompt } = req.body as { prompt?: string };
  if (!prompt?.trim()) return res.status(400).json({ error: '`prompt` field is required' });

  try {
    const recipe = await generateRecipeServer(prompt.trim());
    return res.status(200).json(recipe);
  } catch (err) {
    console.error('[POST /api/gemini/generate]', err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : 'AI generation failed' });
  }
}
