// api/recipes/index.ts — GET /api/recipes (list) · POST /api/recipes (create)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors';
import { ensureSchema, rowToRecipe, sql } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureSchema();

    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT * FROM recipes ORDER BY created_at DESC
      `;
      return res.status(200).json(rows.map(rowToRecipe));
    }

    // ── POST ───────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = req.body as Record<string, unknown>;
      const { title, portions, macros_per_portion, ingredients, instructions, source_url } = body;

      if (!title || !macros_per_portion || !ingredients || !instructions) {
        return res.status(400).json({ error: 'Missing required fields: title, macros_per_portion, ingredients, instructions' });
      }

      const { rows } = await sql`
        INSERT INTO recipes (title, portions, macros_per_portion, ingredients, instructions, source_url)
        VALUES (
          ${title as string},
          ${(portions as number) ?? 6},
          ${JSON.stringify(macros_per_portion)}::jsonb,
          ${JSON.stringify(ingredients)}::jsonb,
          ${JSON.stringify(instructions)}::jsonb,
          ${(source_url as string | null) ?? null}
        )
        RETURNING *
      `;
      return res.status(201).json(rowToRecipe(rows[0] as Record<string, unknown>));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[POST /api/recipes]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
