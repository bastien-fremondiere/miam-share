// app/(tabs)/reflection.tsx — AI recipe generation chat interface

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useRecipes } from '@/context/recipes-context';
import { generateRecipeIdea } from '@/services/gemini';
import type { GeminiRecipeResponse } from '@/types/recipe';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from 'react-native';

// ── Types ──────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'error';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  recipe?: GeminiRecipeResponse;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ReflectionScreen() {
  const { addRecipe } = useRecipes();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Bonjour ! Décrivez la recette que vous souhaitez et je vais la générer pour vous. Exemple : "Poulet rôti high protein sous 500 kcal pour 6 portions"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const recipe = await generateRecipeIdea(prompt);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Voici une idée pour "${recipe.title}" :`,
        recipe,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'error',
        text: err instanceof Error ? err.message : 'Erreur lors de la génération.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSaveRecipe = async (recipe: GeminiRecipeResponse) => {
    try {
      await addRecipe(recipe);
      Alert.alert('✅ Recette sauvegardée', `"${recipe.title}" a été ajoutée à vos recettes.`);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de sauvegarder.');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isError = item.role === 'error';

    return (
      <View style={[styles.msgWrapper, isUser && styles.msgWrapperUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: isError ? Brand.danger : Brand.primary }]}>
            <Text style={styles.avatarText}>{isError ? '⚠' : '🤖'}</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: Brand.primary }]
              : [
                  styles.bubbleAssistant,
                  {
                    backgroundColor: isError ? Brand.danger + '18' : colors.surface,
                    borderColor: isError ? Brand.danger + '44' : colors.border,
                  },
                ],
          ]}>
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? '#fff' : isError ? Brand.danger : colors.text },
            ]}>
            {item.text}
          </Text>

          {/* Recipe card inside assistant message */}
          {item.recipe && (
            <View
              style={[
                styles.recipePreview,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}>
              <Text style={[styles.recipeTitle, { color: colors.text }]}>{item.recipe.title}</Text>
              <View style={styles.macrosRow}>
                <MacroBadge
                  label="kcal"
                  value={item.recipe.macros_per_portion.kcal}
                  unit=""
                  color={Brand.primary}
                />
                <MacroBadge
                  label="prot"
                  value={item.recipe.macros_per_portion.protein}
                  unit="g"
                  color={Brand.secondary}
                />
                <MacroBadge
                  label="glucides"
                  value={item.recipe.macros_per_portion.carbs}
                  unit="g"
                  color={Brand.accent}
                />
                <MacroBadge
                  label="lipides"
                  value={item.recipe.macros_per_portion.fat}
                  unit="g"
                  color="#8E6BBF"
                />
              </View>
              <Text style={[styles.ingredients, { color: colors.textSecondary }]}>
                {item.recipe.ingredients.length} ingrédients · {item.recipe.instructions.length}{' '}
                étapes
              </Text>
              <Pressable
                style={styles.saveBtn}
                onPress={() => handleSaveRecipe(item.recipe!)}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Sauvegarder</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={[styles.loadingRow, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={Brand.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Gemini génère la recette…
          </Text>
        </View>
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          placeholder="Ex: Curry de pois chiches high protein…"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="send"
          multiline
          style={[
            styles.textInput,
            { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
          ]}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || loading}
          style={[
            styles.sendBtn,
            { backgroundColor: Brand.primary },
            (!input.trim() || loading) && styles.sendBtnDisabled,
          ]}>
          <IconSymbol name="paperplane.fill" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 8 },

  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgWrapperUser: { flexDirection: 'row-reverse' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14 },

  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bubbleUser: { borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleAssistant: { borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },

  recipePreview: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  recipeTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  ingredients: { fontSize: 12, marginBottom: 10 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.secondary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 13 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
