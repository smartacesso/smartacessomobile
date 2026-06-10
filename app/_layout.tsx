import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { ServerProvider } from '@/lib/ServerContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/ThemeContext';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationRoot() {
  const { isDark } = useTheme();

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: Palette.bgDark,
          card: Palette.surfaceDark,
          border: Palette.borderDark,
          text: Palette.textPrimaryDark,
          primary: Palette.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: Palette.bgLight,
          card: Palette.surfaceLight,
          border: Palette.borderLight,
          text: Palette.textPrimaryLight,
          primary: Palette.accent,
        },
      };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: isDark ? Palette.bgDark : Palette.bgLight },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="historico" options={{ headerShown: false }} />
        <Stack.Screen name="avisos" options={{ headerShown: false }} />
        <Stack.Screen name="aviso-form" options={{ headerShown: false }} />
        <Stack.Screen name="cadastro" options={{ headerShown: false }} />
        <Stack.Screen name="entregas" options={{ headerShown: false }} />
        <Stack.Screen name="perfil" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CustomThemeProvider>
        <ServerProvider>
          <PushNotificationSetup />
          <NavigationRoot />
        </ServerProvider>
      </CustomThemeProvider>
    </SafeAreaProvider>
  );
}
