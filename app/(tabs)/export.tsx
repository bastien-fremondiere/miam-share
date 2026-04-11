// app/(tabs)/export.tsx — Select recipes and generate a PDF recipe book

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import { exportRecipesPDF } from '@/services/pdf-export';
import type { Recipe } from '@/types/recipe';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from 'react-native';

export default function ExportScreen() {
  const { recipes, loading } = useRecipes();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bookTitle, setBookTitle] = useState('Mon Livre de Recettes');
  const [exporting, setExporting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === recipes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(recipes.map((r) => r.id!).filter(Boolean)));
    }
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      Alert.alert('Aucune recette', 'Sélectionnez au moins une recette à exporter.');
      return;
    }

    const toExport = recipes.filter((r) => r.id && selected.has(r.id));
    setExporting(true);
    try {
      await exportRecipesPDF(toExport, bookTitle.trim() || 'Mon Livre de Recettes');
    } catch (err) {
      Alert.alert('Erreur export', err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    const isSelected = !!item.id && selected.has(item.id);
    return (
      <Pressable
        onPress={() => item.id && toggleSelect(item.id)}
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? Brand.primary + '12' : colors.surface,
            borderColor: isSelected ? Brand.primary : colors.border,
          },
        ]}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? Brand.primary : colors.border,
              backgroundColor: isSelected ? Brand.primary : 'transparent',
            },
          ]}>
          {isSelected && <IconSymbol name="checkmark" size={14} color="#fff" />}
        </View>
        <View style={styles.itemInfo}>
          <Text
            style={[styles.itemTitle, { color: colors.text }]}
            numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemMacros, { color: colors.textSecondary }]}>
            {item.macros_per_portion.kcal} kcal · {item.macros_per_portion.protein}g prot ·{' '}
            {item.ingredients.length} ingrédients
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title input */}
      <View style={[styles.titleSection, { borderBottomColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Titre du livre</Text>
        <TextInput
          value={bookTitle}
          onChangeText={setBookTitle}
          style={[
            styles.titleInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          placeholder="Mon Livre de Recettes"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Select all header */}
      {recipes.length > 0 && (
        <Pressable
          onPress={toggleAll}
          style={[styles.selectAll, { borderBottomColor: colors.border }]}>
          <Text style={[styles.selectAllText, { color: Brand.primary }]}>
            {selected.size === recipes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Text>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {selected.size}/{recipes.length} sélectionnée{selected.size > 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}

      {/* Recipe list */}
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.id ?? item.title}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune recette</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Ajoutez des recettes depuis l'onglet Recettes pour les exporter en PDF.
            </Text>
          </View>
        }
      />

      {/* Export button */}
      {recipes.length > 0 && (
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable
            onPress={handleExport}
            disabled={exporting || selected.size === 0}
            style={[
              styles.exportBtn,
              (exporting || selected.size === 0) && styles.exportBtnDisabled,
            ]}>
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
                <Text style={styles.exportBtnText}>
                  Exporter {selected.size > 0 ? `(${selected.size})` : ''} en PDF
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  titleSection: { padding: 16, borderBottomWidth: 1 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  titleInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },

  selectAll: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectAllText: { fontSize: 14, fontWeight: '500' },
  countText: { fontSize: 13 },

  list: { padding: 12, gap: 8, paddingBottom: 16 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  itemMacros: { fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20 },

  footer: { padding: 16, borderTopWidth: 1 },
  exportBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
