// services/shopping-list.ts — Aggregate ingredients from recipes into a grouped shopping list.

import type { DayMealPlan, Ingredient, IngredientCategory, Recipe } from '@/types/recipe';

/** A merged shopping list item: same name+unit aggregated */
export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
}

/** Shopping list grouped by category, sorted for display */
export interface GroupedShoppingList {
  category: IngredientCategory;
  label: string;
  items: ShoppingItem[];
}

/** French labels for each category, in display order */
const CATEGORY_CONFIG: { key: IngredientCategory; label: string; emoji: string }[] = [
  { key: 'fruits-legumes', label: 'Fruits & Légumes', emoji: '🥦' },
  { key: 'viandes', label: 'Viandes', emoji: '🥩' },
  { key: 'poissons', label: 'Poissons', emoji: '🐟' },
  { key: 'produits-laitiers', label: 'Produits Laitiers', emoji: '🧀' },
  { key: 'feculents', label: 'Féculents', emoji: '🍚' },
  { key: 'conserves', label: 'Conserves & Bocaux', emoji: '🥫' },
  { key: 'epicerie', label: 'Épicerie', emoji: '🧂' },
  { key: 'surgeles', label: 'Surgelés', emoji: '🧊' },
  { key: 'autres', label: 'Autres', emoji: '🛒' },
];

/** Fallback category inference from ingredient name (for recipes without categories) */
function inferCategory(name: string): IngredientCategory {
  const n = name.toLowerCase();

  // Viandes
  if (/poulet|dinde|bœuf|boeuf|porc|jambon|viande|veau|agneau|canard|lapin|saucisse|lardons|steak/.test(n))
    return 'viandes';

  // Poissons
  if (/poisson|saumon|thon|cabillaud|colin|crevette|moule|sardine|truite|merlu|bar/.test(n))
    return 'poissons';

  // Produits laitiers
  if (/lait|crème|fromage|skyr|yaourt|beurre|mozzarella|parmesan|emmental|gruyère|mascarpone|ricotta|œuf/.test(n))
    return 'produits-laitiers';

  // Féculents
  if (/riz|pâtes|nouille|semoule|quinoa|blé|pain|tortilla|pomme.?de.?terre|patate|lentille|pois.?chiche/.test(n))
    return 'feculents';

  // Conserves
  if (/conserve|égoutté|passata|pulpe|concentré|sauce tomate|tomates? concass|haricots? rouge|maïs/.test(n))
    return 'conserves';

  // Surgelés
  if (/surgelé|congelé/.test(n)) return 'surgeles';

  // Épicerie
  if (/sel|poivre|épice|curry|cumin|paprika|piment|huile|vinaigre|sauce soja|moutarde|herbe|basilic|persil|ciboulette|thym|laurier|origan|gingembre|ail(?! |$)/.test(n))
    return 'epicerie';

  // Fruits & Légumes (broad catch)
  if (/tomate|courgette|brocoli|chou|carotte|oignon|poivron|aubergine|salade|épinard|haricot.?vert|champignon|avocat|concombre|citron|pomme|banane|orange|fraise|légume|fruit/.test(n))
    return 'fruits-legumes';

  return 'autres';
}

/** Normalize ingredient name for merging (lowercase, trim, singular-ish) */
function normalizeKey(name: string, unit: string): string {
  return `${name.toLowerCase().trim()}||${unit.toLowerCase().trim()}`;
}

/**
 * Build an aggregated, categorized shopping list from a set of recipes.
 * Ingredients with the same name+unit are merged (quantities summed).
 */
export function buildShoppingList(recipes: Recipe[]): GroupedShoppingList[] {
  const merged = new Map<string, ShoppingItem>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = normalizeKey(ing.name, ing.unit);
      const existing = merged.get(key);
      const category = ing.category ?? inferCategory(ing.name);
      if (existing) {
        existing.quantity += ing.quantity;
      } else {
        merged.set(key, {
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category,
        });
      }
    }
  }

  // Group by category in display order
  const groups: GroupedShoppingList[] = [];
  for (const { key, label, emoji } of CATEGORY_CONFIG) {
    const items = [...merged.values()]
      .filter((item) => item.category === key)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (items.length > 0) {
      groups.push({ category: key, label: `${emoji} ${label}`, items });
    }
  }

  return groups;
}

/**
 * Build a shopping list from a weekly meal plan.
 * Accounts for batch cooking: each unique recipe in the plan is counted once
 * (since one batch = 6 portions used across multiple days).
 */
export function buildShoppingListFromPlan(plan: DayMealPlan[]): GroupedShoppingList[] {
  const seen = new Set<string>();
  const uniqueRecipes: Recipe[] = [];

  for (const day of plan) {
    if (day.cheat_day) continue;
    for (const recipe of [day.lunch, day.dinner]) {
      const key = recipe.id ?? recipe.title;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipes.push(recipe);
      }
    }
  }

  return buildShoppingList(uniqueRecipes);
}

/** Format a quantity for display (round to 1 decimal if needed) */
export function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(1).replace(/\.0$/, '');
}
