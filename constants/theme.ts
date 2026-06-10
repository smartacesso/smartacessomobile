/**
 * Paleta Smart Acesso (tokens --sa-*)
 * brand: identidade | accent: ações primárias | success/warning/danger/info: semânticos
 */

import { Platform } from 'react-native';

export const Palette = {
  brand: '#00263d',
  brandHover: '#003d5c',

  accent: '#4f6bf5',
  accentHover: '#6378f7',

  success: '#198754',
  warning: '#e6a817',
  danger: '#dc3545',
  info: '#0dcaf0',

  surface: '#f4f6f8',
  surfaceElevated: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',

  sidebarBg: '#0c1222',
  sidebarBgHover: '#1a2338',
  sidebarActive: '#4f6bf5',
  sidebarActiveBorder: '#7c9bff',

  /** Verde da marca (logo "acesso") */
  brandGreen: '#a3b808',

  /** @deprecated Use tokens semânticos (brand, accent, danger, etc.) */
  color1: '#00263d',
  /** @deprecated Use accent */
  color2: '#4f6bf5',
  /** @deprecated Use danger */
  color3: '#dc3545',
  /** @deprecated Use warning */
  color4: '#e6a817',
  /** @deprecated Use info */
  color5: '#0dcaf0',

  white: '#FFFFFF',
  black: '#000000',

  bgLight: '#f4f6f8',
  bgDark: '#000D1A',

  surfaceLight: '#ffffff',
  surfaceDark: '#1a2338',
  surfaceDarkAlt: '#243047',

  borderLight: '#e2e8f0',
  borderDark: '#2a3548',

  textPrimaryLight: '#1e293b',
  textPrimaryDark: '#f1f5f9',
  textSecondaryLight: '#475569',
  textSecondaryDark: '#cbd5e1',
  textMutedLight: '#64748b',
  textMutedDark: '#94a3b8',

  header: '#000D1A',
  overlay: 'rgba(0, 13, 26, 0.85)',

  error: '#dc3545',
  successBgLight: '#d1e7dd',
  successBgDark: '#0f2e1f',

  errorBgLight: '#f8d7da',
  errorBgDark: '#2e1015',

  warningBgLight: '#fff3cd',
  warningBgDark: '#2e250f',

  infoBgLight: '#cff4fc',
  infoBgDark: '#0a2e36',

  whatsapp: '#25D366',
} as const;

/** Aplica opacidade (0–1) a cor hex #RRGGBB */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const AppColors = {
  light: {
    text: Palette.textPrimaryLight,
    textSecondary: Palette.textSecondaryLight,
    textMuted: Palette.textMutedLight,
    background: Palette.bgLight,
    surface: Palette.surfaceLight,
    border: Palette.borderLight,
    tint: Palette.accent,
    icon: Palette.textMutedLight,
    tabIconDefault: Palette.textMutedLight,
    tabIconSelected: Palette.accent,
    header: Palette.surfaceLight,
    primary: Palette.accent,
    secondary: Palette.warning,
    danger: Palette.danger,
    info: Palette.info,
    onPrimary: Palette.white,
    onDark: Palette.white,
  },
  dark: {
    text: Palette.textPrimaryDark,
    textSecondary: Palette.textSecondaryDark,
    textMuted: Palette.textMutedDark,
    background: Palette.bgDark,
    surface: Palette.surfaceDark,
    border: Palette.borderDark,
    tint: Palette.accent,
    icon: Palette.textMutedDark,
    tabIconDefault: Palette.textMutedDark,
    tabIconSelected: Palette.accent,
    header: Palette.header,
    primary: Palette.accent,
    secondary: Palette.warning,
    danger: Palette.danger,
    info: Palette.info,
    onPrimary: Palette.white,
    onDark: Palette.white,
  },
};

export type StatusBarStyle = 'light-content' | 'dark-content';

export interface ScreenHeaderTheme {
  background: string;
  title: string;
  subtitle: string;
  icon: string;
  border: string;
  statusBar: StatusBarStyle;
  accentOrb: string;
  actionBg: string;
  greeting: string;
  brand: string;
  brandAccent: string;
}

export function getScreenHeaderTheme(isDark: boolean): ScreenHeaderTheme {
  if (isDark) {
    return {
      background: Palette.header,
      title: Palette.white,
      subtitle: 'rgba(255,255,255,0.65)',
      icon: Palette.white,
      border: 'transparent',
      statusBar: 'light-content',
      accentOrb: withAlpha(Palette.accent, 0.15),
      actionBg: 'rgba(255,255,255,0.1)',
      greeting: 'rgba(255,255,255,0.75)',
      brand: Palette.white,
      brandAccent: Palette.brandGreen,
    };
  }

  return {
    background: Palette.surfaceLight,
    title: Palette.textPrimaryLight,
    subtitle: Palette.textMutedLight,
    icon: Palette.textPrimaryLight,
    border: Palette.borderLight,
    statusBar: 'dark-content',
    accentOrb: withAlpha(Palette.accent, 0.1),
    actionBg: withAlpha(Palette.brand, 0.06),
    greeting: Palette.textSecondaryLight,
    brand: Palette.textPrimaryLight,
    brandAccent: Palette.brandGreen,
  };
}

export type AppColorScheme = typeof AppColors.light | typeof AppColors.dark;

export function getAppColors(isDark: boolean): AppColorScheme {
  return isDark ? AppColors.dark : AppColors.light;
}

/** Sombra de card — desativada no escuro para evitar artefato visual */
export function getCardShadow(isDark: boolean) {
  if (isDark) {
    return {
      shadowColor: 'transparent' as const,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  };
}

/** @deprecated Use AppColors — mantido para compatibilidade */
export const Colors = AppColors;

export const MenuColors = {
  cadastro: Palette.accent,
  historico: Palette.warning,
  avisos: Palette.danger,
  entregas: Palette.info,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
