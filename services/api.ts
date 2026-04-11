// services/api.ts — HTTP client for the Vercel backend (replaces firebase.ts)
// All recipe CRUD goes through REST calls to /api/recipes/*.

import type { Recipe } from '@/types/recipe';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── Internal helper ────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit, accessToken?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...init?.headers as Record<string, string> };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Fetch all recipes, newest first. */
export async function getRecipes(): Promise<Recipe[]> {
  const rows = await request<RawRecipe[]>('/api/recipes');
  return rows.map(parseRecipe);
}

/** Add a new recipe. Returns the saved recipe (with server-generated id). */
export async function addRecipe(
  recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>,
  accessToken?: string | null,
): Promise<Recipe> {
  const row = await request<RawRecipe>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(recipe),
  }, accessToken);
  return parseRecipe(row);
}

/** Partially update a recipe. Returns the updated recipe. */
export async function updateRecipe(
  id: string,
  updates: Partial<Omit<Recipe, 'id' | 'created_at'>>,
  accessToken?: string | null,
): Promise<Recipe> {
  const row = await request<RawRecipe>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, accessToken);
  return parseRecipe(row);
}

/** Delete a recipe by id. */
export async function deleteRecipe(id: string, accessToken?: string | null): Promise<void> {
  await request<void>(`/api/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken);
}

// ── Internal types & parse helper ─────────────────────────────────────────

interface RawRecipe {
  id: string;
  title: string;
  portions: 6;
  macros_per_portion: Recipe['macros_per_portion'];
  ingredients: Recipe['ingredients'];
  instructions: string[];
  source_url?: string | null;
  created_at: string;
  updated_at: string;
}

function parseRecipe(raw: RawRecipe): Recipe {
  return {
    ...raw,
    source_url: raw.source_url ?? undefined,
    created_at: new Date(raw.created_at),
    updated_at: new Date(raw.updated_at),
  };
}
