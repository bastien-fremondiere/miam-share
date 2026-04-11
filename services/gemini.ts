// services/gemini.ts — Google Generative AI recipe extraction & generation
// See CLAUDE.md for prompt strategy notes and SECURITY.md for injection mitigations.

import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import type { GeminiRecipeResponse } from '@/types/recipe';

// ── Setup ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

/** JSON schema description injected into every prompt to enforce structure. */
const RECIPE_JSON_SCHEMA = `{
  "title": "string",
  "portions": 6,
  "macros_per_portion": {
    "kcal": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "string" }
  ],
  "instructions": ["string", "string", "..."]
}`;

const STRICT_JSON_SYSTEM_INSTRUCTION = `You are a professional nutritionist and batch-cooking chef.
CRITICAL OUTPUT RULE: Respond with ONLY valid JSON. No markdown, no code fences, no prose.
The JSON MUST follow this exact schema — do not add or remove fields:
${RECIPE_JSON_SCHEMA}`;

const extractionConfig: GenerationConfig = {
  temperature: 0.2,
  responseMimeType: 'application/json',
};

const generationConfig: GenerationConfig = {
  temperature: 0.7,
  responseMimeType: 'application/json',
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze raw text or a URL and extract a structured recipe scaled to 6 portions.
 *
 * @param rawText - URL, pasted recipe text, or Instagram caption
 * @returns Validated GeminiRecipeResponse with 6-portion scaling
 * @throws If the API key is missing or the response cannot be parsed
 */
export async function analyzeRecipe(rawText: string): Promise<GeminiRecipeResponse> {
  if (!API_KEY) throw new Error('Gemini API key is not configured. Check your .env file.');

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: STRICT_JSON_SYSTEM_INSTRUCTION,
    generationConfig: extractionConfig,
  });

  const prompt = `Analyze the following recipe content and extract a structured recipe.

SOURCE CONTENT:
${rawText}

TASK:
1. Extract or infer the recipe title.
2. Scale ALL ingredient quantities to EXACTLY 6 portions (batch cooking standard).
3. Calculate accurate macros (kcal, protein, carbs, fat) per single portion.
4. Write clear, numbered step-by-step cooking instructions.
5. If the content is a URL, use all available context to infer the recipe.`;

  const result = await model.generateContent(prompt);
  return parseAndValidate(result.response.text());
}

/**
 * Generate a new recipe idea from a natural-language prompt.
 *
 * @param userPrompt - e.g. "High protein chicken dish under 500 kcal"
 * @returns A fully generated GeminiRecipeResponse
 * @throws If the API key is missing or generation fails
 */
export async function generateRecipeIdea(userPrompt: string): Promise<GeminiRecipeResponse> {
  if (!API_KEY) throw new Error('Gemini API key is not configured. Check your .env file.');

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: STRICT_JSON_SYSTEM_INSTRUCTION,
    generationConfig: generationConfig,
  });

  const prompt = `Generate a complete batch-cooking recipe based on this request:

"${userPrompt}"

Requirements:
- Optimized for batch cooking: EXACTLY 6 portions
- Macro-conscious and family-friendly
- Practical ingredients available in a French supermarket
- Include accurate macro calculations per portion`;

  const result = await model.generateContent(prompt);
  return parseAndValidate(result.response.text());
}

// ── Internal helpers ───────────────────────────────────────────────────────

function parseAndValidate(text: string): GeminiRecipeResponse {
  // Safety net: strip markdown code fences if model ignores responseMimeType
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: GeminiRecipeResponse;
  try {
    parsed = JSON.parse(cleaned) as GeminiRecipeResponse;
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  // Validate required fields
  if (
    typeof parsed.title !== 'string' ||
    !parsed.title ||
    !Array.isArray(parsed.ingredients) ||
    !Array.isArray(parsed.instructions) ||
    !parsed.macros_per_portion ||
    typeof parsed.macros_per_portion.kcal !== 'number'
  ) {
    throw new Error('AI response is missing required recipe fields. Please try again.');
  }

  // Enforce portions = 6
  parsed.portions = 6;

  return parsed;
}
