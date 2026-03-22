import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime


@contextmanager
def get_db(db_path="fitness_tracker.db"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path="fitness_tracker.db"):
    with get_db(db_path) as db:
        db.executescript("""
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
                image_path TEXT,
                raw_data TEXT,
                fitbit_activity_id TEXT UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS fitbit_tokens (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                total_calories_burned REAL,
                total_steps INTEGER,
                total_distance_miles REAL,
                total_active_minutes INTEGER,
                resting_heart_rate INTEGER,
                source TEXT NOT NULL DEFAULT 'manual',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)


def save_workout(db_path, data):
    with get_db(db_path) as db:
        hr_zones = data.get("heart_rate_zones")
        if isinstance(hr_zones, (dict, list)):
            hr_zones = json.dumps(hr_zones)
        raw = data.get("raw_data")
        if isinstance(raw, (dict, list)):
            raw = json.dumps(raw)

        db.execute(
            """INSERT INTO workouts
               (source, activity_type, date, start_time, duration_seconds,
                distance_miles, calories_burned, steps, avg_pace,
                avg_heart_rate, heart_rate_zones, elevation_gain_ft,
                cardio_load, zone_minutes, image_path, raw_data, fitbit_activity_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                data.get("source", "manual"),
                data.get("activity_type", "walk"),
                data["date"],
                data.get("start_time"),
                data.get("duration_seconds"),
                data.get("distance_miles"),
                data.get("calories_burned"),
                data.get("steps"),
                data.get("avg_pace"),
                data.get("avg_heart_rate"),
                hr_zones,
                data.get("elevation_gain_ft"),
                data.get("cardio_load"),
                data.get("zone_minutes"),
                data.get("image_path"),
                raw,
                data.get("fitbit_activity_id"),
            ),
        )
        return db.execute("SELECT last_insert_rowid()").fetchone()[0]


def get_workouts(db_path, limit=50, offset=0, activity_type=None):
    with get_db(db_path) as db:
        query = "SELECT * FROM workouts"
        params = []
        if activity_type:
            query += " WHERE activity_type = ?"
            params.append(activity_type)
        query += " ORDER BY date DESC, start_time DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        rows = db.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_workout(db_path, workout_id):
    with get_db(db_path) as db:
        row = db.execute(
            "SELECT * FROM workouts WHERE id = ?", (workout_id,)
        ).fetchone()
        return dict(row) if row else None


def get_calorie_summary(db_path, days=30):
    with get_db(db_path) as db:
        rows = db.execute(
            """SELECT date, SUM(calories_burned) as total_calories,
                      COUNT(*) as workout_count
               FROM workouts
               WHERE date >= date('now', ?)
               GROUP BY date ORDER BY date""",
            (f"-{days} days",),
        ).fetchall()
        return [dict(r) for r in rows]


def get_comparison_data(db_path, workout_ids):
    with get_db(db_path) as db:
        placeholders = ",".join("?" * len(workout_ids))
        rows = db.execute(
            f"SELECT * FROM workouts WHERE id IN ({placeholders})", workout_ids
        ).fetchall()
        return [dict(r) for r in rows]
