// api/_db.ts — Postgres connection + schema bootstrap
//
// Two backends, selected automatically:
//   POSTGRES_URL set   → 'postgres' npm package (Vercel Neon in prod, or local Docker)
//   POSTGRES_URL unset → @electric-sql/pglite (embedded Postgres in "./dev-db", no Docker needed)

import type { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';

type SqlResult = { rows: Record<string, unknown>[]; rowCount: number };

// ── PGlite (embedded, local dev only) ─────────────────────────────────────
let pgliteDb: PGlite | undefined;

async function getPGlite(): Promise<PGlite> {
  if (!pgliteDb) {
    // Lazy import: PGlite is a devDependency; this path is never reached in production.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PGlite } = require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
    pgliteDb = new PGlite('./dev-db');
    await pgliteDb.waitReady;
  }
  return pgliteDb;
}

/** Convert a tagged-template call into a positional ($1, $2…) query for PGlite */
async function pgliteQuery(strings: TemplateStringsArray, values: unknown[]): Promise<SqlResult> {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  const db = await getPGlite();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.query(text, values as any[]);
  return {
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.affectedRows ?? result.rows.length,
  };
}

// ── postgres package (network Postgres) ─────────────────────────────────────
let _pgClient: ReturnType<typeof postgres> | undefined;

function getPgClient(): ReturnType<typeof postgres> {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('[_db] getPgClient() called but POSTGRES_URL is not set');
  if (!_pgClient) {
    _pgClient = postgres(url, {
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
    });
  }
  return _pgClient;
}

// ── Unified sql tagged-template tag ─────────────────────────────────────────
// Mimics the { rows, rowCount } shape expected by all route handlers.
export const sql = (strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlResult> => {
  const forcedBackend = (process.env.DB_BACKEND ?? '').toLowerCase();
  if (forcedBackend === 'pglite') return pgliteQuery(strings, values);
  if (forcedBackend === 'postgres') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getPgClient() as any)(strings, ...values).then((result: any) => ({
      rows: Array.from(result) as Record<string, unknown>[],
      rowCount: Number(result.count ?? 0),
    }));
  }

  const pgUrl = process.env.POSTGRES_URL;
  if (!pgUrl) return pgliteQuery(strings, values);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getPgClient() as any)(strings, ...values).then((result: any) => ({
    rows: Array.from(result) as Record<string, unknown>[],
    rowCount: Number(result.count ?? 0),
  }));
};

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
