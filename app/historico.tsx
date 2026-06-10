import { EmptyListState } from '@/components/EmptyListState';
import { AppSafeArea } from '@/components/AppSafeArea';
import { FilterChipGroup, ListFiltersPanel, ListSearchInput } from '@/components/filters/ListFilters';
import { LoadMoreFooter } from '@/components/LoadMoreFooter';
import { CacheBanner, OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCardShadow, Palette, withAlpha } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AcessoEvento,
  ApiError,
  aplicarFiltrosAcessosCache,
  fetchAcessosPaginated,
  isAcessoSaida,
  LIST_PAGE_SIZE,
  PERIODO_DATA_OPCOES,
  PeriodoFiltroData,
} from '@/lib/apiService';
import { loadAcessosCache, saveAcessosCache } from '@/lib/cacheService';
import { formatCacheAge } from '@/lib/formatUtils';
import { useServer } from '@/lib/ServerContext';
import { useTheme } from '@/lib/ThemeContext';

type SentidoFiltro = 'TODOS' | 'ENTRADA' | 'SAIDA';

const SENTIDO_OPCOES = [
  { value: 'TODOS' as SentidoFiltro, label: 'Todos' },
  { value: 'ENTRADA' as SentidoFiltro, label: 'Entradas' },
  { value: 'SAIDA' as SentidoFiltro, label: 'Saídas' },
];

const FILTROS_PADRAO = {
  busca: '',
  periodo: '30' as PeriodoFiltroData,
  sentido: 'TODOS' as SentidoFiltro,
};

