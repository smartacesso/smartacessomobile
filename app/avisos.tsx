import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { AppSafeArea } from '@/components/AppSafeArea';
import { EmptyListState } from '@/components/EmptyListState';
import { FilterChipGroup, ListFiltersPanel, ListSearchInput } from '@/components/filters/ListFilters';
import { LoadMoreFooter } from '@/components/LoadMoreFooter';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Palette, getCardShadow, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ApiError, Aviso, excluirAviso, fetchAvisosPaginated, getAvisoImagemUrl, LIST_PAGE_SIZE } from '@/lib/apiService';
import { useServer } from '@/lib/ServerContext';
import { isPerfilGerencial } from '@/lib/userUtils';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

function formatarDataPublicacao(dataIso: string): string {
  if (!dataIso) return '';
  const dataObj = new Date(dataIso);
  if (Number.isNaN(dataObj.getTime())) return '';

  const dia = String(dataObj.getDate()).padStart(2, '0');
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const ano = dataObj.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function AvisosScreen() {
  const router = useRouter();
  const { id: deepLinkId } = useLocalSearchParams<{ id?: string }>();
  const { servidor, token, logout, user } = useServer();
  const gerencial = isPerfilGerencial(user);
  const { isDark } = useTheme();
  const colors = useAppColors();
  const { isOffline } = useNetworkStatus();
  const { isAuthorized } = useRequireAuth();

  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setBusca(buscaInput.trim()), buscaInput.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  const handleUnauthorized = useCallback(
    async (error: ApiError) => {
      Alert.alert('Sessão expirada', error.message);
      await logout();
      router.replace('/');
    },
    [logout, router]
  );

  const fetchPage = useCallback(
    (pagina: number) =>
      fetchAvisosPaginated(servidor, token!, {
        busca,
        pagina,
        tamanho: LIST_PAGE_SIZE,
      }),
    [servidor, token, busca]
  );

  const {
    items: avisos,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    loadError,
    loadMore,
    refresh,
  } = usePaginatedList<Aviso>({
    enabled: isAuthorized && Boolean(token),
    resetKey: busca,
    fetchPage,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (loadError) {
      Alert.alert('Erro', 'Não foi possível carregar os avisos.');
    }
  }, [loadError]);

  useEffect(() => {
    if (!deepLinkId) return;
    const numId = Number(deepLinkId);
    if (!Number.isNaN(numId)) {
      setExpandedId(numId);
    }
  }, [deepLinkId]);

  const handleExcluirAviso = (aviso: Aviso) => {
    Alert.alert('Excluir aviso', `Deseja excluir "${aviso.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirAviso(servidor, token!, aviso.id);
            refresh();
          } catch (error) {
            const msg =
              error instanceof ApiError
                ? error.message
                : 'Não foi possível excluir o aviso.';
            Alert.alert('Erro', msg);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item: aviso }: { item: Aviso }) => {
    const expandido = expandedId === aviso.id;
    const descricaoCurta =
      aviso.descricao && aviso.descricao.length > 120 && !expandido
        ? `${aviso.descricao.slice(0, 120)}...`
        : aviso.descricao;

    return (
      <View
        style={[styles.avisoCard, {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
          borderColor: colors.border,
          ...getCardShadow(isDark),
        }]}
      >
        <View style={styles.avisoHeader}>
          <View style={[styles.avisoIconWrap, { backgroundColor: withAlpha(Palette.color3, 0.12) }]}>
            <MaterialCommunityIcons name="bullhorn-variant-outline" size={22} color={Palette.color3} />
          </View>
          <Text style={[styles.avisoTitle, { color: colors.text }]}>{aviso.titulo}</Text>
          {gerencial ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleExcluirAviso(aviso)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={18} color={Palette.color4} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.avisoData, { color: colors.textMuted }]}>
          {formatarDataPublicacao(aviso.dataPublicacao)}
          {aviso.temImagem ? ' · com imagem' : ''}
        </Text>

        {aviso.temImagem && token ? (
          <AuthenticatedImage
            uri={getAvisoImagemUrl(servidor, aviso.id)}
            authToken={token}
            style={styles.avisoImagem}
          />
        ) : null}

        {descricaoCurta ? (
          <Text style={[styles.avisoDesc, { color: colors.textSecondary }]}>{descricaoCurta}</Text>
        ) : null}

        {(aviso.descricao?.length ?? 0) > 120 && (
          <TouchableOpacity
            style={[styles.readMore, { borderTopColor: colors.border }]}
            onPress={() => setExpandedId(expandido ? null : aviso.id)}
          >
            <Text style={styles.readMoreText}>{expandido ? 'VER MENOS' : 'LER MAIS'}</Text>
            <Feather name={expandido ? 'chevron-up' : 'chevron-right'} size={16} color={Palette.color3} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!isAuthorized) {
    return (
      <AppSafeArea style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.color3} />
      </AppSafeArea>
    );
  }

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="AVISOS"
        onBack={() => router.back()}
        rightIcon={gerencial ? 'plus' : 'refresh-cw'}
        onRightPress={() => (gerencial ? router.push('/aviso-form' as Href) : refresh())}
      />
      <OfflineBanner visible={isOffline} />

      {loading && avisos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.color3} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando avisos...</Text>
        </View>
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh()}
              colors={[Palette.color3]}
              tintColor={Palette.color3}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <ListFiltersPanel>
              <ListSearchInput
                value={buscaInput}
                onChangeText={setBuscaInput}
                placeholder="Buscar aviso por título ou conteúdo..."
                onClear={() => setBuscaInput('')}
              />
            </ListFiltersPanel>
          }
          ListFooterComponent={
            <LoadMoreFooter loadingMore={loadingMore} hasMore={hasMore} totalLoaded={avisos.length} />
          }
          ListEmptyComponent={
            <EmptyListState
              icon={loadError ? 'alert-circle' : busca.trim() ? 'search' : 'bell'}
              title={loadError ? 'Não foi possível carregar' : 'Nenhum aviso encontrado'}
              message={
                loadError
                  ? 'Verifique sua conexão ou tente atualizar.'
                  : busca.trim()
                    ? `Nenhum resultado para "${busca}".`
                    : 'Não há avisos publicados no momento.'
              }
              onRetry={loadError ? () => refresh() : undefined}
              onClearFilters={busca.trim() ? () => setBuscaInput('') : undefined}
            />
          }
        />
      )}
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  content: { padding: 15, paddingBottom: 30 },
  avisoCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  avisoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avisoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avisoTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  deleteBtn: { padding: 4, marginLeft: 8 },
  avisoData: { fontSize: 12, marginBottom: 10, marginLeft: 50 },
  avisoImagem: { width: '100%', height: 180, marginBottom: 12, marginLeft: 0 },
  avisoDesc: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', borderTopWidth: 1, paddingTop: 10 },
  readMoreText: { color: Palette.color3, fontWeight: 'bold', fontSize: 12, marginRight: 5 },
});
