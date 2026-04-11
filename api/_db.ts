// api/_db.ts — Postgres connection + schema bootstrap
// Uses the 'postgres' npm package which works with:
//   - Local Docker Postgres (dev.sh)
//   - Vercel Postgres / Neon (production, via POSTGRES_URL)

import postgres from 'postgres';

// Lazy singleton — created on first sql call so env vars are read at call time,
// not at module load time (important for test / seed scripts that configure env first).
let _client: ReturnType<typeof postgres> | undefined;

function getClient(): ReturnType<typeof postgres> {
  if (!_client) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error('POSTGRES_URL environment variable is not set');
    _client = postgres(url, {
      // No SSL for localhost; require it for Neon / remote (production)
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
    });
  }
  return _client;
}

/**
 * sql tagged-template tag — mimics the @vercel/postgres { rows, rowCount } API
 * so all existing route handlers remain unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql = (strings: TemplateStringsArray, ...values: unknown[]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (getClient() as any)(strings, ...values).then((result: any) => ({
    rows: Array.from(result) as Record<string, unknown>[],
    rowCount: Number(result.count ?? 0),
  }));

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
