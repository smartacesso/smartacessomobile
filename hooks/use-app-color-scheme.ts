import { useColorScheme } from 'react-native';

export function useAppColorScheme() {
  const colorScheme = useColorScheme();
  
  // Retorna 'light' como padrão se colorScheme for null
  // ou retorna o valor de colorScheme se for 'dark' ou 'light'
  return colorScheme || 'light';
}
