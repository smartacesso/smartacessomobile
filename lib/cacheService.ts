import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AcessoEvento, Encomenda } from './apiService';

const CACHE_KEYS = {
  ACESSOS: '@cache_acessos',
  ENCOMENDAS: '@cache_encomendas',
} as const;

interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

async function saveCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

async function loadCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export async function saveAcessosCache(data: AcessoEvento[]): Promise<void> {
  await saveCache(CACHE_KEYS.ACESSOS, data);
}

export async function loadAcessosCache(): Promise<CacheEntry<AcessoEvento[]> | null> {
  return loadCache<AcessoEvento[]>(CACHE_KEYS.ACESSOS);
}

export async function saveEncomendasCache(data: Encomenda[]): Promise<void> {
  await saveCache(CACHE_KEYS.ENCOMENDAS, data);
}

export async function loadEncomendasCache(): Promise<CacheEntry<Encomenda[]> | null> {
  return loadCache<Encomenda[]>(CACHE_KEYS.ENCOMENDAS);
}
