import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Workout } from '@/db/database';

interface Props {
  workout: Workout;
  onPress: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

function formatDuration(s: number | null): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export function WorkoutRow({ workout, onPress, selectable, selected, onToggle }: Props) {
  return (
    <Pressable
      style={[styles.row, selected && styles.selected]}
      onPress={selectable ? onToggle : onPress}
    >
      <View style={styles.left}>
        <Text style={styles.type}>{workout.activity_type.charAt(0).toUpperCase() + workout.activity_type.slice(1)}</Text>
        <Text style={styles.date}>{workout.date}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.metric}>
          {workout.distance_miles ? `${workout.distance_miles.toFixed(2)} mi` : '—'}
        </Text>
        <Text style={styles.metric}>
          {workout.calories_burned ? `${Math.round(workout.calories_burned)} cal` : '—'}
        </Text>
        <Text style={styles.sub}>{formatDuration(workout.duration_seconds)}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { backgroundColor: workout.source === 'fitbit' ? '#0d6efd' : workout.source === 'image' ? '#fd7e14' : '#6c757d' }]}>
          {workout.source}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selected: { borderColor: '#0d6efd', borderWidth: 2 },
  left: { flex: 1 },
  type: { color: '#fff', fontSize: 16, fontWeight: '600' },
  date: { color: '#aaa', fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end', marginRight: 10 },
  metric: { color: '#fff', fontSize: 14 },
  sub: { color: '#888', fontSize: 12, marginTop: 2 },
  badge: { position: 'absolute', top: 8, right: 10 },
  badgeText: { color: '#fff', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
});
