import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EntregasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [encomendas, setEncomendas] = useState<any[]>([]);

  // O Token que funcionou no Histórico (Code 200)
  const TOKEN_ATUAL = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNzA4NTAiLCJjbGllbnRlIjoiZGVzZW52b2x2aW1lbnRvIiwiaWF0IjoxNzc4MTk1NDI1LCJleHAiOjE3NzgyMjQyMjV9.seDgfHvKJ_HKyaySb6ymjnnEwHiBvBNIoonnCAvnBiE";

  const carregarEncomendas = async () => {
    setLoading(true);
    try {
      // AJUSTE DE URL: Verifique se o seu servidor de dev usa /encomendas ou /encomenda
      const url = 'https://smartacesso.com.br/sistema/restful-services/app/encomendas';
      
      console.log("Tentando Encomendas em:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN_ATUAL}`,
          'User-Agent': 'Apidog/1.0.0'
        },
        body: JSON.stringify({ 
          pagina: 0, 
          tamanho: 20 
        }),
      });

      const responseText = await response.text();
      console.log("Status Encomendas:", response.status);

      if (response.ok) {
        const data = JSON.parse(responseText);
        const lista = data.content || data || [];
        setEncomendas(Array.isArray(lista) ? lista : []);
      } else {
        console.log("Resposta do erro:", responseText);
        Alert.alert("Erro " + response.status, "Caminho de encomendas não encontrado no servidor de dev.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha de conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarEncomendas(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>ENCOMENDAS</Text>
        <TouchableOpacity onPress={carregarEncomendas}><Feather name="refresh-cw" size={20} color="#FFF" /></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{flex:1}} />
      ) : (
        <FlatList
          data={encomendas}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconBox}><MaterialCommunityIcons name="package-variant" size={24} color="#2196F3" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.title}>{item.descricao || item.observacao || "Encomenda Registrada"}</Text>
                <Text style={styles.sub}>{item.dataHoraRegistro || item.data || "Sem data"}</Text>
              </View>
              <View style={styles.badge}><Text style={styles.badgeText}>{item.status || "RECEBIDO"}</Text></View>
            </View>
          )}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:40, color:'#999'}}>Nenhuma encomenda encontrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { backgroundColor: '#001529', height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 11, color: '#999', marginTop: 2 },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' }
});