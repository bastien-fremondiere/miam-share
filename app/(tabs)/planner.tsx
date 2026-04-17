// app/(tabs)/planner.tsx — Batch-cooking weekly planner (batch editing mode)
// Edit 4 recipe slots (2 batches × lunch+dinner). Day 7 is always a free day.

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import { useSettings } from '@/context/settings-context';
import {
  batchPlanToWeeklyPlan,
  calculateWeeklyMacroSummary,
  DAY_NAMES,
  generateWeeklyPlan,
} from '@/services/meal-planner';
import { buildWeeklyPlanText, exportWeeklyPlanPDF } from '@/services/pdf-export';
import type { BatchPlan, Recipe, WeeklyPlan } from '@/types/recipe';
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
  useColorScheme,
  View,
} from 'react-native';

// ── Recipe picker modal ────────────────────────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  recipes: Recipe[];
  onPick: (recipe: Recipe) => void;
  onClose: () => void;
  colors: (typeof Colors)[keyof typeof Colors];
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

// ── Batch slot sub-component ───────────────────────────────────────────────

type BatchSlotKey = keyof BatchPlan;

function BatchSlot({
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

// ── Main screen ────────────────────────────────────────────────────────────

export default function PlannerScreen() {
  const { recipes, refresh } = useRecipes();
  const { settings } = useSettings();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [batch, setBatch] = useState<BatchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Which batch slot is being edited in the picker
  const [pickerTarget, setPickerTarget] = useState<BatchSlotKey | null>(null);

  // Derive the full WeeklyPlan from the current batch
  const plan: WeeklyPlan | null = batch ? batchPlanToWeeklyPlan(batch) : null;
  const summary = plan ? calculateWeeklyMacroSummary(plan) : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleGenerate = () => {
    setLoading(true);
    try {
      const result = generateWeeklyPlan(recipes, {
        max_kcal_per_day: settings.max_kcal_per_day,
        min_protein_per_day: settings.min_protein_per_day,
      });
      // Convert the generated plan back to batch form for editing
      if (result.length < 7) {
        throw new Error('Le planning généré est incomplet. Veuillez réessayer.');
      }
      setBatch({
        batch1Lunch: result[0]!.lunch,
        batch1Dinner: result[0]!.dinner,
        batch2Lunch: result[3]!.lunch,
        batch2Dinner: result[3]!.dinner,
      });
    } catch (err) {
      Alert.alert(
        'Impossible de générer',
        err instanceof Error ? err.message : 'Erreur inconnue',
      );
    } finally {
      setLoading(false);
    }
  };

  const replaceSlot = (slot: BatchSlotKey, recipe: Recipe) => {
    setBatch((prev) => prev ? { ...prev, [slot]: recipe } : prev);
  };

  const handleExportPDF = async () => {
    if (!plan) return;
    setExporting(true);
    try {
      await exportWeeklyPlanPDF(plan);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Impossible d'exporter.");
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

        {/* Goals banner (links to settings) */}
        <View style={[styles.goalsBanner, { backgroundColor: Brand.primary + '12', borderColor: Brand.primary + '30' }]}>
          <IconSymbol name="flame.fill" size={14} color={Brand.primary} />
          <Text style={[styles.goalsBannerText, { color: Brand.primary }]}>
            Objectifs : max {settings.max_kcal_per_day} kcal/j · min {settings.min_protein_per_day}g prot/j
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/settings')} style={styles.goalsBannerEdit}>
            <IconSymbol name="gearshape" size={14} color={Brand.primary} />
          </Pressable>
        </View>

        {/* Generate button */}
        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="wand.and.stars" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>
                {batch ? 'Régénérer le planning' : 'Générer le planning'}
              </Text>
            </>
          )}
        </Pressable>

        {/* ── Batch editing cards ──────────────────────────────── */}
        {batch && (
          <>
            {/* Batch 1: Lundi – Mercredi */}
            <View style={[styles.batchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.batchHeader, { backgroundColor: Brand.primary + '18' }]}>
                <Text style={[styles.batchLabel, { color: Brand.primary }]}>🥘 Batch 1</Text>
                <Text style={[styles.batchDays, { color: colors.textSecondary }]}>
                  Lundi · Mardi · Mercredi
                </Text>
              </View>
              <BatchSlot
                emoji="☀️"
                label="Repas 1 — Déjeuner"
                recipe={batch.batch1Lunch}
                colors={colors}
                onPress={() => batch.batch1Lunch.id && router.push(`/recipe/${batch.batch1Lunch.id}`)}
                onReplace={() => setPickerTarget('batch1Lunch')}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BatchSlot
                emoji="🌙"
                label="Repas 2 — Dîner"
                recipe={batch.batch1Dinner}
                colors={colors}
                onPress={() => batch.batch1Dinner.id && router.push(`/recipe/${batch.batch1Dinner.id}`)}
                onReplace={() => setPickerTarget('batch1Dinner')}
              />
            </View>

            {/* Batch 2: Jeudi – Samedi */}
            <View style={[styles.batchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.batchHeader, { backgroundColor: Brand.secondary + '18' }]}>
                <Text style={[styles.batchLabel, { color: Brand.secondary }]}>🥗 Batch 2</Text>
                <Text style={[styles.batchDays, { color: colors.textSecondary }]}>
                  Jeudi · Vendredi · Samedi
                </Text>
              </View>
              <BatchSlot
                emoji="☀️"
                label="Repas 1 — Déjeuner"
                recipe={batch.batch2Lunch}
                colors={colors}
                onPress={() => batch.batch2Lunch.id && router.push(`/recipe/${batch.batch2Lunch.id}`)}
                onReplace={() => setPickerTarget('batch2Lunch')}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BatchSlot
                emoji="🌙"
                label="Repas 2 — Dîner"
                recipe={batch.batch2Dinner}
                colors={colors}
                onPress={() => batch.batch2Dinner.id && router.push(`/recipe/${batch.batch2Dinner.id}`)}
                onReplace={() => setPickerTarget('batch2Dinner')}
              />
            </View>

            {/* Sunday: always free day */}
            <View style={[styles.batchCard, { backgroundColor: colors.surface, borderColor: '#8E6BBF44' }]}>
              <View style={[styles.batchHeader, { backgroundColor: '#8E6BBF18' }]}>
                <Text style={[styles.batchLabel, { color: '#8E6BBF' }]}>🎉 Dimanche</Text>
                <Text style={[styles.batchDays, { color: '#8E6BBF' }]}>Jour libre</Text>
              </View>
              <View style={styles.cheatDayContent}>
                <Text style={styles.cheatEmoji}>🌟</Text>
                <Text style={[styles.cheatTitle, { color: '#8E6BBF' }]}>Jour libre automatique</Text>
                <Text style={[styles.cheatSubtitle, { color: colors.textSecondary }]}>
                  Pas de batch cooking — profitez de votre journée !
                </Text>
              </View>
            </View>

            {/* Weekly macro summary */}
            {summary && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Moyenne journalière (hors dimanche)</Text>
                <View style={styles.macroRow}>
                  <MacroBadge label="kcal" value={summary.avg_kcal} unit="" color={Brand.primary} />
                  <MacroBadge label="protéines" value={summary.avg_protein} unit="g" color={Brand.secondary} />
                  <MacroBadge label="glucides" value={summary.avg_carbs} unit="g" color={Brand.accent} />
                  <MacroBadge label="lipides" value={summary.avg_fat} unit="g" color="#8E6BBF" />
                </View>
              </View>
            )}

            {/* Weekly preview toggle */}
            <Pressable
              style={[styles.previewToggle, { borderColor: colors.border }]}
              onPress={() => setShowPreview((v) => !v)}>
              <IconSymbol
                name={showPreview ? 'chevron.up' : 'chevron.down'}
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.previewToggleText, { color: colors.textSecondary }]}>
                {showPreview ? 'Masquer le planning détaillé' : 'Voir le planning jour par jour'}
              </Text>
            </Pressable>

            {/* Day-by-day preview (read-only) */}
            {showPreview && plan && plan.map((day) => (
              <View
                key={day.day}
                style={[
                  styles.dayCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  day.cheat_day && { borderColor: '#8E6BBF44' },
                ]}>
                <View
                  style={[
                    styles.dayHeader,
                    { backgroundColor: day.cheat_day ? '#8E6BBF18' : Brand.primary + '12' },
                  ]}>
                  <Text style={[styles.dayName, { color: day.cheat_day ? '#8E6BBF' : Brand.primary }]}>
                    {DAY_NAMES[day.day]}
                  </Text>
                </View>
                {day.cheat_day ? (
                  <Text style={[styles.dayCheatText, { color: '#8E6BBF' }]}>🎉 Jour libre</Text>
                ) : (
                  <View style={styles.daySlots}>
                    <Text style={[styles.daySlotText, { color: colors.text }]} numberOfLines={1}>
                      ☀️ {day.lunch.title}
                    </Text>
                    <Text style={[styles.daySlotText, { color: colors.text }]} numberOfLines={1}>
                      🌙 {day.dinner.title}
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {/* Export actions */}
            <View style={styles.exportRow}>
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
          </>
        )}

        {/* Empty state */}
        {!batch && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas encore de planning</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {'Appuyez sur "Générer" pour créer votre semaine batch cooking avec 4 recettes sur 6 jours. Le dimanche est toujours un jour libre 🎉'}
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
          if (pickerTarget) replaceSlot(pickerTarget, recipe);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  goalsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  goalsBannerText: { flex: 1, fontSize: 12, fontWeight: '500' },
  goalsBannerEdit: { padding: 2 },

  generateBtn: {
    backgroundColor: Brand.primary, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  batchCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  batchHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
  },
  batchLabel: { fontSize: 15, fontWeight: '700' },
  batchDays: { fontSize: 12 },

  mealRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  mealPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  mealEmoji: { fontSize: 22 },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  mealTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  mealMacros: { fontSize: 12 },
  swapBtn: { padding: 10 },
  divider: { height: 1, marginHorizontal: 14 },

  cheatDayContent: { alignItems: 'center', paddingVertical: 20 },
  cheatEmoji: { fontSize: 32 },
  cheatTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  cheatSubtitle: { fontSize: 12, marginTop: 2, textAlign: 'center', paddingHorizontal: 16 },

  previewToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  previewToggleText: { fontSize: 13, fontWeight: '500' },

  dayCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dayHeader: { paddingVertical: 6, paddingHorizontal: 12 },
  dayName: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayCheatText: { fontSize: 13, fontStyle: 'italic', paddingHorizontal: 12, paddingVertical: 8 },
  daySlots: { paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  daySlotText: { fontSize: 13 },

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
