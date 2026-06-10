import { ConfirmRetiradaModal } from '@/components/ConfirmRetiradaModal';
import { AppSafeArea } from '@/components/AppSafeArea';
import { EmptyListState } from '@/components/EmptyListState';
import { FilterChipGroup, ListFiltersPanel, ListSearchInput } from '@/components/filters/ListFilters';
import { LoadMoreFooter } from '@/components/LoadMoreFooter';
import { CacheBanner, OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Palette, getCardShadow, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  ApiError,
  Encomenda,
  aplicarFiltrosEncomendasCache,
  confirmarRetiradaEncomenda,
  fetchEncomendasPaginated,
  isEncomendaRetirada,
  podeConfirmarEncomenda,
  LIST_PAGE_SIZE,
  PERIODO_DATA_OPCOES,
  PeriodoFiltroData,
} from '@/lib/apiService';
import { loadEncomendasCache, saveEncomendasCache } from '@/lib/cacheService';
import { formatCacheAge } from '@/lib/formatUtils';
import { useServer } from '@/lib/ServerContext';
import { loadLoginInfo } from '@/lib/StorageUtils';
import { useTheme } from '@/lib/ThemeContext';

type StatusFiltro = 'TODAS' | 'DISPONIVEL' | 'ENTREGUE';

const STATUS_OPCOES = [
  { value: 'TODAS' as StatusFiltro, label: 'Todas' },
  { value: 'DISPONIVEL' as StatusFiltro, label: 'Disponíveis' },
  { value: 'ENTREGUE' as StatusFiltro, label: 'Entregues' },
];

const FILTROS_PADRAO = {
  busca: '',
  periodo: '30' as PeriodoFiltroData,
  status: 'TODAS' as StatusFiltro,
};

