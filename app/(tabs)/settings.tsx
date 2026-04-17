// app/(tabs)/settings.tsx — App settings & preferences

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

// ── Reusable setting row ───────────────────────────────────────────────────

function SettingRow({
  label,
  hint,
  value,
  unit,
  onChangeText,
  colors,
}: {
  label: string;
  hint?: string;
  value: string;
  unit?: string;
  onChangeText: (v: string) => void;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={rowStyles.wrap}>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[rowStyles.hint, { color: colors.textSecondary }]}>{hint}</Text>}
      </View>
      <View style={[rowStyles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          style={[rowStyles.input, { color: colors.text }]}
          selectTextOnFocus
        />
        {unit && <Text style={[rowStyles.unit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
  },
  info: { flex: 1, paddingRight: 12 },
  label: { fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 80,
  },
  input: { fontSize: 15, fontWeight: '600', minWidth: 44, textAlign: 'right' },
  unit: { fontSize: 12, marginLeft: 4 },
});

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: (typeof Colors)[keyof typeof Colors] }) {
  return (
    <Text style={[sectionStyles.header, { color: colors.textSecondary }]}>{title}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 8, marginTop: 4, paddingHorizontal: 4,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { settings, updateSettings, resetSettings } = useSettings();

  const [kcal, setKcal] = useState(String(settings.max_kcal_per_day));
  const [protein, setProtein] = useState(String(settings.min_protein_per_day));

  // Keep local state in sync when settings load from AsyncStorage
  useEffect(() => {
    setKcal(String(settings.max_kcal_per_day));
    setProtein(String(settings.min_protein_per_day));
  }, [settings.max_kcal_per_day, settings.min_protein_per_day]);

  const handleSave = async () => {
    const kcalNum = parseFloat(kcal);
    const proteinNum = parseFloat(protein);
    if (isNaN(kcalNum) || kcalNum <= 0 || isNaN(proteinNum) || proteinNum <= 0) {
      Alert.alert('Valeurs invalides', 'Veuillez saisir des valeurs numériques positives.');
      return;
    }
    await updateSettings({ max_kcal_per_day: kcalNum, min_protein_per_day: proteinNum });
    Alert.alert('Enregistré', 'Vos préférences ont été mises à jour.');
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser',
      'Remettre tous les paramètres aux valeurs par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* ── Planning & Planner Objectives ─────────────────────────── */}
      <SectionHeader title="Objectifs nutritionnels" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <IconSymbol name="flame.fill" size={18} color={Brand.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Objectifs par défaut</Text>
        </View>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Ces valeurs sont utilisées comme point de départ lors de la génération du planning et du
          filtrage des recettes.
        </Text>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <SettingRow
          label="Max calories / jour"
          hint="Utilisé pour filtrer les recettes du planning"
          value={kcal}
          unit="kcal"
          onChangeText={setKcal}
          colors={colors}
        />
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <SettingRow
          label="Min protéines / jour"
          hint="Objectif protéique journalier minimum"
          value={protein}
          unit="g"
          onChangeText={setProtein}
          colors={colors}
        />

        <View style={[styles.infoBox, { backgroundColor: Brand.primary + '12', borderColor: Brand.primary + '30' }]}>
          <IconSymbol name="info.circle" size={14} color={Brand.primary} />
          <Text style={[styles.infoText, { color: Brand.primary }]}>
            Par repas : max {Math.round(parseFloat(kcal) / 2) || 500} kcal ·
            min {Math.round(parseFloat(protein) / 2) || 50}g prot
          </Text>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: Brand.primary }]}
          onPress={handleSave}>
          <IconSymbol name="checkmark" size={16} color="#fff" />
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </Pressable>
      </View>

      {/* ── Batch cooking info ─────────────────────────────────────── */}
      <SectionHeader title="Batch cooking" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <IconSymbol name="fork.knife.circle" size={20} color={Brand.secondary} />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowLabel, { color: colors.text }]}>Portions par recette</Text>
            <Text style={[styles.infoRowValue, { color: Brand.secondary }]}>6 portions</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <IconSymbol name="calendar" size={20} color={Brand.accent} />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowLabel, { color: colors.text }]}>Structure de la semaine</Text>
            <Text style={[styles.infoRowValue, { color: colors.textSecondary }]}>
              Batch 1 (Lun–Mer) · Batch 2 (Jeu–Sam) · Dimanche libre
            </Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <IconSymbol name="bolt.fill" size={20} color="#8E6BBF" />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowLabel, { color: colors.text }]}>Recettes par semaine</Text>
            <Text style={[styles.infoRowValue, { color: colors.textSecondary }]}>
              4 recettes distinctes (2 déj. + 2 dîners)
            </Text>
          </View>
        </View>
      </View>

      {/* ── App info ──────────────────────────────────────────────── */}
      <SectionHeader title="Application" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <IconSymbol name="info.circle" size={20} color={colors.textSecondary} />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowLabel, { color: colors.text }]}>Miam Share</Text>
            <Text style={[styles.infoRowValue, { color: colors.textSecondary }]}>Version 1.0.0 — Batch Cooking Planner</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
        <Pressable
          style={styles.infoRow}
          onPress={handleReset}>
          <IconSymbol name="arrow.counterclockwise" size={20} color={Brand.danger} />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowLabel, { color: Brand.danger }]}>Réinitialiser les paramètres</Text>
            <Text style={[styles.infoRowValue, { color: colors.textSecondary }]}>
              Revenir aux valeurs par défaut
            </Text>
          </View>
        </Pressable>
      </View>

    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 4, paddingBottom: 48 },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    marginBottom: 8,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },

  separator: { height: 1, marginVertical: 8 },

  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12, marginBottom: 4,
  },
  infoText: { fontSize: 12, fontWeight: '500', flex: 1 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  infoRowText: { flex: 1 },
  infoRowLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  infoRowValue: { fontSize: 12 },
});
