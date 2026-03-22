import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getWorkout, type Workout } from '@/db/database';
import { StatCard } from '@/components/StatCard';

function formatDuration(s: number | null): string {
  if (!s) return '—';
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (id) getWorkout(Number(id)).then(setWorkout);
  }, [id]);

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  let zones: Record<string, { percent?: number; minutes?: number }> | null = null;
  try {
    if (workout.heart_rate_zones) zones = JSON.parse(workout.heart_rate_zones);
  } catch {}

  const zoneColors: Record<string, string> = {
    peak: '#dc3545',
    vigorous: '#fd7e14',
    moderate: '#198754',
    light: '#0d6efd',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {workout.activity_type.charAt(0).toUpperCase() + workout.activity_type.slice(1)}
      </Text>
      <Text style={styles.date}>{workout.date}</Text>
      <View style={[styles.badge, { backgroundColor: workout.source === 'fitbit' ? '#0d6efd' : '#fd7e14' }]}>
        <Text style={styles.badgeText}>{workout.source}</Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Duration" value={formatDuration(workout.duration_seconds)} />
        <StatCard label="Distance" value={workout.distance_miles ? `${workout.distance_miles.toFixed(2)} mi` : '—'} />
        <StatCard label="Calories" value={workout.calories_burned ? `${Math.round(workout.calories_burned)}` : '—'} />
        <StatCard label="Steps" value={workout.steps ?? '—'} />
        <StatCard label="Avg Pace" value={workout.avg_pace ?? '—'} />
        <StatCard label="Avg HR" value={workout.avg_heart_rate ? `${workout.avg_heart_rate} bpm` : '—'} />
        <StatCard label="Elevation" value={workout.elevation_gain_ft ? `${workout.elevation_gain_ft} ft` : '—'} />
        <StatCard label="Cardio Load" value={workout.cardio_load ?? '—'} />
        <StatCard label="Zone Min" value={workout.zone_minutes ?? '—'} />
      </View>

      {zones && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heart Rate Zones</Text>
          {['peak', 'vigorous', 'moderate', 'light'].map((name) => {
            const z = zones![name];
            if (!z) return null;
            return (
              <View key={name} style={[styles.zoneRow, { borderLeftColor: zoneColors[name] }]}>
                <Text style={styles.zoneName}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
                <Text style={styles.zoneVal}>
                  {z.percent != null ? `${z.percent}%` : ''}{z.minutes != null ? ` · ${z.minutes} min` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {workout.image_uri && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original Screenshot</Text>
          <Image source={{ uri: workout.image_uri }} style={styles.screenshot} resizeMode="contain" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingBottom: 40 },
  loading: { color: '#888', textAlign: 'center', marginTop: 40 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  date: { color: '#aaa', fontSize: 15, marginTop: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  section: { marginTop: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  zoneRow: { borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 8, marginBottom: 6, backgroundColor: '#2a2a3e', borderRadius: 6 },
  zoneName: { color: '#fff', fontWeight: '600' },
  zoneVal: { color: '#aaa', fontSize: 13 },
  screenshot: { width: '100%', height: 400, borderRadius: 12, marginTop: 8 },
});
