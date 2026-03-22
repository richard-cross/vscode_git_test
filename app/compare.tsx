import { useCallback, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getWorkouts, getWorkoutsByIds, type Workout } from '@/db/database';
import { compareWorkouts, type ComparisonResult } from '@/services/analytics';
import { WorkoutRow } from '@/components/WorkoutRow';

export default function Compare() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ComparisonResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkouts(100).then(setWorkouts);
      setResult(null);
      setSelected(new Set());
    }, []),
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  }

  async function compare() {
    const ids = Array.from(selected);
    if (ids.length < 2) {
      Alert.alert('Select at least 2 workouts');
      return;
    }
    const rows = await getWorkoutsByIds(ids);
    if (rows.length >= 2) {
      setResult(compareWorkouts(rows[0], rows[1]));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Compare Workouts</Text>
      <Text style={styles.sub}>Select 2 workouts to compare side-by-side.</Text>

      {workouts.map((w) => (
        <WorkoutRow
          key={w.id}
          workout={w}
          onPress={() => {}}
          selectable
          selected={selected.has(w.id)}
          onToggle={() => toggle(w.id)}
        />
      ))}

      {selected.size >= 2 && (
        <Pressable style={styles.compareBtn} onPress={compare}>
          <Text style={styles.compareBtnText}>Compare ({selected.size})</Text>
        </Pressable>
      )}

      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultHeading}>Results</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell, { flex: 1.5 }]}>Metric</Text>
              <Text style={[styles.cell, styles.headerCell]}>Base</Text>
              <Text style={[styles.cell, styles.headerCell]}>Compare</Text>
              <Text style={[styles.cell, styles.headerCell]}>Change</Text>
            </View>
            {Object.values(result.metrics).map((m) => (
              <View key={m.label} style={styles.tableRow}>
                <Text style={[styles.cell, { flex: 1.5 }]}>{m.label}</Text>
                <Text style={styles.cell}>{m.base ?? '—'}</Text>
                <Text style={styles.cell}>{m.compare ?? '—'}</Text>
                <Text
                  style={[
                    styles.cell,
                    m.improved === true && styles.improved,
                    m.improved === false && styles.declined,
                  ]}
                >
                  {m.diff != null
                    ? `${m.diff > 0 ? '+' : ''}${m.diff}${m.pctChange != null ? ` (${m.pctChange > 0 ? '+' : ''}${m.pctChange}%)` : ''}`
                    : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#888', fontSize: 14, marginBottom: 16 },
  compareBtn: { backgroundColor: '#4fc3f7', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 12 },
  compareBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
  resultSection: { marginTop: 24 },
  resultHeading: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  table: { backgroundColor: '#2a2a3e', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#333352', paddingVertical: 10 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#3a3a5e' },
  cell: { flex: 1, color: '#ccc', fontSize: 13, paddingHorizontal: 8 },
  headerCell: { color: '#fff', fontWeight: '700' },
  improved: { color: '#2ecc71' },
  declined: { color: '#e74c3c' },
});
