"""Workout comparison and analytics engine."""

import json
from datetime import datetime


def compare_workouts(workouts):
    """Compare two or more workouts side-by-side.

    Returns a dict with per-workout stats and deltas between them.
    """
    if len(workouts) < 2:
        return {"workouts": workouts, "deltas": []}

    metrics = [
        ("duration_seconds", "Duration (s)", False),  # lower is better
        ("distance_miles", "Distance (mi)", True),
        ("calories_burned", "Calories", True),
        ("steps", "Steps", True),
        ("avg_heart_rate", "Avg HR (bpm)", False),
        ("zone_minutes", "Zone Minutes", True),
        ("elevation_gain_ft", "Elevation (ft)", True),
    ]

    deltas = []
    base = workouts[0]
    for other in workouts[1:]:
        delta = {"base_id": base["id"], "compare_id": other["id"], "metrics": {}}
        for key, label, higher_better in metrics:
            base_val = base.get(key)
            other_val = other.get(key)
            if base_val is None or other_val is None:
                delta["metrics"][key] = {
                    "label": label,
                    "base": base_val,
                    "compare": other_val,
                    "diff": None,
                    "pct_change": None,
                    "improved": None,
                }
                continue

            diff = other_val - base_val
            pct = (diff / base_val * 100) if base_val != 0 else None
            improved = (diff > 0) if higher_better else (diff < 0)

            delta["metrics"][key] = {
                "label": label,
                "base": base_val,
                "compare": other_val,
                "diff": round(diff, 2),
                "pct_change": round(pct, 1) if pct is not None else None,
                "improved": improved,
            }
        deltas.append(delta)

    return {"workouts": workouts, "deltas": deltas}


def pace_to_seconds(pace_str):
    """Convert pace string like '22\\'35\" /mi' to total seconds."""
    if not pace_str:
        return None
    import re

    m = re.match(r"(\d+)['\u2019](\d+)[\"″]?", pace_str)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    return None


def calorie_trend(workouts):
    """Compute cumulative and per-day calorie data for charting."""
    sorted_w = sorted(workouts, key=lambda w: w.get("date", ""))
    cumulative = 0
    trend = []
    for w in sorted_w:
        cal = w.get("calories_burned") or 0
        cumulative += cal
        trend.append(
            {
                "date": w.get("date"),
                "calories": cal,
                "cumulative": round(cumulative, 1),
                "activity_type": w.get("activity_type", "walk"),
            }
        )
    return trend


def weekly_summary(workouts):
    """Group workouts by ISO week and compute aggregates."""
    weeks = {}
    for w in workouts:
        date_str = w.get("date")
        if not date_str:
            continue
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        week_key = dt.strftime("%G-W%V")
        if week_key not in weeks:
            weeks[week_key] = {
                "week": week_key,
                "workouts": 0,
                "total_calories": 0,
                "total_distance": 0,
                "total_steps": 0,
                "total_duration": 0,
            }
        weeks[week_key]["workouts"] += 1
        weeks[week_key]["total_calories"] += w.get("calories_burned") or 0
        weeks[week_key]["total_distance"] += w.get("distance_miles") or 0
        weeks[week_key]["total_steps"] += w.get("steps") or 0
        weeks[week_key]["total_duration"] += w.get("duration_seconds") or 0

    return sorted(weeks.values(), key=lambda x: x["week"])


def compute_stats(workouts):
    """Compute aggregate statistics across all workouts."""
    if not workouts:
        return {}

    total_cal = sum(w.get("calories_burned") or 0 for w in workouts)
    total_dist = sum(w.get("distance_miles") or 0 for w in workouts)
    total_steps = sum(w.get("steps") or 0 for w in workouts)
    total_dur = sum(w.get("duration_seconds") or 0 for w in workouts)
    count = len(workouts)

    return {
        "total_workouts": count,
        "total_calories": round(total_cal, 1),
        "avg_calories": round(total_cal / count, 1) if count else 0,
        "total_distance_miles": round(total_dist, 2),
        "avg_distance_miles": round(total_dist / count, 2) if count else 0,
        "total_steps": total_steps,
        "avg_steps": total_steps // count if count else 0,
        "total_duration_minutes": round(total_dur / 60, 1),
        "avg_duration_minutes": round(total_dur / 60 / count, 1) if count else 0,
    }
