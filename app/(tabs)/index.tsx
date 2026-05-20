import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useServer } from '../ServerContext';

export default function SmartAcessoApp() {
  const router = useRouter();
  const { servidor, setServidor, setToken } = useServer();
  
  // Estados do Login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [organizacao, setOrganizacao] = useState('lineaempresarial');
  const [usuario, setUsuario] = useState('victorborges');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estados de Configuração do Servidor
  const [modalVisible, setModalVisible] = useState(false);

  const handleLogin = async () => {
    if (!usuario || !senha || !organizacao) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const urlCompleta = `${servidor}/sistema/restful-services/app/login`;
      console.log("Conectando via HTTPS em:", urlCompleta);

      const response = await fetch(urlCompleta, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SmartAcessoApp/1.0' 
        },
        body: JSON.stringify({
          login: usuario,
          senha: senha,
          cliente: organizacao
        }),
      });

      const responseText = await response.text();
      console.log("Status Code:", response.status);

      try {
        const data = JSON.parse(responseText);
        
        if (response.ok) {
          console.log("Login realizado com sucesso!");
          // Salvar o token retornado pelo servidor
          if (data.token) {
            setToken(data.token);
          }
          setIsLoggedIn(true);
        } else {
          Alert.alert("Acesso Negado", data.mensagem || "Usuário ou senha incorretos.");
        }
      } catch (e) {
        // Se cair aqui, o servidor provavelmente mandou HTML (erro 404 ou 500)
        console.log("Erro: Resposta não é JSON. Recebido:", responseText);
        if (response.status === 404) {
          Alert.alert("Erro 404", "Endpoint não encontrado. Verifique a URL na engrenagem.");
        } else {
          Alert.alert("Erro no Servidor", "O servidor respondeu de forma inesperada (HTML).");
        }
      }

    } catch (error: any) {
      console.log("Erro de rede:", error.message);
      Alert.alert("Sem Conexão", "Não foi possível alcançar o servidor HTTPS.");
    } finally {
      setLoading(false);
    }
  };

  // TELA DE LOGIN
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.loginBg}>
        <StatusBar barStyle="light-content" />
        
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Configurar Servidor</Text>
              <View style={styles.modalInputRow}>
                <Feather name="globe" size={20} color="#666" />
                <TextInput 
                  style={styles.modalInput} 
                  value={servidor} 
                  onChangeText={setServidor} 
                  autoCapitalize="none" 
                />
              </View>
              <TouchableOpacity style={styles.btnSalvarModal} onPress={() => setModalVisible(false)}>
                <Text style={{fontWeight: 'bold', color: '#000'}}>SALVAR URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.loginContent}>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setModalVisible(true)}>
              <Feather name="settings" size={26} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.logoArea}>
              <Text style={styles.logoText}>smart <Text style={{color: '#99CC33'}}>acesso</Text></Text>
              <Text style={styles.appName}>CONTROLE DE ACESSO</Text>
            </View>

            <View style={styles.loginCard}>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons name="office-building" size={20} color="#99CC33" />
                <TextInput placeholder="Organização" placeholderTextColor="#666" style={styles.textInput} value={organizacao} onChangeText={setOrganizacao} />
              </View>
              
              <View style={styles.inputRow}>
                <Feather name="user" size={20} color="#666" />
                <TextInput placeholder="Usuário" placeholderTextColor="#666" style={styles.textInput} value={usuario} onChangeText={setUsuario} autoCapitalize="none" />
              </View>

              <View style={styles.inputRow}>
                <Feather name="lock" size={20} color="#666" />
                <TextInput placeholder="Senha" secureTextEntry={!mostrarSenha} placeholderTextColor="#666" style={styles.textInput} value={senha} onChangeText={setSenha} />
                <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
                  <Feather name={mostrarSenha ? "eye" : "eye-off"} size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>ENTRAR</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // TELA DASHBOARD (PÓS-LOGIN)
  return (
    <SafeAreaView style={styles.homeBg}>
      <View style={styles.header}><Text style={styles.headerTitle}>SMART ACESSO</Text></View>
      
      <View style={styles.menuGrid}>
        <MenuButton title="CADASTRO" icon="account-plus" color="#009688" onPress={() => router.push('/cadastro')} />
        <MenuButton title="HISTÓRICO" icon="history" color="#FF9800" onPress={() => router.push('/historico')} />
        <MenuButton title="AVISOS" icon="bullhorn" color="#F44336" onPress={() => router.push('/avisos')} />
        <MenuButton title="ENTREGAS" icon="truck-delivery" color="#2196F3" onPress={() => router.push('/entregas')} />
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}><Feather name="home" size={24} color="#3F51B5" /><Text style={{fontSize:10, color:'#3F51B5'}}>Início</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/perfil')}><Feather name="user" size={24} color="#666" /><Text style={{fontSize:10, color:'#666'}}>Perfil</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const MenuButton = ({ title, icon, color, onPress }: any) => (
  <TouchableOpacity style={[styles.cardMenu, { backgroundColor: color }]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={42} color="white" />
    <Text style={styles.cardMenuText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  loginBg: { flex: 1, backgroundColor: '#000D1A' },
  loginContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 25 },
  settingsBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  appName: { fontSize: 12, color: '#99CC33', fontWeight: 'bold', letterSpacing: 2 },
  loginCard: { width: '100%', backgroundColor: '#001A33', padding: 25, borderRadius: 25 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000D1A', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 15, borderWidth: 1, borderColor: '#002B52' },
  textInput: { flex: 1, color: '#FFF', marginLeft: 10 },
  btnPrimary: { backgroundColor: '#99CC33', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnPrimaryText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#001A33', borderRadius: 20, padding: 25 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000D1A', borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 20 },
  modalInput: { flex: 1, color: '#FFF', marginLeft: 10 },
  btnSalvarModal: { backgroundColor: '#99CC33', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  homeBg: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#001529', height: 60, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, justifyContent: 'space-between' },
  cardMenu: { width: '47%', height: 160, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  cardMenuText: { color: 'white', fontWeight: 'bold', marginTop: 12, fontSize: 14 },
  bottomNav: { position: 'absolute', bottom: 0, width: '100%', height: 75, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#DDD' },
  navItem: { alignItems: 'center' }
});