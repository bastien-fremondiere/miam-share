// types/recipe.ts — Core data model for Miam Share

/** Nutritional macros for a single portion */
export interface MacrosPerPortion {
  kcal: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

/** Food categories for shopping list grouping */
export type IngredientCategory =
  | 'viandes'
  | 'poissons'
  | 'produits-laitiers'
  | 'fruits-legumes'
  | 'feculents'
  | 'epicerie'
  | 'conserves'
  | 'surgeles'
  | 'autres';

/** A single ingredient with scaled quantity */
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category?: IngredientCategory;
}

/**
 * Full recipe stored in Firestore.
 * portions is always 6 (batch cooking standard).
 */
export interface Recipe {
  id?: string;
  title: string;
  portions: 6;
  macros_per_portion: MacrosPerPortion;
  ingredients: Ingredient[];
  instructions: string[];
  source_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * What Gemini returns before we add Firestore metadata.
 * Subset of Recipe without db-specific fields.
 */
export type GeminiRecipeResponse = Omit<Recipe, 'id' | 'source_url' | 'created_at' | 'updated_at'>;

/** User-defined macro targets for the weekly planner */
export interface MacroGoals {
  max_kcal_per_day: number;
  min_protein_per_day: number;
  max_carbs_per_day?: number;
  max_fat_per_day?: number;
}

/** A single day's meal assignment in the weekly plan */
export interface DayMealPlan {
  day: number;       // 1–7
  lunch: Recipe;
  dinner: Recipe;
  cheat_day?: boolean; // when true, macros are not counted and meals are hidden
}

/** Full 7-day meal plan */
export type WeeklyPlan = DayMealPlan[];

/** Average macros computed across a WeeklyPlan */
export interface WeeklyMacroSummary {
  avg_kcal: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
}

/** Sort options for the recipe list */
export type RecipeSortKey = 'created_at' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'title';

/** Direction for sort */
export type SortDirection = 'asc' | 'desc';

export interface RecipeFilterOptions {
  sortKey: RecipeSortKey;
  sortDirection: SortDirection;
  maxKcal?: number;
  minProtein?: number;
}
