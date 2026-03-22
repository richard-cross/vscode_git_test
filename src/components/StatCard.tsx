import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    margin: 4,
  },
  value: { color: '#fff', fontSize: 24, fontWeight: '700' },
  label: { color: '#aaa', fontSize: 13, marginTop: 4 },
  sub: { color: '#888', fontSize: 11, marginTop: 2 },
});
