# SECURITY.md — Miam Share Security Guidelines

> Read this before deploying or modifying any service configuration.

---

## API Key Management

### Rules
1. **NEVER** commit `.env` to version control. It is in `.gitignore`.
2. All secrets use the `EXPO_PUBLIC_` prefix for Expo's build system.
3. Firebase API keys are restricted by **Android/iOS app signature** in the Google Cloud Console.
4. Gemini API key must be **restricted to Generative Language API only** in Google Cloud Console.

### Environment Variables
```
EXPO_PUBLIC_FIREBASE_API_KEY       # Restricted via HTTP referrers / app check
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_GEMINI_API_KEY         # Restricted to Generative Language API
```

### Note on Client-Side Secrets
Firebase API keys are designed to be public. Security is enforced through **Firestore Security Rules**, not key secrecy.
Gemini API keys incur costs — implement rate limiting and monitor usage in Google Cloud Console.

---

## Firestore Security Rules

Deploy these rules to Firebase Console → Firestore → Rules before going to production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary: allow all reads/writes during development
    // REPLACE with authenticated rules before production:
    match /recipes/{recipeId} {
      // Production rule (requires Firebase Auth):
      // allow read, write: if request.auth != null;
      
      // Development rule (open access — NOT for production):
      allow read, write: if true;
    }
  }
}
```

**Before going to production**, implement Firebase Authentication and replace `allow read, write: if true` with `allow read, write: if request.auth != null`.

---

## Input Validation

### Gemini Service (services/gemini.ts)
- All user input sent to Gemini is wrapped in a constrained prompt with explicit JSON schema.
- `responseMimeType: 'application/json'` prevents Gemini from executing injected instructions as code.
- `parseGeminiResponse()` validates required fields after parsing — invalid structure throws an error.
- **Prompt injection risk**: User-controlled text is passed as data context, not as instructions. The system prompt establishes the role before user input is included.

### Firebase Service
- All data written to Firestore comes from Gemini's parsed + validated response.
- No raw user input is written directly to Firestore without validation.
- TypeScript strict mode ensures type safety at compile time.

### Share Intent Handler
- The URL received from the Android share intent is treated as untrusted input.
- It is displayed to the user for review before being sent to Gemini.
- URLs are not fetched directly by the app — Gemini handles content analysis.

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
| A01 Broken Access Control | ⚠️ Dev | Open Firestore rules in dev — see Rules above |
| A02 Cryptographic Failures | ✅ | No sensitive data stored; HTTPS enforced by Firebase |
| A03 Injection | ✅ | Gemini prompts use data context pattern; JSON schema enforced |
| A04 Insecure Design | ✅ | Minimal attack surface; no server component |
| A05 Security Misconfiguration | ⚠️ | Firebase rules must be tightened before production |
| A06 Vulnerable Components | ✅ | Keep `expo`, `firebase`, `@google/generative-ai` updated |
| A07 Auth Failures | ⚠️ | No auth in MVP; add Firebase Auth before multi-user production |
| A08 Software/Data Integrity | ✅ | Dependencies pinned in package.json |
| A09 Logging/Monitoring | ✅ | No sensitive data logged; use Firebase Crashlytics in prod |
| A10 SSRF | N/A | No server-side HTTP requests from the app |
