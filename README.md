# FitTrack

A standalone mobile app (no server required) that analyzes fitness screenshots with AI and integrates with Fitbit. Compare workouts, track long-term calorie burn, and view trends — all on your phone.

## Features

- **Screenshot Analysis** — Snap or pick a screenshot from any fitness app (Google Fit, Fitbit, Apple Health, etc.). Claude Vision extracts duration, distance, calories, steps, heart rate zones, elevation, pace, and more.
- **Fitbit Integration** — Connect your Fitbit account via OAuth2. Sync recent activities directly to your device.
- **Workout Comparison** — Select any two workouts to compare side-by-side with percentage changes and color-coded improvement indicators.
- **Trends & Analytics** — Calorie burn chart, weekly summaries, and aggregate stats across all your workouts.
- **100% On-Device** — All data stored locally in SQLite. API calls go directly from your phone to Anthropic/Fitbit. No backend server.

## Setup

```bash
# Install dependencies
npm install

# Run on your phone with Expo Go
npx expo start

# Scan the QR code with Expo Go (Android) or Camera (iOS)
```

## Build a Standalone APK/IPA

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build Android APK (no Play Store account needed)
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

## Configuration (In-App)

Go to the **Settings** tab in the app to enter your keys:

| Setting | Where to get it |
|---|---|
| Anthropic API Key | [console.anthropic.com](https://console.anthropic.com) |
| Fitbit Client ID | [dev.fitbit.com](https://dev.fitbit.com) |
| Fitbit Client Secret | Same Fitbit app registration |

All keys are stored locally on your device — nothing is sent to any third-party server.

## Architecture

```
app/                     # Expo Router screens (file-based routing)
  _layout.tsx            # Tab navigation
  index.tsx              # Dashboard
  upload.tsx             # Camera/gallery upload + AI analysis
  compare.tsx            # Side-by-side workout comparison
  trends.tsx             # Charts and weekly summaries
  settings.tsx           # API keys and Fitbit connection
  workout/[id].tsx       # Workout detail view
src/
  db/database.ts         # SQLite models and queries
  services/
    imageAnalyzer.ts     # Direct Anthropic API calls for screenshot parsing
    fitbit.ts            # Fitbit OAuth2 + activity sync (on-device)
    analytics.ts         # Stats, comparison, and trend calculations
  components/
    StatCard.tsx          # Reusable metric card
    WorkoutRow.tsx        # Workout list item
```

## Tech Stack

- **Expo / React Native** — Cross-platform mobile
- **expo-sqlite** — On-device SQLite storage
- **expo-image-picker** — Camera and gallery access
- **expo-auth-session** — OAuth2 for Fitbit
- **Anthropic API** — Claude Vision for screenshot analysis
- **react-native-chart-kit** — Calorie trend charts
