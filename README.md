# 🍽️ Miam Share

A family **Batch Cooking & Recipe Planner** mobile app built with React Native and Expo. Extract recipes from the web via Android's Share menu, store them in a Postgres database, generate macro-aware weekly meal plans with Gemini AI, and export them as branded PDFs.

---

## Features

- **Recipe Extraction** — Share a URL from any browser or app on Android; Gemini AI extracts the recipe, scales ingredients to 6 portions, and computes macros automatically.
- **Manual Recipe Input** — Paste raw text or a recipe description and let AI structure it for you.
- **AI Recipe Ideas** — Describe what you want ("high protein chicken dish under 500 kcal") and get a fully generated recipe.
- **Macro Tracking** — Every recipe displays kcal, protein, carbs, and fat per portion.
- **Weekly Meal Planner** — Generates a 7-day batch cooking plan (2 meals/day) that respects your calorie and protein goals.
- **PDF Export** — Select recipes and export a branded, print-ready PDF with cover page, two-column layout, and macro badges.
- **Shopping List** — Aggregated ingredient list grouped by food category from your weekly plan.
- **Google Sign-In** — Native Google authentication protects write operations (add, edit, delete recipes).
- **Sort & Filter** — Sort recipes by creation date, title, or any macro; filter by max kcal / min protein.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 (Expo Router v6) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based routing) |
| Backend API | Vercel Serverless Functions (`api/` folder, Node.js 20) |
| Database | Vercel Postgres (Neon) via `@vercel/postgres` |
| AI Engine | Google Generative AI — Gemini 1.5 Flash (server-side only) |
| Authentication | `@react-native-google-signin/google-signin` + server-side idToken verification |
| PDF | `expo-print` + `expo-sharing` |
| Icons | SF Symbols (iOS) / MaterialIcons (Android/Web) via `@expo/vector-icons` |
| Builds | EAS Build (development / preview / production profiles) |

---

## Project Structure

```
miam-share/
├── api/                         # Vercel Serverless Functions
│   ├── _auth.ts                 # Google idToken verification middleware
│   ├── _cors.ts                 # CORS headers helper
│   ├── _db.ts                   # Postgres connection + schema bootstrap
│   ├── _gemini.ts               # Server-side Gemini prompt logic
│   ├── recipes/
│   │   ├── index.ts             # GET /api/recipes · POST /api/recipes
│   │   └── [id].ts              # GET/PATCH/DELETE /api/recipes/:id
│   └── gemini/
│       ├── analyze.ts           # POST /api/gemini/analyze
│       └── generate.ts          # POST /api/gemini/generate
├── app/                         # Expo Router screens
│   ├── _layout.tsx              # Root Stack (wraps providers, handles share intent)
│   ├── share-handler.tsx        # Modal: process incoming share → Gemini → save
│   ├── recipe/
│   │   └── [id].tsx             # Recipe detail (view / edit / delete)
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom Tab navigator (4 tabs)
│       ├── index.tsx            # Recipes list with sort/filter
│       ├── planner.tsx          # Weekly meal planner
│       ├── reflection.tsx       # AI chat (generate recipe ideas)
│       └── export.tsx           # Select recipes → generate PDF
├── services/
│   ├── api.ts                   # HTTP client for Vercel backend
│   ├── gemini.ts                # Thin proxy to /api/gemini/*
│   ├── meal-planner.ts          # Batch cooking weekly plan algorithm
│   ├── pdf-export.ts            # HTML → PDF → expo-sharing
│   └── shopping-list.ts         # Aggregate ingredients by category
├── context/
│   ├── auth-context.tsx         # Google Sign-In state + idToken management
│   └── recipes-context.tsx      # Recipe state + 10s polling + optimistic updates
├── hooks/
│   ├── use-share-intent.ts      # Detect incoming share data via expo-linking
│   └── use-require-auth.ts      # Soft auth prompt for write actions
├── types/
│   └── recipe.ts                # All TypeScript interfaces
├── components/
│   ├── recipe-card.tsx          # Recipe card with macro badges
│   ├── macro-badge.tsx          # Single macro display pill
│   └── ui/
│       └── icon-symbol.tsx      # Cross-platform icon mapping
├── constants/
│   └── theme.ts                 # Color palette + food-app theme
├── scripts/
│   └── seed.ts                  # Database seed script (15 recipes)
├── eas.json                     # EAS Build profiles
├── vercel.json                  # Vercel deployment config
└── .env.example                 # Template for required env vars
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Android Studio** (for Android emulator) or a physical Android device
- **Vercel CLI** (`npm i -g vercel`)
- **EAS CLI** (`npm i -g eas-cli`) — for building APK/AAB
- A **Google Cloud** project with OAuth 2.0 credentials
- A **Gemini API key** from [AI Studio](https://aistudio.google.com/apikey)

### 1. Clone & Install

```bash
git clone git@github.com:bastien-fremondiere/miam-share.git
cd miam-share
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend URL. Use `http://10.0.2.2:3000` for Android emulator, LAN IP for physical device |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web client ID (used for idToken exchange) |
| `ANDROID_HOME` | Path to your Android SDK |

