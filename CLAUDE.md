# CLAUDE.md — Miam Share Developer Reference

> **For AI assistants and developers**: Read this file first before making any changes.
> Update this file whenever you add features, change architecture, or discover important constraints.

---

## Project Overview

**Miam Share** is a family "Batch Cooking & Recipe Planner" React Native app built with Expo.
Primary use case: extract recipes from the web/Instagram via the Android Share menu, store them in Firebase, generate weekly macro-aware meal plans, and export them as PDFs.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 (Expo Router v6) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) |
| Backend API | Vercel Serverless Functions (`api/` folder, Node.js 20) |
| Database | Vercel Postgres (Neon) via `@vercel/postgres` |
| AI Engine | Google Generative AI — Gemini 1.5 Flash (server-side only) |
| PDF | `expo-print` + `expo-sharing` |
| Icons | SF Symbols (iOS) / MaterialIcons (Android/Web) via `@expo/vector-icons` |

---

## Project Structure

```
miam-share/
├── api/                         # Vercel Serverless Functions (Node.js 20)
│   ├── _db.ts                   # Vercel Postgres connection + schema bootstrap
│   ├── _cors.ts                 # CORS headers helper
│   ├── _gemini.ts               # Server-side Gemini logic (API key never sent to client)
│   ├── recipes/
│   │   ├── index.ts             # GET /api/recipes · POST /api/recipes
│   │   └── [id].ts              # GET/PATCH/DELETE /api/recipes/:id
│   └── gemini/
│       ├── analyze.ts           # POST /api/gemini/analyze
│       └── generate.ts          # POST /api/gemini/generate
├── app/
│   ├── _layout.tsx              # Root Stack — wraps RecipesProvider, handles share intent
│   ├── share-handler.tsx        # Modal screen: process incoming share → Gemini → save
│   ├── recipe/
│   │   └── [id].tsx             # Recipe detail (view / delete)
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom Tab navigator (4 tabs)
│       ├── index.tsx            # Recipes list with sort/filter
│       ├── planner.tsx          # Weekly meal planner
│       ├── reflection.tsx       # AI chat (generate recipe ideas)
│       └── export.tsx           # Select recipes → generate PDF
├── services/
│   ├── api.ts                   # HTTP client for Vercel backend (recipe CRUD)
│   ├── gemini.ts                # Thin proxy → /api/gemini/* (no API key on client)
│   ├── meal-planner.ts          # Batch cooking weekly plan algorithm
│   └── pdf-export.ts            # HTML → PDF → expo-sharing
├── context/
│   └── recipes-context.tsx      # React Context: recipe state + 10s polling + AppState refresh
├── hooks/
│   ├── use-share-intent.ts      # Detect incoming share data via expo-linking
│   ├── use-color-scheme.ts      # (existing)
│   └── use-theme-color.ts       # (existing)
├── types/
│   └── recipe.ts                # All TypeScript interfaces (Recipe, Macros, WeeklyPlan…)
├── components/
│   ├── recipe-card.tsx          # Reusable recipe card with macro badges
│   ├── macro-badge.tsx          # Single macro display pill
│   └── ui/
│       └── icon-symbol.tsx      # SF Symbols → MaterialIcons mapping (extended)
├── constants/
│   └── theme.ts                 # Extended color palette + food-app theme
├── vercel.json                  # Vercel deployment config
├── CLAUDE.md                    # ← you are here
├── SECURITY.md                  # Security guidelines
├── .env                         # Local secrets (NEVER commit)
└── .env.example                 # Template for required env vars
```

---

## Environment Variables

### Mobile app (`.env`)

```
EXPO_PUBLIC_API_URL=http://localhost:3000   # or your Vercel deployment URL
```

> **Android emulator**: use `http://10.0.2.2:3000` instead of `localhost`.
> **Physical device**: use your machine's LAN IP, e.g. `http://192.168.1.x:3000`.

### Vercel backend (set in Vercel Dashboard → Settings → Environment Variables)

```
GEMINI_API_KEY        # from https://aistudio.google.com/apikey
POSTGRES_URL          # auto-injected when you add a Vercel Postgres database
POSTGRES_URL_NON_POOLING  # auto-injected by Vercel
```

These are **server-side only** — they never reach the mobile app.

---

## Core Data Model

### `Recipe` (types/recipe.ts)
```typescript
{
  id?: string;              // Firestore document ID
  title: string;
  portions: 6;              // ALWAYS 6 — batch cooking standard
  macros_per_portion: {
    kcal: number;
    protein: number;        // grams
    carbs: number;          // grams
    fat: number;            // grams
  };
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions: string[];
  source_url?: string;      // original URL if shared from browser
  created_at?: Date;
  updated_at?: Date;
}
```

