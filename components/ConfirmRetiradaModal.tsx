import { Palette, getCardShadow } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { Encomenda } from '@/lib/apiService';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface ConfirmRetiradaModalProps {
  visible: boolean;
  encomenda: Encomenda | null;
  nomeInicial?: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (nome: string, documento: string) => void;
}

export function ConfirmRetiradaModal({
  visible,
  encomenda,
  nomeInicial = '',
  submitting,
  onClose,
  onConfirm,
}: ConfirmRetiradaModalProps) {
  const colors = useAppColors();
  const { isDark } = useTheme();
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');

  useEffect(() => {
    if (visible) {
      setNome(nomeInicial);
      setDocumento('');
    }
  }, [visible, nomeInicial]);

  if (!encomenda) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.background : '#fff',
              borderColor: colors.border,
              ...getCardShadow(isDark),
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Confirmar retirada</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {(encomenda.codigoRastreio || 'Sem código') + ' · ' + (encomenda.tipo || 'Correspondência')}
          </Text>

          <Text style={[styles.label, { color: colors.textMuted }]}>Nome de quem retirou</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8f8f8' }]}
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Documento (RG/CPF)</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.background : '#f8f8f8' }]}
            value={documento}
            onChangeText={setDocumento}
            placeholder="Número do documento"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={onClose} disabled={submitting}>
              <Text style={[styles.btnSecondaryText, { color: colors.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, submitting && styles.btnDisabled]}
              onPress={() => onConfirm(nome.trim(), documento.trim())}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.btnPrimaryText}>Confirmar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { fontWeight: '700', fontSize: 14 },
  btnPrimary: {
    flex: 1,
    backgroundColor: Palette.color2,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.7 },
});
