import { AppColors, Palette, withAlpha } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

interface ListSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function ListSearchInput({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  onClear,
}: ListSearchInputProps) {
  const { isDark } = useTheme();
  const colors = isDark ? AppColors.dark : AppColors.light;

  return (
    <View style={[styles.searchRow, {
      backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
      borderColor: colors.border,
    }]}>
      <Feather name="search" size={18} color={colors.textMuted} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => (onClear ? onClear() : onChangeText(''))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface FilterChipGroupProps<T extends string> {
  options: FilterChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  accentColor?: string;
}

export function FilterChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  accentColor = Palette.color2,
}: FilterChipGroupProps<T>) {
  const { isDark } = useTheme();
  const colors = isDark ? AppColors.dark : AppColors.light;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContent}
    >
      {options.map((option) => {
        const isActive = selected === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? withAlpha(accentColor, 0.15)
                  : isDark ? Palette.surfaceDarkAlt : Palette.bgLight,
                borderColor: isActive ? accentColor : colors.border,
              },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? accentColor : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

interface ListFiltersPanelProps {
  children: React.ReactNode;
}

export function ListFiltersPanel({ children }: ListFiltersPanelProps) {
  return <View style={styles.panel}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  chipsContent: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
