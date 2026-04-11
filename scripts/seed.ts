// scripts/seed.ts — inserts fake batch-cooking recipes for local development.
// Safe to re-run: skips seeding when recipes already exist in the database.
// Run with: npx tsx scripts/seed.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

import { ensureSchema, sql } from '../api/_db';

const FAKE_RECIPES = [
  {
    title: 'Poulet Rôti au Citron et Herbes',
    portions: 6,
    macros_per_portion: { kcal: 440, protein: 48, carbs: 5, fat: 23 },
    ingredients: [
      { name: 'Cuisses de poulet', quantity: 1800, unit: 'g' },
      { name: 'Citron', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 6, unit: 'gousse' },
      { name: 'Thym frais', quantity: 4, unit: 'branche' },
      { name: 'Romarin frais', quantity: 2, unit: 'branche' },
      { name: "Huile d'olive", quantity: 3, unit: 'cs' },
      { name: 'Sel', quantity: 1, unit: 'cc' },
      { name: 'Poivre noir', quantity: 0.5, unit: 'cc' },
    ],
    instructions: [
      'Préchauffer le four à 200°C.',
      "Mélanger l'huile d'olive, le jus de citron, l'ail écrasé, le thym et le romarin.",
      'Badigeonner les cuisses de poulet avec la marinade.',
      'Disposer dans un grand plat et enfourner 45 min.',
      'Laisser reposer 10 min avant de diviser en 6 portions.',
      "Conserver au réfrigérateur jusqu'à 4 jours.",
    ],
    source_url: null,
  },
  {
    title: 'Bœuf Mijoté au Vin Rouge',
    portions: 6,
    macros_per_portion: { kcal: 480, protein: 42, carbs: 14, fat: 28 },
    ingredients: [
      { name: 'Bœuf à braiser (paleron)', quantity: 1500, unit: 'g' },
      { name: 'Vin rouge', quantity: 400, unit: 'ml' },
      { name: 'Bouillon de bœuf', quantity: 300, unit: 'ml' },
      { name: 'Carottes', quantity: 3, unit: 'pièce' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 4, unit: 'gousse' },
      { name: 'Concentré de tomates', quantity: 2, unit: 'cs' },
      { name: 'Thym', quantity: 3, unit: 'branche' },
      { name: 'Laurier', quantity: 2, unit: 'feuille' },
      { name: 'Farine', quantity: 2, unit: 'cs' },
    ],
    instructions: [
      'Couper le bœuf en gros cubes, saler et poivrer.',
      "Faire dorer la viande en plusieurs fois dans une cocotte avec un peu d'huile.",
      "Faire revenir l'oignon et l'ail 3 min, ajouter les carottes en rondelles.",
      'Saupoudrer de farine, mélanger 1 min.',
      'Ajouter le vin, le bouillon et le concentré de tomates. Porter à ébullition.',
      'Ajouter les herbes, couvrir et laisser mijoter 2h30 à feu doux.',
      'Répartir en 6 portions. Se congèle très bien.',
    ],
    source_url: null,
  },
  {
    title: 'Saumon en Papillote aux Légumes',
    portions: 6,
    macros_per_portion: { kcal: 380, protein: 38, carbs: 10, fat: 20 },
    ingredients: [
      { name: 'Filet de saumon', quantity: 1200, unit: 'g' },
      { name: 'Courgette', quantity: 3, unit: 'pièce' },
      { name: 'Tomates cerises', quantity: 300, unit: 'g' },
      { name: 'Poivron rouge', quantity: 2, unit: 'pièce' },
      { name: 'Citron', quantity: 2, unit: 'pièce' },
      { name: 'Aneth frais', quantity: 1, unit: 'bouquet' },
      { name: "Huile d'olive", quantity: 3, unit: 'cs' },
      { name: 'Sel et poivre', quantity: 1, unit: 'pincée' },
    ],
    instructions: [
      'Préchauffer le four à 180°C.',
      'Couper les légumes en julienne ou rondelles fines.',
      'Préparer 6 grandes feuilles de papier cuisson.',
      'Sur chaque feuille, poser une portion de légumes, ajouter 200g de saumon.',
      "Arroser d'huile d'olive, ajouter quelques rondelles de citron et de l'aneth.",
      'Fermer les papillotes hermétiquement et enfourner 20 min.',
      'Se conserve 3 jours au réfrigérateur.',
    ],
    source_url: null,
  },
  {
    title: 'Lentilles Corail au Curry et Lait de Coco',
    portions: 6,
    macros_per_portion: { kcal: 360, protein: 22, carbs: 45, fat: 9 },
    ingredients: [
      { name: 'Lentilles corail', quantity: 500, unit: 'g' },
      { name: 'Lait de coco', quantity: 400, unit: 'ml' },
      { name: 'Bouillon de légumes', quantity: 800, unit: 'ml' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 4, unit: 'gousse' },
      { name: 'Gingembre frais', quantity: 20, unit: 'g' },
      { name: 'Curry en poudre', quantity: 2, unit: 'cs' },
      { name: 'Curcuma', quantity: 1, unit: 'cc' },
      { name: 'Cumin', quantity: 1, unit: 'cc' },
      { name: 'Tomates concassées', quantity: 400, unit: 'g' },
      { name: 'Épinards frais', quantity: 200, unit: 'g' },
    ],
    instructions: [
      "Faire revenir l'oignon, l'ail et le gingembre râpé dans un peu d'huile.",
      'Ajouter les épices (curry, curcuma, cumin) et mélanger 1 min.',
      'Ajouter les lentilles rincées, les tomates et le bouillon.',
      'Porter à ébullition puis laisser mijoter 20 min en remuant régulièrement.',
      'Ajouter le lait de coco et les épinards, cuire encore 5 min.',
      "Ajuster l'assaisonnement. Se conserve 5 jours au réfrigérateur.",
    ],
    source_url: null,
  },
  {
    title: 'Gratin de Chou-Fleur Fromager',
    portions: 6,
    macros_per_portion: { kcal: 320, protein: 19, carbs: 20, fat: 17 },
    ingredients: [
      { name: 'Chou-fleur', quantity: 1500, unit: 'g' },
      { name: 'Lait demi-écrémé', quantity: 600, unit: 'ml' },
      { name: 'Gruyère râpé', quantity: 200, unit: 'g' },
      { name: 'Farine', quantity: 40, unit: 'g' },
      { name: 'Beurre', quantity: 40, unit: 'g' },
      { name: 'Noix de muscade', quantity: 0.5, unit: 'cc' },
      { name: 'Jambon blanc', quantity: 200, unit: 'g' },
      { name: 'Chapelure', quantity: 50, unit: 'g' },
    ],
    instructions: [
      "Préchauffer le four à 190°C. Cuire le chou-fleur à la vapeur 10 min (il doit rester ferme).",
      'Préparer une béchamel : faire fondre le beurre, ajouter la farine, mélanger, verser le lait.',
      "Cuire la béchamel à feu moyen 8 min, assaisonner avec sel, poivre et muscade.",
      'Ajouter la moitié du gruyère dans la béchamel, mélanger.',
      'Disposer le chou-fleur et le jambon en dés dans un grand plat.',
      'Napper de béchamel, parsemer du reste de gruyère et de chapelure.',
      "Enfourner 25 min jusqu'à dorure. Se conserve 4 jours.",
    ],
    source_url: null,
  },
  {
    title: 'Tian Provençal aux Herbes',
    portions: 6,
    macros_per_portion: { kcal: 280, protein: 12, carbs: 28, fat: 14 },
    ingredients: [
      { name: 'Courgettes', quantity: 4, unit: 'pièce' },
      { name: 'Tomates', quantity: 4, unit: 'pièce' },
      { name: 'Aubergines', quantity: 2, unit: 'pièce' },
      { name: 'Pommes de terre', quantity: 600, unit: 'g' },
      { name: 'Oignon', quantity: 2, unit: 'pièce' },
      { name: 'Ail', quantity: 6, unit: 'gousse' },
      { name: "Huile d'olive", quantity: 4, unit: 'cs' },
      { name: 'Herbes de Provence', quantity: 2, unit: 'cs' },
      { name: 'Fromage de chèvre frais', quantity: 120, unit: 'g' },
    ],
    instructions: [
      'Préchauffer le four à 180°C.',
      "Couper tous les légumes en rondelles de 5 mm d'épaisseur.",
      "Faire suer l'oignon et l'ail dans l'huile 5 min dans le plat allant au four.",
      'Disposer les rondelles de légumes verticalement en alternant dans le plat.',
      "Arroser d'huile d'olive, parsemer d'herbes de Provence, sel et poivre.",
      'Enfourner 1h15. En fin de cuisson, émietter le chèvre sur le dessus.',
      'Servir chaud ou à température ambiante. Se conserve 4 jours.',
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

  console.log(`🌱 Seeding ${FAKE_RECIPES.length} fake recipes...`);

  for (const recipe of FAKE_RECIPES) {
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

  console.log('\n✨ Database seeded with fake recipes.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
