import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AvisosScreen() {
  const router = useRouter();

  // Exemplo de dados de avisos (Isso depois virá do seu banco de dados)
  const listaAvisos = [
    { id: '1', titulo: 'Manutenção de Elevador', data: '10/05/2026', desc: 'O elevador do bloco A ficará parado das 08h às 12h.' },
    { id: '2', titulo: 'Dedetização', data: '12/05/2026', desc: 'A área comum será dedetizada. Evite circular com pets.' },
    { id: '3', titulo: 'Reunião Extraordinária', data: '15/05/2026', desc: 'Pauta: Reforma da guarita e novos procedimentos de segurança.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AVISOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {listaAvisos.map((aviso) => (
          <View key={aviso.id} style={styles.avisoCard}>
            <View style={styles.avisoHeader}>
              <MaterialCommunityIcons name="bullhorn-variant-outline" size={24} color="#F44336" />
              <Text style={styles.avisoTitle}>{aviso.titulo}</Text>
            </View>
            <Text style={styles.avisoData}>{aviso.data}</Text>
            <Text style={styles.avisoDesc}>{aviso.desc}</Text>
            <TouchableOpacity style={styles.readMore}>
              <Text style={styles.readMoreText}>LER MAIS</Text>
              <Feather name="chevron-right" size={16} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { backgroundColor: '#001529', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', left: 15 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 15 },
  avisoCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  avisoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  avisoTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  avisoData: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 34 },
  avisoDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 10 },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  readMoreText: { color: '#F44336', fontWeight: 'bold', fontSize: 12, marginRight: 5 }
});