export default function HistoricoScreen() {
  const router = useRouter();
  const { servidor, token, logout } = useServer();
  const { isDark } = useTheme();
  const colors = useAppColors();
  const { isOffline } = useNetworkStatus();
  const { isAuthorized } = useRequireAuth();

  const [buscaInput, setBuscaInput] = useState(FILTROS_PADRAO.busca);
  const [busca, setBusca] = useState(FILTROS_PADRAO.busca);
  const [periodo, setPeriodo] = useState<PeriodoFiltroData>(FILTROS_PADRAO.periodo);
  const [sentido, setSentido] = useState<SentidoFiltro>(FILTROS_PADRAO.sentido);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBusca(buscaInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  const resetKey = `${periodo}|${sentido}|${busca}`;
  const skipNextFocusRefreshRef = useRef(true);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

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
        const page = await fetchAcessosPaginated(servidor, token!, {
          periodo,
          sentido,
          busca,
          pagina,
          tamanho: LIST_PAGE_SIZE,
        });
        if (pagina === 0) {
          await saveAcessosCache(page.content);
        }
        return page;
      } catch (error) {
        if (pagina === 0) {
          const cached = await loadAcessosCache();
          if (cached) {
            setFromCache(true);
            setCacheLabel(`Dados em cache · atualizados ${formatCacheAge(cached.savedAt)}`);
            const filtered = aplicarFiltrosAcessosCache(cached.data, periodo, busca, sentido);
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
    [servidor, token, periodo, sentido, busca]
  );

  const {
    items: eventosRaw,
    loading: listLoading,
    loadingMore,
    refreshing,
    hasMore,
    loadError,
    loadMore,
    refresh,
  } = usePaginatedList<AcessoEvento>({
    enabled: isAuthorized && Boolean(token),
    resetKey,
    fetchPage,
    onUnauthorized: handleUnauthorized,
  });

  const loading = listLoading && eventosRaw.length === 0;

  const hasActiveFilters =
    busca.trim().length > 0 ||
    periodo !== FILTROS_PADRAO.periodo ||
    sentido !== FILTROS_PADRAO.sentido;

  const limparFiltros = () => {
    setBuscaInput(FILTROS_PADRAO.busca);
    setBusca(FILTROS_PADRAO.busca);
    setPeriodo(FILTROS_PADRAO.periodo);
    setSentido(FILTROS_PADRAO.sentido);
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return 'Data não informada';
    const dataObj = new Date(dataIso);

    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hora = String(dataObj.getHours()).padStart(2, '0');
    const min = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} · ${hora}:${min}`;
  };

  const agruparEventos = (listaPlan: AcessoEvento[]) => {
    const grupos = listaPlan.reduce<Record<string, AcessoEvento[]>>((acc, item) => {
      const nomePessoa = item.pedestre?.nome || 'Usuário Identificado';

      if (!acc[nomePessoa]) {
        acc[nomePessoa] = [];
      }
      acc[nomePessoa].push(item);
      return acc;
    }, {});

    return Object.keys(grupos).map((nome) => ({
      title: nome,
      data: grupos[nome],
      totalCount: grupos[nome].length,
    }));
  };

  const eventosFiltrados = useMemo(() => {
    if (fromCache) {
      return aplicarFiltrosAcessosCache(eventosRaw, periodo, busca, sentido);
    }
    return eventosRaw;
  }, [eventosRaw, periodo, busca, sentido, fromCache]);

  const eventosAgrupados = useMemo(
    () => agruparEventos(eventosFiltrados),
    [eventosFiltrados]
  );

  const sectionsForList = useMemo(
    () =>
      eventosAgrupados.map((section) => ({
        title: section.title,
        totalCount: section.totalCount,
        data: expandedSections[section.title] ? section.data : [],
      })),
    [eventosAgrupados, expandedSections]
  );

  const stats = useMemo(() => {
    const entradas = eventosFiltrados.filter((item) => !isAcessoSaida(item)).length;
    const saidas = eventosFiltrados.filter((item) => isAcessoSaida(item)).length;

    return {
      total: eventosFiltrados.length,
      entradas,
      saidas,
      pessoas: eventosAgrupados.length,
    };
  }, [eventosFiltrados, eventosAgrupados.length]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const carregarHistorico = useCallback(
    (isRefresh = false) => {
      if (isRefresh) {
        refresh().catch((error) => {
          if (error instanceof ApiError && !error.isUnauthorized && !cacheLabel) {
            Alert.alert('Erro', error.message);
          }
        });
      }
    },
    [refresh, cacheLabel]
  );

  useEffect(() => {
    if (loadError && !fromCache && !cacheLabel) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico de acessos.');
    }
  }, [loadError, fromCache, cacheLabel]);

  refreshRef.current = refresh;

  useEffect(() => {
    skipNextFocusRefreshRef.current = true;
    setExpandedSections({});
  }, [resetKey]);

  useEffect(() => {
    if (eventosAgrupados.length === 0) return;

    setExpandedSections((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return { [eventosAgrupados[0].title]: true };
    });
  }, [eventosAgrupados.length, resetKey]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthorized || !token) return;

      if (skipNextFocusRefreshRef.current) {
        skipNextFocusRefreshRef.current = false;
        return;
      }

      refreshRef.current?.().catch(() => {
        /* erro tratado em loadError */
      });
    }, [isAuthorized, token])
  );

  const handleEndReached = useCallback(() => {
    if (fromCache || loading || loadingMore || !hasMore) return;
    loadMore();
  }, [fromCache, loading, loadingMore, hasMore, loadMore]);

  if (!isAuthorized) {
    return (
      <AppSafeArea style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.color2} />
      </AppSafeArea>
    );
  }

  const renderStatCard = (label: string, value: number, icon: string, accent: string) => (
    <View style={[styles.statCard, {
      backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
      borderColor: colors.border,
      ...getCardShadow(isDark),
    }]}>
      <View style={[styles.statIconWrap, { backgroundColor: withAlpha(accent, 0.12) }]}>
        <Feather name={icon as any} size={16} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  const filtrosHeader = (
    <View>
      <ListFiltersPanel>
        <ListSearchInput
          value={buscaInput}
          onChangeText={setBuscaInput}
          placeholder="Buscar por nome, local ou sentido..."
          onClear={() => setBuscaInput('')}
        />
        <FilterChipGroup
          options={PERIODO_DATA_OPCOES}
          selected={periodo}
          onSelect={setPeriodo}
          accentColor={Palette.color5}
        />
        <FilterChipGroup
          options={SENTIDO_OPCOES}
          selected={sentido}
          onSelect={setSentido}
          accentColor={Palette.color4}
        />
      </ListFiltersPanel>

      <View style={styles.statsRow}>
        {renderStatCard('Total', stats.total, 'activity', Palette.color5)}
        {renderStatCard('Entradas', stats.entradas, 'log-in', Palette.success)}
        {renderStatCard('Saídas', stats.saidas, 'log-out', Palette.color3)}
      </View>
    </View>
  );

  return (
    <AppSafeArea style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Histórico"
        subtitle="Filtros aplicados no servidor"
        onBack={() => router.back()}
        onRightPress={() => carregarHistorico(true)}
      />
      <OfflineBanner visible={isOffline} />
      <CacheBanner visible={Boolean(cacheLabel)} label={cacheLabel ?? ''} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Palette.color2} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Carregando acessos...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sectionsForList}
          keyExtractor={(item, index) => `${item.data ?? 'sem-data'}-${item.local ?? ''}-${index}`}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => carregarHistorico(true)}
              colors={[Palette.color2]}
              tintColor={Palette.color2}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            !fromCache ? (
              <LoadMoreFooter loadingMore={loadingMore} hasMore={hasMore} totalLoaded={eventosFiltrados.length} />
            ) : null
          }
          ListHeaderComponent={filtrosHeader}
          ListEmptyComponent={
            <EmptyListState
              icon="clock"
              title={loadError ? 'Não foi possível carregar' : 'Nenhum acesso encontrado'}
              message={
                loadError
                  ? 'Verifique sua conexão ou tente atualizar a lista.'
                  : hasActiveFilters
                    ? 'Nenhum resultado com os filtros atuais.'
                    : 'Ajuste os filtros ou aguarde novos registros.'
              }
              onRetry={loadError ? () => carregarHistorico(true) : undefined}
              onClearFilters={hasActiveFilters ? limparFiltros : undefined}
            />
          }
          renderSectionHeader={({ section: { title, totalCount } }) => (
            <TouchableOpacity onPress={() => toggleSection(title)} activeOpacity={0.8}>
              <View style={[styles.sectionHeader, {
                backgroundColor: isDark ? Palette.surfaceDark : Palette.surfaceLight,
                borderColor: colors.border,
              }]}>
                <View style={[styles.sectionAvatar, { backgroundColor: withAlpha(Palette.color4, 0.15) }]}>
                  <Feather name="user" size={16} color={Palette.color4} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                    {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
                  </Text>
                </View>
                <View style={[styles.sectionChevron, { backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.bgLight }]}>
                  <Feather
                    name={expandedSections[title] ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
          renderItem={({ item }) => {
            const isSaida = isAcessoSaida(item);
            const corSentido = isSaida ? Palette.danger : Palette.success;
            const labelSentido = isSaida ? 'Saída' : 'Entrada';

            return (
              <View style={[styles.card, {
                backgroundColor: isDark ? Palette.surfaceDarkAlt : Palette.surfaceLight,
                borderColor: colors.border,
                ...getCardShadow(isDark),
              }]}>
                <View style={[styles.indicator, { backgroundColor: corSentido }]} />

                <View style={styles.avatarArea}>
                  {item.pedestre?.foto ? (
                    <Image source={{ uri: item.pedestre.foto }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(corSentido, 0.12) }]}>
                      <Feather
                        name={isSaida ? 'arrow-up-right' : 'arrow-down-left'}
                        size={18}
                        color={corSentido}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.cardContent}>
                  <View style={[styles.sentidoBadge, { backgroundColor: withAlpha(corSentido, 0.12) }]}>
                    <Text style={[styles.sentidoText, { color: corSentido }]}>{labelSentido}</Text>
                  </View>
                  <Text style={[styles.info, { color: colors.text }]}>
                    {formatarData(item.data || '')}
                  </Text>
                  <View style={styles.localRow}>
                    <Feather name="map-pin" size={12} color={colors.textMuted} />
                    <Text style={[styles.local, { color: colors.textMuted }]} numberOfLines={2}>
                      {item.local || 'Portaria Principal'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </AppSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  sectionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionCount: { fontSize: 11, marginTop: 2 },
  sectionChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 14,
    paddingLeft: 18,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  avatarArea: { marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  sentidoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  sentidoText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  info: { fontSize: 14, fontWeight: '700' },
  localRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  local: { fontSize: 12, flex: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