Server-side variables (set in **Vercel Dashboard → Settings → Environment Variables**):

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Generative AI key |
| `POSTGRES_URL` | Auto-injected when you add a Vercel Postgres database |

### 3. Set Up the Backend

```bash
# Link your Vercel project (first time only)
vercel login
vercel link

# In Vercel Dashboard → Storage → Create → Postgres (Neon)
# Link it to the project — POSTGRES_URL is auto-injected

# Add your Gemini API key
# Vercel Dashboard → Settings → Environment Variables → GEMINI_API_KEY

# Start the local API server (pulls env vars from Vercel)
npm run api
```

### 4. Seed the Database (Optional)

```bash
# Pull Vercel env vars locally
vercel env pull .env.vercel

# Seed with 15 sample recipes
DB_BACKEND=postgres npx tsx --env-file=.env.vercel scripts/seed.ts
```

### 5. Run the App

```bash
# Terminal 1 — API server
npm run api

# Terminal 2 — Expo dev server
npx expo start

# Or run directly on Android (required for share intent)
npx expo run:android
```

> **Note**: Android share intent filters only work in **development builds**, not in Expo Go.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Credentials
2. Configure OAuth consent screen → External → add test users
3. Create an **Android** OAuth 2.0 client:
   - Package name: `fr.ohana.miam_share`
   - SHA-1 fingerprint (debug): 
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
4. Create a **Web** OAuth 2.0 client (needed for idToken exchange)
5. Add the client IDs to your `.env` file or EAS secrets

---

## EAS Build

Three build profiles are configured in `eas.json`:

| Profile | Output | Use Case |
|---|---|---|
| `development` | Debug APK | Local testing with dev client |
| `preview` | Release APK | Internal testing / QA |
| `production` | AAB | Google Play Store submission |

```bash
# Set EAS env vars (once per environment)
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://your-app.vercel.app
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <your-id>
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <your-id>

# Build
npm run build:android:dev       # development APK
npm run build:android:preview   # preview APK
npm run build:android            # production AAB
```

---

## API Endpoints

All endpoints are served from `/api/` via Vercel Serverless Functions.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/recipes` | No | List all recipes |
| `GET` | `/api/recipes/:id` | No | Get a single recipe |
| `POST` | `/api/recipes` | **Yes** | Create a recipe |
| `PATCH` | `/api/recipes/:id` | **Yes** | Update a recipe |
| `DELETE` | `/api/recipes/:id` | **Yes** | Delete a recipe |
| `POST` | `/api/gemini/analyze` | **Yes** | Extract recipe from URL or text |
| `POST` | `/api/gemini/generate` | **Yes** | Generate recipe from prompt |

**Auth** = `Authorization: Bearer <google-idToken>` header required. The server verifies the token against Google's tokeninfo endpoint.

---

## Batch Cooking Logic

The weekly planner is designed around batch cooking principles:

- Each recipe always yields **6 portions**
- 2 meals/day × 3 days = 6 portions consumed per batch
- A full week = 2 lunch batches + 2 dinner batches → **4–5 distinct recipes**
- Recipes are filtered by user-defined macro goals (max kcal, min protein per day)

---

## Data Model

```typescript
interface Recipe {
  id?: string;
  title: string;
  portions: 6;                    // Always 6 (batch cooking standard)
  macros_per_portion: {
    kcal: number;
    protein: number;              // grams
    carbs: number;                // grams
    fat: number;                  // grams
  };
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category?: IngredientCategory; // For shopping list grouping
  }>;
  instructions: string[];
  source_url?: string;            // Original URL if shared from browser
  created_at?: Date;
  updated_at?: Date;
}
```

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run api` | `vercel dev` | Start the Vercel API dev server on port 3000 |
| `npm start` | `expo start` | Start the Expo dev server |
| `npm run android` | `expo run:android` | Build and run on Android device/emulator |
| `npm run ios` | `expo run:ios` | Build and run on iOS |
| `npm run dev` | `bash dev.sh` | Start both API + Expo with env propagation |
| `npm run lint` | `expo lint` | Run ESLint |
| `npm run build:android:dev` | EAS Build | Debug APK for local testing |
| `npm run build:android:preview` | EAS Build | Release APK for internal testing |
| `npm run build:android` | EAS Build | Production AAB for Google Play |

---

## Architecture Decisions

- **Server-side AI only** — The Gemini API key never leaves the Vercel backend. The mobile app calls `/api/gemini/*` endpoints through a thin fetch wrapper.
- **Polling over WebSockets** — The recipe context polls `GET /api/recipes` every 10 seconds and on `AppState` foreground transitions. Simpler than maintaining a WebSocket connection for a family-scale app.
- **Optimistic updates** — `addRecipe` and `deleteRecipe` update local state immediately before the server responds, then reconcile on the next poll.
- **Native Google Sign-In** — Uses `@react-native-google-signin/google-signin` for a seamless native sign-in flow (no browser redirect). Server verifies the idToken JWT.

---

## License

Private project — All rights reserved.
