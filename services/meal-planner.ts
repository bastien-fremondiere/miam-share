// services/meal-planner.ts — Batch cooking weekly plan generation algorithm
// See CLAUDE.md "Weekly Planner Algorithm" for design rationale.

import type { MacroGoals, Recipe, WeeklyMacroSummary, WeeklyPlan } from '@/types/recipe';

/**
 * Generate a 7-day batch-cooking meal plan.
 *
 * Batch logic:
 *   - Each recipe yields 6 portions
 *   - 2 meals/day × 3 days = 6 portions consumed per batch
 *   - Week needs: 2 lunch batches (days 1-3, days 4-6) + 2 dinner batches
 *   - Day 7 reuses the first batches (last portions)
 *
 * @param recipes  - All available recipes from Firestore
 * @param goals    - User macro goals (kcal + protein constraints)
 * @throws If fewer than 2 recipes match the macro goals
 */
export function generateWeeklyPlan(recipes: Recipe[], goals: MacroGoals): WeeklyPlan {
  const maxKcalPerMeal = goals.max_kcal_per_day / 2;
  const minProteinPerMeal = goals.min_protein_per_day / 2;

  // Filter recipes whose macros satisfy one-meal targets
  const eligible = recipes.filter((r) => {
    const { kcal, protein } = r.macros_per_portion;
    const kcalOk = kcal <= maxKcalPerMeal;
    const proteinOk = protein >= minProteinPerMeal;
    return kcalOk && proteinOk;
  });

  if (eligible.length === 0) {
    throw new Error(
      'Aucune recette ne correspond à vos objectifs. Essayez d\'assouplir vos critères.',
    );
  }

  if (eligible.length < 2) {
    throw new Error(
      `Seulement ${eligible.length} recette correspond à vos objectifs. Ajoutez plus de recettes pour varier les menus.`,
    );
  }

  // Shuffle to produce a different plan each time
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  // Pick up to 4 distinct recipes for the 4 batch slots
  // lunchA (days 1-3), lunchB (days 4-6), dinnerA (days 1-3), dinnerB (days 4-6)
  const pool = shuffled.slice(0, Math.min(4, shuffled.length));
  const getLunch = (batchIndex: 0 | 1): Recipe => pool[batchIndex] ?? pool[0]!;
  const getDinner = (batchIndex: 0 | 1): Recipe =>
    pool[batchIndex + 2] ?? pool[batchIndex] ?? pool[0]!;

  const plan: WeeklyPlan = [];
  for (let day = 1; day <= 7; day++) {
    // Days 1-3: batch 0 | Days 4-6: batch 1 | Day 7: reuse batch 0 last portions
    const batchIndex: 0 | 1 = day <= 3 || day === 7 ? 0 : 1;
    plan.push({
      day,
      lunch: getLunch(batchIndex),
      dinner: getDinner(batchIndex),
    });
  }

  return plan;
}

/**
 * Compute average daily macros across a weekly plan.
 */
export function calculateWeeklyMacroSummary(plan: WeeklyPlan): WeeklyMacroSummary {
  const totals = plan.reduce(
    (acc, day) => {
      const l = day.lunch.macros_per_portion;
      const d = day.dinner.macros_per_portion;
      return {
        kcal: acc.kcal + l.kcal + d.kcal,
        protein: acc.protein + l.protein + d.protein,
        carbs: acc.carbs + l.carbs + d.carbs,
        fat: acc.fat + l.fat + d.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const days = plan.length;
  return {
    avg_kcal: Math.round(totals.kcal / days),
    avg_protein: Math.round(totals.protein / days),
    avg_carbs: Math.round(totals.carbs / days),
    avg_fat: Math.round(totals.fat / days),
  };
}

/** Day names in French for display */
export const DAY_NAMES: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};
