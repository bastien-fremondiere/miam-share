// api/_db.ts — Vercel Postgres connection + schema bootstrap
// Uses @vercel/postgres which connects via the POSTGRES_URL env var (set by Vercel dashboard).

import { sql } from '@vercel/postgres';

export { sql };

// Guard so schema is created at most once per warm function instance
let schemaReady = false;

/**
 * Idempotent schema bootstrap — safe to call on every cold start.
 * In production CI you'd run migrations separately; for this project a single
 * CREATE TABLE IF NOT EXISTS is sufficient.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      title               TEXT        NOT NULL,
      portions            INTEGER     NOT NULL DEFAULT 6,
      macros_per_portion  JSONB       NOT NULL,
      ingredients         JSONB       NOT NULL,
      instructions        JSONB       NOT NULL,
      source_url          TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

/** Map a raw Postgres row → Recipe-shaped plain object */
export function rowToRecipe(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    portions: row.portions as 6,
    macros_per_portion: row.macros_per_portion,
    ingredients: row.ingredients,
    instructions: row.instructions,
    source_url: (row.source_url as string | null) ?? undefined,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}