---

## Gemini AI Integration

**Model**: `gemini-1.5-flash`

`responseMimeType: 'application/json'` is set directly in `generationConfig` to force structured JSON output.

### `analyzeRecipe(rawText)`
- Input: URL string or raw text (recipe description / paste from clipboard)
- Output: `GeminiRecipeResponse` (Recipe without id/timestamps)
- Temperature: 0.2 (deterministic extraction)
- Always scales ingredients to 6 portions

### `generateRecipeIdea(userPrompt)`
- Input: natural language prompt (e.g. "High protein chicken dish under 500 kcal")
- Output: `GeminiRecipeResponse` (fully generated recipe)
- Temperature: 0.7 (creative generation)

---

## Backend Architecture (Vercel)

### Database — Vercel Postgres
- Table: `recipes` (UUID PK, JSONB columns for `macros_per_portion`, `ingredients`, `instructions`)
- `ensureSchema()` in `api/_db.ts` bootstraps the table on cold start (idempotent)
- Provisioned via Vercel Dashboard → Storage → Create Database (Postgres)

### Sync strategy
- **Instead of Firestore's `onSnapshot`**, the context polls `GET /api/recipes` every **10 seconds**
- Also re-fetches on `AppState` foreground transition
- Optimistic updates on `addRecipe` / `deleteRecipe` for instant UI feedback

### Gemini API — server-side only
- `GEMINI_API_KEY` lives exclusively in the Vercel environment, never bundled into the app
- `api/_gemini.ts` contains all prompt logic; `services/gemini.ts` is a thin fetch wrapper

---

## Android Share Intent (IMPORTANT)

The app is configured to appear in Android's native Share menu via `intentFilters` in `app.json`.

### What works natively:
- Sharing a **URL** from Chrome/browser → received via `expo-linking`
- Sharing a **URL** from most Android apps → received via `expo-linking`

### Known limitation:
- Sharing **plain text** (e.g., copy-pasting an Instagram caption) sends the text in Android's intent `EXTRA_TEXT` bundle, which is **NOT** accessible via `expo-linking`.
- For full text capture from any source, the app includes a manual paste fallback in `share-handler.tsx`.
- For production: consider adding `react-native-receive-sharing-intent` or a custom Expo config plugin.

### Build requirement:
Intent filters only work in **development builds** (`expo run:android` or EAS Build).
They do **NOT** work in Expo Go.

---

## Weekly Planner Algorithm (meal-planner.ts)

Batch cooking logic:
- Each recipe yields **6 portions**
- 2 meals/day × 3 days = 6 portions consumed per batch
- Week plan = 2 lunch batches + 2 dinner batches → 4-5 distinct recipes cover a full week

Filtering:
- `macros_per_portion.kcal ≤ max_kcal_per_day / 2`
- `macros_per_portion.protein ≥ min_protein_per_day / 2`

---

## Navigation

| Route | Description |
|---|---|
| `/(tabs)/` | Recipe list (home) |
| `/(tabs)/planner` | Weekly planner |
| `/(tabs)/reflection` | AI chat |
| `/(tabs)/export` | PDF export |
| `/recipe/[id]` | Recipe detail (pushed by recipe card tap) |
| `/share-handler` | Modal, opened when app is launched from share intent |

---

## Common Commands

```bash
# Terminal 1 — Start the Vercel API dev server (port 3000)
npm run api        # alias for: vercel dev

# Terminal 2 — Start the Expo app
npx expo start

# Run on Android device/emulator (required for share intent testing)
npx expo run:android

# Run on iOS
npx expo run:ios

# Lint
npx expo lint

# Type check (Expo app only)
npx tsc --noEmit

# Deploy backend to Vercel
vercel deploy
```

### First-time backend setup
1. `npm i -g vercel` then `vercel login`
2. Run `vercel link` in the project root
3. In Vercel Dashboard → Storage → Create → Postgres (Neon)
4. Link it to the project → `POSTGRES_URL` is auto-injected
5. Add `GEMINI_API_KEY` manually in Dashboard → Settings → Environment Variables
6. Run `vercel dev` locally — it pulls env vars automatically

---

## Known TODOs / Future Improvements

- [ ] Add Firebase Authentication (currently uses open Firestore rules)
- [ ] Add image support per recipe (Firebase Storage)
- [ ] Native text capture from share intent (requires custom native module)
- [ ] Recipe search by ingredient
- [ ] Shopping list generation from weekly plan
- [ ] Nutritional goal tracking / progress charts
