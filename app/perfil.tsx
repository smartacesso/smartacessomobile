import { Colors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { clearLoginInfo } from './StorageUtils';
import { useTheme } from './ThemeContext';

export default function PerfilScreen() {
  const router = useRouter();
  const { isDark, updateTheme } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [isDarkMode, setIsDarkMode] = useState(isDark);

  // Salvar a configuração quando mudar o Switch
  const toggleTheme = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await updateTheme(value);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar sua preferência de tema.");
    }
  };

  // Limpar dados salvos e sair
  const handleClearDataAndLogout = () => {
    Alert.alert(
      'Limpar Dados',
      'Deseja limpar todos os dados salvos (usuário, organização e servidor) e fazer logout?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar e Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLoginInfo();
              router.replace('/(tabs)');
            } catch (e) {
              Alert.alert("Erro", "Não foi possível limpar os dados.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={isDark ? "#FFF" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Meu Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.userCard}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#3a3a3a' : '#DDD' }]}>
            <Feather name="user" size={40} color={isDark ? "#888" : "#666"} />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>Victor Borges</Text>
          <Text style={[styles.userEmail, { color: isDark ? '#888' : '#999' }]}>victor@smartacesso.com.br</Text>
        </View>

        <View style={[styles.settingRow, { borderBottomColor: isDark ? '#444' : '#EEE' }]}>
          <View style={styles.rowInfo}>
            <Feather name="moon" size={20} color={isDarkMode ? "#99CC33" : "#666"} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Escuro</Text>
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

        <TouchableOpacity 
          style={[styles.logoutBtn, { borderTopWidth: 1, borderTopColor: isDark ? '#444' : '#EEE', marginTop: 20 }]}
          onPress={handleClearDataAndLogout}
        >
          <Feather name="trash-2" size={20} color="#FF9800" />
          <Text style={[styles.logoutText, { color: '#FF9800' }]}>Limpar Dados e Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  userCard: { alignItems: 'center', marginVertical: 30 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userEmail: { fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1 },
  rowInfo: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { marginLeft: 15, fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 15 },
  logoutText: { color: '#F44336', marginLeft: 10, fontWeight: 'bold' }
});