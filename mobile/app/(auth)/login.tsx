import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/stores/authStore';
import { STORE_NAME } from '@bhai-store/shared';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);

  const handleLogin = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    try {
      // Try login first, if fails try setup
      let res;
      try {
        res = await api.post('/auth/login', { pin });
      } catch {
        res = await api.post('/auth/setup', { pin });
      }
      await setToken(res.data.data.token);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{STORE_NAME}</Text>
        <Text style={styles.subtitle}>Expense Tracker</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter PIN"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (pin.length < 4 || loading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={pin.length < 4 || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16a34a', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#9ca3af', marginTop: 4, marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 16 },
  button: { width: '100%', backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
