import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useServer } from '@/lib/ServerContext';

export function useRequireAuth() {
  const router = useRouter();
  const { isLoggedIn, token } = useServer();
  const isAuthorized = isLoggedIn && Boolean(token);

  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/(tabs)');
    }
  }, [isAuthorized, router]);

  return { isAuthorized };
}
