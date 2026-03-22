import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(32).hex())
    DATABASE = os.getenv("DATABASE", "fitness_tracker.db")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

    # Fitbit OAuth2 credentials — register at https://dev.fitbit.com
    FITBIT_CLIENT_ID = os.getenv("FITBIT_CLIENT_ID", "")
    FITBIT_CLIENT_SECRET = os.getenv("FITBIT_CLIENT_SECRET", "")
    FITBIT_REDIRECT_URI = os.getenv(
        "FITBIT_REDIRECT_URI", "http://localhost:5000/fitbit/callback"
    )

    # Anthropic API key for image analysis
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
