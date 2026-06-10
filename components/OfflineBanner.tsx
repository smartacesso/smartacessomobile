import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Palette, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useTheme } from '@/lib/ThemeContext';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { isDark } = useTheme();
  const colors = useAppColors();

  if (!visible) return null;

  return (
    <View style={[styles.banner, {
      backgroundColor: isDark ? Palette.warningBgDark : Palette.warningBgLight,
      borderBottomColor: withAlpha(Palette.color4, 0.35),
    }]}>
      <Feather name="wifi-off" size={16} color={Palette.color4} />
      <Text style={[styles.text, { color: isDark ? Palette.color4 : colors.text }]}>
        Sem conexão com a internet
      </Text>
    </View>
  );
}

interface CacheBannerProps {
  visible: boolean;
  label: string;
}

export function CacheBanner({ visible, label }: CacheBannerProps) {
  const { isDark } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.banner, {
      backgroundColor: isDark ? Palette.infoBgDark : Palette.infoBgLight,
      borderBottomColor: withAlpha(Palette.color5, 0.35),
    }]}>
      <Feather name="clock" size={16} color={Palette.color5} />
      <Text style={[styles.text, { color: isDark ? Palette.color5 : Palette.textPrimaryLight }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
