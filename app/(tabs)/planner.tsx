// app/(tabs)/planner.tsx — Weekly batch-cooking meal planner
// Features: cheat day toggle, per-slot recipe swap, PDF/text export

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import {
  calculateWeeklyMacroSummary,
  DAY_NAMES,
  generateWeeklyPlan,
} from '@/services/meal-planner';
import { buildWeeklyPlanText, exportWeeklyPlanPDF } from '@/services/pdf-export';
import type { Recipe, WeeklyPlan } from '@/types/recipe';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

// ── Recipe picker modal ────────────────────────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  recipes: Recipe[];
  onPick: (recipe: Recipe) => void;
  onClose: () => void;
  colors: ReturnType<typeof Colors['light' | 'dark' extends string ? 'light' : 'dark']>;
}

function RecipePickerModal({ visible, recipes, onPick, onClose, colors }: PickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[pickerStyles.container, { backgroundColor: colors.background }]}>
        <View style={[pickerStyles.header, { borderBottomColor: colors.border }]}>
          <Text style={[pickerStyles.title, { color: colors.text }]}>Choisir une recette</Text>
          <Pressable onPress={onClose}>
            <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView>
          {recipes.map((r) => (
            <Pressable
              key={r.id}
              style={[pickerStyles.item, { borderBottomColor: colors.border }]}
              onPress={() => { onPick(r); onClose(); }}>
              <View style={pickerStyles.itemInfo}>
                <Text style={[pickerStyles.itemTitle, { color: colors.text }]}>{r.title}</Text>
                <Text style={[pickerStyles.itemMacros, { color: colors.textSecondary }]}>
                  {r.macros_per_portion.kcal} kcal · {r.macros_per_portion.protein}g prot
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemMacros: { fontSize: 12 },
});

// ── Main screen ────────────────────────────────────────────────────────────

export default function PlannerScreen() {
  const { recipes, refresh } = useRecipes();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [maxKcal, setMaxKcal] = useState('1300');
  const [minProtein, setMinProtein] = useState('80');
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Recipe picker state: which slot is being edited
  const [pickerTarget, setPickerTarget] = useState<{
    dayIndex: number;
    slot: 'lunch' | 'dinner';
  } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

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

  const toggleCheatDay = (dayIndex: number) => {
    if (!plan) return;
    setPlan((prev) =>
      prev!.map((d, i) =>
        i === dayIndex ? { ...d, cheat_day: !d.cheat_day } : d,
      ),
    );
  };

  const replaceRecipe = (dayIndex: number, slot: 'lunch' | 'dinner', recipe: Recipe) => {
    if (!plan) return;
    setPlan((prev) =>
      prev!.map((d, i) =>
        i === dayIndex ? { ...d, [slot]: recipe } : d,
      ),
    );
  };

  const handleExportPDF = async () => {
    if (!plan) return;
    setExporting(true);
    try {
      await exportWeeklyPlanPDF(plan);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d\'exporter.');
    } finally {
      setExporting(false);
    }
  };

  const handleShareText = async () => {
    if (!plan) return;
    const text = buildWeeklyPlanText(plan);
    try {
      await Share.share({ message: text, title: 'Planning Batch Cooking' });
    } catch {
      // user dismissed
    }
  };

  const summary = plan ? calculateWeeklyMacroSummary(plan) : null;

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Brand.primary}
            colors={[Brand.primary]}
          />
        }>
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
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Moyenne journalière</Text>
            <View style={styles.macroRow}>
              <MacroBadge label="kcal" value={summary.avg_kcal} unit="" color={Brand.primary} />
              <MacroBadge label="protéines" value={summary.avg_protein} unit="g" color={Brand.secondary} />
              <MacroBadge label="glucides" value={summary.avg_carbs} unit="g" color={Brand.accent} />
              <MacroBadge label="lipides" value={summary.avg_fat} unit="g" color="#8E6BBF" />
            </View>
          </View>
        )}

        {/* Day-by-day plan */}
        {plan &&
          plan.map((day, dayIndex) => (
            <View
              key={day.day}
              style={[
                styles.dayCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                day.cheat_day && { borderColor: '#8E6BBF44' },
              ]}>
              {/* Day header */}
              <View
                style={[
                  styles.dayHeader,
                  { backgroundColor: day.cheat_day ? '#8E6BBF18' : Brand.primary + '18' },
                ]}>
                <Text
                  style={[
                    styles.dayName,
                    { color: day.cheat_day ? '#8E6BBF' : Brand.primary },
                  ]}>
                  {DAY_NAMES[day.day]}
                </Text>
                {/* Cheat day toggle */}
                <Pressable
                  onPress={() => toggleCheatDay(dayIndex)}
                  style={[
                    styles.cheatBtn,
                    day.cheat_day && { backgroundColor: '#8E6BBF22' },
                  ]}>
                  <IconSymbol
                    name="moon.stars.fill"
                    size={14}
                    color={day.cheat_day ? '#8E6BBF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.cheatBtnText,
                      { color: day.cheat_day ? '#8E6BBF' : colors.textSecondary },
                    ]}>
                    {day.cheat_day ? 'Jour libre ✓' : 'Jour libre'}
                  </Text>
                </Pressable>
              </View>

              {day.cheat_day ? (
                <View style={styles.cheatDayContent}>
                  <Text style={styles.cheatEmoji}>🎉</Text>
                  <Text style={[styles.cheatTitle, { color: '#8E6BBF' }]}>Jour libre</Text>
                  <Text style={[styles.cheatSubtitle, { color: colors.textSecondary }]}>
                    Pas de batch cooking aujourd'hui
                  </Text>
                </View>
              ) : (
                <>
                  {/* Lunch */}
                  <MealSlot
                    emoji="☀️"
                    label="Déjeuner"
                    recipe={day.lunch}
                    colors={colors}
                    onPress={() => day.lunch.id && router.push(`/recipe/${day.lunch.id}`)}
                    onReplace={() => setPickerTarget({ dayIndex, slot: 'lunch' })}
                  />

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Dinner */}
                  <MealSlot
                    emoji="🌙"
                    label="Dîner"
                    recipe={day.dinner}
                    colors={colors}
                    onPress={() => day.dinner.id && router.push(`/recipe/${day.dinner.id}`)}
                    onReplace={() => setPickerTarget({ dayIndex, slot: 'dinner' })}
                  />
                </>
              )}
            </View>
          ))}

        {/* Export actions */}
        {plan && (
          <View style={[styles.exportRow]}>
            <Pressable
              style={[styles.exportBtn, { backgroundColor: Brand.primary }]}
              disabled={exporting}
              onPress={handleExportPDF}>
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <IconSymbol name="square.and.arrow.up.fill" size={16} color="#fff" />
                  <Text style={styles.exportBtnText}>Exporter PDF</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.exportBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleShareText}>
              <IconSymbol name="square.and.arrow.up" size={16} color={colors.text} />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>Partager</Text>
            </Pressable>
          </View>
        )}

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

      {/* Recipe picker modal */}
      <RecipePickerModal
        visible={pickerTarget !== null}
        recipes={recipes}
        colors={colors}
        onPick={(recipe) => {
          if (pickerTarget) replaceRecipe(pickerTarget.dayIndex, pickerTarget.slot, recipe);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </>
  );
}

