// services/pdf-export.ts — Generate and share a PDF recipe book
// Uses expo-print (HTML → PDF) + expo-sharing.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Recipe } from '@/types/recipe';

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
        <span class="macro macro-kcal">&#128293; ${escape(recipe.macros_per_portion.kcal)} kcal</span>
        <span class="macro macro-protein">&#128170; ${escape(recipe.macros_per_portion.protein)}g prot</span>
        <span class="macro macro-carbs">&#127838; ${escape(recipe.macros_per_portion.carbs)}g glucides</span>
        <span class="macro macro-fat">&#129361; ${escape(recipe.macros_per_portion.fat)}g lipides</span>
        <span class="macro macro-portions">${escape(recipe.portions)} portions</span>
      </div>
      <div class="section">
        <h3>Ingr&eacute;dients</h3>
        <ul class="ingredients">${ingredientRows}</ul>
      </div>
      <div class="section">
        <h3>Pr&eacute;paration</h3>
        <ol class="instructions">${instructionRows}</ol>
      </div>
      ${recipe.source_url ? `<p class="source">Source&#160;: <em>${escape(recipe.source_url)}</em></p>` : ''}
    </article>`;
}

function buildHtml(recipes: Recipe[], bookTitle: string): string {
  const recipePages = recipes.map(renderRecipeHTML).join('<hr class="separator" />');
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1c1c1e;
      padding: 32px 28px;
      line-height: 1.6;
    }
    .cover { text-align: center; margin-bottom: 48px; }
    .cover h1 { font-size: 36px; color: #E8652A; margin-bottom: 8px; }
    .cover p  { font-size: 14px; color: #8e8e93; }

    .recipe { page-break-inside: avoid; margin-bottom: 32px; }
    h2 { font-size: 22px; color: #2D9B52; margin-bottom: 12px; }
    h3 { font-size: 15px; color: #E8652A; text-transform: uppercase;
         letter-spacing: 0.06em; margin-bottom: 8px; }

    .macros { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .macro {
      padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
      background: #f5ede5; color: #1c1c1e;
    }
    .macro-portions { background: #E8652A; color: #fff; }

    .section { margin-bottom: 14px; }
    ul.ingredients { list-style: disc; padding-left: 18px; }
    ul.ingredients li { font-size: 14px; margin-bottom: 4px; }

    ol.instructions { list-style: none; padding-left: 0; }
    ol.instructions li { display: flex; gap: 10px; font-size: 14px; margin-bottom: 8px; }
    .step-num {
      flex-shrink: 0; width: 24px; height: 24px; background: #E8652A; color: #fff;
      border-radius: 50%; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    .source { font-size: 11px; color: #8e8e93; margin-top: 10px; }
    .separator { border: none; border-top: 2px dashed #e5e5ea; margin: 28px 0; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>&#127869; ${escape(bookTitle)}</h1>
    <p>G&eacute;n&eacute;r&eacute; par Miam Share &bull; ${dateStr} &bull; ${recipes.length} recette${recipes.length > 1 ? 's' : ''}</p>
  </div>
  ${recipePages}
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
