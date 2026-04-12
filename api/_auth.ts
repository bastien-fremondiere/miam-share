// api/_auth.ts — Verify Google ID tokens (JWT) server-side.
// Calls Google's tokeninfo endpoint to validate the Bearer token.
// In local dev (no VERCEL env var), auth is skipped for convenience.

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GoogleIdTokenInfo {
  sub: string;
  email: string;
  email_verified: string;
  aud: string;
  iss: string;
  error_description?: string;
}

/**
 * Verify the Authorization header contains a valid Google ID token (JWT).
 * Returns the authenticated user's Google ID (`sub`) and email, or sends a
 * 401 response and returns null.
 *
 * In local dev (when VERCEL env var is not set), auth is bypassed.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ sub: string; email: string } | null> {
  // Skip auth in local development
  if (!process.env.VERCEL) {
    return { sub: 'dev-user', email: 'dev@localhost' };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    // Verify as an ID token (JWT) via Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    const info = (await response.json()) as GoogleIdTokenInfo;

    if (!response.ok || info.error_description) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return null;
    }

    // Check email allowlist if configured
    const allowedEmails = process.env.ALLOWED_EMAILS;
    if (allowedEmails) {
      const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase());
      if (!list.includes(info.email.toLowerCase())) {
        res.status(403).json({ error: 'Unauthorized user' });
        return null;
      }
    }

    return { sub: info.sub, email: info.email };
  } catch {
    res.status(401).json({ error: 'Token verification failed' });
    return null;
  }
}
