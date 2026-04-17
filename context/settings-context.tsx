// context/settings-context.tsx — Persistent user preferences for Miam Share
// Stored in AsyncStorage so settings survive app restarts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AppSettings {
  /** Maximum daily calorie budget used by the planner (kcal). Default: 1000. */
  max_kcal_per_day: number;
  /** Minimum daily protein target used by the planner (g). Default: 100. */
  min_protein_per_day: number;
  /** Number of portions per batch recipe. Always 6 — batch cooking standard. */
  portions_per_batch: 6;
}

const DEFAULT_SETTINGS: AppSettings = {
  max_kcal_per_day: 1000,
  min_protein_per_day: 100,
  portions_per_batch: 6,
};

const STORAGE_KEY = '@miam_share:settings';

interface SettingsContextValue {
  settings: AppSettings;
  /** Merge partial updates into the current settings and persist them. */
  updateSettings: (updates: Partial<Omit<AppSettings, 'portions_per_batch'>>) => Promise<void>;
  /** Reset all settings to their factory defaults. */
  resetSettings: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Partial<AppSettings>;
            setSettings({ ...DEFAULT_SETTINGS, ...parsed, portions_per_batch: 6 });
          } catch {
            // Corrupted data — fall back to defaults
          }
        }
      })
      .catch(() => {
        // AsyncStorage unavailable — silently use defaults
      });
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<AppSettings, 'portions_per_batch'>>) => {
      const next: AppSettings = { ...settings, ...updates, portions_per_batch: 6 };
      setSettings(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore write failures — in-memory state is still updated
      }
    },
    [settings],
  );

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}
