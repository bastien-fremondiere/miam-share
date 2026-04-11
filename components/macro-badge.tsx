// components/macro-badge.tsx — A single macro stat pill

import { Brand } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MacroBadgeProps {
  label: string;
  value: number;
  unit: string;
  color?: string;
}

export function MacroBadge({ label, value, unit, color }: MacroBadgeProps) {
  const bgColor = color ?? Brand.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor + '1A' }]}>
      <Text style={[styles.value, { color: bgColor }]}>
        {value}
        <Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={[styles.label, { color: bgColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 60,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
