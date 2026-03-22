import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getWorkouts, type Workout } from '@/db/database';
import { computeStats } from '@/services/analytics';
import { StatCard } from '@/components/StatCard';
import { WorkoutRow } from '@/components/WorkoutRow';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getWorkouts(50).then(setWorkouts);
    }, []),
  );

  const stats = computeStats(workouts);

  return (
    <View style={styles.container}>
      {stats.totalWorkouts > 0 && (
        <View style={styles.statsRow}>
          <StatCard label="Workouts" value={stats.totalWorkouts} />
          <StatCard label="Calories" value={stats.totalCalories} />
          <StatCard label="Miles" value={stats.totalDistanceMiles} />
        </View>
      )}

      <Text style={styles.heading}>Recent Workouts</Text>

      {workouts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No workouts yet.</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/upload')}>
            <Text style={styles.ctaText}>Upload a Screenshot</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(w) => String(w.id)}
          renderItem={({ item }) => (
            <WorkoutRow
              workout={item}
              onPress={() => router.push(`/workout/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#888', fontSize: 16, marginBottom: 16 },
  cta: { backgroundColor: '#4fc3f7', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 },
  ctaText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
});
