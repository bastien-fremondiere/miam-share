// services/pdf-export.ts — Generate and share a PDF recipe book or weekly menu
// Uses expo-print (HTML → PDF) + expo-sharing.

import type { DayMealPlan, Recipe } from '@/types/recipe';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LOGO_BASE64 } from './_logo-base64';
import {
    buildShoppingList,
    buildShoppingListFromPlan,
    formatQty,
    type GroupedShoppingList,
} from './shopping-list';

// ── HTML templates ─────────────────────────────────────────────────────────

/** Escape HTML entities to prevent XSS in generated PDF content. */
function escape(text: string | number): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRecipeHTML(recipe: Recipe): string {
  const ingredientRows = recipe.ingredients
    .map((ing) => `<li>${escape(ing.quantity)} ${escape(ing.unit)} — ${escape(ing.name)}</li>`)
    .join('');

  const instructionRows = recipe.instructions
    .map((step, i) => `<li><span class="step-num">${i + 1}</span>${escape(step)}</li>`)
    .join('');

  return `
    <article class="recipe">
      <h2>${escape(recipe.title)}</h2>
      <div class="macros">
        <span class="macro macro-kcal">${escape(recipe.macros_per_portion.kcal)} kcal</span>
        <span class="macro macro-protein">${escape(recipe.macros_per_portion.protein)}g prot</span>
        <span class="macro macro-carbs">${escape(recipe.macros_per_portion.carbs)}g glucides</span>
        <span class="macro macro-fat">${escape(recipe.macros_per_portion.fat)}g lipides</span>
        <span class="macro macro-portions">${escape(recipe.portions)} portions</span>
      </div>
      <div class="two-col">
        <div class="col-left">
          <h3>Ingr&eacute;dients</h3>
          <ul class="ingredients">${ingredientRows}</ul>
        </div>
        <div class="col-right">
          <h3>Pr&eacute;paration</h3>
          <ol class="instructions">${instructionRows}</ol>
        </div>
      </div>
      ${recipe.source_url ? `<p class="source">Source&#160;: <em>${escape(recipe.source_url)}</em></p>` : ''}
    </article>`;
}

/** Render a shopping list section as HTML */
function renderShoppingListHTML(groups: GroupedShoppingList[]): string {
  if (groups.length === 0) return '';

  const sections = groups.map((g) => {
    const items = g.items
      .map((item) => `<li>${escape(formatQty(item.quantity))} ${escape(item.unit)} — ${escape(item.name)}</li>`)
      .join('');
    return `
      <div class="shop-group">
        <h3 class="shop-cat">${escape(g.label)}</h3>
        <ul class="shop-items">${items}</ul>
      </div>`;
  }).join('');

  return `
    <div class="shopping-list">
      <h2 class="shop-title">&#128722; Liste de courses</h2>
      ${sections}
    </div>`;
}

/** CSS for the shopping list section */
const SHOPPING_LIST_CSS = `
    .shopping-list { page-break-before: always; margin-top: 32px; }
    .shop-title { font-size: 22px; color: #E8652A; margin-bottom: 18px; }
    .shop-group { margin-bottom: 16px; }
    .shop-cat { font-size: 14px; color: #2D9B52; text-transform: uppercase;
                letter-spacing: 0.05em; margin-bottom: 6px; border-bottom: 1px solid #e5e5ea; padding-bottom: 4px; }
    .shop-items { list-style: none; padding-left: 0; columns: 2; column-gap: 24px; }
    .shop-items li { font-size: 13px; margin-bottom: 4px; padding-left: 16px; position: relative; break-inside: avoid; }
    .shop-items li::before { content: '☐'; position: absolute; left: 0; color: #8e8e93; }
`;

function buildHtml(recipes: Recipe[], bookTitle: string): string {
  const recipePages = recipes.map(renderRecipeHTML).join('<hr class="separator" />');
  const shoppingListHtml = renderShoppingListHTML(buildShoppingList(recipes));
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1c1c1e;
      line-height: 1.6;
    }

    /* ── Cover ───────────────────────────────────────────── */
    .cover {
      text-align: center;
      padding: 60px 20px 48px;
      border-bottom: 3px solid #2D9B52;
      margin-bottom: 40px;
    }
    .cover img {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
    }
    .cover h1 {
      font-size: 32px;
      color: #2D9B52;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .cover .subtitle {
      font-size: 13px;
      color: #8e8e93;
    }
    .cover .recipe-count {
      display: inline-block;
      margin-top: 16px;
      padding: 6px 18px;
      background: #2D9B52;
      color: #fff;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
    }

    /* ── Recipes ─────────────────────────────────────────── */
    .recipe { page-break-inside: avoid; margin-bottom: 36px; }
    h2 {
      font-size: 20px;
      color: #2D9B52;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e5e5ea;
    }
    h3 {
      font-size: 13px;
      color: #E8652A;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .macros {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 18px;
    }
    .macro {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .macro-kcal     { background: #E8652A; color: #fff; }
    .macro-protein  { background: #2D9B52; color: #fff; }
    .macro-carbs    { background: #F5A623; color: #fff; }
    .macro-fat      { background: #8E6BBF; color: #fff; }
    .macro-portions { background: #f0f0f0; color: #1c1c1e; }

    .two-col { display: flex; gap: 28px; }
    .two-col > .col-left  { flex: 1; }
    .two-col > .col-right { flex: 1.4; }

    .section { margin-bottom: 14px; }
    ul.ingredients { list-style: none; padding-left: 0; }
    ul.ingredients li {
      font-size: 12px;
      margin-bottom: 4px;
      padding: 3px 0;
      border-bottom: 1px dotted #e5e5ea;
    }

    ol.instructions { list-style: none; padding-left: 0; }
    ol.instructions li {
      display: flex;
      gap: 10px;
      font-size: 12px;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .step-num {
      flex-shrink: 0;
      width: 22px; height: 22px;
      background: #E8652A;
      color: #fff;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .source { font-size: 10px; color: #8e8e93; margin-top: 8px; }
    .separator { border: none; border-top: 2px dashed #e5e5ea; margin: 32px 0; }

    /* ── Footer ──────────────────────────────────────────── */
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 2px solid #2D9B52;
      margin-top: 40px;
      font-size: 11px;
      color: #8e8e93;
    }
    .footer img { width: 24px; height: 24px; vertical-align: middle; margin-right: 6px; }

    ${SHOPPING_LIST_CSS}
  </style>
</head>
<body>
  <div class="cover">
    <img src="${LOGO_BASE64}" alt="Miam Share" />
    <h1>${escape(bookTitle)}</h1>
    <p class="subtitle">G&eacute;n&eacute;r&eacute; par Miam Share &bull; ${dateStr}</p>
    <span class="recipe-count">${recipes.length} recette${recipes.length > 1 ? 's' : ''}</span>
  </div>
  ${recipePages}
  ${shoppingListHtml}
  <div class="footer">
    <img src="${LOGO_BASE64}" alt="" />Miam Share &mdash; Batch Cooking & Meal Planner
  </div>
</body>
</html>`;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF recipe book and open the native share sheet.
 *
 * @param recipes   - List of Recipe objects to include
 * @param bookTitle - Title displayed on the cover page
 */
export async function exportRecipesPDF(
  recipes: Recipe[],
  bookTitle = 'Mon Livre de Recettes',
): Promise<void> {
  if (recipes.length === 0) {
    throw new Error('Sélectionnez au moins une recette à exporter.');
  }

  const html = buildHtml(recipes, bookTitle);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Partager le livre de recettes',
    UTI: 'com.adobe.pdf',
  });
}

// ── Weekly plan PDF ────────────────────────────────────────────────────────

const FRENCH_DAY_NAMES: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
};

function buildWeeklyPlanHtml(plan: DayMealPlan[]): string {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const shoppingGroups = buildShoppingListFromPlan(plan);
  const shoppingHtml = renderShoppingListHTML(shoppingGroups);

  const rows = plan.map((day) => {
    if (day.cheat_day) {
      return `
        <tr class="cheat-row">
          <td class="day-cell">${escape(FRENCH_DAY_NAMES[day.day] ?? `Jour ${day.day}`)}</td>
          <td colspan="2" class="cheat-cell">🎉 Jour libre — pas de batch cooking</td>
        </tr>`;
    }
    return `
      <tr>
        <td class="day-cell">${escape(FRENCH_DAY_NAMES[day.day] ?? `Jour ${day.day}`)}</td>
        <td class="meal-cell">
          <strong>${escape(day.lunch.title)}</strong><br/>
          <span class="macro-hint">${escape(day.lunch.macros_per_portion.kcal)} kcal · ${escape(day.lunch.macros_per_portion.protein)}g prot</span>
        </td>
        <td class="meal-cell">
          <strong>${escape(day.dinner.title)}</strong><br/>
          <span class="macro-hint">${escape(day.dinner.macros_per_portion.kcal)} kcal · ${escape(day.dinner.macros_per_portion.protein)}g prot</span>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { margin: 20mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1c1e; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .header img { width: 40px; height: 40px; }
    h1 { font-size: 26px; color: #2D9B52; }
    .subtitle { font-size: 12px; color: #8e8e93; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
    th { background: #2D9B52; color: #fff; padding: 10px 14px; font-size: 12px;
         text-transform: uppercase; letter-spacing: 0.05em; text-align: left; }
    td { padding: 12px 14px; border-bottom: 1px solid #e5e5ea; vertical-align: top; }
    .day-cell { font-weight: 700; font-size: 13px; color: #2D9B52; width: 90px; }
    .meal-cell { font-size: 12px; }
    .meal-cell strong { color: #1c1c1e; }
    .macro-hint { font-size: 10px; color: #8e8e93; }
    .cheat-row .cheat-cell { font-size: 13px; color: #8E6BBF; font-style: italic; }
    tr:nth-child(even) { background: #fafafa; }
    .footer {
      text-align: center; padding-top: 20px; border-top: 2px solid #2D9B52;
      margin-top: 32px; font-size: 11px; color: #8e8e93;
    }
    .footer img { width: 20px; height: 20px; vertical-align: middle; margin-right: 4px; }
    ${SHOPPING_LIST_CSS}
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_BASE64}" alt="Miam Share" />
    <h1>Planning Batch Cooking</h1>
  </div>
  <p class="subtitle">G&eacute;n&eacute;r&eacute; par Miam Share &bull; ${dateStr}</p>
  <table>
    <thead>
      <tr>
        <th>Jour</th>
        <th>&#9728;&#65039; D&eacute;jeuner</th>
        <th>&#127769; D&icirc;ner</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${shoppingHtml}
  <div class="footer">
    <img src="${LOGO_BASE64}" alt="" />Miam Share &mdash; Batch Cooking & Meal Planner
  </div>
</body>
</html>`;
}

/**
 * Generate a PDF of the weekly meal plan and open the native share sheet.
 */
export async function exportWeeklyPlanPDF(plan: DayMealPlan[]): Promise<void> {
  if (plan.length === 0) throw new Error('Le planning est vide.');

  const html = buildWeeklyPlanHtml(plan);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Le partage n\'est pas disponible sur cet appareil.');

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Partager le planning de la semaine',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Build a plain-text version of the plan suitable for sharing to Google Keep / clipboard.
 */
export function buildWeeklyPlanText(plan: DayMealPlan[]): string {
  const lines = ['🍽️ Planning Batch Cooking — Miam Share\n'];
  for (const day of plan) {
    const name = FRENCH_DAY_NAMES[day.day] ?? `Jour ${day.day}`;
    if (day.cheat_day) {
      lines.push(`${name}: 🎉 Jour libre`);
    } else {
      lines.push(`${name}:`);
      lines.push(`  ☀️ ${day.lunch.title} (${day.lunch.macros_per_portion.kcal} kcal · ${day.lunch.macros_per_portion.protein}g prot)`);
      lines.push(`  🌙 ${day.dinner.title} (${day.dinner.macros_per_portion.kcal} kcal · ${day.dinner.macros_per_portion.protein}g prot)`);
    }
  }

  // Shopping list
  const groups = buildShoppingListFromPlan(plan);
  if (groups.length > 0) {
    lines.push('\n🛒 Liste de courses\n');
    for (const group of groups) {
      lines.push(`${group.label}`);
      for (const item of group.items) {
        lines.push(`  ☐ ${formatQty(item.quantity)} ${item.unit} — ${item.name}`);
      }
    }
  }

  return lines.join('\n');
}

