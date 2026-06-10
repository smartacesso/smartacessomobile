import { OfflineBanner } from '@/components/OfflineBanner';
import { AppSafeArea } from '@/components/AppSafeArea';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCardShadow, Palette, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  ApiError,
  EmpresaResumo,
  fetchEmpresas,
  gerarLinkConviteVisitante,
} from '@/lib/apiService';
import { formatPhoneBr, phoneDigits } from '@/lib/formatUtils';
import { useServer } from '@/lib/ServerContext';
import { useTheme } from '@/lib/ThemeContext';
import { isPerfilGerencial } from '@/lib/userUtils';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CadastroScreen() {
  const router = useRouter();
  const { servidor, token, user, logout } = useServer();
  const { isDark } = useTheme();
  const colors = useAppColors();
  const { isOffline } = useNetworkStatus();
  const { isAuthorized } = useRequireAuth();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<number | null>(null);
  const [linkConvite, setLinkConvite] = useState('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [gerandoLink, setGerandoLink] = useState(false);

  const gerencial = isPerfilGerencial(user);

  useEffect(() => {
    if (isAuthorized && user && !gerencial) {
      Alert.alert(
        'Acesso restrito',
        'Somente usuários com perfil gerencial podem gerar links de cadastro.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isAuthorized, user, gerencial, router]);

  const carregarEmpresas = useCallback(async () => {
    if (!token || !gerencial) return;

    setLoadingEmpresas(true);
    try {
      const lista = await fetchEmpresas(servidor, token);
      setEmpresas(lista);
      if (lista.length === 1) {
        setEmpresaSelecionada(lista[0].id);
      }
    } catch (error) {
      const msg =
        error instanceof ApiError && error.isUnauthorized
          ? 'Sessão expirada.'
          : 'Não foi possível carregar as empresas.';
      Alert.alert('Erro', msg, [
        {
          text: 'OK',
          onPress: async () => {
            if (error instanceof ApiError && error.isUnauthorized) {
              await logout();
              router.replace('/');
            }
          },
        },
      ]);
    } finally {
      setLoadingEmpresas(false);
    }
  }, [token, gerencial, servidor, logout, router]);

  useEffect(() => {
    if (isAuthorized && gerencial) {
      carregarEmpresas();
    }
  }, [isAuthorized, gerencial, carregarEmpresas]);

  const obterLinkConvite = async (): Promise<string | null> => {
    if (!token || empresaSelecionada == null) {
      Alert.alert('Erro', 'Selecione a empresa/unidade.');
      return null;
    }

    if (linkConvite) return linkConvite;

    setGerandoLink(true);
    try {
      const resposta = await gerarLinkConviteVisitante(servidor, token, empresaSelecionada);
      if (!resposta.link) {
        Alert.alert('Erro', 'O servidor não retornou um link válido.');
        return null;
      }
      setLinkConvite(resposta.link);
      return resposta.link;
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Não foi possível gerar o link de convite.';
      Alert.alert('Erro', msg);
      return null;
    } finally {
      setGerandoLink(false);
    }
  };

  const handleCopiarLink = async () => {
    const link = await obterLinkConvite();
    if (!link) return;

    await Clipboard.setStringAsync(link);
    Alert.alert('Link copiado', 'O link de cadastro foi copiado para a área de transferência.');
  };

  const handleEnviarWhatsApp = async () => {
    if (!nome || !telefone) {
      Alert.alert('Erro', 'Preencha pelo menos o nome e o telefone.');
      return;
    }

    const telefoneLimpo = phoneDigits(telefone);
    if (telefoneLimpo.length < 10) {
      Alert.alert('Erro', 'Informe um telefone válido com DDD.');
      return;
    }

    const link = await obterLinkConvite();
    if (!link) return;

    const mensagem = `Olá ${nome}! Aqui está o seu link para finalizar o cadastro no Smart Acesso:\n\n${link}`;
    const urlWhatsapp = `whatsapp://send?phone=55${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;

    Linking.canOpenURL(urlWhatsapp).then((supported) => {
      if (supported) {
        Linking.openURL(urlWhatsapp);
      } else {
        Alert.alert('Erro', 'O WhatsApp não está instalado neste dispositivo.');
      }
    });
  };

  if (!isAuthorized || !gerencial) {
    return (
      <AppSafeArea style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.color2} />
      </AppSafeArea>
    );
  }

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="NOVO CADASTRO" onBack={() => router.back()} rightIcon="link" onRightPress={handleCopiarLink} />
      <OfflineBanner visible={isOffline} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.instructions, {
          backgroundColor: isDark ? Palette.successBgDark : Palette.successBgLight,
          borderColor: withAlpha(Palette.color2, 0.35),
        }]}>
          <MaterialCommunityIcons name="whatsapp" size={40} color={Palette.whatsapp} />
          <Text style={[styles.instructionText, { color: isDark ? Palette.color2 : Palette.color1 }]}>
            Selecione a unidade, preencha os dados e envie o link oficial de cadastro pelo WhatsApp.
          </Text>
        </View>

        <View style={[styles.form, {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
          borderColor: colors.border,
          ...getCardShadow(isDark),
        }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Empresa / Unidade</Text>
            {loadingEmpresas ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Palette.color2} />
                <Text style={[styles.loadingLabel, { color: colors.textMuted }]}>Carregando...</Text>
              </View>
            ) : empresas.length === 0 ? (
              <Text style={[styles.emptyEmpresas, { color: colors.textMuted }]}>
                Nenhuma empresa disponível para este cliente.
              </Text>
            ) : (
              empresas.map((empresa) => {
                const selecionada = empresaSelecionada === empresa.id;
                return (
                  <TouchableOpacity
                    key={empresa.id}
                    style={[
                      styles.empresaOption,
                      {
                        borderColor: selecionada ? Palette.color2 : colors.border,
                        backgroundColor: selecionada
                          ? withAlpha(Palette.color2, 0.12)
                          : (isDark ? Palette.surfaceDarkAlt : Palette.bgLight),
                      },
                    ]}
                    onPress={() => {
                      setEmpresaSelecionada(empresa.id);
                      setLinkConvite('');
                    }}
                  >
                    <MaterialCommunityIcons
                      name={selecionada ? 'radiobox-marked' : 'radiobox-blank'}
                      size={22}
                      color={selecionada ? Palette.color2 : colors.textMuted}
                    />
                    <Text style={[styles.empresaNome, { color: colors.text }]}>{empresa.nome}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Nome do visitante</Text>
            <View style={[styles.inputArea, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
              <Feather name="user" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ex: João Silva"
                placeholderTextColor={colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>WhatsApp (com DDD)</Text>
            <View style={[styles.inputArea, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight, borderColor: colors.border }]}>
              <Feather name="phone" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="(31) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={telefone}
                onChangeText={(text) => setTelefone(formatPhoneBr(text))}
              />
            </View>
          </View>

          {linkConvite ? (
            <View style={[styles.linkPreview, { borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight }]}>
              <Text style={[styles.linkPreviewLabel, { color: colors.textMuted }]}>Link gerado</Text>
              <Text style={[styles.linkPreviewText, { color: colors.text }]} numberOfLines={3}>
                {linkConvite}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.btnSecondary} onPress={handleCopiarLink} disabled={gerandoLink}>
            {gerandoLink ? (
              <ActivityIndicator color={Palette.color2} />
            ) : (
              <>
                <Feather name="copy" size={18} color={Palette.color2} />
                <Text style={styles.btnSecondaryText}>GERAR E COPIAR LINK</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSalvar} onPress={handleEnviarWhatsApp} disabled={gerandoLink}>
            <MaterialCommunityIcons name="whatsapp" size={24} color={Palette.white} />
            <Text style={styles.btnText}>GERAR LINK E ENVIAR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  instructions: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
  },
  instructionText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  form: { padding: 20, borderRadius: 15, borderWidth: 1 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, marginBottom: 5, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingLabel: { fontSize: 14 },
  emptyEmpresas: { fontSize: 14, lineHeight: 20 },
  empresaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
  },
  empresaNome: { flex: 1, fontSize: 15 },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  input: { flex: 1, marginLeft: 10 },
  linkPreview: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  linkPreviewLabel: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  linkPreviewText: { fontSize: 13, lineHeight: 18 },
  btnSecondary: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.color2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
  },
  btnSecondaryText: { color: Palette.color2, fontWeight: 'bold' },
  btnSalvar: {
    backgroundColor: Palette.color2,
    height: 55,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnText: { color: Palette.white, fontWeight: 'bold', marginLeft: 10 },
});
