// components/recipe-card.tsx — Tappable recipe card with macro summary

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Brand, Colors } from '@/constants/theme';
import { MacroBadge } from './macro-badge';
import type { Recipe } from '@/types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  /** Optionally override the tap handler (default: navigate to /recipe/[id]) */
  onPress?: () => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (recipe.id) {
      router.push(`/recipe/${recipe.id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={[styles.portionsBadge, { backgroundColor: Brand.primary }]}>
          <Text style={styles.portionsText}>{recipe.portions}×</Text>
        </View>
      </View>

      <View style={styles.macros}>
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

      <Text style={[styles.ingredientsHint, { color: colors.textSecondary }]}>
        {recipe.ingredients.length} ingrédients · {recipe.instructions.length} étapes
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  portionsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  portionsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  macros: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  ingredientsHint: {
    fontSize: 12,
  },
});
