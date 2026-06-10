import { AppColorScheme, AppColors } from '@/constants/theme';
import { useTheme } from '@/lib/ThemeContext';

export function useAppColors(): AppColorScheme {
  const { isDark } = useTheme();
  return isDark ? AppColors.dark : AppColors.light;
}
