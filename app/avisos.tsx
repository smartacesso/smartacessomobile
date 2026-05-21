import { Colors } from '@/constants/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';

export default function AvisosScreen() {
  const router = useRouter();
  const { isDark, colorScheme } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  // Exemplo de dados de avisos (Isso depois virá do seu banco de dados)
  const listaAvisos = [
    { id: '1', titulo: 'Manutenção de Elevador', data: '10/05/2026', desc: 'O elevador do bloco A ficará parado das 08h às 12h.' },
    { id: '2', titulo: 'Dedetização', data: '12/05/2026', desc: 'A área comum será dedetizada. Evite circular com pets.' },
    { id: '3', titulo: 'Reunião Extraordinária', data: '15/05/2026', desc: 'Pauta: Reforma da guarita e novos procedimentos de segurança.' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AVISOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {listaAvisos.map((aviso) => (
          <View key={aviso.id} style={[styles.avisoCard, { backgroundColor: isDark ? '#242424' : '#FFF' }]}>
            <View style={styles.avisoHeader}>
              <MaterialCommunityIcons name="bullhorn-variant-outline" size={24} color="#F44336" />
              <Text style={[styles.avisoTitle, { color: isDark ? colors.text : '#333' }]}>{aviso.titulo}</Text>
            </View>
            <Text style={[styles.avisoData, { color: isDark ? '#888' : '#999' }]}>{aviso.data}</Text>
            <Text style={[styles.avisoDesc, { color: isDark ? '#aaa' : '#666' }]}>{aviso.desc}</Text>
            <TouchableOpacity style={[styles.readMore, { borderTopColor: isDark ? '#444' : '#EEE' }]}>
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
  container: { flex: 1 },
  header: { backgroundColor: '#001529', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', left: 15 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 15 },
  avisoCard: { borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  avisoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  avisoTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  avisoData: { fontSize: 12, marginBottom: 10, marginLeft: 34 },
  avisoDesc: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  readMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', borderTopWidth: 1, paddingTop: 10 },
  readMoreText: { color: '#F44336', fontWeight: 'bold', fontSize: 12, marginRight: 5 }
});