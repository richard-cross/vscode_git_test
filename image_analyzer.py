"""Analyze fitness screenshots using Claude's vision capabilities."""

import base64
import json
import re
from pathlib import Path

import anthropic


EXTRACTION_PROMPT = """Analyze this fitness/workout screenshot and extract all available data.
Return a JSON object with these fields (use null for any data not visible):

{
  "activity_type": "walk | run | bike | hike | swim | other",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_seconds": <integer total seconds>,
  "distance_miles": <float>,
  "calories_burned": <float>,
  "steps": <integer>,
  "avg_pace": "<string like 22'22\\" /mi>",
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
- Return ONLY valid JSON, no markdown fences or extra text."""


def analyze_image(image_path: str, api_key: str) -> dict:
    """Analyze a fitness screenshot and return structured workout data."""
    path = Path(image_path)
    suffix = path.suffix.lower()
    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_types.get(suffix, "image/png")

    image_data = base64.standard_b64encode(path.read_bytes()).decode("utf-8")

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {"type": "text", "text": EXTRACTION_PROMPT},
                ],
            }
        ],
    )

    response_text = message.content[0].text.strip()
    # Strip markdown code fences if present
    response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
    response_text = re.sub(r"\s*```$", "", response_text)

    return json.loads(response_text)
