import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import type { AppUsuario } from './apiService';
import { logoutSession } from './authService';
import { unregisterDevicePushToken } from './pushNotifications';
import { getDefaultServerUrl } from './serverUrlUtils';
import { clearUserProfile } from './StorageUtils';

interface ServerContextType {
  servidor: string;
  setServidor: (url: string) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  user: AppUsuario | null;
  setUser: (user: AppUsuario | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  logout: () => Promise<void>;
}

export const ServerContext = createContext<ServerContextType | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servidor, setServidor] = useState(getDefaultServerUrl());
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUsuario | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const logout = useCallback(async () => {
    if (token) {
      await unregisterDevicePushToken(servidor, token);
    }
    await logoutSession();
    await clearUserProfile();
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  }, [servidor, token]);

  return (
    <ServerContext.Provider
      value={{ servidor, setServidor, token, setToken, user, setUser, isLoggedIn, setIsLoggedIn, logout }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer deve ser usado dentro de ServerProvider');
  }
  return context;
}
