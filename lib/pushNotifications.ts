import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { Palette } from '@/constants/theme';
import { joinServerPath } from './serverUrlUtils';

const APP_USER_AGENT = 'SmartAcessoApp/1.0.0';
const API_PREFIX = '/sistema/restful-services/app';
const STORED_PUSH_TOKEN_KEY = '@push_fcm_token';

export type PushNotificationType = 'aviso' | 'encomenda' | 'retirada_encomenda' | 'acesso';

export interface PushNotificationData {
  type?: PushNotificationType | string;
  screen?: string;
  id?: string;
}

export type PushRoutePath = '/avisos' | '/entregas' | '/historico';

export interface PushNavigationTarget {
  pathname: PushRoutePath;
  params?: { id?: string };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getPlatformLabel(): 'ANDROID' | 'IOS' | 'WEB' {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Smart Acesso',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: Palette.accent,
  });
}

function isExpoPushToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.startsWith('ExponentPushToken[') || trimmed.startsWith('ExpoPushToken');
}

export interface DeviceTokenRegisterResult {
  ok?: boolean;
  pedestreId?: number;
  tokensAtivos?: number;
  tokenMascarado?: string;
}

/** Alerta visível quando push chega com app em primeiro plano. */
export function showForegroundNotificationAlert(
  title: string | null | undefined,
  body: string | null | undefined,
  data?: PushNotificationData
): void {
  const heading = title?.trim() || 'Nova notificação';
  let message = body?.trim() || '';
  if (!message && data?.type) {
    const destino =
      data.type === 'acesso'
        ? 'Histórico de acessos'
        : data.type === 'aviso'
          ? 'Avisos'
          : data.type === 'encomenda' || data.type === 'retirada_encomenda'
            ? 'Entregas'
            : data.screen;
    message = destino ? `Abra ${destino} para ver detalhes.` : 'Toque na notificação para abrir.';
  }
  if (!message) message = 'Toque na notificação para abrir.';

  Alert.alert(heading, message, [{ text: 'OK' }]);
}

/** Obtém token FCM/APNs nativo (requer development build + google-services.json no Android). */
export async function obtainNativePushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] Simulador/emulador: push nativo indisponível.');
    return null;
  }

  if (Platform.OS === 'web') {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permissão de notificação negada.');
    return null;
  }

  await ensureAndroidChannel();

  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const token = deviceToken.data;
    if (token && isExpoPushToken(token)) {
      console.error('[push] Token Expo detectado — use build nativo com getDevicePushTokenAsync().');
      return null;
    }
    return token;
  } catch (error) {
    console.warn('[push] Falha ao obter token nativo (use dev build + Firebase):', error);
    return null;
  }
}

async function postDeviceToken(
  servidor: string,
  authToken: string,
  fcmToken: string
): Promise<DeviceTokenRegisterResult> {
  const url = joinServerPath(servidor, `${API_PREFIX}/device-token`);

  if (isExpoPushToken(fcmToken)) {
    throw new Error('Token Expo não é aceito. Use APK nativo (release), não Expo Go.');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'User-Agent': APP_USER_AGENT,
      },
      body: JSON.stringify({
        fcmToken,
        platform: getPlatformLabel(),
        appVersion: Constants.expoConfig?.version ?? '1.0.0',
      }),
    });
  } catch (error) {
    console.error('[push] Falha de rede ao registrar token:', error);
    throw new Error('Não foi possível registrar o token push no servidor.');
  }

  const responseText = await response.text();

  if (response.ok) {
    await AsyncStorage.setItem(STORED_PUSH_TOKEN_KEY, fcmToken);
    let data: DeviceTokenRegisterResult = { ok: true };
    try {
      if (responseText.trim()) {
        data = JSON.parse(responseText) as DeviceTokenRegisterResult;
      }
    } catch {
      /* resposta vazia ou legado */
    }
    console.log(
      '[push] device-token OK',
      'pedestreId=',
      data.pedestreId,
      'tokensAtivos=',
      data.tokensAtivos,
      data.tokenMascarado ?? ''
    );
    return data;
  }

  if (response.status === 404) {
    console.error('[push] Endpoint /device-token não encontrado (404).');
    throw new Error('Endpoint /device-token não encontrado no servidor.');
  }

  console.error('[push] device-token falhou', response.status, responseText.slice(0, 300));
  let message = `Erro ao registrar token (HTTP ${response.status}).`;
  try {
    const body = JSON.parse(responseText) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    if (responseText.trim()) message = responseText.trim().slice(0, 200);
  }
  throw new Error(message);
}

