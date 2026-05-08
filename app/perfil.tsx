import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 1. Carregar a configuração ao abrir a tela
  useEffect(() => {
    const carregarPreferencia = async () => {
      try {
        const valorSalvo = await AsyncStorage.getItem('@dark_mode');
        if (valorSalvo !== null) {
          setIsDarkMode(JSON.parse(valorSalvo));
        }
      } catch (e) {
        console.log("Erro ao carregar tema", e);
      }
    };
    carregarPreferencia();
  }, []);

  // 2. Salvar a configuração quando mudar o Switch
  const toggleTheme = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('@dark_mode', JSON.stringify(value));
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar sua preferência de tema.");
    }
  };

  // Estilos dinâmicos baseados no estado
  const themeContainer = isDarkMode ? styles.darkBg : styles.lightBg;
  const themeText = isDarkMode ? styles.darkText : styles.lightText;

  return (
    <SafeAreaView style={[styles.container, themeContainer]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFF" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, themeText]}>Meu Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.userCard}>
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={40} color="#666" />
          </View>
          <Text style={[styles.userName, themeText]}>Victor Borges</Text>
          <Text style={styles.userEmail}>victor@smartacesso.com.br</Text>
        </View>

        <View style={[styles.settingRow, isDarkMode ? styles.borderDark : styles.borderLight]}>
          <View style={styles.rowInfo}>
            <Feather name="moon" size={20} color={isDarkMode ? "#99CC33" : "#666"} />
            <Text style={[styles.settingLabel, themeText]}>Modo Escuro</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: "#767577", true: "#99CC33" }}
            thumbColor={isDarkMode ? "#FFF" : "#f4f3f4"}
          />
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => router.replace('/')}
        >
          <Feather name="log-out" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#F5F5F5' },
  darkBg: { backgroundColor: '#000D1A' },
  lightText: { color: '#333' },
  darkText: { color: '#FFF' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  userCard: { alignItems: 'center', marginVertical: 30 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#999', fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#EEE' },
  borderDark: { borderBottomColor: '#002B52' },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { marginLeft: 15, fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 15 },
  logoutText: { color: '#F44336', marginLeft: 10, fontWeight: 'bold' }
});