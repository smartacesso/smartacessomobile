import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUsuario } from './apiService';

// Chaves de armazenamento
export const STORAGE_KEYS = {
  LOGIN_ORGANIZATION: '@login_organization',
  LOGIN_USER: '@login_user',
  LOGIN_SERVER: '@login_server',
  THEME_PREFERENCE: '@theme_preference',
  TOKEN: '@auth_token',
  USER_PROFILE: '@user_profile',
};

// Salvar informações de login (exceto senha)
export const saveLoginInfo = async (organization: string, user: string, server: string) => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.LOGIN_ORGANIZATION, organization],
      [STORAGE_KEYS.LOGIN_USER, user],
      [STORAGE_KEYS.LOGIN_SERVER, server],
    ]);
  } catch (e) {
    console.error('Erro ao salvar informações de login:', e);
    throw e;
  }
};

// Carregar informações de login salvas
export const loadLoginInfo = async () => {
  try {
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.LOGIN_ORGANIZATION,
      STORAGE_KEYS.LOGIN_USER,
      STORAGE_KEYS.LOGIN_SERVER,
    ]);

    return {
      organization: values[0][1] || '',
      user: values[1][1] || '',
      server: values[2][1] || '',
    };
  } catch (e) {
    console.error('Erro ao carregar informações de login:', e);
    return {
      organization: '',
      user: '',
      server: '',
    };
  }
};

// Limpar informações de login completamente
export const clearLoginInfo = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.LOGIN_ORGANIZATION,
      STORAGE_KEYS.LOGIN_USER,
      STORAGE_KEYS.LOGIN_SERVER,
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER_PROFILE,
    ]);
  } catch (e) {
    console.error('Erro ao limpar informações de login:', e);
    throw e;
  }
};

// Salvar token
export const saveToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (e) {
    console.error('Erro ao salvar token:', e);
    throw e;
  }
};

// Carregar token
export const loadToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (e) {
    console.error('Erro ao carregar token:', e);
    return null;
  }
};

// Limpar token
export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch (e) {
    console.error('Erro ao limpar token:', e);
    throw e;
  }
};

export async function saveUserProfile(profile: AppUsuario): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function loadUserProfile(): Promise<AppUsuario | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as AppUsuario;
  } catch {
    return null;
  }
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
}
