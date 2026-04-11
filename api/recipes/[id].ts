// api/recipes/[id].ts — GET · PATCH · DELETE /api/recipes/:id

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';
import { setCors } from '../_cors';
import { ensureSchema, rowToRecipe, sql } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing recipe id' });

  try {
    await ensureSchema();

    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM recipes WHERE id = ${id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
      return res.status(200).json(rowToRecipe(rows[0] as Record<string, unknown>));
    }

    // ── PATCH ──────────────────────────────────────────────────────────────
    // Fetch current record, merge with provided updates, then do a full replace.
    // This avoids dynamic SQL while still supporting partial updates.
    if (req.method === 'PATCH') {
      const authed = await requireAuth(req, res);
      if (!authed) return;
      const existing = await sql`SELECT * FROM recipes WHERE id = ${id}`;
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });

      const cur = existing.rows[0] as Record<string, unknown>;
      const upd = req.body as Record<string, unknown>;

      const merged = {
        title:              (upd.title              ?? cur.title)              as string,
        portions:           (upd.portions           ?? cur.portions)           as number,
        macros_per_portion: (upd.macros_per_portion ?? cur.macros_per_portion) as unknown,
        ingredients:        (upd.ingredients        ?? cur.ingredients)        as unknown,
        instructions:       (upd.instructions       ?? cur.instructions)      as unknown,
        source_url:         (upd.source_url !== undefined ? upd.source_url : cur.source_url) as string | null,
      };

      const { rows } = await sql`
        UPDATE recipes SET
          title               = ${merged.title},
          portions            = ${merged.portions},
          macros_per_portion  = ${JSON.stringify(merged.macros_per_portion)}::jsonb,
          ingredients         = ${JSON.stringify(merged.ingredients)}::jsonb,
          instructions        = ${JSON.stringify(merged.instructions)}::jsonb,
          source_url          = ${merged.source_url ?? null},
          updated_at          = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(rowToRecipe(rows[0] as Record<string, unknown>));
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const authed = await requireAuth(req, res);
      if (!authed) return;
      const { rowCount } = await sql`DELETE FROM recipes WHERE id = ${id}`;
      if (rowCount === 0) return res.status(404).json({ error: 'Recipe not found' });
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`[/api/recipes/${id}]`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
