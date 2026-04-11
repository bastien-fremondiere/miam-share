# SECURITY.md — Miam Share Security Guidelines

> Read this before deploying or modifying any service configuration.

---

## API Key Management

### Rules
1. **NEVER** commit `.env` to version control. It is in `.gitignore`.
2. The mobile app exposes **only one** env var: `EXPO_PUBLIC_API_URL` (the Vercel URL — not a secret).
3. `GEMINI_API_KEY` lives **exclusively** on the Vercel server. It is never bundled into the mobile app and never prefixed with `EXPO_PUBLIC_`.
4. Gemini API key should be restricted to **Generative Language API only** in Google Cloud Console.

### Client Environment Variables (mobile app)
```
EXPO_PUBLIC_API_URL    # URL of your Vercel deployment — not a secret
```

### Server Environment Variables (Vercel Dashboard only — never in git)
```
GEMINI_API_KEY         # Restricted to Generative Language API
POSTGRES_URL           # Auto-injected by Vercel when Postgres DB is linked
POSTGRES_URL_NON_POOLING  # Auto-injected by Vercel
```

### Note on API Security
Unlike Firebase (where the API key is client-visible and security relies on Firestore rules), the Vercel architecture keeps all secrets server-side. The database is only reachable from Vercel's private network — there is no way for a client to query Postgres directly.

---

## Vercel Postgres Security

- The Postgres database is accessible **only** from Vercel's serverless functions via the private connection string. It is not exposed to the public internet.
- All queries in `api/recipes/` use `@vercel/postgres`'s tagged template literals (`sql\`...\``), which provide **parameterised queries** and prevent SQL injection by design.
- `ensureSchema()` uses `CREATE TABLE IF NOT EXISTS` — idempotent and safe on every cold start.
- PATCH uses a fetch-then-replace pattern to avoid dynamic SQL construction.

---

## Input Validation

### Gemini Service (api/_gemini.ts — server-side)
- All user input sent to Gemini is wrapped in a constrained prompt with explicit JSON schema.
- `responseMimeType: 'application/json'` prevents Gemini from executing injected instructions as code.
- `parseAndValidate()` strips code fences, validates required fields after parsing, and enforces `portions = 6`.
- **Prompt injection risk**: User-controlled text is passed as data context, not as instructions. The system prompt establishes the role before user input is included.

### API Endpoints (api/recipes/)
- All data written to Postgres comes from Gemini's parsed + validated response.
- No raw user input is written directly to the database without validation.
- TypeScript strict mode ensures type safety at compile time.

### Share Intent Handler
- The URL received from the Android share intent is treated as untrusted input.
- It is displayed to the user for review before being sent to the Vercel Gemini endpoint.
- URLs are not fetched directly by the app — the Gemini server handles content analysis.

---

## PDF Export Security
- PDF is generated from HTML using `expo-print`. HTML is constructed by `pdf-export.ts`.
- Recipe data is inserted using string interpolation into HTML.
- **XSS risk**: Recipe titles and instruction text from Gemini could contain HTML entities.
  - Mitigation: All text content is inserted inside HTML text nodes (not innerHTML via JS), and `expo-print` renders server-side without executing scripts.
  - Recommendation: Add HTML entity escaping in `pdf-export.ts` for defense in depth.

---

## OWASP Top 10 Checklist

| Risk | Status | Notes |
|---|---|---|
| A01 Broken Access Control | ⚠️ Dev | No auth in MVP; add authentication before multi-user production |
| A02 Cryptographic Failures | ✅ | No sensitive data stored; HTTPS enforced by Vercel |
| A03 Injection | ✅ | SQL via parameterised template literals; Gemini uses data context pattern |
| A04 Insecure Design | ✅ | API key isolated server-side; Postgres not publicly reachable |
| A05 Security Misconfiguration | ✅ | No open DB rules; secrets managed via Vercel Dashboard |
| A06 Vulnerable Components | ✅ | Keep `expo`, `@vercel/postgres`, `@google/generative-ai` updated |
| A07 Auth Failures | ⚠️ | No auth in MVP; add auth middleware to Vercel functions for production |
| A08 Software/Data Integrity | ✅ | Dependencies pinned in package.json |
| A09 Logging/Monitoring | ✅ | No sensitive data logged; use Vercel observability in prod |
| A10 SSRF | ✅ | Vercel functions do not forward user-supplied URLs as server requests |
