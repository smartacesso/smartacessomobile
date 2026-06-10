import { Palette } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadMoreFooterProps {
  loadingMore: boolean;
  hasMore: boolean;
  totalLoaded: number;
}

export function LoadMoreFooter({ loadingMore, hasMore, totalLoaded }: LoadMoreFooterProps) {
  const colors = useAppColors();

  if (loadingMore) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator size="small" color={Palette.color2} />
        <Text style={[styles.text, { color: colors.textMuted }]}>Carregando mais...</Text>
      </View>
    );
  }

  if (!hasMore && totalLoaded > 0) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.text, { color: colors.textMuted }]}>Fim da lista</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 12,
  },
});
