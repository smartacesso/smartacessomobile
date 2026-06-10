import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Palette, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useTheme } from '@/lib/ThemeContext';

interface EmptyListStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  onRetry?: () => void;
  onClearFilters?: () => void;
  retryLabel?: string;
}

export function EmptyListState({
  icon = 'inbox',
  title,
  message,
  onRetry,
  onClearFilters,
  retryLabel = 'Tentar novamente',
}: EmptyListStateProps) {
  const { isDark } = useTheme();
  const colors = useAppColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: isDark ? Palette.surfaceDark : withAlpha(Palette.color1, 0.08) }]}>
        <Feather name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      <View style={styles.actions}>
        {onClearFilters && (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]}
            onPress={onClearFilters}
          >
            <Feather name="filter" size={16} color={colors.text} />
            <Text style={[styles.btnText, { color: colors.text }]}>Limpar filtros</Text>
          </TouchableOpacity>
        )}
        {onRetry && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onRetry}>
            <Feather name="refresh-cw" size={16} color={Palette.white} />
            <Text style={[styles.btnText, { color: Palette.white }]}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, justifyContent: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: Palette.color2 },
  btnSecondary: { borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: '600' },
});
