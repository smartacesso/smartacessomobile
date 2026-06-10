import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppColorScheme, AppColors, Palette, withAlpha } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AppSafeArea } from '@/components/AppSafeArea';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { testServerConnection } from '@/lib/authService';
import { fetchHealthStatus, fetchPushStatus, type PushStatus } from '@/lib/apiService';
import { obtainNativePushToken, registerDevicePushToken, testPushNotification } from '@/lib/pushNotifications';
import { getDefaultServerUrl, parseServerUrl } from '@/lib/serverUrlUtils';
import { useServer } from '@/lib/ServerContext';
import { clearLoginInfo, loadLoginInfo } from '@/lib/StorageUtils';
import { useTheme } from '@/lib/ThemeContext';
import { isPerfilGerencial, labelPerfil } from '@/lib/userUtils';

interface ConnectionInfo {
  organization: string;
  user: string;
  server: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const { servidor, setServidor, logout, isLoggedIn, user, token } = useServer();
  const { isDark, updateTheme } = useTheme();
  const colors = isDark ? AppColors.dark : AppColors.light;
  const { isOffline } = useNetworkStatus();
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [healthInfo, setHealthInfo] = useState<{ jwt?: boolean; firebase?: boolean } | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushStatusError, setPushStatusError] = useState<string | null>(null);
  useEffect(() => {
    setIsDarkMode(isDark);
  }, [isDark]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    organization: '',
    user: '',
    server: '',
  });

  const loadConnectionInfo = useCallback(async () => {
    const { organization, user, server } = await loadLoginInfo();
    setConnectionInfo({
      organization,
      user,
      server: server || servidor,
    });
  }, [servidor]);

  const loadPushStatus = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setPushStatus(null);
      setPushStatusError(null);
      return;
    }
    try {
      const status = await fetchPushStatus(servidor, token);
      setPushStatus(status);
      setPushStatusError(null);
    } catch (error) {
      setPushStatus(null);
      setPushStatusError(error instanceof Error ? error.message : 'Não foi possível consultar push/status.');
    }
  }, [isLoggedIn, token, servidor]);

  useFocusEffect(
    useCallback(() => {
      loadConnectionInfo();
      fetchHealthStatus(servidor)
        .then((health) => {
          setHealthInfo({
            jwt: health.jwtConfigured,
            firebase: health.firebaseReady,
          });
        })
        .catch(() => setHealthInfo(null));
      loadPushStatus();
    }, [loadConnectionInfo, servidor, loadPushStatus])
  );

  const toggleTheme = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await updateTheme(value);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar sua preferência de tema.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(tabs)');
          } catch {
            Alert.alert('Erro', 'Não foi possível encerrar a sessão.');
          }
        },
      },
    ]);
  };

  const handleClearDataAndLogout = () => {
    Alert.alert(
      'Limpar Dados',
      'Deseja limpar todos os dados salvos (usuário, organização e servidor) e fazer logout?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar e Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              await clearLoginInfo();
              setServidor(getDefaultServerUrl());
              router.replace('/(tabs)');
            } catch {
              Alert.alert('Erro', 'Não foi possível limpar os dados.');
            }
          },
        },
      ]
    );
  };

  const { protocol, host } = parseServerUrl(connectionInfo.server || servidor);
  const displayUser = user?.nome || connectionInfo.user || 'Usuário não informado';
  const displayOrg = user?.cliente || connectionInfo.organization || '—';
  const displayPerfil = labelPerfil(user?.perfil);
  const gerencial = isPerfilGerencial(user);
  const sessionLabel = isLoggedIn ? 'Sessão ativa' : 'Sessão encerrada';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const result = await testServerConnection(connectionInfo.server || servidor);
    setTestingConnection(false);

    if (result === 'ok') {
      Alert.alert('Conexão OK', 'Servidor alcançado com sucesso.');
    } else if (result === 'not_found') {
      Alert.alert('Erro 404', 'Endpoint não encontrado. Verifique a URL do servidor.');
    } else {
      Alert.alert('Sem conexão', 'Não foi possível alcançar o servidor.');
    }
  };

  const handleTestPush = async () => {
    if (!token) {
      Alert.alert('Erro', 'Faça login novamente para testar push.');
      return;
    }

    setTestingPush(true);
    try {
      const fcmToken = await obtainNativePushToken();
      if (!fcmToken) {
        Alert.alert(
          'Push indisponível',
          'Use um build nativo (não Expo Go) com google-services.json e permissão de notificação.'
        );
        return;
      }

      await testPushNotification(servidor, token, fcmToken);
      Alert.alert('Push enviado', 'Verifique se a notificação chegou neste dispositivo.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao enviar push de teste.');
    } finally {
      setTestingPush(false);
    }
  };

  const handleReregisterPush = async () => {
    if (!token) {
      Alert.alert('Erro', 'Faça login novamente para registrar push.');
      return;
    }

    setRegisteringPush(true);
    try {
      const result = await registerDevicePushToken(servidor, token);
      if (!result) {
        Alert.alert(
          'Push indisponível',
          'Não foi possível obter o token FCM. Verifique permissão de notificação e use o APK release (não Expo Go).'
        );
        return;
      }
      await loadPushStatus();
      Alert.alert(
        'Token registrado',
        `Pedestre ${result.pedestreId ?? user?.id ?? '—'}\nTokens ativos: ${result.tokensAtivos ?? 1}`
      );
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao registrar token push.');
    } finally {
      setRegisteringPush(false);
    }
  };

  const pushStatusLabel = (() => {
    if (pushStatusError) return pushStatusError;
    if (!pushStatus) return 'Carregando...';
    const n = pushStatus.tokensAtivos ?? 0;
    if (n === 0) return 'Nenhum token FCM ativo — toque em Re-registrar';
    const mascarado = pushStatus.tokens?.[0]?.tokenMascarado;
    return `${n} token(s) ativo(s)${mascarado ? ` · ${mascarado}` : ''}`;
  })();

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Meu Perfil" onBack={() => router.back()} />
      <OfflineBanner visible={isOffline} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(Palette.color2, 0.15) }]}>
            <Feather name="user" size={40} color={Palette.color2} />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{displayUser}</Text>
          <Text style={[styles.userOrg, { color: colors.textMuted }]}>{displayOrg}</Text>
          {user?.perfil ? (
            <View style={[styles.perfilBadge, { backgroundColor: withAlpha(Palette.color2, 0.15) }]}>
              <Feather name="shield" size={14} color={Palette.color2} />
              <Text style={styles.perfilBadgeText}>{displayPerfil}</Text>
            </View>
          ) : null}
          <View style={[styles.sessionBadge, {
            backgroundColor: isLoggedIn
              ? (isDark ? Palette.successBgDark : Palette.successBgLight)
              : (isDark ? Palette.surfaceDarkAlt : withAlpha(Palette.color1, 0.08)),
          }]}>
            <View style={[styles.sessionDot, { backgroundColor: isLoggedIn ? Palette.success : colors.textMuted }]} />
            <Text style={[styles.sessionText, { color: isLoggedIn ? Palette.success : colors.textMuted }]}>
              {sessionLabel}
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight, borderColor: colors.border }]}>
          <Text style={[styles.infoCardTitle, { color: colors.text }]}>Dados de Conexão</Text>

          <InfoRow
            icon="office-building"
            label="Organização"
            value={connectionInfo.organization}
            isDark={isDark}
            colors={colors}
            iconLib="material"
          />
          <InfoRow icon="user" label="Usuário" value={connectionInfo.user} isDark={isDark} colors={colors} />
          <InfoRow
            icon="shield"
            label="Protocolo"
            value={protocol.toUpperCase()}
            isDark={isDark}
            colors={colors}
          />
          <InfoRow icon="globe" label="Servidor" value={host} isDark={isDark} colors={colors} isLast={!healthInfo} />
          {healthInfo ? (
            <InfoRow
              icon="activity"
              label="Backend push"
              value={
                healthInfo.firebase
                  ? 'Firebase configurado'
                  : healthInfo.jwt
                    ? 'JWT OK · Firebase pendente'
                    : 'Configuração incompleta'
              }
              isDark={isDark}
              colors={colors}
              isLast
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.testBtn, { borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight }]}
          onPress={handleTestConnection}
          disabled={testingConnection}
        >
          {testingConnection ? (
            <ActivityIndicator color={Palette.color2} />
          ) : (
            <>
              <Feather name="wifi" size={18} color={Palette.color2} />
              <Text style={styles.testBtnText}>Testar conexão com o servidor</Text>
            </>
          )}
        </TouchableOpacity>

        {isLoggedIn ? (
          <View style={[styles.infoCard, {
            backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
            borderColor: colors.border,
            marginBottom: 16,
          }]}>
            <Text style={[styles.infoCardTitle, { color: colors.text }]}>Notificações push</Text>
            <InfoRow
              icon="hash"
              label="Pedestre (JWT)"
              value={String(pushStatus?.pedestreId ?? user?.id ?? '—')}
              isDark={isDark}
              colors={colors}
            />
            <InfoRow
              icon="bell"
              label="Status no servidor"
              value={pushStatusLabel}
              isDark={isDark}
              colors={colors}
              isLast
            />
            <TouchableOpacity
              style={[styles.testBtn, { borderColor: colors.border, marginBottom: 0, marginTop: 4 }]}
              onPress={handleReregisterPush}
              disabled={registeringPush}
            >
              {registeringPush ? (
                <ActivityIndicator color={Palette.color2} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={18} color={Palette.color2} />
                  <Text style={styles.testBtnText}>Re-registrar token push</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {gerencial ? (
          <TouchableOpacity
            style={[styles.testBtn, { borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight }]}
            onPress={handleTestPush}
            disabled={testingPush}
          >
            {testingPush ? (
              <ActivityIndicator color={Palette.color3} />
            ) : (
              <>
                <Feather name="bell" size={18} color={Palette.color3} />
                <Text style={[styles.testBtnText, { color: Palette.color3 }]}>Testar notificação push</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <View style={[styles.settingsCard, {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
          borderColor: colors.border,
        }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.rowInfo}>
              <Feather name="moon" size={20} color={isDarkMode ? Palette.color2 : colors.textMuted} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: isDark ? Palette.surfaceDarkAlt : '#D1D5DB', true: Palette.color2 }}
              thumbColor={isDarkMode ? Palette.white : Palette.white}
              ios_backgroundColor={isDark ? Palette.surfaceDarkAlt : '#D1D5DB'}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={Palette.color3} />
          <Text style={styles.logoutText}>Sair do Aplicativo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 20 }]}
          onPress={handleClearDataAndLogout}
        >
          <Feather name="trash-2" size={20} color={Palette.color4} />
          <Text style={[styles.logoutText, { color: Palette.color4 }]}>Limpar Dados e Sair</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Smart Acesso v{appVersion}
        </Text>
      </ScrollView>
    </AppSafeArea>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isDark,
  colors,
  iconLib = 'feather',
  isLast = false,
}: {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
  colors: AppColorScheme;
  iconLib?: 'feather' | 'material';
  isLast?: boolean;
}) {
  const displayValue = value || '—';

  return (
    <View style={[styles.infoRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      {iconLib === 'material' ? (
        <MaterialCommunityIcons name={icon as any} size={18} color={Palette.color2} />
      ) : (
        <Feather name={icon as any} size={18} color={colors.textMuted} />
      )}
      <View style={styles.infoRowContent}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
          {displayValue}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  userCard: { alignItems: 'center', marginVertical: 20 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userOrg: { fontSize: 14, marginTop: 4 },
  perfilBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  perfilBadgeText: { color: Palette.color2, fontSize: 12, fontWeight: '700' },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sessionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sessionText: { fontSize: 12, fontWeight: '600' },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  infoCardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  testBtnText: { color: Palette.color2, fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  infoRowContent: { flex: 1, marginLeft: 12 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { marginLeft: 15, fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 15 },
  logoutText: { color: Palette.color3, marginLeft: 10, fontWeight: 'bold' },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
