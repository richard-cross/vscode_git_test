import * as SQLite from 'expo-sqlite';

export interface Workout {
  id: number;
  source: string;
  activity_type: string;
  date: string;
  start_time: string | null;
  duration_seconds: number | null;
  distance_miles: number | null;
  calories_burned: number | null;
  steps: number | null;
  avg_pace: string | null;
  avg_heart_rate: number | null;
  heart_rate_zones: string | null;
  elevation_gain_ft: number | null;
  cardio_load: number | null;
  zone_minutes: number | null;
  image_uri: string | null;
  fitbit_activity_id: string | null;
  created_at: string;
}

export type WorkoutInsert = Omit<Workout, 'id' | 'created_at'>;

let db: SQLite.SQLiteDatabase;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('fittrack.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL DEFAULT 'manual',
        activity_type TEXT NOT NULL DEFAULT 'walk',
        date TEXT NOT NULL,
        start_time TEXT,
        duration_seconds INTEGER,
        distance_miles REAL,
        calories_burned REAL,
        steps INTEGER,
        avg_pace TEXT,
        avg_heart_rate INTEGER,
        heart_rate_zones TEXT,
        elevation_gain_ft REAL,
        cardio_load INTEGER,
        zone_minutes INTEGER,
        image_uri TEXT,
        fitbit_activity_id TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return db;
}

export async function saveWorkout(data: Partial<WorkoutInsert>): Promise<number> {
  const d = await getDb();
  const result = await d.runAsync(
    `INSERT INTO workouts
     (source, activity_type, date, start_time, duration_seconds,
      distance_miles, calories_burned, steps, avg_pace,
      avg_heart_rate, heart_rate_zones, elevation_gain_ft,
      cardio_load, zone_minutes, image_uri, fitbit_activity_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    data.source ?? 'manual',
    data.activity_type ?? 'walk',
    data.date ?? new Date().toISOString().slice(0, 10),
    data.start_time ?? null,
    data.duration_seconds ?? null,
    data.distance_miles ?? null,
    data.calories_burned ?? null,
    data.steps ?? null,
    data.avg_pace ?? null,
    data.avg_heart_rate ?? null,
    data.heart_rate_zones ?? null,
    data.elevation_gain_ft ?? null,
    data.cardio_load ?? null,
    data.zone_minutes ?? null,
    data.image_uri ?? null,
    data.fitbit_activity_id ?? null,
  );
  return result.lastInsertRowId;
}

export async function getWorkouts(limit = 50): Promise<Workout[]> {
  const d = await getDb();
  return d.getAllAsync<Workout>(
    'SELECT * FROM workouts ORDER BY date DESC, start_time DESC LIMIT ?',
    limit,
  );
}

export async function getWorkout(id: number): Promise<Workout | null> {
  const d = await getDb();
  return d.getFirstAsync<Workout>('SELECT * FROM workouts WHERE id = ?', id);
}

export async function getWorkoutsByIds(ids: number[]): Promise<Workout[]> {
  const d = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  return d.getAllAsync<Workout>(
    `SELECT * FROM workouts WHERE id IN (${placeholders})`,
    ...ids,
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
