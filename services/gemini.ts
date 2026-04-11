// services/gemini.ts — Thin client proxy to the Vercel /api/gemini/* functions.
// The Gemini API key lives ONLY on the server — this file contains no secrets.
// Pass an accessToken (from Google OAuth) to authenticate requests.

import type { GeminiRecipeResponse } from '@/types/recipe';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze raw text or a URL via the Vercel /api/gemini/analyze endpoint.
 */
export async function analyzeRecipe(
  rawText: string,
  accessToken?: string | null,
): Promise<GeminiRecipeResponse> {
  return callGemini('/api/gemini/analyze', { text: rawText }, accessToken);
}

/**
 * Generate new recipe ideas via the Vercel /api/gemini/generate endpoint.
 * Returns `count` distinct recipe suggestions (default 3).
 */
export async function generateRecipeIdeas(
  userPrompt: string,
  count = 3,
  accessToken?: string | null,
): Promise<GeminiRecipeResponse[]> {
  const calls = Array.from({ length: count }, () =>
    callGemini('/api/gemini/generate', { prompt: userPrompt }, accessToken),
  );
  return Promise.all(calls);
}

/**
 * @deprecated Use generateRecipeIdeas instead.
 */
export async function generateRecipeIdea(
  userPrompt: string,
  accessToken?: string | null,
): Promise<GeminiRecipeResponse> {
  return callGemini('/api/gemini/generate', { prompt: userPrompt }, accessToken);
}

// ── Internal ───────────────────────────────────────────────────────────────

async function callGemini(
  path: string,
  body: Record<string, string>,
  accessToken?: string | null,
): Promise<GeminiRecipeResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Erreur serveur Gemini');
  }
  return data as GeminiRecipeResponse;
}
