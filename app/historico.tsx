import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HistoricoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);

  // Token do seu CURL (lembre-se que ele expira)
  const TOKEN_ATUAL = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNzA4NTAiLCJjbGllbnRlIjoiZGVzZW52b2x2aW1lbnRvIiwiaWF0IjoxNzc4MTk1NDI1LCJleHAiOjE3NzgyMjQyMjV9.seDgfHvKJ_HKyaySb6ymjnnEwHiBvBNIoonnCAvnBiE";

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // URL corrigida para /acessos conforme seu CURL
      const url = 'https://smartacesso.com.br/sistema/restful-services/app/acessos';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN_ATUAL}`,
          'User-Agent': 'Apidog/1.0.0'
        },
        // Body atualizado com o filtro de datas do seu CURL
        body: JSON.stringify({ 
          dataInicio: "2026-04-20", 
          dataFim: "2026-05-07", // Coloquei a data de hoje para garantir que venha algo
          pagina: 0, 
          tamanho: 50 
        }),
      });

      const responseText = await response.text();
      console.log("Status Histórico:", response.status);

      if (response.ok) {
        const data = JSON.parse(responseText);
        const lista = data.content || data || [];
        setEventos(Array.isArray(lista) ? lista : []);
      } else {
        console.log("Erro no servidor:", responseText);
        Alert.alert("Erro " + response.status, "Não foi possível carregar os acessos.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarHistorico(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>HISTÓRICO DE ACESSOS</Text>
        <TouchableOpacity onPress={carregarHistorico}><Feather name="refresh-cw" size={20} color="#FFF" /></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{flex:1}} />
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum acesso para este período.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatarArea}>
                {item.foto ? (
                  <Image source={{ uri: item.foto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="user" size={20} color="#FF9800" />
                  </View>
                )}
              </View>
              
              <View style={{flex: 1}}>
                <Text style={styles.nome}>{item.pessoa || item.nome || "Usuário Identificado"}</Text>
                <Text style={styles.info}>{item.dataHora || item.data || "Data não informada"}</Text>
                <Text style={styles.local}>{item.local || item.dispositivo || "Portaria Principal"}</Text>
              </View>

              <View style={[styles.indicator, { backgroundColor: item.sentido === 'SAIDA' ? '#F44336' : '#4CAF50' }]} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#001529', height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  avatarArea: { marginRight: 12 },
  avatar: { width: 45, height: 45, borderRadius: 22 },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' },
  nome: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  info: { fontSize: 11, color: '#666', marginTop: 2 },
  local: { fontSize: 10, color: '#999', marginTop: 1 },
  indicator: { width: 4, height: 30, borderRadius: 2, marginLeft: 10 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});