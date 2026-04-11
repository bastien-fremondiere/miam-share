// services/gemini.ts — Thin client proxy to the Vercel /api/gemini/* functions.
// The Gemini API key lives ONLY on the server — this file contains no secrets.

import type { GeminiRecipeResponse } from '@/types/recipe';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze raw text or a URL via the Vercel /api/gemini/analyze endpoint.
 * Returns a structured recipe scaled to 6 portions.
 */
export async function analyzeRecipe(rawText: string): Promise<GeminiRecipeResponse> {
  return callGemini('/api/gemini/analyze', { text: rawText });
}

/**
 * Generate a new recipe idea via the Vercel /api/gemini/generate endpoint.
 * @param userPrompt - e.g. "High protein chicken dish under 500 kcal"
 */
export async function generateRecipeIdea(userPrompt: string): Promise<GeminiRecipeResponse> {
  return callGemini('/api/gemini/generate', { prompt: userPrompt });
}

// ── Internal ───────────────────────────────────────────────────────────────

async function callGemini(
  path: string,
  body: Record<string, string>,
): Promise<GeminiRecipeResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Erreur serveur Gemini');
  }
  return data as GeminiRecipeResponse;
}
