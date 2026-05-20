import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, SectionList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useServer } from './ServerContext';

export default function HistoricoScreen() {
  const router = useRouter();
  const { servidor, token } = useServer();
  const [loading, setLoading] = useState(false);
  
  const [eventosAgrupados, setEventosAgrupados] = useState<any[]>([]);

  // Função para formatar a data ISO para o padrão brasileiro
  const formatarData = (dataIso: string) => {
    if (!dataIso) return "Data não informada";
    const dataObj = new Date(dataIso);
    
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hora = String(dataObj.getHours()).padStart(2, '0');
    const min = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  };

  const agruparEventos = (listaPlan: any[]) => {
    const grupos = listaPlan.reduce((acc, item) => {
      // Pega o nome do JSON que você enviou (item.pedestre.nome)
      const nomePessoa = item.pedestre?.nome || "Usuário Identificado";
      
      if (!acc[nomePessoa]) {
        acc[nomePessoa] = [];
      }
      acc[nomePessoa].push(item);
      return acc;
    }, {});

    return Object.keys(grupos).map(nome => ({
      title: nome,
      data: grupos[nome]
    }));
  };

  const carregarHistorico = async () => {
    if (!token) {
      Alert.alert("Erro", "Token não disponível. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      const url = `${servidor}/sistema/restful-services/app/acessos`;
      
      const dataFimObj = new Date();
      const dataInicioObj = new Date();
      dataInicioObj.setDate(dataFimObj.getDate() - 30);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'SmartAcessoApp/1.0.0'
        },
        body: JSON.stringify({ 
          dataInicio: dataInicioObj.toISOString().split('T')[0], 
          dataFim: dataFimObj.toISOString().split('T')[0], 
          pagina: 0, 
          tamanho: 50 
        }),
      });

      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);
        const lista = data.content || data || [];
        
        const listaFormatada = agruparEventos(Array.isArray(lista) ? lista : []);
        setEventosAgrupados(listaFormatada);
        
      } else {
        Alert.alert("Erro", "Não foi possível carregar os acessos.");
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
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HISTÓRICO DE ACESSOS</Text>
        <TouchableOpacity onPress={carregarHistorico}>
          <Feather name="refresh-cw" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#99CC33" style={{flex:1}} />
      ) : (
        <SectionList
          sections={eventosAgrupados}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum acesso para este período.</Text>}
          
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Feather name="user" size={18} color="#001529" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          
          renderItem={({ item }) => {
            // Lógica de cores baseada no "sentido" do JSON
            const isSaida = item.sentido === 'SAIDA';
            const corSentido = isSaida ? '#F44336' : '#99CC33';
            
            return (
              <View style={styles.card}>
                <View style={styles.avatarArea}>
                  {/* Corrida a busca da foto (agora busca de item.pedestre.foto) */}
                  {item.pedestre?.foto ? (
                    <Image source={{ uri: item.pedestre.foto }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Feather name={isSaida ? "arrow-up-right" : "arrow-down-left"} size={20} color={corSentido} />
                    </View>
                  )}
                </View>
                
                <View style={{flex: 1}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                     {/* Texto explicitando o Sentido (Entrada/Saída) */}
                    <Text style={[styles.sentidoText, { color: corSentido }]}>
                      {item.sentido || "ACESSO"}
                    </Text>
                  </View>
                  
                  {/* Data formatada bonito */}
                  <Text style={styles.info}>{formatarData(item.data)}</Text>
                  <Text style={styles.local}>{item.local || "Portaria Principal"}</Text>
                </View>

                {/* Barra lateral colorida de acordo com a Entrada/Saida */}
                <View style={[styles.indicator, { backgroundColor: corSentido }]} />
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#001529', height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3E8ED', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#001529', textTransform: 'uppercase' },
  
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  avatarArea: { marginRight: 12 },
  avatar: { width: 45, height: 45, borderRadius: 22 },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#F0F5E5', justifyContent: 'center', alignItems: 'center' },
  
  sentidoText: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  info: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  local: { fontSize: 12, color: '#666', marginTop: 2 },
  indicator: { width: 4, height: 35, borderRadius: 2, marginLeft: 10 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});