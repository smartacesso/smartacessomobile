export type ServerProtocol = 'http' | 'https';

export const DEFAULT_SERVER_PROTOCOL: ServerProtocol = 'https';
export const DEFAULT_SERVER_HOST = 'smartacesso.com.br';

export function parseServerUrl(url: string): { protocol: ServerProtocol; host: string } {
  let trimmed = url.trim();

  if (!trimmed) {
    return { protocol: DEFAULT_SERVER_PROTOCOL, host: DEFAULT_SERVER_HOST };
  }

  let protocol: ServerProtocol = DEFAULT_SERVER_PROTOCOL;

  if (trimmed.toLowerCase().startsWith('https://')) {
    protocol = 'https';
    trimmed = trimmed.slice(8);
  } else if (trimmed.toLowerCase().startsWith('http://')) {
    protocol = 'http';
    trimmed = trimmed.slice(7);
  }

  const host = trimmed.replace(/\/+$/, '').trim();

  return {
    protocol,
    host: host || DEFAULT_SERVER_HOST,
  };
}

export function buildServerUrl(protocol: ServerProtocol, host: string): string {
  const cleanHost = host
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  if (!cleanHost) {
    return `${protocol}://${DEFAULT_SERVER_HOST}`;
  }

  return `${protocol}://${cleanHost}`;
}

export function getDefaultServerUrl(): string {
  return buildServerUrl(DEFAULT_SERVER_PROTOCOL, DEFAULT_SERVER_HOST);
}

/** Monta URL da API sem barras duplicadas */
export function joinServerPath(servidor: string, path: string): string {
  const base = servidor.trim().replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