export default function EntregasScreen() {
  const router = useRouter();
  const { servidor, token, logout, user } = useServer();
  const { isDark } = useTheme();
  const colors = useAppColors();
  const { isOffline } = useNetworkStatus();
  const { isAuthorized } = useRequireAuth();

  const [buscaInput, setBuscaInput] = useState(FILTROS_PADRAO.busca);
  const [busca, setBusca] = useState(FILTROS_PADRAO.busca);
  const [periodo, setPeriodo] = useState<PeriodoFiltroData>(FILTROS_PADRAO.periodo);
  const [status, setStatus] = useState<StatusFiltro>(FILTROS_PADRAO.status);
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [encomendaSelecionada, setEncomendaSelecionada] = useState<Encomenda | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBusca(buscaInput.trim()), buscaInput.trim() ? 400 : 0);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  useEffect(() => {
    loadLoginInfo().then(({ user }) => setNomeUsuario(user));
  }, []);

  const handleUnauthorized = useCallback(
    async (error: ApiError) => {
      Alert.alert('Sessão expirada', error.message);
      await logout();
      router.replace('/');
    },
    [logout, router]
  );

  const fetchPage = useCallback(
    async (pagina: number) => {
      try {
        setFromCache(false);
        setCacheLabel(null);
        const page = await fetchEncomendasPaginated(servidor, token!, {
          periodo,
          status,
          busca,
          pagina,
          tamanho: LIST_PAGE_SIZE,
        });
        if (pagina === 0) {
          await saveEncomendasCache(page.content);
        }
        return page;
      } catch (error) {
        if (pagina === 0) {
          const cached = await loadEncomendasCache();
          if (cached) {
            setFromCache(true);
            setCacheLabel(`Dados em cache · atualizados ${formatCacheAge(cached.savedAt)}`);
            const filtered = aplicarFiltrosEncomendasCache(cached.data, periodo, busca, status);
            return {
              content: filtered,
              total: filtered.length,
              pagina: 0,
              tamanho: filtered.length,
              hasMore: false,
            };
          }
        }
        throw error;
      }
    },
    [servidor, token, periodo, status, busca]
  );

  const resetKey = `${periodo}|${status}|${busca}`;

  const {
    items: encomendasRaw,
    loading: listLoading,
    loadingMore,
    refreshing,
    hasMore,
    loadError,
    loadMore,
    refresh,
  } = usePaginatedList<Encomenda>({
    enabled: isAuthorized && Boolean(token),
    resetKey,
    fetchPage,
    onUnauthorized: handleUnauthorized,
  });

  const loading = listLoading && encomendasRaw.length === 0;

  const encomendas = useMemo(() => {
    if (fromCache) {
      return aplicarFiltrosEncomendasCache(encomendasRaw, periodo, busca, status);
    }
    return encomendasRaw;
  }, [encomendasRaw, periodo, busca, status, fromCache]);

  const hasActiveFilters =
    busca.trim().length > 0 ||
    periodo !== FILTROS_PADRAO.periodo ||
    status !== FILTROS_PADRAO.status;

  const limparFiltros = () => {
    setBuscaInput(FILTROS_PADRAO.busca);
    setBusca(FILTROS_PADRAO.busca);
    setPeriodo(FILTROS_PADRAO.periodo);
    setStatus(FILTROS_PADRAO.status);
  };

  useEffect(() => {
    if (loadError && !fromCache && !cacheLabel) {
      Alert.alert('Falha de Conexão', 'Não foi possível buscar as encomendas no servidor.');
    }
  }, [loadError, fromCache, cacheLabel]);

  const handleConfirmarRetirada = async (nome: string, documento: string) => {
    if (!token || !encomendaSelecionada) return;

    if (!nome || !documento) {
      Alert.alert('Campos obrigatórios', 'Informe nome e documento de quem está retirando.');
      return;
    }

    setConfirmando(true);
    try {
      await confirmarRetiradaEncomenda(servidor, token, {
        id: encomendaSelecionada.id,
        nomeQuemRetirou: nome,
        documentoQuemRetirou: documento,
      });
      setEncomendaSelecionada(null);
      Alert.alert('Sucesso', 'Retirada confirmada.');
      await refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          Alert.alert('Erro', error.message || 'Recurso não encontrado no servidor.');
        } else if (error.code === 'ALREADY_CONFIRMED') {
          Alert.alert('Aviso', 'Esta encomenda já foi retirada.');
          setEncomendaSelecionada(null);
          await refresh();
        } else {
          Alert.alert('Erro', error.message);
        }
      } else {
        Alert.alert('Erro', 'Não foi possível confirmar a retirada.');
      }
    } finally {
      setConfirmando(false);
    }
  };

  const renderItem = ({ item }: { item: Encomenda }) => {
    const isRetirado = isEncomendaRetirada(item);
    const podeConfirmar = podeConfirmarEncomenda(item);
    const destinatarioLabel = item.destinatario?.nome?.trim();

    return (
      <TouchableOpacity
        activeOpacity={podeConfirmar ? 0.85 : 1}
        onPress={() => {
          if (podeConfirmar) setEncomendaSelecionada(item);
        }}
        disabled={!podeConfirmar}
      >
        <View style={[styles.card, {
          backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
          borderColor: colors.border,
          borderWidth: 1,
          ...getCardShadow(isDark),
        }]}>
          <View style={[styles.iconBox, { backgroundColor: withAlpha(Palette.color5, 0.15) }]}>
            <MaterialCommunityIcons
              name={item.tipo === 'PACOTE' ? 'package-variant' : 'email-outline'}
              size={24}
              color={Palette.color5}
            />
          </View>

          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              {(item.codigoRastreio || 'Sem Código')} - {String(item.tipo || '')}
            </Text>
            {destinatarioLabel ? (
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Destinatário: {destinatarioLabel}
              </Text>
            ) : null}
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {isRetirado
                ? `Retirado em ${item.dataRetirada ? new Date(item.dataRetirada).toLocaleDateString() : 'Data não informada'}`
                : `Recebido em ${item.dataRecebimento ? new Date(item.dataRecebimento).toLocaleDateString() : 'Data não informada'}`}
            </Text>
            <Text style={[styles.statusInfo, { color: isRetirado ? Palette.success : Palette.warning }]}>
              {isRetirado
                ? `Retirado por: ${item.nomeQuemRetirou || 'N/A'}`
                : podeConfirmar
                  ? 'Toque para confirmar retirada'
                  : 'Aguardando retirada pelo destinatário'}
            </Text>
          </View>

          <View style={[styles.badge, {
            backgroundColor: isRetirado
              ? (isDark ? Palette.successBgDark : Palette.successBgLight)
              : (isDark ? Palette.warningBgDark : Palette.warningBgLight),
          }]}>
            <Text style={[styles.badgeText, { color: isRetirado ? Palette.success : Palette.warning }]}>
              {isRetirado ? 'ENTREGUE' : 'DISPONÍVEL'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filtrosHeader = (
    <ListFiltersPanel>
      <ListSearchInput
        value={buscaInput}
        onChangeText={setBuscaInput}
        placeholder="Buscar código, tipo ou quem retirou..."
        onClear={() => setBuscaInput('')}
      />
      <FilterChipGroup options={PERIODO_DATA_OPCOES} selected={periodo} onSelect={setPeriodo} accentColor={Palette.color2} />
      <FilterChipGroup options={STATUS_OPCOES} selected={status} onSelect={setStatus} accentColor={Palette.color5} />
    </ListFiltersPanel>
  );

  if (!isAuthorized) {
    return (
      <AppSafeArea style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.color5} />
      </AppSafeArea>
    );
  }

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="ENCOMENDAS"
        onBack={() => router.back()}
        onRightPress={() => refresh()}
      />
      <OfflineBanner visible={isOffline} />
      <CacheBanner visible={Boolean(cacheLabel)} label={cacheLabel ?? ''} />

      <ConfirmRetiradaModal
        visible={encomendaSelecionada != null}
        encomenda={encomendaSelecionada}
        nomeInicial={user?.nome || nomeUsuario}
        submitting={confirmando}
        onClose={() => setEncomendaSelecionada(null)}
        onConfirm={handleConfirmarRetirada}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.color5} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando encomendas...</Text>
        </View>
      ) : (
        <FlatList
          data={encomendas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListHeaderComponent={filtrosHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh()}
              colors={[Palette.color5]}
              tintColor={Palette.color5}
            />
          }
          onEndReached={() => {
            if (!fromCache) loadMore();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            !fromCache ? (
              <LoadMoreFooter loadingMore={loadingMore} hasMore={hasMore} totalLoaded={encomendas.length} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyListState
              icon="box"
              title={loadError ? 'Não foi possível carregar' : 'Nenhuma encomenda encontrada'}
              message={
                loadError
                  ? 'Verifique sua conexão ou tente atualizar a lista.'
                  : hasActiveFilters
                    ? 'Nenhum resultado com os filtros atuais.'
                    : 'Não há encomendas registradas no momento.'
              }
              onRetry={loadError ? () => refresh() : undefined}
              onClearFilters={hasActiveFilters ? limparFiltros : undefined}
            />
          }
        />
      )}
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: { flex: 1 },
  title: { fontSize: 15, fontWeight: 'bold' },
  sub: { fontSize: 12, marginTop: 2 },
  statusInfo: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },
});
