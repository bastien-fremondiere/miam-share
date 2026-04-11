// app/(tabs)/planner.tsx — Weekly batch-cooking meal planner

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import {
    calculateWeeklyMacroSummary,
    DAY_NAMES,
    generateWeeklyPlan,
} from '@/services/meal-planner';
import type { WeeklyPlan } from '@/types/recipe';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';

export default function PlannerScreen() {
  const { recipes } = useRecipes();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [maxKcal, setMaxKcal] = useState('2000');
  const [minProtein, setMinProtein] = useState('100');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    const kcal = parseFloat(maxKcal);
    const protein = parseFloat(minProtein);

    if (isNaN(kcal) || kcal <= 0 || isNaN(protein) || protein <= 0) {
      Alert.alert('Objectifs invalides', 'Saisissez des valeurs numériques positives.');
      return;
    }

    setLoading(true);
    try {
      const result = generateWeeklyPlan(recipes, {
        max_kcal_per_day: kcal,
        min_protein_per_day: protein,
      });
      setPlan(result);
    } catch (err) {
      Alert.alert(
        'Impossible de générer',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = plan ? calculateWeeklyMacroSummary(plan) : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      {/* Goals form */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🎯 Objectifs de la semaine</Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Max kcal / jour</Text>
            <TextInput
              value={maxKcal}
              onChangeText={setMaxKcal}
              keyboardType="numeric"
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Min protéines / jour (g)</Text>
            <TextInput
              value={minProtein}
              onChangeText={setMinProtein}
              keyboardType="numeric"
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="wand.and.stars" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Générer le planning</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Weekly macro summary */}
      {summary && (
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Moyenne journalière
          </Text>
          <View style={styles.macroRow}>
            <MacroBadge label="kcal" value={summary.avg_kcal} unit="" color={Brand.primary} />
            <MacroBadge
              label="protéines"
              value={summary.avg_protein}
              unit="g"
              color={Brand.secondary}
            />
            <MacroBadge label="glucides" value={summary.avg_carbs} unit="g" color={Brand.accent} />
            <MacroBadge label="lipides" value={summary.avg_fat} unit="g" color="#8E6BBF" />
          </View>
        </View>
      )}

      {/* Day-by-day plan */}
      {plan &&
        plan.map((day) => (
          <View
            key={day.day}
            style={[
              styles.dayCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={[styles.dayHeader, { backgroundColor: Brand.primary + '18' }]}>
              <Text style={[styles.dayName, { color: Brand.primary }]}>{DAY_NAMES[day.day]}</Text>
            </View>

            {/* Lunch */}
            <Pressable
              style={styles.mealRow}
              onPress={() => day.lunch.id && router.push(`/recipe/${day.lunch.id}`)}>
              <Text style={[styles.mealEmoji]}>☀️</Text>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealLabel, { color: colors.textSecondary }]}>Déjeuner</Text>
                <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
                  {day.lunch.title}
                </Text>
                <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
                  {day.lunch.macros_per_portion.kcal} kcal ·{' '}
                  {day.lunch.macros_per_portion.protein}g prot
                </Text>
              </View>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Dinner */}
            <Pressable
              style={styles.mealRow}
              onPress={() => day.dinner.id && router.push(`/recipe/${day.dinner.id}`)}>
              <Text style={styles.mealEmoji}>🌙</Text>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealLabel, { color: colors.textSecondary }]}>Dîner</Text>
                <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
                  {day.dinner.title}
                </Text>
                <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
                  {day.dinner.macros_per_portion.kcal} kcal ·{' '}
                  {day.dinner.macros_per_portion.protein}g prot
                </Text>
              </View>
            </Pressable>
          </View>
        ))}

      {!plan && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas encore de planning</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Définissez vos objectifs et appuyez sur "Générer" pour créer votre semaine batch
            cooking.
          </Text>
          {recipes.length < 2 && (
            <Text style={[styles.emptyHint, { color: Brand.primary }]}>
              ⚠️ Il vous faut au moins 2 recettes sauvegardées.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  field: { flex: 1 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '500',
  },

  generateBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: { paddingVertical: 8, paddingHorizontal: 16 },
  dayName: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  mealRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  mealEmoji: { fontSize: 22 },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  mealTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12 },
  divider: { height: 1, marginHorizontal: 14 },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  emptyHint: { marginTop: 12, fontSize: 14, fontWeight: '500' },
});
