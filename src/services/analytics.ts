import type { Workout } from '@/db/database';

export interface WorkoutStats {
  totalWorkouts: number;
  totalCalories: number;
  avgCalories: number;
  totalDistanceMiles: number;
  avgDistanceMiles: number;
  totalSteps: number;
  avgSteps: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
}

export function computeStats(workouts: Workout[]): WorkoutStats {
  const n = workouts.length;
  if (n === 0) {
    return {
      totalWorkouts: 0, totalCalories: 0, avgCalories: 0,
      totalDistanceMiles: 0, avgDistanceMiles: 0,
      totalSteps: 0, avgSteps: 0,
      totalDurationMinutes: 0, avgDurationMinutes: 0,
    };
  }

  const totalCal = workouts.reduce((s, w) => s + (w.calories_burned ?? 0), 0);
  const totalDist = workouts.reduce((s, w) => s + (w.distance_miles ?? 0), 0);
  const totalSteps = workouts.reduce((s, w) => s + (w.steps ?? 0), 0);
  const totalDur = workouts.reduce((s, w) => s + (w.duration_seconds ?? 0), 0);

  return {
    totalWorkouts: n,
    totalCalories: Math.round(totalCal),
    avgCalories: Math.round(totalCal / n),
    totalDistanceMiles: Math.round(totalDist * 100) / 100,
    avgDistanceMiles: Math.round(totalDist / n * 100) / 100,
    totalSteps,
    avgSteps: Math.round(totalSteps / n),
    totalDurationMinutes: Math.round(totalDur / 60),
    avgDurationMinutes: Math.round(totalDur / 60 / n),
  };
}

export interface CalorieTrendPoint {
  date: string;
  calories: number;
  cumulative: number;
}

export function calorieTrend(workouts: Workout[]): CalorieTrendPoint[] {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  return sorted.map((w) => {
    const cal = w.calories_burned ?? 0;
    cumulative += cal;
    return { date: w.date, calories: cal, cumulative: Math.round(cumulative) };
  });
}

export interface ComparisonMetric {
  label: string;
  base: number | null;
  compare: number | null;
  diff: number | null;
  pctChange: number | null;
  improved: boolean | null;
}

export interface ComparisonResult {
  baseId: number;
  compareId: number;
  metrics: Record<string, ComparisonMetric>;
}

export function compareWorkouts(base: Workout, other: Workout): ComparisonResult {
  const defs: [string, string, boolean][] = [
    ['duration_seconds', 'Duration (s)', false],
    ['distance_miles', 'Distance (mi)', true],
    ['calories_burned', 'Calories', true],
    ['steps', 'Steps', true],
    ['avg_heart_rate', 'Avg HR', false],
    ['zone_minutes', 'Zone Min', true],
    ['elevation_gain_ft', 'Elevation (ft)', true],
  ];

  const metrics: Record<string, ComparisonMetric> = {};
  for (const [key, label, higherBetter] of defs) {
    const bv = (base as any)[key] as number | null;
    const cv = (other as any)[key] as number | null;
    if (bv == null || cv == null) {
      metrics[key] = { label, base: bv, compare: cv, diff: null, pctChange: null, improved: null };
      continue;
    }
    const diff = Math.round((cv - bv) * 100) / 100;
    const pct = bv !== 0 ? Math.round((diff / bv) * 1000) / 10 : null;
    const improved = higherBetter ? diff > 0 : diff < 0;
    metrics[key] = { label, base: bv, compare: cv, diff, pctChange: pct, improved };
  }

  return { baseId: base.id, compareId: other.id, metrics };
}

export interface WeekSummary {
  week: string;
  workouts: number;
  totalCalories: number;
  totalDistance: number;
  totalSteps: number;
}

export function weeklySummary(workouts: Workout[]): WeekSummary[] {
  const weeks: Record<string, WeekSummary> = {};

  for (const w of workouts) {
    const d = new Date(w.date + 'T00:00:00');
    // ISO week
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const dayNum = Math.round((d.getTime() - jan4.getTime()) / 86400000);
    const weekNum = Math.ceil((dayNum + jan4.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    if (!weeks[key]) {
      weeks[key] = { week: key, workouts: 0, totalCalories: 0, totalDistance: 0, totalSteps: 0 };
    }
    weeks[key].workouts++;
    weeks[key].totalCalories += w.calories_burned ?? 0;
    weeks[key].totalDistance += w.distance_miles ?? 0;
    weeks[key].totalSteps += w.steps ?? 0;
  }

  return Object.values(weeks).sort((a, b) => b.week.localeCompare(a.week));
}
