import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from '@/db/database';
import { authorize, isConnected, disconnect } from '@/services/fitbit';

export default function Settings() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [fitbitClientId, setFitbitClientId] = useState('');
  const [fitbitSecret, setFitbitSecret] = useState('');
  const [fitbitConnected, setFitbitConnected] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setAnthropicKey((await getSetting('anthropic_api_key')) ?? '');
        setFitbitClientId((await getSetting('fitbit_client_id')) ?? '');
        setFitbitSecret((await getSetting('fitbit_client_secret')) ?? '');
        setFitbitConnected(await isConnected());
      })();
    }, []),
  );

  async function saveKeys() {
    await setSetting('anthropic_api_key', anthropicKey.trim());
    await setSetting('fitbit_client_id', fitbitClientId.trim());
    await setSetting('fitbit_client_secret', fitbitSecret.trim());
    Alert.alert('Saved', 'API keys saved locally on your device.');
  }

  async function connectFitbit() {
    try {
      const ok = await authorize();
      if (ok) {
        setFitbitConnected(true);
        Alert.alert('Connected', 'Fitbit account linked!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function disconnectFitbit() {
    await disconnect();
    setFitbitConnected(false);
    Alert.alert('Disconnected', 'Fitbit account unlinked.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.sub}>All keys are stored locally on your device. Nothing is sent to any server.</Text>

      <Text style={styles.label}>Anthropic API Key</Text>
      <TextInput
        style={styles.input}
        value={anthropicKey}
        onChangeText={setAnthropicKey}
        placeholder="sk-ant-..."
        placeholderTextColor="#555"
        secureTextEntry
        autoCapitalize="none"
      />
      <Text style={styles.hint}>Required for screenshot analysis. Get one at console.anthropic.com</Text>

      <Text style={[styles.label, { marginTop: 24 }]}>Fitbit Client ID</Text>
      <TextInput
        style={styles.input}
        value={fitbitClientId}
        onChangeText={setFitbitClientId}
        placeholder="e.g. 23ABCD"
        placeholderTextColor="#555"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Fitbit Client Secret</Text>
      <TextInput
        style={styles.input}
        value={fitbitSecret}
        onChangeText={setFitbitSecret}
        placeholder="e.g. abc123..."
        placeholderTextColor="#555"
        secureTextEntry
        autoCapitalize="none"
      />
      <Text style={styles.hint}>Register at dev.fitbit.com to get these.</Text>

      <Pressable style={styles.saveBtn} onPress={saveKeys}>
        <Text style={styles.saveBtnText}>Save Keys</Text>
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.label}>Fitbit Connection</Text>
      {fitbitConnected ? (
        <View style={styles.connectedRow}>
          <Text style={styles.connectedText}>Connected</Text>
          <Pressable style={styles.disconnectBtn} onPress={disconnectFitbit}>
            <Text style={styles.disconnectBtnText}>Disconnect</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.connectBtn} onPress={connectFitbit}>
          <Text style={styles.connectBtnText}>Connect Fitbit</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#888', fontSize: 13, marginBottom: 20 },
  label: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  hint: { color: '#666', fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  saveBtn: { backgroundColor: '#4fc3f7', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#3a3a5e', marginVertical: 24 },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  connectedText: { color: '#2ecc71', fontSize: 16, fontWeight: '600' },
  disconnectBtn: { backgroundColor: '#e74c3c', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  disconnectBtnText: { color: '#fff', fontWeight: '600' },
  connectBtn: { backgroundColor: '#2a2a3e', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#4fc3f7' },
  connectBtnText: { color: '#4fc3f7', fontWeight: '700', fontSize: 16 },
});
