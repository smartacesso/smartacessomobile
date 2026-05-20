import React, { createContext, ReactNode, useState } from 'react';

interface ServerContextType {
  servidor: string;
  setServidor: (url: string) => void;
  token: string | null;
  setToken: (token: string | null) => void;
}

export const ServerContext = createContext<ServerContextType | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servidor, setServidor] = useState('https://smartacesso.com.br');
  const [token, setToken] = useState<string | null>(null);

  return (
    <ServerContext.Provider value={{ servidor, setServidor, token, setToken }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = React.useContext(ServerContext);
  if (!context) {
    throw new Error('useServer deve ser usado dentro de ServerProvider');
  }
  return context;
}
