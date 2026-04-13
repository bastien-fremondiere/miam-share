// api/_gemini.ts — Server-side Gemini logic shared by analyze + generate functions.
// The GEMINI_API_KEY env var stays on the server — it is NEVER sent to the client.

import { GoogleGenerativeAI, type GenerationConfig, type Part } from '@google/generative-ai';

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

const SYSTEM_INSTRUCTION = `Tu es un nutritionniste professionnel et chef en batch-cooking.
RÈGLE DE LANGUE : Réponds TOUJOURS en français. Le titre, les noms d'ingrédients et les instructions doivent être rédigés en français.
RÈGLE DE SORTIE CRITIQUE : Réponds UNIQUEMENT avec du JSON valide. Pas de markdown, pas de blocs de code, pas de texte libre.
Le JSON DOIT respecter exactement ce schéma — n'ajoute ni ne supprime des champs :
${RECIPE_JSON_SCHEMA}

Chaque ingrédient DOIT inclure un champ "category". Utilise l'une des valeurs suivantes : ${INGREDIENT_CATEGORIES.join(', ')}.
Choisis la catégorie la plus précise pour chaque ingrédient (ex. poulet → viandes, riz → feculents, haricots en boîte → conserves, épices → epicerie, yaourt/skyr → produits-laitiers, légumes frais → fruits-legumes).`;

// ── Public helpers ─────────────────────────────────────────────────────────

/** Extract a structured recipe from a URL or raw text, scaled to 6 portions. */
export async function analyzeRecipeServer(rawText: string): Promise<GeminiRecipe> {
  const config: GenerationConfig = { temperature: 0.2, responseMimeType: 'application/json' };
  const prompt = `Analyse le contenu de recette suivant et extrais une recette structurée.

CONTENU SOURCE :
${rawText}

TÂCHE :
1. Extraire ou déduire le titre de la recette.
2. Adapter TOUTES les quantités d'ingrédients pour EXACTEMENT 6 portions (standard batch cooking).
3. Calculer les macros précises (kcal, protéines, glucides, lipides) par portion.
4. Rédiger des instructions de cuisine claires, étape par étape.`;

  return runGemini([prompt], config);
}

/**
 * Analyze an Instagram URL by extracting the video or image from the post,
 * then sending the media to Gemini alongside any caption text found.
 */
export async function analyzeInstagramServer(url: string): Promise<GeminiRecipe> {
  const config: GenerationConfig = { temperature: 0.2, responseMimeType: 'application/json' };

  const media = await fetchInstagramMedia(url);

  const parts: Part[] = [];

  const textPart = `Analyse ce contenu partagé depuis Instagram et extrais une recette structurée.

URL source : ${url}
${media.caption ? `\nLégende/Description :\n${media.caption}` : ''}

TÂCHE :
1. Extraire ou déduire le titre de la recette à partir du contenu visuel et/ou du texte.
2. Adapter TOUTES les quantités d'ingrédients pour EXACTEMENT 6 portions (standard batch cooking).
3. Calculer les macros précises (kcal, protéines, glucides, lipides) par portion.
4. Rédiger des instructions de cuisine claires, étape par étape.`;

  parts.push({ text: textPart });

  if (media.mediaBase64 && media.mimeType) {
    parts.push({ inlineData: { data: media.mediaBase64, mimeType: media.mimeType } });
  }

  return runGemini(parts, config);
}

/** Generate a brand-new recipe from a natural-language prompt. */
export async function generateRecipeServer(userPrompt: string): Promise<GeminiRecipe> {
  const config: GenerationConfig = { temperature: 0.7, responseMimeType: 'application/json' };
  const prompt = `Génère une recette de batch-cooking complète en réponse à cette demande :

"${userPrompt}"

Exigences :
- EXACTEMENT 6 portions (standard batch cooking)
- Équilibrée niveau macros et adaptée à toute la famille
- Ingrédients accessibles dans un supermarché français
- Calcul précis des macros par portion`;

  return runGemini([prompt], config);
}

// ── Instagram media extraction ─────────────────────────────────────────────

/**
 * Returns true if the URL looks like an Instagram post/reel/story.
 */
export function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|tv|stories)\//.test(url);
}

interface InstagramMedia {
  mediaBase64?: string;
  mimeType?: string;
  caption?: string;
}

/**
 * Attempts to extract video or image media from a public Instagram post.
 * Strategy:
 *  1. Fetch the embed page (less likely to trigger consent wall than the main page)
 *  2. Parse og:video / og:image meta tags + caption from og:description
 *  3. Download whichever media is available and return it as base64
 * Falls back gracefully — if Instagram blocks the request, returns only the caption (if any).
 */
async function fetchInstagramMedia(urlStr: string): Promise<InstagramMedia> {
  // Extract shortcode so we can use the embed URL
  const shortcodeMatch = urlStr.match(/instagram\.com\/(?:p|reel|tv|stories\/[^/]+)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch?.[1];

  // Prefer the /embed/ page — it is lighter and OG tags are usually present
  const fetchUrl = shortcode
    ? `https://www.instagram.com/p/${shortcode}/embed/captioned/`
    : urlStr;

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  };

  let html = '';
  try {
    const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.ok) html = await res.text();
  } catch {
    // Network / timeout — continue with empty HTML (caption-only fallback)
  }

  // Extract metadata from OG / meta tags
  const getOgContent = (prop: string): string | undefined => {
    const m =
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, 'i')) ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, 'i'));
    return m ? decodeHtmlEntities(m[1]) : undefined;
  };

  const caption = getOgContent('description');
  const videoUrl = getOgContent('video:secure_url') ?? getOgContent('video');
  const imageUrl = getOgContent('image');

  // Also try to find an inline video URL embedded in the page JS/JSON
  const inlineVideoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
  const resolvedVideoUrl =
    videoUrl ??
    (inlineVideoMatch?.[1]
      ? inlineVideoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '')
      : undefined);

  // Download media (prefer video, fall back to image)
  const mediaUrl = resolvedVideoUrl ?? imageUrl;
  if (mediaUrl) {
    try {
      const mediaRes = await fetch(mediaUrl, { headers, signal: AbortSignal.timeout(30_000) });
      if (mediaRes.ok) {
        const contentType = mediaRes.headers.get('content-type') ?? (resolvedVideoUrl ? 'video/mp4' : 'image/jpeg');
        // Inline data is limited to ~20 MB; skip if larger to avoid memory issues
        const contentLength = Number(mediaRes.headers.get('content-length') ?? 0);
        if (contentLength === 0 || contentLength <= 20 * 1024 * 1024) {
          const buffer = Buffer.from(await mediaRes.arrayBuffer());
          if (buffer.byteLength <= 20 * 1024 * 1024) {
            return { mediaBase64: buffer.toString('base64'), mimeType: contentType, caption };
          }
        }
      }
    } catch {
      // Download failed — return caption only
    }
  }

  return { caption };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// ── Internal ───────────────────────────────────────────────────────────────

export interface GeminiRecipe {
  title: string;
  portions: 6;
  macros_per_portion: { kcal: number; protein: number; carbs: number; fat: number };
  ingredients: { name: string; quantity: number; unit: string; category?: string }[];
  instructions: string[];
}

async function runGemini(parts: (string | Part)[], config: GenerationConfig): Promise<GeminiRecipe> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: config,
  });

  const result = await model.generateContent(parts);
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
