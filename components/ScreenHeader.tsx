import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getScreenHeaderTheme } from '@/constants/theme';
import { useTheme } from '@/lib/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon = 'refresh-cw',
  onRightPress,
}: ScreenHeaderProps) {
  const { isDark } = useTheme();
  const headerTheme = getScreenHeaderTheme(isDark);

  return (
    <>
      <StatusBar barStyle={headerTheme.statusBar} backgroundColor={headerTheme.background} />
      <View style={[styles.header, {
        backgroundColor: headerTheme.background,
        borderBottomColor: headerTheme.border,
        borderBottomWidth: isDark ? 0 : 1,
        minHeight: subtitle ? 64 : 60,
      }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Feather name="arrow-left" size={22} color={headerTheme.icon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}

        {subtitle ? (
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: headerTheme.title }]}>{title}</Text>
            <Text style={[styles.headerSubtitle, { color: headerTheme.subtitle }]}>{subtitle}</Text>
          </View>
        ) : (
          <Text style={[styles.headerTitle, styles.headerTitleCenter, { color: headerTheme.title }]}>
            {title}
          </Text>
        )}

        {onRightPress ? (
          <TouchableOpacity onPress={onRightPress} style={styles.headerBtn}>
            <Feather name={rightIcon} size={20} color={headerTheme.icon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerTitleCenter: { flex: 1, textAlign: 'center', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
});
