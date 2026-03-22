"""Fitbit Web API integration using OAuth2.

Register your app at https://dev.fitbit.com to get client credentials.
Set callback URL to http://localhost:5000/fitbit/callback
and grant type to "Authorization Code Grant Flow".
"""

import time

import fitbit
from models import get_db


FITBIT_SCOPES = [
    "activity",
    "heartrate",
    "profile",
    "sleep",
    "weight",
]


def _save_tokens(db_path, token):
    """Callback invoked by python-fitbit when tokens are refreshed."""
    with get_db(db_path) as db:
        db.execute(
            """INSERT INTO fitbit_tokens (id, access_token, refresh_token, expires_at)
               VALUES (1, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 access_token=excluded.access_token,
                 refresh_token=excluded.refresh_token,
                 expires_at=excluded.expires_at""",
            (token["access_token"], token["refresh_token"], token.get("expires_at", 0)),
        )


def get_stored_tokens(db_path):
    with get_db(db_path) as db:
        row = db.execute("SELECT * FROM fitbit_tokens WHERE id = 1").fetchone()
        return dict(row) if row else None


def get_authorize_url(client_id, client_secret, redirect_uri):
    """Return the Fitbit OAuth2 authorization URL."""
    client = fitbit.Fitbit(
        client_id,
        client_secret,
        redirect_uri=redirect_uri,
        timeout=10,
    )
    url, _ = client.client.authorize_token_url(scope=FITBIT_SCOPES)
    return url


def complete_authorization(client_id, client_secret, redirect_uri, auth_code, db_path):
    """Exchange authorization code for access/refresh tokens."""
    client = fitbit.Fitbit(
        client_id,
        client_secret,
        redirect_uri=redirect_uri,
        timeout=10,
    )
    client.client.fetch_access_token(auth_code)

    token = {
        "access_token": client.client.session.token["access_token"],
        "refresh_token": client.client.session.token["refresh_token"],
        "expires_at": client.client.session.token.get("expires_at", 0),
    }
    _save_tokens(db_path, token)
    return token


def get_client(client_id, client_secret, redirect_uri, db_path):
    """Build an authenticated Fitbit client from stored tokens."""
    tokens = get_stored_tokens(db_path)
    if not tokens:
        return None

    return fitbit.Fitbit(
        client_id,
        client_secret,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        expires_at=tokens["expires_at"],
        refresh_cb=lambda tok: _save_tokens(db_path, tok),
        redirect_uri=redirect_uri,
        timeout=10,
    )


def fetch_activities(client, date_str):
    """Fetch activity summary for a given date (YYYY-MM-DD)."""
    return client.activities(date=date_str)


def fetch_activity_detail(client, activity_log_id):
    """Fetch detailed data for a single activity."""
    return client.activity_detail(activity_log_id)


def fetch_heart_rate(client, date_str, period="1d"):
    """Fetch heart rate time series."""
    return client.time_series("activities/heart", base_date=date_str, period=period)


def fetch_recent_activities(client, days=7):
    """Fetch activities for the last N days."""
    from datetime import datetime, timedelta

    results = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        try:
            data = fetch_activities(client, date)
            activities = data.get("activities", [])
            for act in activities:
                results.append(normalize_fitbit_activity(act, date))
        except Exception:
            continue
    return results


def normalize_fitbit_activity(activity, date_str):
    """Convert Fitbit activity JSON to our internal format."""
    duration_ms = activity.get("duration", 0)
    distance_km = 0
    for detail in activity.get("activityLevel", []):
        pass  # activityLevel is separate from distance
    for d in activity.get("distance", []):
        if d.get("activity") == "total":
            distance_km = d.get("distance", 0)
            break

    hr_zones = {}
    for zone in activity.get("heartRateZones", []):
        name = zone.get("name", "").lower().replace(" ", "_")
        hr_zones[name] = {
            "minutes": zone.get("minutes", 0),
            "calories_out": zone.get("caloriesOut", 0),
        }

    return {
        "source": "fitbit",
        "activity_type": activity.get("activityName", "Walk").lower(),
        "date": date_str,
        "start_time": activity.get("startTime", ""),
        "duration_seconds": duration_ms // 1000,
        "distance_miles": round(distance_km * 0.621371, 2),
        "calories_burned": activity.get("calories", 0),
        "steps": activity.get("steps", 0),
        "avg_heart_rate": activity.get("averageHeartRate"),
        "heart_rate_zones": hr_zones or None,
        "elevation_gain_ft": activity.get("elevationGain"),
        "fitbit_activity_id": str(activity.get("logId", "")),
        "raw_data": activity,
    }
