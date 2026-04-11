// context/recipes-context.tsx — Global recipe state with REST polling
// Polls the Vercel backend every 10 s and on app foreground for near-real-time sync.

import {
    addRecipe as apiAdd,
    deleteRecipe as apiDelete,
    updateRecipe as apiUpdate,
    getRecipes,
} from '@/services/api';
import type { Recipe } from '@/types/recipe';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from './auth-context';

const POLL_INTERVAL_MS = 10_000; // 10-second polling for near-real-time family sync

// ── Context types ──────────────────────────────────────────────────────────

interface RecipesContextValue {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  /** Trigger a manual refresh (e.g. after pull-to-refresh) */
  refresh: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false); // prevent concurrent fetches

  const fetchRecipes = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await getRecipes();
      setRecipes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Initial fetch + interval polling + foreground refresh
  useEffect(() => {
    fetchRecipes();
    const interval = setInterval(fetchRecipes, POLL_INTERVAL_MS);
    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') fetchRecipes();
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [fetchRecipes]);

  const addRecipe = useCallback(
    async (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
      const saved = await apiAdd(recipe, accessToken);
      // Optimistically insert at top so the UI feels instant
      setRecipes((prev) => [saved, ...prev]);
      return saved.id!;
    },
    [accessToken],
  );

  const updateRecipe = useCallback(
    async (id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>): Promise<void> => {
      const updated = await apiUpdate(id, updates, accessToken);
      setRecipes((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [accessToken],
  );

  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    await apiDelete(id, accessToken);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, [accessToken]);

  return (
    <RecipesContext.Provider
      value={{
        recipes,
        loading,
        error,
        refresh: fetchRecipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
      }}>
      {children}
    </RecipesContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within <RecipesProvider>');
  return ctx;
}
