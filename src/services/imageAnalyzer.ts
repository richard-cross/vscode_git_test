/**
 * Analyze fitness screenshots by calling the Anthropic API directly from the device.
 * No server needed — the API key is stored locally in the app's secure settings.
 */

import * as FileSystem from 'expo-file-system';
import { getSetting } from '@/db/database';

const EXTRACTION_PROMPT = `Analyze this fitness/workout screenshot and extract all available data.
Return a JSON object with these fields (use null for any data not visible):

{
  "activity_type": "walk | run | bike | hike | swim | other",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_seconds": <integer total seconds>,
  "distance_miles": <float>,
  "calories_burned": <float>,
  "steps": <integer>,
  "avg_pace": "<string like 22'35\\"/mi>",
  "avg_heart_rate": <integer bpm>,
  "heart_rate_zones": {
    "peak": {"percent": <int>, "minutes": <int>},
    "vigorous": {"percent": <int>, "minutes": <int>},
    "moderate": {"percent": <int>, "minutes": <int>},
    "light": {"percent": <int>, "minutes": <int>}
  },
  "elevation_gain_ft": <float>,
  "cardio_load": <integer>,
  "zone_minutes": <integer>
}

Important:
- Convert all durations to total seconds (e.g. 17m 57s = 1077 seconds)
- Convert distances to miles if shown in km (1 km = 0.621371 mi)
- Extract heart rate zone breakdowns if visible
- Return ONLY valid JSON, no markdown fences or extra text.`;

export interface AnalyzedWorkout {
  activity_type: string;
  date: string | null;
  start_time: string | null;
  duration_seconds: number | null;
  distance_miles: number | null;
  calories_burned: number | null;
  steps: number | null;
  avg_pace: string | null;
  avg_heart_rate: number | null;
  heart_rate_zones: Record<string, { percent?: number; minutes?: number }> | null;
  elevation_gain_ft: number | null;
  cardio_load: number | null;
  zone_minutes: number | null;
}

export async function analyzeImage(imageUri: string): Promise<AnalyzedWorkout> {
  const apiKey = await getSetting('anthropic_api_key');
  if (!apiKey) {
    throw new Error('Anthropic API key not set. Go to Settings to add it.');
  }

  // Read image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Determine media type from URI
  const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'png';
  const mediaTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const mediaType = mediaTypes[ext] ?? 'image/png';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const json = await response.json();
  let text: string = json.content?.[0]?.text ?? '';

  // Strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');

  return JSON.parse(text);
}
