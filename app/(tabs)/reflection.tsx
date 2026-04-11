// app/(tabs)/reflection.tsx — AI recipe generation chat with Google auth gate
// Generates 3 recipe variants per prompt; user validates one to save it.

import { MacroBadge } from '@/components/macro-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useRecipes } from '@/context/recipes-context';
import { generateRecipeIdeas } from '@/services/gemini';
import type { GeminiRecipeResponse } from '@/types/recipe';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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

// ── Types ──────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'error';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  variants?: GeminiRecipeResponse[]; // 3 recipe ideas
}

// ── Google sign-in gate ────────────────────────────────────────────────────

function SignInGate({
  colors,
}: {
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const { signIn, loading } = useAuth();
  return (
    <View style={[gateStyles.container, { backgroundColor: colors.background }]}>
      <Text style={gateStyles.logo}>🤖</Text>
      <Text style={[gateStyles.title, { color: colors.text }]}>Connexion requise</Text>
      <Text style={[gateStyles.subtitle, { color: colors.textSecondary }]}>
        Connectez-vous avec votre compte Google pour utiliser la génération de recettes par IA.
      </Text>
      <Pressable
        onPress={signIn}
        disabled={loading}
        style={[gateStyles.btn, loading && { opacity: 0.6 }]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <IconSymbol name="person.crop.circle.fill" size={20} color="#fff" />
            <Text style={gateStyles.btnText}>Se connecter avec Google</Text>
          </>
        )}
      </Pressable>
      {!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
       !process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID &&
       !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID && (
        <Text style={[gateStyles.hint, { color: Brand.danger }]}>
          ⚠️ Aucun client Google configuré — ajoutez EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ou EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID dans .env
        </Text>
      )}
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4285F4', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { marginTop: 16, fontSize: 12, textAlign: 'center' },
});

// ── Variant card ───────────────────────────────────────────────────────────

function VariantCard({
  recipe,
  index,
  colors,
  onValidate,
}: {
  recipe: GeminiRecipeResponse;
  index: number;
  colors: (typeof Colors)[keyof typeof Colors];
  onValidate: (recipe: GeminiRecipeResponse) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[variantStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={variantStyles.indexBadge}>
        <Text style={variantStyles.indexText}>#{index + 1}</Text>
      </View>
      <Text style={[variantStyles.title, { color: colors.text }]}>{recipe.title}</Text>

      <View style={variantStyles.macrosRow}>
        <MacroBadge label="kcal" value={recipe.macros_per_portion.kcal} unit="" color={Brand.primary} />
        <MacroBadge label="prot" value={recipe.macros_per_portion.protein} unit="g" color={Brand.secondary} />
        <MacroBadge label="glucides" value={recipe.macros_per_portion.carbs} unit="g" color={Brand.accent} />
        <MacroBadge label="lipides" value={recipe.macros_per_portion.fat} unit="g" color="#8E6BBF" />
      </View>

      <Text style={[variantStyles.meta, { color: colors.textSecondary }]}>
        {recipe.ingredients.length} ingrédients · {recipe.instructions.length} étapes
      </Text>

      {/* Expandable details */}
      <Pressable onPress={() => setExpanded((v) => !v)} style={variantStyles.expandBtn}>
        <Text style={[variantStyles.expandText, { color: Brand.primary }]}>
          {expanded ? 'Masquer les détails ▲' : 'Voir les détails ▼'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={[variantStyles.details, { borderTopColor: colors.border }]}>
          <Text style={[variantStyles.detailsTitle, { color: colors.text }]}>Ingrédients</Text>
          {recipe.ingredients.map((ing, i) => (
            <Text key={i} style={[variantStyles.detailLine, { color: colors.textSecondary }]}>
              • {ing.quantity} {ing.unit} — {ing.name}
            </Text>
          ))}
          <Text style={[variantStyles.detailsTitle, { color: colors.text, marginTop: 10 }]}>
            Préparation
          </Text>
          {recipe.instructions.map((step, i) => (
            <Text key={i} style={[variantStyles.detailLine, { color: colors.textSecondary }]}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      {/* Validate button */}
      <Pressable
        style={[variantStyles.validateBtn, { backgroundColor: Brand.secondary }]}
        onPress={() => onValidate(recipe)}>
        <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
        <Text style={variantStyles.validateBtnText}>Valider cette recette</Text>
      </Pressable>
    </View>
  );
}

const variantStyles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 8,
    marginHorizontal: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  indexBadge: {
    alignSelf: 'flex-start', backgroundColor: Brand.primary,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  indexText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700' },
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { fontSize: 12 },
  expandBtn: { paddingVertical: 4 },
  expandText: { fontSize: 13, fontWeight: '500' },
  details: { borderTopWidth: 1, paddingTop: 10, gap: 3 },
  detailsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  detailLine: { fontSize: 12, lineHeight: 18 },
  validateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 10, marginTop: 4,
  },
  validateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ── Main chat screen ───────────────────────────────────────────────────────

export default function ReflectionScreen() {
  const { addRecipe } = useRecipes();
  const { user, accessToken, signOut } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      text: 'Bonjour ! Décrivez la recette souhaitée et je vais générer 3 idées différentes. Exemple : "Poulet rôti high protein sous 500 kcal pour 6 portions"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Show sign-in gate if not authenticated
  if (!user) {
    return <SignInGate colors={colors} />;
  }

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
      const variants = await generateRecipeIdeas(prompt, 3, accessToken);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Voici 3 idées pour "${prompt}" — choisissez celle qui vous convient :`,
        variants,
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

  const handleValidate = async (recipe: GeminiRecipeResponse) => {
    try {
      await addRecipe(recipe);
      Alert.alert('✅ Recette validée !', `"${recipe.title}" a été ajoutée à vos recettes.`);
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
          <View
            style={[
              styles.avatar,
              { backgroundColor: isError ? Brand.danger : Brand.primary },
            ]}>
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
            // Wide bubble for variant cards
            item.variants && styles.bubbleWide,
          ]}>
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? '#fff' : isError ? Brand.danger : colors.text },
            ]}>
            {item.text}
          </Text>

          {/* 3 recipe variants as horizontally scrollable cards */}
          {item.variants && item.variants.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.variantsScroll}
              contentContainerStyle={styles.variantsContent}>
              {item.variants.map((v, i) => (
                <VariantCard
                  key={i}
                  recipe={v}
                  index={i}
                  colors={colors}
                  onValidate={handleValidate}
                />
              ))}
            </ScrollView>
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
      {/* User header */}
      <View style={[styles.userBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.userAvatar} />
        ) : (
          <IconSymbol name="person.crop.circle.fill" size={28} color={Brand.primary} />
        )}
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <IconSymbol name="arrow.right.square" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

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
            Gemini génère 3 variantes…
          </Text>
        </View>
      )}

      {/* Input row */}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}>
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
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
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

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 8 },

  userBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  userAvatar: { width: 28, height: 28, borderRadius: 14 },
  userName: { flex: 1, fontSize: 14, fontWeight: '600' },
  signOutBtn: { padding: 4 },

  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgWrapperUser: { flexDirection: 'row-reverse' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14 },

  bubble: {
    maxWidth: '82%', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  bubbleWide: { maxWidth: '95%' },
  bubbleUser: { borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleAssistant: { borderRadius: 16, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },

  variantsScroll: { marginTop: 10 },
  variantsContent: { gap: 10, paddingRight: 4 },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  loadingText: { fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, gap: 10, borderTopWidth: 1,
  },
  textInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
