import { joinServerPath } from './serverUrlUtils';
import { clearToken } from './StorageUtils';

export type SessionValidationResult = 'valid' | 'invalid' | 'unreachable';

const APP_USER_AGENT = 'SmartAcessoApp/1.0.0';

export async function validateSession(servidor: string, token: string): Promise<SessionValidationResult> {
  try {
    const url = joinServerPath(servidor, '/sistema/restful-services/app/encomendas');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': APP_USER_AGENT,
      },
      body: JSON.stringify({ pagina: 0, tamanho: 1 }),
    });

    if (response.ok) return 'valid';
    if (response.status === 401 || response.status === 403) return 'invalid';
    return 'invalid';
  } catch {
    return 'unreachable';
  }
}

export async function logoutSession(): Promise<void> {
  await clearToken();
}

export type ConnectionTestResult = 'ok' | 'unreachable' | 'not_found' | 'error';

export async function testServerConnection(servidor: string): Promise<ConnectionTestResult> {
  try {
    const healthUrl = joinServerPath(servidor, '/sistema/restful-services/app/health');
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': APP_USER_AGENT,
      },
    });

    if (healthResponse.ok) return 'ok';
    if (healthResponse.status === 404) {
      // Servidor antigo sem /health — fallback para login
    } else {
      return 'error';
    }
  } catch {
    return 'unreachable';
  }

  try {
    const url = joinServerPath(servidor, '/sistema/restful-services/app/login');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': APP_USER_AGENT,
      },
      body: JSON.stringify({ login: '', senha: '', cliente: '' }),
    });

    if (response.status === 404) return 'not_found';
    return 'ok';
  } catch {
    return 'unreachable';
  }
}
