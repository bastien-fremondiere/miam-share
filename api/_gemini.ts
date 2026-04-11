// api/_gemini.ts — Server-side Gemini logic shared by analyze + generate functions.
// The GEMINI_API_KEY env var stays on the server — it is NEVER sent to the client.

import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';

// ── Schema injected into every prompt ─────────────────────────────────────

const INGREDIENT_CATEGORIES = [
  'viandes', 'poissons', 'produits-laitiers', 'fruits-legumes',
  'feculents', 'epicerie', 'conserves', 'surgeles', 'autres',
] as const;

const RECIPE_JSON_SCHEMA = `{
  "title": "string",
  "portions": 6,
  "macros_per_portion": { "kcal": number, "protein": number, "carbs": number, "fat": number },
  "ingredients": [{ "name": "string", "quantity": number, "unit": "string", "category": "${INGREDIENT_CATEGORIES.join('" | "')}" }],
  "instructions": ["string"]
}`;

const SYSTEM_INSTRUCTION = `You are a professional nutritionist and batch-cooking chef.
CRITICAL OUTPUT RULE: Respond with ONLY valid JSON. No markdown, no code fences, no prose.
The JSON MUST follow this exact schema — do not add or remove fields:
${RECIPE_JSON_SCHEMA}

Each ingredient MUST include a "category" field. Use one of: ${INGREDIENT_CATEGORIES.join(', ')}.
Pick the most accurate category for each ingredient (e.g. chicken → viandes, rice → feculents, canned beans → conserves, spices → epicerie, yogurt/skyr → produits-laitiers, fresh vegetables → fruits-legumes).`;

// ── Public helpers ─────────────────────────────────────────────────────────

/** Extract a structured recipe from a URL or raw text, scaled to 6 portions. */
export async function analyzeRecipeServer(rawText: string): Promise<GeminiRecipe> {
  const config: GenerationConfig = { temperature: 0.2, responseMimeType: 'application/json' };
  const prompt = `Analyze the following recipe content and extract a structured recipe.

SOURCE CONTENT:
${rawText}

TASK:
1. Extract or infer the recipe title.
2. Scale ALL ingredient quantities to EXACTLY 6 portions (batch cooking standard).
3. Calculate accurate macros (kcal, protein, carbs, fat) per single portion.
4. Write clear, step-by-step cooking instructions.`;

  return runGemini(prompt, config);
}

/** Generate a brand-new recipe from a natural-language prompt. */
export async function generateRecipeServer(userPrompt: string): Promise<GeminiRecipe> {
  const config: GenerationConfig = { temperature: 0.7, responseMimeType: 'application/json' };
  const prompt = `Generate a complete batch-cooking recipe based on this request:

"${userPrompt}"

Requirements:
- EXACTLY 6 portions (batch cooking standard)
- Macro-conscious and family-friendly
- Practical ingredients available in a French supermarket
- Include accurate macro calculations per portion`;

  return runGemini(prompt, config);
}

// ── Internal ───────────────────────────────────────────────────────────────

export interface GeminiRecipe {
  title: string;
  portions: 6;
  macros_per_portion: { kcal: number; protein: number; carbs: number; fat: number };
  ingredients: { name: string; quantity: number; unit: string; category?: string }[];
  instructions: string[];
}

async function runGemini(prompt: string, config: GenerationConfig): Promise<GeminiRecipe> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: config,
  });

  const result = await model.generateContent(prompt);
  return parseAndValidate(result.response.text());
}

function parseAndValidate(text: string): GeminiRecipe {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: GeminiRecipe;
  try {
    parsed = JSON.parse(cleaned) as GeminiRecipe;
  } catch {
    throw new Error('Gemini returned invalid JSON. Please try again.');
  }

  if (
    typeof parsed.title !== 'string' ||
    !parsed.title ||
    !Array.isArray(parsed.ingredients) ||
    !Array.isArray(parsed.instructions) ||
    !parsed.macros_per_portion ||
    typeof parsed.macros_per_portion.kcal !== 'number'
  ) {
    throw new Error('Gemini response is missing required fields. Please try again.');
  }

  parsed.portions = 6;
  return parsed;
}
