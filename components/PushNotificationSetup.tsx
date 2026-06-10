import {
  parsePushData,
  registerDevicePushToken,
  resolveRouteFromPushData,
  showForegroundNotificationAlert,
} from '@/lib/pushNotifications';
import { useServer } from '@/lib/ServerContext';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';

function navigateFromNotification(data: Record<string, unknown> | undefined): void {
  const target = resolveRouteFromPushData(parsePushData(data));
  if (!target) return;

  if (target.params) {
    router.push({ pathname: target.pathname, params: target.params });
  } else {
    router.push(target.pathname);
  }
}

/**
 * Registra push após login e trata toque em notificações.
 * Token nativo exige development build + google-services.json (Android).
 */
export function PushNotificationSetup() {
  const { servidor, token, isLoggedIn } = useServer();
  const lastRegisteredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      lastRegisteredRef.current = null;
      return;
    }

    const key = `${servidor}:${token.slice(0, 12)}`;
    if (lastRegisteredRef.current === key) return;

    lastRegisteredRef.current = key;
    registerDevicePushToken(servidor, token).catch((error) => {
      console.warn('[push] registerDevicePushToken:', error instanceof Error ? error.message : error);
    });
  }, [isLoggedIn, token, servidor]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = parsePushData(content.data as Record<string, unknown>);
      console.log('[push] Recebida em foreground:', content.title, data?.type);
      showForegroundNotificationAlert(content.title, content.body, data);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response.notification.request.content.data as Record<string, unknown>);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateFromNotification(
          response.notification.request.content.data as Record<string, unknown>
        );
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return null;
}
