// app/(tabs)/index.tsx — Recipe list with real-time sync, sort & filter

import { RecipeCard } from '@/components/recipe-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import type { RecipeSortKey, SortDirection } from '@/types/recipe';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
    useColorScheme,
} from 'react-native';

const SORT_OPTIONS: { key: RecipeSortKey; label: string }[] = [
  { key: 'created_at', label: 'Date' },
  { key: 'protein', label: 'Protéines' },
  { key: 'kcal', label: 'Calories' },
  { key: 'title', label: 'Nom' },
];

export default function RecipesScreen() {
  const { recipes, loading, error, refresh } = useRecipes();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, { toValue, useNativeDriver: true, friction: 6 }).start();
    setFabOpen(!fabOpen);
  };

  const closeFab = () => {
    if (!fabOpen) return;
    Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
    setFabOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const [sortKey, setSortKey] = useState<RecipeSortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [maxKcal, setMaxKcal] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const toggleSort = (key: RecipeSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...recipes];

    if (maxKcal) {
      const max = parseFloat(maxKcal);
      if (!isNaN(max)) list = list.filter((r) => r.macros_per_portion.kcal <= max);
    }
    if (minProtein) {
      const min = parseFloat(minProtein);
      if (!isNaN(min)) list = list.filter((r) => r.macros_per_portion.protein >= min);
    }

    list.sort((a, b) => {
      let va: number | string;
      let vb: number | string;

      switch (sortKey) {
        case 'kcal':
          va = a.macros_per_portion.kcal;
          vb = b.macros_per_portion.kcal;
          break;
        case 'protein':
          va = a.macros_per_portion.protein;
          vb = b.macros_per_portion.protein;
          break;
        case 'carbs':
          va = a.macros_per_portion.carbs;
          vb = b.macros_per_portion.carbs;
          break;
        case 'fat':
          va = a.macros_per_portion.fat;
          vb = b.macros_per_portion.fat;
          break;
        case 'title':
          va = a.title.toLowerCase();
          vb = b.title.toLowerCase();
          break;
        default:
          va = a.created_at?.getTime() ?? 0;
          vb = b.created_at?.getTime() ?? 0;
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [recipes, sortKey, sortDir, maxKcal, minProtein]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement des recettes…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <IconSymbol name="exclamationmark.triangle" size={40} color={Brand.danger} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Erreur de connexion</Text>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
        <Text style={[styles.errorHint, { color: colors.textSecondary }]}>
          Vérifiez votre fichier .env et les règles Firestore.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sort bar */}
      <View style={[styles.sortBar, { borderBottomColor: colors.border }]}>
        <View style={styles.sortButtons}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => toggleSort(opt.key)}
              style={[
                styles.sortBtn,
                sortKey === opt.key && { backgroundColor: Brand.primary + '22' },
              ]}>
              <Text
                style={[
                  styles.sortBtnText,
                  { color: sortKey === opt.key ? Brand.primary : colors.textSecondary },
                ]}>
                {opt.label}
                {sortKey === opt.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setShowFilters((v) => !v)}>
          <IconSymbol
            name="line.3.horizontal.decrease"
            size={22}
            color={showFilters ? Brand.primary : colors.icon}
          />
        </Pressable>
      </View>

      {/* Filter inputs */}
      {showFilters && (
        <View
          style={[
            styles.filterRow,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}>
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Max kcal</Text>
            <TextInput
              value={maxKcal}
              onChangeText={setMaxKcal}
              keyboardType="numeric"
              placeholder="ex: 600"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.filterInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              Min protéines (g)
            </Text>
            <TextInput
              value={minProtein}
              onChangeText={setMinProtein}
              keyboardType="numeric"
              placeholder="ex: 30"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.filterInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Recipe list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id ?? item.title}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Brand.primary}
            colors={[Brand.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍳</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune recette</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Partagez une URL de recette depuis votre navigateur, ou utilisez l'onglet Réflexion
              pour en générer une.
            </Text>
          </View>
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {filtered.length} recette{filtered.length > 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />

      {/* FAB menu overlay — closes when tapping outside */}
      {fabOpen && (
        <Modal transparent animationType="none" onRequestClose={closeFab}>
          <TouchableWithoutFeedback onPress={closeFab}>
            <View style={styles.fabOverlay}>
              {/* Action items — appear above the FAB */}
              <Animated.View
                style={[
                  styles.fabMenu,
                  {
                    opacity: fabAnim,
                    transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}>
                {/* Option 2: generate idea */}
                <Pressable
                  style={[styles.fabMenuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { closeFab(); router.push('/(tabs)/reflection'); }}>
                  <IconSymbol name="sparkles" size={20} color={Brand.accent} />
                  <Text style={[styles.fabMenuLabel, { color: colors.text }]}>Générer une idée IA</Text>
                </Pressable>

                {/* Option 1: share URL / text */}
                <Pressable
                  style={[styles.fabMenuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { closeFab(); router.push('/share-handler'); }}>
                  <IconSymbol name="link" size={20} color={Brand.primary} />
                  <Text style={[styles.fabMenuLabel, { color: colors.text }]}>
                    Analyser une URL ou texte
                  </Text>
                </Pressable>
              </Animated.View>

              {/* FAB button (mirrored position — inside modal so overlay works) */}
              <Pressable
                style={[styles.fab, fabOpen && styles.fabActive]}
                onPress={closeFab}
                accessibilityLabel="Fermer le menu">
                <Animated.View
                  style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
                  <IconSymbol name="plus" size={28} color="#fff" />
                </Animated.View>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* FAB button (normal position when menu is closed) */}
      {!fabOpen && (
        <Pressable
          style={styles.fab}
          onPress={toggleFab}
          accessibilityLabel="Ajouter une recette">
          <IconSymbol name="plus" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  errorMsg: { marginTop: 6, textAlign: 'center', fontSize: 14 },
  errorHint: { marginTop: 4, textAlign: 'center', fontSize: 12 },

  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  sortButtons: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  sortBtnText: { fontSize: 13, fontWeight: '500' },

  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  filterField: { flex: 1 },
  filterLabel: { fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },

  list: { padding: 16, paddingBottom: 100 },
  count: { fontSize: 13, marginBottom: 8 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabActive: {
    backgroundColor: Brand.danger,
  },
  fabOverlay: {
    flex: 1,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 92,
    right: 24,
    gap: 10,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabMenuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});

