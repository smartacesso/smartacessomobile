import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ServerProvider } from './ServerContext';
import { ThemeProvider as CustomThemeProvider } from './ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <CustomThemeProvider>
      <ServerProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="historico" options={{ headerShown: false }} />
            <Stack.Screen name="avisos" options={{ headerShown: false }} />
            <Stack.Screen name="cadastro" options={{ headerShown: false }} />
            <Stack.Screen name="entregas" options={{ headerShown: false }} />
            <Stack.Screen name="perfil" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ServerProvider>
    </CustomThemeProvider>
  );
}
