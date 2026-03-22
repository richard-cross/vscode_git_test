import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getWorkouts, type Workout } from '@/db/database';
import { computeStats, calorieTrend, weeklySummary, type CalorieTrendPoint, type WeekSummary } from '@/services/analytics';
import { StatCard } from '@/components/StatCard';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

export default function Trends() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      getWorkouts(500).then(setWorkouts);
    }, []),
  );

  const stats = computeStats(workouts);
  const trend = calorieTrend(workouts);
  const weeks = weeklySummary(workouts);

  const chartData = trend.length >= 2
    ? {
        labels: trend.map((t) => t.date.slice(5)), // MM-DD
        datasets: [{ data: trend.map((t) => t.calories || 0), color: () => '#4fc3f7' }],
      }
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trends & Analytics</Text>

      {stats.totalWorkouts > 0 ? (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Workouts" value={stats.totalWorkouts} />
            <StatCard label="Total Cal" value={stats.totalCalories} />
            <StatCard label="Avg Cal" value={stats.avgCalories} />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Total Mi" value={stats.totalDistanceMiles} />
            <StatCard label="Avg Duration" value={`${stats.avgDurationMinutes}m`} />
            <StatCard label="Total Steps" value={stats.totalSteps} />
          </View>

          {chartData && (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Calories Per Workout</Text>
              <LineChart
                data={chartData}
                width={screenWidth}
                height={200}
                chartConfig={{
                  backgroundColor: '#2a2a3e',
                  backgroundGradientFrom: '#2a2a3e',
                  backgroundGradientTo: '#1a1a2e',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(79, 195, 247, ${opacity})`,
                  labelColor: () => '#888',
                  propsForDots: { r: '4', strokeWidth: '1', stroke: '#4fc3f7' },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {weeks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Summary</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Week</Text>
                  <Text style={[styles.cell, styles.headerCell]}>#</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Cal</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Mi</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Steps</Text>
                </View>
                {weeks.map((w) => (
                  <View key={w.week} style={styles.tableRow}>
                    <Text style={[styles.cell, { flex: 1.2 }]}>{w.week}</Text>
                    <Text style={styles.cell}>{w.workouts}</Text>
                    <Text style={styles.cell}>{Math.round(w.totalCalories)}</Text>
                    <Text style={styles.cell}>{w.totalDistance.toFixed(1)}</Text>
                    <Text style={styles.cell}>{w.totalSteps}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.empty}>No workout data yet. Upload screenshots or sync Fitbit.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  chartContainer: { marginTop: 16 },
  chart: { borderRadius: 12 },
  section: { marginTop: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  table: { backgroundColor: '#2a2a3e', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#333352', paddingVertical: 10 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#3a3a5e' },
  cell: { flex: 1, color: '#ccc', fontSize: 13, paddingHorizontal: 6 },
  headerCell: { color: '#fff', fontWeight: '700' },
  empty: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 60 },
});
