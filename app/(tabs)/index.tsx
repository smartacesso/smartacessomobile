import { OfflineBanner } from '@/components/OfflineBanner';
import { AppSafeArea } from '@/components/AppSafeArea';
import { AppColorScheme, AppColors, getCardShadow, getScreenHeaderTheme, MenuColors, Palette, withAlpha } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { testServerConnection, validateSession } from '@/lib/authService';
import { fetchResumo, fetchMe, type AppUsuario } from '@/lib/apiService';
import { registerDevicePushToken } from '@/lib/pushNotifications';
import { buildServerUrl, parseServerUrl, ServerProtocol } from '@/lib/serverUrlUtils';
import { useServer } from '@/lib/ServerContext';
import { loadLoginInfo, loadToken, loadUserProfile, saveLoginInfo, saveToken, saveUserProfile } from '@/lib/StorageUtils';
import { useTheme } from '@/lib/ThemeContext';
import { isPerfilGerencial } from '@/lib/userUtils';

export default function SmartAcessoApp() {
  const router = useRouter();
  const { servidor, setServidor, setToken, token, isLoggedIn, setIsLoggedIn, logout, setUser, user } = useServer();
  const { isDark } = useTheme();
  const colors = isDark ? AppColors.dark : AppColors.light;
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  
  // Estados do Login
  const [isHydrated, setIsHydrated] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [organizacao, setOrganizacao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [displayUser, setDisplayUser] = useState('');
  const [displayOrg, setDisplayOrg] = useState('');

  // Estados de Configuração do Servidor
  const [modalVisible, setModalVisible] = useState(false);
  const [serverProtocol, setServerProtocol] = useState<ServerProtocol>('https');
  const [serverHost, setServerHost] = useState('smartacesso.com.br');
  const [testingConnection, setTestingConnection] = useState(false);
  const [summary, setSummary] = useState({ acessosHoje: 0, entregasPendentes: 0, loading: false });

  const openServerModal = () => {
    const { protocol, host } = parseServerUrl(servidor);
    setServerProtocol(protocol);
    setServerHost(host);
    setModalVisible(true);
  };

  const persistConnectionInfo = async (org: string, user: string, server: string) => {
    try {
      await saveLoginInfo(org, user, server);
    } catch (e) {
      console.error('Erro ao salvar dados de conexão:', e);
    }
  };

  const handleSaveServer = async () => {
    if (!serverHost.trim()) {
      Alert.alert('Erro', 'Informe o endereço do servidor.');
      return;
    }

    const url = buildServerUrl(serverProtocol, serverHost);
    setServidor(url);
    await persistConnectionInfo(organizacao, usuario, url);
    setModalVisible(false);
  };

  const handleTestConnection = async () => {
    if (!serverHost.trim()) {
      Alert.alert('Erro', 'Informe o endereço do servidor.');
      return;
    }

    setTestingConnection(true);
    const url = buildServerUrl(serverProtocol, serverHost);
    const result = await testServerConnection(url);
    setTestingConnection(false);

    if (result === 'ok') {
      Alert.alert('Conexão OK', 'Servidor alcançado com sucesso.');
    } else if (result === 'not_found') {
      Alert.alert('Erro 404', 'Endpoint não encontrado. Verifique a URL.');
    } else {
      Alert.alert('Sem conexão', 'Não foi possível alcançar o servidor.');
    }
  };

  const loadDashboardSummary = useCallback(async () => {
    if (!isLoggedIn || !token) return;

    setSummary((prev) => ({ ...prev, loading: true }));
    try {
      const resumo = await fetchResumo(servidor, token);
      setSummary({
        acessosHoje: resumo.acessosHoje,
        entregasPendentes: resumo.encomendasPendentes,
        loading: false,
      });
    } catch {
      setSummary((prev) => ({ ...prev, loading: false }));
    }
  }, [isLoggedIn, token, servidor]);

  // Carregar dados salvos ao inicializar
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const { organization, user, server } = await loadLoginInfo();

        setOrganizacao(organization);
        setUsuario(user);
        if (server) setServidor(server);

        const storedToken = await loadToken();
        const serverUrl = server || servidor;

        if (storedToken) {
          setToken(storedToken);
          setIsValidatingSession(true);

          const sessionStatus = await validateSession(serverUrl, storedToken);

          if (sessionStatus === 'valid') {
            setIsLoggedIn(true);
            const profile = await loadUserProfile();
            if (profile) setUser(profile);
          } else if (sessionStatus === 'invalid') {
            await logout();
          } else {
            setToken(storedToken);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar dados de conexão:', e);
      } finally {
        setIsValidatingSession(false);
        setIsHydrated(true);
      }
    };

    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLoginInfo().then(({ organization, user: loginUser, server }) => {
        if (!isLoggedIn) {
          setOrganizacao(organization);
          setUsuario(loginUser);
          if (server) setServidor(server);
        } else {
          setDisplayUser(user?.nome || loginUser || 'Usuário');
          setDisplayOrg(organization || user?.cliente || '');
        }
      });

      if (isLoggedIn) {
        const timer = setTimeout(() => {
          loadDashboardSummary();
        }, 400);
        return () => clearTimeout(timer);
      }
    }, [isLoggedIn, setServidor, loadDashboardSummary, user])
  );

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setSenha('');
            } catch (e) {
              console.error('Erro ao fazer logout:', e);
            }
          },
        },
      ]
    );
  };

  const handleLogin = async () => {
    if (!usuario || !senha || !organizacao) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    setLoading(true);
    await persistConnectionInfo(organizacao, usuario, servidor);

    try {
      const urlCompleta = `${servidor}/sistema/restful-services/app/login`;
      console.log('Conectando em:', urlCompleta);

      const response = await fetch(urlCompleta, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SmartAcessoApp/1.0' 
        },
        body: JSON.stringify({
          login: usuario,
          senha: senha,
          cliente: organizacao
        }),
      });

      const responseText = await response.text();
      console.log("Status Code:", response.status);

      try {
        const data = JSON.parse(responseText);
        
        if (response.ok) {
          console.log("Login realizado com sucesso!");
          if (data.token) {
            setToken(data.token);
            await saveToken(data.token);
          }
          await persistConnectionInfo(organizacao, usuario, servidor);
          setIsLoggedIn(true);

          let profile: AppUsuario | null = null;
          if (data.usuario) {
            profile = {
              id: Number(data.usuario.id),
              nome: data.usuario.nome ?? usuario,
              cliente: data.usuario.cliente ?? organizacao,
              perfil: data.usuario.perfil ?? 'COMUM',
            };
          } else if (data.token) {
            try {
              profile = await fetchMe(servidor, data.token);
            } catch {
              /* /me indisponível em servidor antigo */
            }
          }
          if (profile) {
            setUser(profile);
            await saveUserProfile(profile);
            setDisplayUser(profile.nome);
            setDisplayOrg(profile.cliente || organizacao);
          }

          if (data.token) {
            registerDevicePushToken(servidor, data.token).catch((error) => {
              console.warn('[push] login register:', error instanceof Error ? error.message : error);
            });
          }
        } else {
          const msg = data.message || data.mensagem || 'Usuário ou senha incorretos.';
          Alert.alert('Acesso negado', msg);
        }
      } catch {
        const { message } = (() => {
          try {
            const body = JSON.parse(responseText) as { message?: string };
            if (body.message) return { message: body.message };
          } catch {
            /* legado texto puro */
          }
          return { message: responseText.trim().slice(0, 120) };
        })();

        if (response.status === 404) {
          Alert.alert('Erro 404', message || 'Endpoint não encontrado. Verifique a URL na engrenagem.');
        } else if (message) {
          Alert.alert('Acesso negado', message);
        } else {
          Alert.alert('Erro no servidor', 'O servidor respondeu de forma inesperada.');
        }
      }

    } catch (error: any) {
      console.log("Erro de rede:", error.message);
      Alert.alert('Sem Conexão', 'Não foi possível alcançar o servidor. Verifique o endereço e o protocolo (HTTP/HTTPS).');
    } finally {
      setLoading(false);
    }
  };

  // TELA DE LOGIN
  if (!isLoggedIn) {
    if (!isHydrated || isValidatingSession) {
      return (
        <AppSafeArea style={[styles.loginBg, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Palette.color2} />
          {isValidatingSession && (
            <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>
              Verificando sessão...
            </Text>
          )}
        </AppSafeArea>
      );
    }

    return (
      <AppSafeArea style={[styles.loginBg, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={[styles.modalOverlay, { backgroundColor: Palette.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Configurar Servidor</Text>

              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Protocolo</Text>
              <View style={styles.protocolRow}>
                <TouchableOpacity
                  style={[
                    styles.protocolBtn,
                    { borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight },
                    serverProtocol === 'http' && styles.protocolBtnActive,
                  ]}
                  onPress={() => setServerProtocol('http')}
                >
                  <Text style={[styles.protocolBtnText, { color: colors.textMuted }, serverProtocol === 'http' && styles.protocolBtnTextActive]}>
                    HTTP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.protocolBtn,
                    { borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight },
                    serverProtocol === 'https' && styles.protocolBtnActive,
                  ]}
                  onPress={() => setServerProtocol('https')}
                >
                  <Text style={[styles.protocolBtnText, { color: colors.textMuted }, serverProtocol === 'https' && styles.protocolBtnTextActive]}>
                    HTTPS
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Endereço do servidor</Text>
              <View style={[styles.modalInputRow, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
                <Feather name="globe" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  value={serverHost}
                  onChangeText={setServerHost}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="smartacesso.com.br"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={[styles.modalPreview, { color: colors.textMuted }]}>
                URL: {buildServerUrl(serverProtocol, serverHost)}
              </Text>

              <TouchableOpacity
                style={[styles.btnTestModal, { borderColor: colors.border }]}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator color={Palette.color2} />
                ) : (
                  <>
                    <Feather name="wifi" size={16} color={Palette.color2} />
                    <Text style={styles.btnTestText}>TESTAR CONEXÃO</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSalvarModal} onPress={handleSaveServer}>
                <Text style={styles.btnPrimaryText}>SALVAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.loginContent}>
            <TouchableOpacity style={styles.settingsBtn} onPress={openServerModal}>
              <Feather name="settings" size={26} color={colors.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.logoArea}>
              <Text style={[styles.logoText, { color: colors.text }]}>
                smart <Text style={{ color: Palette.brandGreen }}>acesso</Text>
              </Text>
              <Text style={styles.appName}>CONTROLE DE ACESSO</Text>
            </View>

            <View style={[styles.loginCard, {
              backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
              borderColor: colors.border,
              ...getCardShadow(isDark),
            }]}>
              <View style={[styles.inputRow, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="office-building" size={20} color={Palette.color2} />
                <TextInput placeholder="Organização" placeholderTextColor={colors.textMuted} style={[styles.textInput, { color: colors.text }]} value={organizacao} onChangeText={setOrganizacao} onBlur={() => persistConnectionInfo(organizacao, usuario, servidor)} />
              </View>
              
              <View style={[styles.inputRow, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
                <Feather name="user" size={20} color={colors.textMuted} />
                <TextInput placeholder="Usuário" placeholderTextColor={colors.textMuted} style={[styles.textInput, { color: colors.text }]} value={usuario} onChangeText={setUsuario} autoCapitalize="none" onBlur={() => persistConnectionInfo(organizacao, usuario, servidor)} />
              </View>

              <View style={[styles.inputRow, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textMuted} />
                <TextInput placeholder="Senha" secureTextEntry={!mostrarSenha} placeholderTextColor={colors.textMuted} style={[styles.textInput, { color: colors.text }]} value={senha} onChangeText={setSenha} />
                <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
                  <Feather name={mostrarSenha ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.btnPrimaryText}>ENTRAR</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppSafeArea>
    );
  }

  // TELA DASHBOARD (PÓS-LOGIN)
  const menuItems = [
    ...(isPerfilGerencial(user)
      ? [{ title: 'Cadastro', subtitle: 'Enviar link de cadastro', icon: 'account-plus', color: MenuColors.cadastro, route: '/cadastro' as const }]
      : []),
    { title: 'Histórico', subtitle: 'Acessos recentes', icon: 'history', color: MenuColors.historico, route: '/historico' as const },
    { title: 'Avisos', subtitle: 'Comunicados', icon: 'bullhorn', color: MenuColors.avisos, route: '/avisos' as const },
    {
      title: 'Entregas',
      subtitle: 'Encomendas pendentes',
      icon: 'truck-delivery',
      color: MenuColors.entregas,
      route: '/entregas' as const,
      badge: summary.entregasPendentes,
    },
  ];

  const firstName = displayUser.split(/[\s._-]/)[0] || 'Usuário';
  const headerTheme = getScreenHeaderTheme(isDark);

  return (
    <AppSafeArea edges={['top', 'left', 'right']} style={[styles.homeBg, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={headerTheme.statusBar} backgroundColor={headerTheme.background} />

      <View style={[styles.homeHeader, {
        backgroundColor: headerTheme.background,
        borderBottomColor: headerTheme.border,
        borderBottomWidth: isDark ? 0 : 1,
      }]}>
        <View style={[styles.homeHeaderAccent, { backgroundColor: headerTheme.accentOrb }]} />
        <View style={styles.homeHeaderContent}>
          <View style={styles.homeHeaderTop}>
            <View>
              <Text style={[styles.homeGreeting, { color: headerTheme.greeting }]}>Olá, {firstName}</Text>
              <Text style={[styles.homeBrand, { color: headerTheme.brand }]}>
                smart<Text style={{ color: headerTheme.brandAccent }}>acesso</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.homeLogoutBtn, { backgroundColor: headerTheme.actionBg }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={20} color={headerTheme.icon} />
            </TouchableOpacity>
          </View>
          {displayOrg ? (
            <View style={styles.orgBadge}>
              <MaterialCommunityIcons name="office-building" size={14} color={Palette.color2} />
              <Text style={styles.orgBadgeText} numberOfLines={1}>{displayOrg}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <OfflineBanner visible={isOffline} />

      <ScrollView
        style={styles.homeScroll}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu principal</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          Selecione uma opção para continuar
        </Text>

        <View style={styles.summaryRow}>
          <SummaryCard
            label="Acessos hoje"
            value={summary.loading ? '...' : String(summary.acessosHoje)}
            icon="history"
            color={Palette.color4}
            isDark={isDark}
            colors={colors}
          />
          <SummaryCard
            label="Entregas pendentes"
            value={summary.loading ? '...' : String(summary.entregasPendentes)}
            icon="package-variant"
            color={Palette.color5}
            isDark={isDark}
            colors={colors}
          />
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <MenuButton
              key={item.route}
              title={item.title}
              subtitle={item.subtitle}
              icon={item.icon}
              color={item.color}
              badge={'badge' in item ? item.badge : 0}
              isDark={isDark}
              colors={colors}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, {
        backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 4),
        height: 72 + Math.max(insets.bottom, 4),
      }]}>
        <TouchableOpacity style={styles.navItemActive}>
          <View style={styles.navIconActive}>
            <Feather name="home" size={22} color={Palette.color2} />
          </View>
          <Text style={styles.navLabelActive}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/perfil')}>
          <Feather name="user" size={22} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </AppSafeArea>
  );
}

interface MenuButtonProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  badge?: number;
  isDark: boolean;
  colors: AppColorScheme;
  onPress: () => void;
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  isDark: boolean;
  colors: AppColorScheme;
}

const SummaryCard = ({ label, value, icon, color, isDark, colors }: SummaryCardProps) => (
  <View style={[styles.summaryCard, {
    backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
    borderColor: colors.border,
    ...getCardShadow(isDark),
  }]}>
    <View style={[styles.summaryIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
    </View>
    <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const MenuButton = ({ title, subtitle, icon, color, badge = 0, isDark, colors, onPress }: MenuButtonProps) => (
  <TouchableOpacity
    style={[styles.cardMenu, {
      backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
      borderColor: colors.border,
      ...getCardShadow(isDark),
    }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    {badge > 0 && (
      <View style={styles.menuBadge}>
        <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
    <View style={[styles.cardMenuIconWrap, { backgroundColor: withAlpha(color, 0.12) }]}>
      <MaterialCommunityIcons name={icon as any} size={28} color={color} />
    </View>
    <Text style={[styles.cardMenuText, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.cardMenuSub, { color: colors.textMuted }]} numberOfLines={2}>
      {subtitle}
    </Text>
    <View style={[styles.cardMenuArrow, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight }]}>
      <Feather name="chevron-right" size={16} color={colors.textMuted} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loginBg: { flex: 1 },
  loginContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  settingsBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: 'bold' },
  appName: { fontSize: 12, color: Palette.color2, fontWeight: 'bold', letterSpacing: 2 },
  loginCard: { width: '100%', padding: 25, borderRadius: 25, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 15, borderWidth: 1 },
  textInput: { flex: 1, marginLeft: 10 },
  btnPrimary: { backgroundColor: Palette.color2, height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnPrimaryText: { color: Palette.white, fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  protocolRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  protocolBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  protocolBtnActive: { backgroundColor: Palette.color2, borderColor: Palette.color2 },
  protocolBtnText: { fontWeight: 'bold' },
  protocolBtnTextActive: { color: Palette.white },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 12, borderWidth: 1 },
  modalInput: { flex: 1, marginLeft: 10 },
  modalPreview: { fontSize: 12, marginBottom: 12, textAlign: 'center' },
  btnTestModal: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  btnTestText: { color: Palette.color2, fontWeight: '700', fontSize: 13 },
  btnSalvarModal: { backgroundColor: Palette.color2, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  homeBg: { flex: 1 },
  homeHeader: { paddingBottom: 20, overflow: 'hidden' },
  homeHeaderAccent: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60 },
  homeHeaderContent: { paddingHorizontal: 20, paddingTop: 12 },
  homeHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  homeGreeting: { fontSize: 14, marginBottom: 4 },
  homeBrand: { fontSize: 26, fontWeight: 'bold' },
  homeLogoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: withAlpha(Palette.color2, 0.18),
    gap: 6,
    maxWidth: '100%',
  },
  orgBadgeText: { color: Palette.color2, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  homeScroll: { flex: 1 },
  homeScrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMenu: {
    width: '48%',
    minHeight: 168,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    position: 'relative',
  },
  menuBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.color3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  menuBadgeText: { color: Palette.white, fontSize: 11, fontWeight: '800' },
  cardMenuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardMenuText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardMenuSub: { fontSize: 11, lineHeight: 15, flex: 1 },
  cardMenuArrow: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  navItemActive: { alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  navIconActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withAlpha(Palette.color2, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navLabel: { fontSize: 10, marginTop: 2, fontWeight: '500' },
  navLabelActive: { fontSize: 10, marginTop: 2, fontWeight: '700', color: Palette.color2 },
});