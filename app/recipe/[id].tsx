// app/recipe/[id].tsx — Full recipe detail view

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, deleteRecipe } = useRecipes();
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const recipe = recipes.find((r) => r.id === id);
  const [deleting, setDeleting] = useState(false);

  if (!recipe) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <IconSymbol name="exclamationmark.triangle" size={40} color={Brand.danger} />
        <Text style={[styles.notFoundText, { color: colors.text }]}>Recette introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Brand.primary, fontWeight: '600' }}>← Retour</Text>
        </Pressable>
      </View>
    );
  }

  const handleDelete = () => {
    requireAuth(() => {
      Alert.alert(
        'Supprimer la recette',
        `Êtes-vous sûr de vouloir supprimer "${recipe.title}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              setDeleting(true);
              try {
                await deleteRecipe(recipe.id!);
                router.back();
              } catch (err) {
                Alert.alert('Erreur', 'Impossible de supprimer la recette.');
                setDeleting(false);
              }
            },
          },
        ],
      );
    });
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>

      {/* Macros */}
      <View style={[styles.macrosCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.macroCardTitle, { color: colors.textSecondary }]}>
          Macros par portion
        </Text>
        <View style={styles.macroRow}>
          <MacroBadge
            label="kcal"
            value={recipe.macros_per_portion.kcal}
            unit=""
            color={Brand.primary}
          />
          <MacroBadge
            label="protéines"
            value={recipe.macros_per_portion.protein}
            unit="g"
            color={Brand.secondary}
          />
          <MacroBadge
            label="glucides"
            value={recipe.macros_per_portion.carbs}
            unit="g"
            color={Brand.accent}
          />
          <MacroBadge
            label="lipides"
            value={recipe.macros_per_portion.fat}
            unit="g"
            color="#8E6BBF"
          />
        </View>
        <View style={[styles.portionsBanner, { backgroundColor: Brand.primary + '18' }]}>
          <Text style={[styles.portionsBannerText, { color: Brand.primary }]}>
            🍱 Recette pour {recipe.portions} portions — idéal pour 3 jours de batch cooking
          </Text>
        </View>
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🧺 Ingrédients ({recipe.ingredients.length})
        </Text>
        {recipe.ingredients.map((ing, i) => (
          <View
            key={i}
            style={[
              styles.ingredientRow,
              { borderBottomColor: colors.border },
              i === recipe.ingredients.length - 1 && styles.lastRow,
            ]}>
            <View style={[styles.bullet, { backgroundColor: Brand.primary }]} />
            <Text style={[styles.ingredientText, { color: colors.text }]}>
              <Text style={styles.ingredientQty}>
                {ing.quantity} {ing.unit}{' '}
              </Text>
              {ing.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          👨‍🍳 Préparation ({recipe.instructions.length} étapes)
        </Text>
        {recipe.instructions.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: Brand.primary }]}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Source URL */}
      {recipe.source_url && (
        <Pressable
          onPress={() => Linking.openURL(recipe.source_url!)}
          style={[styles.sourceBtn, { borderColor: colors.border }]}>
          <IconSymbol name="link" size={16} color={Brand.primary} />
          <Text style={[styles.sourceText, { color: Brand.primary }]} numberOfLines={1}>
            {recipe.source_url}
          </Text>
        </Pressable>
      )}

      {/* Meta */}
      {recipe.created_at && (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Ajoutée le{' '}
          {recipe.created_at.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      )}

      {/* Delete */}
      <Pressable
        onPress={handleDelete}
        disabled={deleting}
        style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}>
        <IconSymbol name="trash.fill" size={16} color={Brand.danger} />
        <Text style={[styles.deleteBtnText, { color: Brand.danger }]}>
          {deleting ? 'Suppression…' : 'Supprimer cette recette'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  backBtn: { marginTop: 16 },

  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 20,
  },

  macrosCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  macroCardTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  portionsBanner: { borderRadius: 8, padding: 10 },
  portionsBannerText: { fontSize: 13, fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  ingredientText: { flex: 1, fontSize: 15 },
  ingredientQty: { fontWeight: '600' },

  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22 },

  sourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  sourceText: { flex: 1, fontSize: 13 },

  meta: { fontSize: 12, marginBottom: 24, textAlign: 'center' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.danger + '44',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },
});
