// context/auth-context.tsx — Google Sign-In via @react-native-google-signin
//
// Uses the native Google Sign-In SDK which avoids browser redirect issues.
//
// Google Console setup:
//   Android client: Package fr.ohana.miam_share + SHA-1 fingerprint
//   Web client: needed for serverAuthCode / idToken exchange
//
// .env variables:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — web client ID (required for idToken)

import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Configure once ─────────────────────────────────────────────────────────

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextValue {
  user: GoogleUser | null;
  accessToken: string | null;
  /** Get a fresh idToken (refreshes automatically if expired) */
  getFreshToken: () => Promise<string | null>;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session silently on mount
  useEffect(() => {
    (async () => {
      try {
        const currentUser = GoogleSignin.getCurrentUser();
        if (currentUser) {
          const { user: u } = currentUser;
          setUser({ id: u.id, email: u.email, name: u.name ?? '', picture: u.photo ?? undefined });
          // Get a fresh idToken (cached one may be expired)
          const { idToken } = await GoogleSignin.getTokens();
          setAccessToken(idToken ?? null);
        }
      } catch {
        // No previous session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { user: u, idToken } = response.data;
        setUser({ id: u.id, email: u.email, name: u.name ?? '', picture: u.photo ?? undefined });
        setAccessToken(idToken ?? null);
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
      }
      console.error('[Auth] Sign-in error:', error);
    }
  }, []);

  /** Always returns a fresh idToken by calling getTokens() which auto-refreshes */
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const currentUser = GoogleSignin.getCurrentUser();
      if (!currentUser) return null;
      const { idToken } = await GoogleSignin.getTokens();
      setAccessToken(idToken ?? null);
      return idToken ?? null;
    } catch {
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, getFreshToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
