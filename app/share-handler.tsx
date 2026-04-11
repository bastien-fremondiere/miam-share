// app/share-handler.tsx — Modal for processing shared URLs / manually entered text
// Opened automatically when the app receives an Android share intent.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { analyzeRecipe } from '@/services/gemini';
import { useRecipes } from '@/context/recipes-context';
import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import type { GeminiRecipeResponse } from '@/types/recipe';

type Step = 'input' | 'loading' | 'preview' | 'saving';

export default function ShareHandlerScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const router = useRouter();
  const { addRecipe } = useRecipes();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [rawText, setRawText] = useState(url ? decodeURIComponent(url) : '');
  const [step, setStep] = useState<Step>('input');
  const [recipe, setRecipe] = useState<GeminiRecipeResponse | null>(null);

  // Auto-analyze if we got a URL from the share intent
  useEffect(() => {
    if (url) {
      const decoded = decodeURIComponent(url);
      setRawText(decoded);
    }
  }, [url]);

  const handleAnalyze = async () => {
    const text = rawText.trim();
    if (!text) {
      Alert.alert('Contenu requis', 'Collez une URL ou du texte de recette à analyser.');
      return;
    }

    setStep('loading');
    try {
      const result = await analyzeRecipe(text);
      setRecipe(result);
      setStep('preview');
    } catch (err) {
      setStep('input');
      Alert.alert(
        'Erreur Gemini',
        err instanceof Error ? err.message : 'Impossible d\'analyser le contenu.',
      );
    }
  };

  const handleSave = async () => {
    if (!recipe) return;
    setStep('saving');
    try {
      await addRecipe({
        ...recipe,
        source_url: rawText.startsWith('http') ? rawText : undefined,
      });
      Alert.alert('✅ Recette sauvegardée', `"${recipe.title}" ajoutée à votre collection !`, [
        { text: 'Voir les recettes', onPress: () => router.replace('/(tabs)/') },
        { text: 'Fermer', onPress: () => router.back() },
      ]);
    } catch (err) {
      setStep('preview');
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de sauvegarder.');
    }
  };

  const handleReset = () => {
    setRecipe(null);
    setStep('input');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Input step ─────────────────────────────────────────── */}
        {(step === 'input' || step === 'loading') && (
          <View style={styles.inputSection}>
            <Text style={[styles.heading, { color: colors.text }]}>🔗 Analyser une recette</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              Collez l'URL d'une recette, ou copiez-collez directement le texte d'une publication
              Instagram.
            </Text>

            <TextInput
              value={rawText}
              onChangeText={setRawText}
              placeholder="https://example.com/recette-poulet\n\nou collez le texte ici…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              editable={step === 'input'}
            />

            {step === 'loading' ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Brand.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Gemini analyse le contenu…
                </Text>
                <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
                  Extraction des ingrédients et calcul des macros pour 6 portions.
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleAnalyze}
                disabled={!rawText.trim()}
                style={[styles.analyzeBtn, !rawText.trim() && styles.analyzeBtnDisabled]}>
                <IconSymbol name="wand.and.stars" size={18} color="#fff" />
                <Text style={styles.analyzeBtnText}>Analyser avec Gemini</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Preview step ───────────────────────────────────────── */}
        {(step === 'preview' || step === 'saving') && recipe && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewSuccess, { color: Brand.secondary }]}>
                ✅ Recette extraite
              </Text>
              <Pressable onPress={handleReset}>
                <IconSymbol name="arrow.clockwise" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>

            {/* Macros */}
            <View
              style={[
                styles.macrosCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text style={[styles.macrosLabel, { color: colors.textSecondary }]}>
                Macros / portion
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
            </View>

            {/* Quick ingredient list */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Ingrédients ({recipe.ingredients.length} — pour {recipe.portions} portions)
              </Text>
              {recipe.ingredients.slice(0, 6).map((ing, i) => (
                <Text key={i} style={[styles.ingredientLine, { color: colors.textSecondary }]}>
                  • {ing.quantity} {ing.unit} {ing.name}
                </Text>
              ))}
              {recipe.ingredients.length > 6 && (
                <Text style={[styles.moreText, { color: Brand.primary }]}>
                  … + {recipe.ingredients.length - 6} autres
                </Text>
              )}
            </View>

            {/* Steps count */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Préparation ({recipe.instructions.length} étapes)
              </Text>
              <Text style={[styles.ingredientLine, { color: colors.textSecondary }]}>
                {recipe.instructions[0]}
              </Text>
              {recipe.instructions.length > 1 && (
                <Text style={[styles.moreText, { color: Brand.primary }]}>
                  … + {recipe.instructions.length - 1} étapes supplémentaires
                </Text>
              )}
            </View>

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={step === 'saving'}
              style={[styles.saveBtn, step === 'saving' && styles.saveBtnDisabled]}>
              {step === 'saving' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Sauvegarder dans mes recettes</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },

  inputSection: { gap: 16 },
  heading: { fontSize: 22, fontWeight: '700' },
  subheading: { fontSize: 14, lineHeight: 20 },

  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
  },

  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loadingText: { fontSize: 15, fontWeight: '500' },
  loadingHint: { fontSize: 13, textAlign: 'center' },

  analyzeBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  previewSection: { gap: 14 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewSuccess: { fontSize: 15, fontWeight: '600' },
  recipeTitle: { fontSize: 22, fontWeight: '700', lineHeight: 28 },

  macrosCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  macrosLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  ingredientLine: { fontSize: 14, lineHeight: 20 },
  moreText: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  saveBtn: {
    backgroundColor: Brand.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