async function deleteDeviceToken(servidor: string, authToken: string, fcmToken: string): Promise<void> {
  const url = joinServerPath(servidor, `${API_PREFIX}/device-token`);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${authToken}`,
        'User-Agent': APP_USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fcmToken }),
    });

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      console.warn('[push] Erro ao remover token:', response.status, text.slice(0, 200));
    }
  } catch (error) {
    console.warn('[push] Falha ao remover token no servidor:', error);
  } finally {
    await AsyncStorage.removeItem(STORED_PUSH_TOKEN_KEY);
  }
}

/** Registra token FCM no backend após login. */
export async function registerDevicePushToken(
  servidor: string,
  authToken: string
): Promise<DeviceTokenRegisterResult | null> {
  const fcmToken = await obtainNativePushToken();
  if (!fcmToken) {
    console.warn('[push] Token FCM não obtido (permissão, emulador ou Firebase).');
    return null;
  }

  return postDeviceToken(servidor, authToken, fcmToken);
}

/** Remove token do backend no logout. */
export async function unregisterDevicePushToken(
  servidor: string,
  authToken: string
): Promise<void> {
  const stored = await AsyncStorage.getItem(STORED_PUSH_TOKEN_KEY);
  const fcmToken = stored ?? (await obtainNativePushToken());

  if (!fcmToken) {
    await AsyncStorage.removeItem(STORED_PUSH_TOKEN_KEY);
    return;
  }

  await deleteDeviceToken(servidor, authToken, fcmToken);
}

export function resolveRouteFromPushData(
  data: PushNotificationData | undefined
): PushNavigationTarget | null {
  if (!data) return null;

  let pathname: PushRoutePath | null = null;

  if (data.screen === '/avisos' || data.screen === '/entregas' || data.screen === '/historico') {
    pathname = data.screen;
  } else {
    switch (data.type) {
      case 'aviso':
        pathname = '/avisos';
        break;
      case 'encomenda':
      case 'retirada_encomenda':
        pathname = '/entregas';
        break;
      case 'acesso':
        pathname = '/historico';
        break;
      default:
        pathname = null;
    }
  }

  if (!pathname) return null;

  return data.id ? { pathname, params: { id: data.id } } : { pathname };
}

export function parsePushData(
  raw: Record<string, unknown> | undefined
): PushNotificationData | undefined {
  if (!raw) return undefined;

  return {
    type: typeof raw.type === 'string' ? raw.type : undefined,
    screen: typeof raw.screen === 'string' ? raw.screen : undefined,
    id: raw.id != null ? String(raw.id) : undefined,
  };
}

/** Envia push de teste via backend (perfil GERENCIAL). */
export async function testPushNotification(
  servidor: string,
  authToken: string,
  fcmToken: string
): Promise<void> {
  const url = joinServerPath(servidor, `${API_PREFIX}/push/test`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
      'User-Agent': APP_USER_AGENT,
    },
    body: JSON.stringify({
      fcmToken,
      title: 'Teste Smart Acesso',
      body: 'Push de teste enviado pelo app.',
    }),
  });

  if (response.ok) return;

  let message = 'Falha ao enviar push de teste.';
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    const text = await response.text();
    if (text.trim()) message = text.trim().slice(0, 200);
  }

  throw new Error(message);
}