// ── Meal slot sub-component ────────────────────────────────────────────────

function MealSlot({
  emoji,
  label,
  recipe,
  colors,
  onPress,
  onReplace,
}: {
  emoji: string;
  label: string;
  recipe: Recipe;
  colors: (typeof Colors)[keyof typeof Colors];
  onPress: () => void;
  onReplace: () => void;
}) {
  return (
    <View style={styles.mealRow}>
      <Pressable style={styles.mealPressable} onPress={onPress}>
        <Text style={styles.mealEmoji}>{emoji}</Text>
        <View style={styles.mealInfo}>
          <Text style={[styles.mealLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
            {recipe.macros_per_portion.kcal} kcal · {recipe.macros_per_portion.protein}g prot
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={onReplace} style={styles.swapBtn}>
        <IconSymbol name="shuffle" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  field: { flex: 1 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 15, fontWeight: '500',
  },

  generateBtn: {
    backgroundColor: Brand.primary, borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  dayCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  dayName: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  cheatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  cheatBtnText: { fontSize: 11, fontWeight: '500' },

  cheatDayContent: { alignItems: 'center', paddingVertical: 24 },
  cheatEmoji: { fontSize: 36 },
  cheatTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  cheatSubtitle: { fontSize: 13, marginTop: 2 },

  mealRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  mealPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  mealEmoji: { fontSize: 22 },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  mealTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12 },
  swapBtn: { padding: 10 },
  divider: { height: 1, marginHorizontal: 14 },

  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13,
  },
  exportBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  emptyHint: { marginTop: 12, fontSize: 14, fontWeight: '500' },
});
