# Fitness Tracker

A web app that analyzes fitness screenshots using AI (Claude Vision), integrates with the Fitbit API, and lets you compare workouts and track long-term calorie burn.

## Features

- **Screenshot Analysis**: Upload a screenshot from Google Fit, Fitbit, Apple Health, etc. Claude Vision extracts duration, distance, calories, steps, heart rate zones, elevation, and more.
- **Fitbit Integration**: Connect your Fitbit account via OAuth2 to sync activities automatically.
- **Workout Comparison**: Select any two (or more) workouts to compare side-by-side with percentage changes and improvement indicators.
- **Trends & Analytics**: View cumulative calorie burn, weekly summaries, and aggregate statistics across all your workouts.
- **REST API**: JSON endpoints at `/api/workouts` and `/api/trends` for integration with other tools.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python app.py
```

Open http://localhost:5000 in your browser.

## Configuration

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Required for screenshot analysis. Get one at https://console.anthropic.com |
| `FITBIT_CLIENT_ID` | Register at https://dev.fitbit.com |
| `FITBIT_CLIENT_SECRET` | From your Fitbit app registration |
| `FITBIT_REDIRECT_URI` | Default: `http://localhost:5000/fitbit/callback` |

## Architecture

```
app.py              — Flask routes and main application
models.py           — SQLite database models (workouts, tokens, summaries)
image_analyzer.py   — Claude Vision API integration for screenshot parsing
fitbit_client.py    — Fitbit OAuth2 + activity sync
comparisons.py      — Workout comparison engine and analytics
templates/          — Jinja2 HTML templates (Bootstrap 5 dark theme)
static/style.css    — Custom styles
```
