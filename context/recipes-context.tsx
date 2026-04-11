// context/recipes-context.tsx — Global real-time recipe state via Firestore
// Provides recipe data and CRUD actions throughout the app.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  subscribeToRecipes,
  addRecipe as fbAddRecipe,
  deleteRecipe as fbDeleteRecipe,
  updateRecipe as fbUpdateRecipe,
} from '@/services/firebase';
import type { Recipe } from '@/types/recipe';

// ── Context types ──────────────────────────────────────────────────────────

interface RecipesContextValue {
  /** All saved recipes, synced in real-time from Firestore */
  recipes: Recipe[];
  /** True while the initial Firestore subscription is loading */
  loading: boolean;
  /** Error message if the Firestore subscription fails */
  error: string | null;
  /** Add a new recipe and return the Firestore document ID */
  addRecipe: (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  /** Update fields of an existing recipe by ID */
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>) => Promise<void>;
  /** Permanently delete a recipe by ID */
  deleteRecipe: (id: string) => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firestore real-time updates on mount
  useEffect(() => {
    const unsubscribe = subscribeToRecipes(
      (updated) => {
        setRecipes(updated);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const addRecipe = useCallback(
    (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => fbAddRecipe(recipe),
    [],
  );

  const updateRecipe = useCallback(
    (id: string, updates: Partial<Omit<Recipe, 'id' | 'created_at'>>) =>
      fbUpdateRecipe(id, updates),
    [],
  );

  const deleteRecipe = useCallback((id: string) => fbDeleteRecipe(id), []);

  return (
    <RecipesContext.Provider
      value={{ recipes, loading, error, addRecipe, updateRecipe, deleteRecipe }}>
      {children}
    </RecipesContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Access global recipe state and actions.
 * Must be used inside a <RecipesProvider>.
 */
export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) {
    throw new Error('useRecipes must be used within <RecipesProvider>');
  }
  return ctx;
}
