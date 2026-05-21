import { Colors } from '@/constants/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useServer } from './ServerContext';
import { useTheme } from './ThemeContext';

// Interface baseada na estrutura do seu backend
interface Encomenda {
  id: number;
  codigoRastreio: string;
  tipo: string;
  dataRecebimento: string;
  dataRetirada: string | null;
  confirmaRetirada: string | boolean;
  nomeQuemRetirou: string | null;
  documentoQuemRetirou: string | null;
}

export default function EntregasScreen() {
  const router = useRouter();
  const { servidor, token } = useServer();
  const { isDark, colorScheme } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);

  const fetchEncomendas = useCallback(async (isRefresh = false) => {
    if (!token) {
      Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = `${servidor}/sistema/restful-services/app/encomendas`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pagina: 0, tamanho: 50 }),
      });

      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const data = await response.json();
      const lista = data.content || data || [];
      setEncomendas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error("Erro ao carregar encomendas:", error);
      Alert.alert("Falha de Conexão", "Não foi possível buscar os dados no servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [servidor, token]);

  useEffect(() => {
    fetchEncomendas();
  }, [fetchEncomendas]);

  const renderItem = ({ item }: { item: Encomenda }) => {
  const isRetirado =
    item.confirmaRetirada === 'S' ||
    item.confirmaRetirada === true;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#242424' : '#FFF' }]}>
      <View style={[styles.iconBox, { backgroundColor: isDark ? '#1a3a5c' : '#E3F2FD' }]}>
        <MaterialCommunityIcons
          name={item.tipo === 'PACOTE'
            ? "package-variant"
            : "email-outline"}
          size={24}
          color="#2196F3"
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: isDark ? colors.text : '#1A1C1E' }]}>
          {(item.codigoRastreio || "Sem Código")} - {String(item.tipo || "")}
        </Text>

        <Text style={[styles.sub, { color: isDark ? '#aaa' : '#666' }]}>
          {isRetirado
            ? `Retirado em ${
                item.dataRetirada
                  ? new Date(item.dataRetirada).toLocaleDateString()
                  : "Data não informada"
              }`
            : `Recebido em ${
                item.dataRecebimento
                  ? new Date(item.dataRecebimento).toLocaleDateString()
                  : "Data não informada"
              }`
          }
        </Text>

        <Text
          style={[
            styles.statusInfo,
            { color: isRetirado ? '#2E7D32' : '#EF6C00' }
          ]}
        >
          {isRetirado
            ? `Retirado por: ${item.nomeQuemRetirou || 'N/A'}`
            : "Aguardando Retirada"}
        </Text>
      </View>

      <View
        style={[
          styles.badge,
          { backgroundColor: isRetirado ? (isDark ? '#1a472a' : '#E8F5E9') : (isDark ? '#5c3a1a' : '#FFF3E0') }
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: isRetirado ? '#2E7D32' : '#EF6C00' }
          ]}
        >
          {isRetirado ? "ENTREGUE" : "DISPONÍVEL"}
        </Text>
      </View>
    </View>
  );
};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="#001529" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>ENCOMENDAS</Text>

        {/* Espaçador para centralizar título */}
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={[styles.loadingText, { color: isDark ? '#aaa' : '#666' }]}>Carregando encomendas...</Text>
        </View>
      ) : (
        <FlatList
          data={encomendas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchEncomendas(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="box" size={50} color={isDark ? "#444" : "#CCC"} />
              <Text style={[styles.emptyText, { color: isDark ? '#888' : '#999' }]}>Nenhuma encomenda encontrada.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    backgroundColor: '#001529', 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15 
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  listContent: { padding: 16, paddingBottom: 30 },
  card: { 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cardContent: { flex: 1 },
  title: { fontSize: 15, fontWeight: 'bold' },
  sub: { fontSize: 12, marginTop: 2 },
  statusInfo: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSuccess: { backgroundColor: '#E8F5E9' },
  badgePending: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  textSuccess: { color: '#2E7D32' },
  textPending: { color: '#EF6C00' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 16 }
});