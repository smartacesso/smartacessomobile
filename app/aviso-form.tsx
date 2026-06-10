import { OfflineBanner } from '@/components/OfflineBanner';
import { AppSafeArea } from '@/components/AppSafeArea';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCardShadow, Palette } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ApiError, salvarAviso } from '@/lib/apiService';
import { useServer } from '@/lib/ServerContext';
import { useTheme } from '@/lib/ThemeContext';
import { isPerfilGerencial } from '@/lib/userUtils';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AvisoFormScreen() {
  const router = useRouter();
  const { servidor, token, user, logout } = useServer();
  const { isDark } = useTheme();
  const colors = useAppColors();
  const { isOffline } = useNetworkStatus();
  const { isAuthorized } = useRequireAuth();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | undefined>();
  const [salvando, setSalvando] = useState(false);

  const gerencial = isPerfilGerencial(user);

  useEffect(() => {
    if (isAuthorized && user && !gerencial) {
      Alert.alert(
        'Acesso restrito',
        'Somente usuários com perfil gerencial podem publicar avisos.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isAuthorized, user, gerencial, router]);

  const handleSelecionarImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para anexar uma imagem.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (resultado.canceled || !resultado.assets[0]) return;

    const asset = resultado.assets[0];
    setImagemUri(asset.uri);
    setImagemBase64(asset.base64 ?? undefined);
  };

  const handleRemoverImagem = () => {
    setImagemUri(null);
    setImagemBase64(undefined);
  };

  const handleSalvar = async () => {
    if (!token) return;

    const tituloTrim = titulo.trim();
    if (!tituloTrim) {
      Alert.alert('Erro', 'Informe o título do aviso.');
      return;
    }

    setSalvando(true);
    try {
      await salvarAviso(servidor, token, {
        titulo: tituloTrim,
        descricao: descricao.trim() || undefined,
        imagemBase64: imagemBase64,
      });
      Alert.alert('Sucesso', 'Aviso publicado com sucesso.', [
        { text: 'OK', onPress: () => router.replace('/avisos') },
      ]);
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Não foi possível salvar o aviso.';
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
      setSalvando(false);
    }
  };

  if (!isAuthorized || !gerencial) {
    return (
      <AppSafeArea style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.color3} />
      </AppSafeArea>
    );
  }

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="NOVO AVISO" onBack={() => router.back()} />
      <OfflineBanner visible={isOffline} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.form, {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
          borderColor: colors.border,
          ...getCardShadow(isDark),
        }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Título</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight }]}
              placeholder="Ex: Manutenção do elevador"
              placeholderTextColor={colors.textMuted}
              value={titulo}
              onChangeText={setTitulo}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Descrição</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight }]}
              placeholder="Detalhes do comunicado..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={descricao}
              onChangeText={setDescricao}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Imagem (opcional)</Text>
            {imagemUri ? (
              <View style={styles.imagemWrap}>
                <Image source={{ uri: imagemUri }} style={styles.imagemPreview} contentFit="cover" />
                <TouchableOpacity style={styles.removerImagemBtn} onPress={handleRemoverImagem}>
                  <Feather name="trash-2" size={16} color={Palette.white} />
                  <Text style={styles.removerImagemText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagemBtn, { borderColor: colors.border }]}
                onPress={handleSelecionarImagem}
              >
                <Feather name="image" size={20} color={Palette.color3} />
                <Text style={styles.imagemBtnText}>Selecionar da galeria</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} disabled={salvando}>
            {salvando ? (
              <ActivityIndicator color={Palette.white} />
            ) : (
              <>
                <Feather name="check" size={20} color={Palette.white} />
                <Text style={styles.btnText}>PUBLICAR AVISO</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  form: { padding: 20, borderRadius: 15, borderWidth: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, marginBottom: 6, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  imagemBtn: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  imagemBtnText: { color: Palette.color3, fontWeight: '600' },
  imagemWrap: { borderRadius: 10, overflow: 'hidden' },
  imagemPreview: { width: '100%', height: 180 },
  removerImagemBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removerImagemText: { color: Palette.white, fontSize: 12, fontWeight: '600' },
  btnSalvar: {
    backgroundColor: Palette.color3,
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  btnText: { color: Palette.white, fontWeight: 'bold' },
});
