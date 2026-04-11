// scripts/seed.ts — seeds the database with batch-cooking recipes from recipes.md.
// Safe to re-run: skips seeding when recipes already exist in the database.
// Run with: npx tsx scripts/seed.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { ensureSchema, sql } from '../api/_db';

const RECIPES = [
  // ── 1. Risotto "Light" Poulet & Tomate ──────────────────────────────────
  {
    title: 'Risotto "Light" Poulet & Tomate',
    portions: 6,
    macros_per_portion: { kcal: 500, protein: 52, carbs: 50, fat: 8 },
    ingredients: [
      { name: 'Blancs de poulet', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Riz arborio', quantity: 400, unit: 'g', category: 'feculents' },
      { name: 'Pulpe de tomate', quantity: 800, unit: 'g', category: 'conserves' },
      { name: 'Champignons', quantity: 500, unit: 'g', category: 'fruits-legumes' },
      { name: 'Poivron rouge', quantity: 2, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Oignon', quantity: 1, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Ail', quantity: 2, unit: 'gousse', category: 'epicerie' },
      { name: 'Bouillon de volaille dégraissé', quantity: 1000, unit: 'ml', category: 'epicerie' },
    ],
    instructions: [
      "Faire dorer le poulet coupé en dés avec l'oignon émincé.",
      'Ajouter le riz et le nacrer 2 min en remuant.',
      'Verser la pulpe de tomate et le bouillon louche après louche en remuant régulièrement.',
      'Ajouter les champignons et les poivrons à mi-cuisson.',
      'Cuire environ 18 min jusqu\'à absorption du liquide.',
      'Répartir en 6 portions. Se conserve 4 jours au réfrigérateur.',
    ],
    source_url: null,
  },
  // ── 2. Brandade de Cabillaud "Berserker" ────────────────────────────────
  {
    title: 'Brandade de Cabillaud "Berserker"',
    portions: 6,
    macros_per_portion: { kcal: 380, protein: 48, carbs: 35, fat: 6 },
    ingredients: [
      { name: 'Cabillaud', quantity: 1500, unit: 'g', category: 'poissons' },
      { name: 'Chou-fleur', quantity: 1200, unit: 'g', category: 'fruits-legumes' },
      { name: 'Pommes de terre', quantity: 500, unit: 'g', category: 'feculents' },
      { name: 'Skyr', quantity: 250, unit: 'g', category: 'produits-laitiers' },
      { name: 'Ail', quantity: 3, unit: 'gousse', category: 'epicerie' },
      { name: 'Persil frais', quantity: 1, unit: 'bouquet', category: 'epicerie' },
      { name: 'Citron', quantity: 1, unit: 'pièce', category: 'fruits-legumes' },
    ],
    instructions: [
      'Cuire le chou-fleur et les pommes de terre à la vapeur jusqu\'à tendreté.',
      'Écraser en purée avec le Skyr.',
      'Pocher le cabillaud 8 min dans de l\'eau frémissante puis l\'effilocher.',
      'Mélanger le poisson à la purée.',
      'Assaisonner avec l\'ail pressé, le persil haché et le jus de citron.',
      'Répartir en 6 portions. Se conserve 3 jours au réfrigérateur.',
    ],
    source_url: null,
  },
  // ── 3. Émincé "Fureur de l'Est" (Bœuf & Paprika) ──────────────────────
  {
    title: 'Émincé "Fureur de l\'Est" (Bœuf & Paprika)',
    portions: 6,
    macros_per_portion: { kcal: 500, protein: 54, carbs: 42, fat: 10 },
    ingredients: [
      { name: 'Bœuf haché 5%', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Pommes de terre', quantity: 800, unit: 'g', category: 'feculents' },
      { name: 'Poivron', quantity: 3, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Oignon rouge', quantity: 2, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Concentré de tomate', quantity: 70, unit: 'g', category: 'conserves' },
      { name: 'Paprika fumé', quantity: 2, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Cuire les pommes de terre coupées en cubes à l\'eau ou à la vapeur.',
      'Faire sauter le bœuf avec les oignons émincés et les poivrons en lanières.',
      'Ajouter les pommes de terre cuites, le paprika fumé et le concentré de tomate.',
      'Bien mélanger et cuire 5 min à feu moyen.',
      'Répartir en 6 portions. Se conserve 4 jours au réfrigérateur.',
    ],
    source_url: null,
  },
  // ── 4. Tortilla "Sans-Brique" ───────────────────────────────────────────
  {
    title: 'Tortilla "Sans-Brique"',
    portions: 6,
    macros_per_portion: { kcal: 450, protein: 40, carbs: 45, fat: 11 },
    ingredients: [
      { name: 'Œufs', quantity: 12, unit: 'pièce', category: 'produits-laitiers' },
      { name: 'Skyr', quantity: 400, unit: 'g', category: 'produits-laitiers' },
      { name: 'Jambon de dinde', quantity: 400, unit: 'g', category: 'viandes' },
      { name: 'Pommes de terre', quantity: 900, unit: 'g', category: 'feculents' },
      { name: 'Épinards', quantity: 400, unit: 'g', category: 'fruits-legumes' },
      { name: 'Oignon', quantity: 2, unit: 'pièce', category: 'fruits-legumes' },
    ],
    instructions: [
      'Préchauffer le four à 180°C.',
      'Cuire les pommes de terre en rondelles à l\'eau ou à la vapeur.',
      'Faire fondre les épinards et les oignons émincés à la poêle.',
      'Battre les œufs avec le Skyr, saler et poivrer.',
      'Mélanger tous les ingrédients dans un grand plat : pommes de terre, épinards, oignons et dinde coupée en dés.',
      'Verser le mélange œufs-Skyr par-dessus.',
      'Cuire 35 min à 180°C. Laisser refroidir avant de couper en 6 parts.',
    ],
    source_url: null,
  },
  // ── 5. Curry "Red Line" (Poulet & Brocoli) ─────────────────────────────
  {
    title: 'Curry "Red Line" (Poulet & Brocoli)',
    portions: 6,
    macros_per_portion: { kcal: 460, protein: 38, carbs: 48, fat: 11 },
    ingredients: [
      { name: 'Poulet', quantity: 900, unit: 'g', category: 'viandes' },
      { name: 'Poivron', quantity: 3, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Brocoli', quantity: 500, unit: 'g', category: 'fruits-legumes' },
      { name: 'Lait de coco light', quantity: 600, unit: 'ml', category: 'epicerie' },
      { name: 'Pâte de curry rouge', quantity: 3, unit: 'cs', category: 'epicerie' },
      { name: 'Nouilles de riz', quantity: 300, unit: 'g', category: 'feculents' },
    ],
    instructions: [
      'Saisir le poulet coupé en morceaux à feu vif.',
      'Ajouter les poivrons en lanières et les bouquets de brocoli.',
      'Verser le lait de coco et la pâte de curry rouge. Mélanger.',
      'Laisser mijoter 10 min à couvert.',
      'Cuire les nouilles de riz à part selon les instructions du paquet.',
      'Mélanger les nouilles au curry. Répartir en 6 portions.',
    ],
    source_url: null,
  },
  // ── 6. Chili "Nouveau Monde" (Bœuf & Courgettes) ──────────────────────
  {
    title: 'Chili "Nouveau Monde" (Bœuf & Courgettes)',
    portions: 6,
    macros_per_portion: { kcal: 490, protein: 42, carbs: 52, fat: 12 },
    ingredients: [
      { name: 'Bœuf haché 5%', quantity: 900, unit: 'g', category: 'viandes' },
      { name: 'Courgette', quantity: 4, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Poivron', quantity: 3, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Pulpe de tomate', quantity: 1200, unit: 'g', category: 'conserves' },
      { name: 'Haricots rouges (égouttés)', quantity: 1200, unit: 'g', category: 'conserves' },
      { name: 'Maïs (égoutté)', quantity: 600, unit: 'g', category: 'conserves' },
      { name: 'Cumin', quantity: 2, unit: 'cc', category: 'epicerie' },
      { name: 'Piment', quantity: 1, unit: 'cc', category: 'epicerie' },
    ],
    instructions: [
      'Faire revenir le bœuf haché dans une grande cocotte.',
      'Ajouter les courgettes en dés et les poivrons en morceaux.',
      'Verser la pulpe de tomate, les haricots rouges et le maïs.',
      'Assaisonner avec le cumin et le piment. Saler et poivrer.',
      'Laisser mijoter 30 min à feu doux en remuant de temps en temps.',
      'Répartir en 6 portions. Se congèle très bien.',
    ],
    source_url: null,
  },
  // ── 7. Quiche "L'Océan" (Thon & Courgettes) ───────────────────────────
  {
    title: 'Quiche "L\'Océan" (Thon & Courgettes)',
    portions: 6,
    macros_per_portion: { kcal: 370, protein: 48, carbs: 12, fat: 14 },
    ingredients: [
      { name: 'Œufs', quantity: 12, unit: 'pièce', category: 'produits-laitiers' },
      { name: 'Skyr', quantity: 500, unit: 'g', category: 'produits-laitiers' },
      { name: 'Thon en conserve (égoutté)', quantity: 420, unit: 'g', category: 'conserves' },
      { name: 'Courgette râpée', quantity: 4, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Tomates cerises', quantity: 300, unit: 'g', category: 'fruits-legumes' },
    ],
    instructions: [
      'Préchauffer le four à 180°C.',
      'Râper les courgettes et bien les essorer dans un torchon.',
      'Battre les œufs avec le Skyr, saler et poivrer.',
      'Ajouter le thon émietté et les courgettes essorées au mélange.',
      'Verser dans un grand plat graissé et disposer les tomates cerises coupées en deux sur le dessus.',
      'Cuire 35 min à 180°C jusqu\'à dorure.',
      'Laisser tiédir, couper en 6 parts. Se conserve 4 jours.',
    ],
    source_url: null,
  },
  // ── 8. Dinde "Des Montagnes" ────────────────────────────────────────────
  {
    title: 'Dinde "Des Montagnes"',
    portions: 6,
    macros_per_portion: { kcal: 430, protein: 41, carbs: 42, fat: 9 },
    ingredients: [
      { name: 'Dinde', quantity: 900, unit: 'g', category: 'viandes' },
      { name: 'Champignons', quantity: 500, unit: 'g', category: 'fruits-legumes' },
      { name: 'Haricots verts', quantity: 600, unit: 'g', category: 'fruits-legumes' },
      { name: 'Pommes de terre', quantity: 1000, unit: 'g', category: 'feculents' },
      { name: 'Skyr', quantity: 500, unit: 'g', category: 'produits-laitiers' },
      { name: 'Moutarde à l\'ancienne', quantity: 4, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Faire dorer la dinde coupée en émincés dans une poêle.',
      'Ajouter les champignons tranchés et les haricots verts.',
      'Cuire les pommes de terre à part et les ajouter au plat.',
      'Lier la sauce avec le Skyr et la moutarde à l\'ancienne.',
      'Bien mélanger et laisser mijoter 5 min.',
      'Répartir en 6 portions. Se conserve 4 jours.',
    ],
    source_url: null,
  },
  // ── 9. Curry Poulet Riz ─────────────────────────────────────────────────
  {
    title: 'Curry Poulet Riz',
    portions: 6,
    macros_per_portion: { kcal: 435, protein: 53, carbs: 38, fat: 5 },
    ingredients: [
      { name: 'Poulet', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Oignon', quantity: 2, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Ail', quantity: 3, unit: 'gousse', category: 'epicerie' },
      { name: 'Gingembre frais', quantity: 15, unit: 'g', category: 'epicerie' },
      { name: 'Curry en poudre', quantity: 2, unit: 'cs', category: 'epicerie' },
      { name: 'Sauce tomate', quantity: 400, unit: 'g', category: 'conserves' },
      { name: 'Skyr', quantity: 400, unit: 'g', category: 'produits-laitiers' },
      { name: 'Riz basmati', quantity: 300, unit: 'g', category: 'feculents' },
    ],
    instructions: [
      'Saisir le poulet coupé en morceaux avec les oignons émincés.',
      'Ajouter l\'ail pressé, le gingembre râpé et le curry en poudre.',
      'Verser la sauce tomate et laisser mijoter 15 min.',
      'Hors du feu, incorporer le Skyr pour obtenir une sauce crémeuse.',
      'Cuire le riz basmati à part.',
      'Servir le curry sur le riz. Répartir en 6 portions.',
    ],
    source_url: null,
  },
  // ── 10. Pâtes Bolo 50/50 ───────────────────────────────────────────────
  {
    title: 'Pâtes Bolo 50/50',
    portions: 6,
    macros_per_portion: { kcal: 460, protein: 38, carbs: 48, fat: 8 },
    ingredients: [
      { name: 'Bœuf haché 5%', quantity: 800, unit: 'g', category: 'viandes' },
      { name: 'Carottes', quantity: 800, unit: 'g', category: 'fruits-legumes' },
      { name: 'Oignon', quantity: 2, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Passata', quantity: 500, unit: 'g', category: 'conserves' },
      { name: 'Pâtes complètes', quantity: 400, unit: 'g', category: 'feculents' },
    ],
    instructions: [
      'Faire revenir le bœuf haché avec les oignons émincés.',
      'Ajouter les carottes râpées et la passata.',
      'Laisser mijoter 20 min à feu doux.',
      'Cuire les pâtes complètes à part.',
      'Mélanger la sauce aux pâtes. Répartir en 6 portions.',
    ],
    source_url: null,
  },
  // ── 12. Chili Con Pollo ─────────────────────────────────────────────────
  {
    title: 'Chili Con Pollo',
    portions: 6,
    macros_per_portion: { kcal: 480, protein: 45, carbs: 50, fat: 9 },
    ingredients: [
      { name: 'Poulet', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Haricots rouges (égouttés)', quantity: 800, unit: 'g', category: 'conserves' },
      { name: 'Tomates concassées', quantity: 800, unit: 'g', category: 'conserves' },
      { name: 'Poivron', quantity: 3, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Riz', quantity: 300, unit: 'g', category: 'feculents' },
      { name: 'Épices chili', quantity: 2, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Cuire le poulet coupé en dés avec les poivrons en morceaux.',
      'Ajouter les haricots rouges et les tomates concassées.',
      'Assaisonner avec les épices chili, saler et poivrer.',
      'Laisser mijoter 20 min.',
      'Cuire le riz à part et servir avec le chili.',
      'Répartir en 6 portions. Se congèle très bien.',
    ],
    source_url: null,
  },
  // ── 13. Dinde Curry-Lentilles ───────────────────────────────────────────
  {
    title: 'Dinde Curry-Lentilles',
    portions: 6,
    macros_per_portion: { kcal: 440, protein: 42, carbs: 45, fat: 10 },
    ingredients: [
      { name: 'Dinde', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Lentilles corail', quantity: 500, unit: 'g', category: 'feculents' },
      { name: 'Chou-fleur', quantity: 1, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Lait de coco light', quantity: 400, unit: 'ml', category: 'epicerie' },
      { name: 'Curry en poudre', quantity: 2, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Faire dorer la dinde coupée en morceaux.',
      'Ajouter les lentilles corail rincées et le chou-fleur en bouquets.',
      'Verser le lait de coco et saupoudrer de curry.',
      'Couvrir et laisser mijoter jusqu\'à cuisson complète des lentilles (~20 min).',
      'Ajuster l\'assaisonnement. Répartir en 6 portions.',
    ],
    source_url: null,
  },
  // ── 14. Colin aux Haricots Verts ────────────────────────────────────────
  {
    title: 'Colin aux Haricots Verts',
    portions: 6,
    macros_per_portion: { kcal: 320, protein: 40, carbs: 25, fat: 7 },
    ingredients: [
      { name: 'Poisson blanc (colin)', quantity: 1200, unit: 'g', category: 'poissons' },
      { name: 'Haricots verts', quantity: 1000, unit: 'g', category: 'fruits-legumes' },
      { name: 'Courgette', quantity: 1000, unit: 'g', category: 'fruits-legumes' },
      { name: 'Tomates cerises', quantity: 500, unit: 'g', category: 'fruits-legumes' },
      { name: 'Ail', quantity: 3, unit: 'gousse', category: 'epicerie' },
      { name: 'Basilic frais', quantity: 1, unit: 'bouquet', category: 'epicerie' },
      { name: "Huile d'olive", quantity: 2, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Cuire le poisson au four ou à la poêle avec un filet d\'huile d\'olive.',
      'Faire sauter les haricots verts et les courgettes en rondelles à la poêle.',
      'Ajouter l\'ail émincé et les tomates cerises coupées en deux.',
      'Assaisonner avec le basilic, sel et poivre.',
      'Servir le poisson sur le lit de légumes. Répartir en 6 portions.',
    ],
    source_url: null,
  },
  // ── 15. Bœuf Kung Fu & Brocolis ────────────────────────────────────────
  {
    title: 'Bœuf Kung Fu & Brocolis',
    portions: 6,
    macros_per_portion: { kcal: 350, protein: 45, carbs: 20, fat: 9 },
    ingredients: [
      { name: 'Bœuf haché 5%', quantity: 1200, unit: 'g', category: 'viandes' },
      { name: 'Brocoli', quantity: 1500, unit: 'g', category: 'fruits-legumes' },
      { name: 'Oignon rouge', quantity: 3, unit: 'pièce', category: 'fruits-legumes' },
      { name: 'Sauce soja', quantity: 6, unit: 'cs', category: 'epicerie' },
    ],
    instructions: [
      'Saisir le bœuf à feu vif dans un wok ou une grande poêle.',
      'Ajouter les oignons rouges émincés et faire revenir 3 min.',
      'Ajouter les bouquets de brocoli et la sauce soja.',
      'Cuire 8-10 min en remuant jusqu\'à ce que le brocoli soit tendre-croquant.',
      'Répartir en 6 portions. Se conserve 4 jours.',
    ],
    source_url: null,
  },
  // ── 16. Mini-Wraps "Sushi Style" ───────────────────────────────────────
  {
    title: 'Mini-Wraps "Sushi Style"',
    portions: 6,
    macros_per_portion: { kcal: 150, protein: 12, carbs: 18, fat: 4 },
    ingredients: [
      { name: 'Tortillas', quantity: 6, unit: 'pièce', category: 'feculents' },
      { name: 'Bœuf émincé ou poulet satay', quantity: 600, unit: 'g', category: 'viandes' },
      { name: 'Fromage frais 0%', quantity: 200, unit: 'g', category: 'produits-laitiers' },
      { name: 'Gingembre frais', quantity: 10, unit: 'g', category: 'epicerie' },
    ],
    instructions: [
      'Cuire la viande avec le gingembre râpé et assaisonner.',
      'Tartiner chaque tortilla de fromage frais 0%.',
      'Répartir la viande sur les tortillas.',
      'Rouler serré et couper en tronçons de 3-4 cm.',
      'Servir froid ou tiède. Se conserve 2 jours au réfrigérateur.',
    ],
    source_url: null,
  },
];

async function seed() {
  await ensureSchema();

  const { rows } = await sql`SELECT COUNT(*) AS count FROM recipes`;
  const count = Number((rows[0] as Record<string, unknown>).count);

  if (count > 0) {
    console.log(`ℹ️  Database already has ${count} recipe(s) — skipping seed.`);
    process.exit(0);
  }

  console.log(`🌱 Seeding ${RECIPES.length} recipes...`);

  for (const recipe of RECIPES) {
    await sql`
      INSERT INTO recipes (title, portions, macros_per_portion, ingredients, instructions, source_url)
      VALUES (
        ${recipe.title},
        ${recipe.portions},
        ${JSON.stringify(recipe.macros_per_portion)}::jsonb,
        ${JSON.stringify(recipe.ingredients)}::jsonb,
        ${JSON.stringify(recipe.instructions)}::jsonb,
        ${recipe.source_url}
      )
    `;
    console.log(`  ✅ ${recipe.title}`);
  }

  console.log('\n✨ Database seeded with recipes.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
