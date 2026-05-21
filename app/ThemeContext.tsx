import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  updateTheme: (isDark: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('@theme_preference');
        if (saved !== null) {
          setIsDark(JSON.parse(saved));
        } else {
          // Se não houver preferência salva, usar a preferência do sistema
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (e) {
        console.error('Erro ao carregar preferência de tema:', e);
        setIsDark(systemColorScheme === 'dark');
      } finally {
        setIsReady(true);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  const updateTheme = async (isDarkValue: boolean) => {
    try {
      await AsyncStorage.setItem('@theme_preference', JSON.stringify(isDarkValue));
      setIsDark(isDarkValue);
    } catch (e) {
      console.error('Erro ao salvar preferência de tema:', e);
      throw e;
    }
  };

  const value: ThemeContextType = {
    isDark,
    colorScheme: isDark ? 'dark' : 'light',
    updateTheme,
  };

  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
