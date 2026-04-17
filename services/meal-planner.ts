// services/meal-planner.ts — Batch cooking weekly plan generation algorithm
// See CLAUDE.md "Weekly Planner Algorithm" for design rationale.

import type { BatchPlan, MacroGoals, Recipe, WeeklyMacroSummary, WeeklyPlan } from '@/types/recipe';

/**
 * Generate a 7-day batch-cooking meal plan.
 *
 * Batch logic:
 *   - Each recipe yields 6 portions
 *   - 2 meals/day × 3 days = 6 portions consumed per batch
 *   - Week needs: 2 lunch batches (days 1-3, days 4-6) + 2 dinner batches
 *   - Day 7 (Sunday) is always a free/cheat day
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
  const batch: BatchPlan = {
    batch1Lunch: pool[0]!,
    batch1Dinner: pool[2] ?? pool[0]!,
    batch2Lunch: pool[1] ?? pool[0]!,
    batch2Dinner: pool[3] ?? pool[1] ?? pool[0]!,
  };

  return batchPlanToWeeklyPlan(batch);
}

/**
 * Convert 4 batch slots into a full 7-day WeeklyPlan.
 * Days 1-3 use batch 1, days 4-6 use batch 2, day 7 is always a free/cheat day.
 */
export function batchPlanToWeeklyPlan(batch: BatchPlan): WeeklyPlan {
  const plan: WeeklyPlan = [];
  for (let day = 1; day <= 7; day++) {
    if (day === 7) {
      // Sunday is always a free day — use batch2 recipes as placeholders
      plan.push({
        day,
        lunch: batch.batch2Lunch,
        dinner: batch.batch2Dinner,
        cheat_day: true,
      });
    } else {
      const useBatch1 = day <= 3;
      plan.push({
        day,
        lunch: useBatch1 ? batch.batch1Lunch : batch.batch2Lunch,
        dinner: useBatch1 ? batch.batch1Dinner : batch.batch2Dinner,
      });
    }
  }
  return plan;
}

/**
 * Compute average daily macros across a weekly plan, excluding cheat days.
 */
export function calculateWeeklyMacroSummary(plan: WeeklyPlan): WeeklyMacroSummary {
  const activeDays = plan.filter((d) => !d.cheat_day);
  if (activeDays.length === 0) {
    return { avg_kcal: 0, avg_protein: 0, avg_carbs: 0, avg_fat: 0 };
  }

  const totals = activeDays.reduce(
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

  const days = activeDays.length;
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
