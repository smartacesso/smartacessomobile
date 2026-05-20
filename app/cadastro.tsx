import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useServer } from './ServerContext';

export default function CadastroScreen() {
  const router = useRouter();
  const { servidor } = useServer();
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleEnviarWhatsApp = () => {
    if (!nome || !telefone) {
      Alert.alert("Erro", "Por favor, preencha pelo menos o nome e o telefone.");
      return;
    }

    // Limpa o número de telefone (remove parênteses, espaços e traços)
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    // URL do cadastro usando o servidor configurável
    const linkCadastro = `${servidor}/portal/cadastro?ref=${Date.now()}`;
    
    const mensagem = `Olá ${nome}! Aqui está o seu link para finalizar o cadastro no Smart Acesso: \n\n${linkCadastro}`;
    
    const urlWhatsapp = `whatsapp://send?phone=55${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;

    Linking.canOpenURL(urlWhatsapp).then((supported) => {
      if (supported) {
        Linking.openURL(urlWhatsapp);
      } else {
        Alert.alert("Erro", "O WhatsApp não está instalado neste dispositivo.");
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOVO CADASTRO</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.instructions}>
          <MaterialCommunityIcons name="whatsapp" size={40} color="#25D366" />
          <Text style={styles.instructionText}>
            Preencha os dados abaixo. Ao salvar, abriremos o WhatsApp para enviar o link de finalização.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo</Text>
            <View style={styles.inputArea}>
              <Feather name="user" size={20} color="#666" />
              <TextInput 
                style={styles.input} 
                placeholder="Ex: João Silva" 
                value={nome}
                onChangeText={setNome}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp (com DDD)</Text>
            <View style={styles.inputArea}>
              <Feather name="phone" size={20} color="#666" />
              <TextInput 
                style={styles.input} 
                placeholder="319XXXXXXXX" 
                keyboardType="phone-pad"
                value={telefone}
                onChangeText={setTelefone}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Documento (Opcional)</Text>
            <View style={styles.inputArea}>
              <Feather name="file-text" size={20} color="#666" />
              <TextInput 
                style={styles.input} 
                placeholder="CPF ou RG" 
                value={documento}
                onChangeText={setDocumento}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações</Text>
            <View style={[styles.inputArea, { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Prestador de serviço, visitante..." 
                multiline
                value={observacao}
                onChangeText={setObservacao}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.btnSalvar} onPress={handleEnviarWhatsApp}>
            <MaterialCommunityIcons name="whatsapp" size={24} color="#000" />
            <Text style={styles.btnText}>GERAR LINK E ENVIAR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { 
    backgroundColor: '#001529', 
    height: 70, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 10 
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  instructions: { 
    alignItems: 'center', 
    backgroundColor: '#E8F5E9', 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  instructionText: { 
    textAlign: 'center', 
    color: '#2E7D32', 
    marginTop: 10, 
    fontSize: 14,
    lineHeight: 20
  },
  form: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 2 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9F9F9', 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    height: 50 
  },
  input: { flex: 1, marginLeft: 10, color: '#333' },
  btnSalvar: { 
    backgroundColor: '#99CC33', 
    height: 55, 
    borderRadius: 10, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10 
  },
  btnText: { color: '#000', fontWeight: 'bold', marginLeft: 10 }
});