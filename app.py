"""Fitness Tracker — Flask web application.

Upload fitness screenshots for AI-powered analysis, connect to Fitbit,
compare workouts, and track long-term calorie burn.

Usage:
    pip install -r requirements.txt
    cp .env.example .env   # fill in your keys
    python app.py
"""

import os
from datetime import datetime
from urllib.parse import urlencode

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)

from comparisons import calorie_trend, compare_workouts, compute_stats, weekly_summary
from config import Config
from fitbit_client import (
    complete_authorization,
    fetch_recent_activities,
    get_authorize_url,
    get_client,
    get_stored_tokens,
    normalize_fitbit_activity,
)
from image_analyzer import analyze_image
from models import (
    get_calorie_summary,
    get_comparison_data,
    get_workout,
    get_workouts,
    init_db,
    save_workout,
)

app = Flask(__name__)
app.config.from_object(Config)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/")
def dashboard():
    workouts = get_workouts(app.config["DATABASE"])
    stats = compute_stats(workouts)
    trend = calorie_trend(workouts)
    weeks = weekly_summary(workouts)
    fitbit_connected = get_stored_tokens(app.config["DATABASE"]) is not None
    return render_template(
        "dashboard.html",
        workouts=workouts,
        stats=stats,
        trend=trend,
        weeks=weeks,
        fitbit_connected=fitbit_connected,
    )


@app.route("/upload", methods=["GET", "POST"])
def upload():
    if request.method == "GET":
        return render_template("upload.html")

    file = request.files.get("image")
    if not file or not file.filename:
        flash("No file selected.", "error")
        return redirect(url_for("upload"))

    if not allowed_file(file.filename):
        flash("Unsupported file type. Use PNG, JPG, GIF, or WebP.", "error")
        return redirect(url_for("upload"))

    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    api_key = app.config["ANTHROPIC_API_KEY"]
    if not api_key:
        flash("ANTHROPIC_API_KEY not configured. Add it to your .env file.", "error")
        return redirect(url_for("upload"))

    try:
        data = analyze_image(filepath, api_key)
    except Exception as e:
        flash(f"Image analysis failed: {e}", "error")
        return redirect(url_for("upload"))

    data["source"] = "image"
    data["image_path"] = filepath
    if not data.get("date"):
        data["date"] = datetime.now().strftime("%Y-%m-%d")

    workout_id = save_workout(app.config["DATABASE"], data)
    flash("Workout extracted and saved!", "success")
    return redirect(url_for("workout_detail", workout_id=workout_id))


@app.route("/workout/<int:workout_id>")
def workout_detail(workout_id):
    workout = get_workout(app.config["DATABASE"], workout_id)
    if not workout:
        flash("Workout not found.", "error")
        return redirect(url_for("dashboard"))
    return render_template("workout_detail.html", workout=workout)


@app.route("/compare", methods=["GET", "POST"])
def compare():
    workouts = get_workouts(app.config["DATABASE"], limit=100)
    if request.method == "GET":
        return render_template("compare.html", workouts=workouts, result=None)

    ids = request.form.getlist("workout_ids")
    if len(ids) < 2:
        flash("Select at least 2 workouts to compare.", "error")
        return render_template("compare.html", workouts=workouts, result=None)

    selected = get_comparison_data(app.config["DATABASE"], [int(i) for i in ids])
    result = compare_workouts(selected)
    return render_template("compare.html", workouts=workouts, result=result)


@app.route("/trends")
def trends():
    workouts = get_workouts(app.config["DATABASE"], limit=500)
    stats = compute_stats(workouts)
    trend = calorie_trend(workouts)
    weeks = weekly_summary(workouts)
    return render_template(
        "trends.html", stats=stats, trend=trend, weeks=weeks, workouts=workouts
    )


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


# ---------------------------------------------------------------------------
# Fitbit OAuth2 flow
# ---------------------------------------------------------------------------


@app.route("/fitbit/connect")
def fitbit_connect():
    cid = app.config["FITBIT_CLIENT_ID"]
    secret = app.config["FITBIT_CLIENT_SECRET"]
    redirect_uri = app.config["FITBIT_REDIRECT_URI"]
    if not cid or not secret:
        flash("Fitbit credentials not configured. Update your .env file.", "error")
        return redirect(url_for("dashboard"))
    auth_url = get_authorize_url(cid, secret, redirect_uri)
    return redirect(auth_url)


@app.route("/fitbit/callback")
def fitbit_callback():
    code = request.args.get("code")
    if not code:
        flash("Authorization failed — no code received.", "error")
        return redirect(url_for("dashboard"))

    try:
        complete_authorization(
            app.config["FITBIT_CLIENT_ID"],
            app.config["FITBIT_CLIENT_SECRET"],
            app.config["FITBIT_REDIRECT_URI"],
            code,
            app.config["DATABASE"],
        )
        flash("Fitbit connected successfully!", "success")
    except Exception as e:
        flash(f"Fitbit authorization failed: {e}", "error")

    return redirect(url_for("dashboard"))


@app.route("/fitbit/sync")
def fitbit_sync():
    client = get_client(
        app.config["FITBIT_CLIENT_ID"],
        app.config["FITBIT_CLIENT_SECRET"],
        app.config["FITBIT_REDIRECT_URI"],
        app.config["DATABASE"],
    )
    if not client:
        flash("Fitbit not connected. Connect first.", "error")
        return redirect(url_for("dashboard"))

    try:
        activities = fetch_recent_activities(client, days=7)
        saved = 0
        for act in activities:
            try:
                save_workout(app.config["DATABASE"], act)
                saved += 1
            except Exception:
                pass  # skip duplicates (fitbit_activity_id UNIQUE constraint)
        flash(f"Synced {saved} new activities from Fitbit.", "success")
    except Exception as e:
        flash(f"Sync failed: {e}", "error")

    return redirect(url_for("dashboard"))


# ---------------------------------------------------------------------------
# API endpoints (for AJAX / future mobile app)
# ---------------------------------------------------------------------------


@app.route("/api/workouts")
def api_workouts():
    workouts = get_workouts(app.config["DATABASE"])
    return jsonify(workouts)


@app.route("/api/trends")
def api_trends():
    workouts = get_workouts(app.config["DATABASE"], limit=500)
    return jsonify(
        {
            "stats": compute_stats(workouts),
            "trend": calorie_trend(workouts),
            "weeks": weekly_summary(workouts),
        }
    )


# ---------------------------------------------------------------------------
# Init & run
# ---------------------------------------------------------------------------

with app.app_context():
    init_db(app.config["DATABASE"])


if __name__ == "__main__":
    app.run(debug=True, port=5000)
