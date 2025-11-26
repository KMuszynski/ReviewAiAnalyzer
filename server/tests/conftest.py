"""
Pytest configuration and fixtures for Flask server tests.
"""

import os
import sys
import tempfile
import pytest
import warnings
from unittest.mock import patch
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
# Look for .env in the server directory (parent of tests directory)
server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(server_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"Loaded environment variables from {env_path}")

# Set environment variables before importing
os.environ["FFMPEG_BINARY"] = "/usr/bin/ffmpeg"
os.environ["FFPROBE_BINARY"] = "/usr/bin/ffprobe"

# Patch warnings.warn to filter out pydub's ffmpeg warning before any imports
_original_warn = warnings.warn

def filtered_warn(message, category=None, stacklevel=1, source=None):
    """Filter out pydub ffmpeg/ffprobe warnings."""
    if isinstance(message, str) and ("ffmpeg" in message.lower() or "ffprobe" in message.lower() or "avconv" in message.lower() or "avprobe" in message.lower()):
        return  # Suppress audio tool warnings
    _original_warn(message, category, stacklevel=stacklevel, source=source)

warnings.warn = filtered_warn

# Add parent directory to path so we can import from server
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app

# Set AudioSegment attributes after import
import pydub
pydub.AudioSegment.converter = "/usr/bin/ffmpeg"
pydub.AudioSegment.ffprobe = "/usr/bin/ffprobe"


@pytest.fixture
def app():
    """Create and configure a test application instance."""
    # Create a temporary directory for static files
    with tempfile.TemporaryDirectory() as temp_dir:
        flask_app.config.update({
            "TESTING": True,
            "STATIC_DIR": temp_dir,
            "AZURE_SPEECH_KEY": "test-key",
            "AZURE_SPEECH_REGION": "test-region",
        })
        yield flask_app


@pytest.fixture
def client(app):
    """Create a test client for the application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test CLI runner for the application."""
    return app.test_cli_runner()


@pytest.fixture
def sample_review_text():
    """Sample review text for sentiment analysis testing."""
    return """
    I have been using this phone for a month. The camera is absolutely fantastic - 
    sharp photos with vivid colors. Night mode works great. However, battery life 
    is disappointing and barely lasts a day with moderate use. The screen is bright 
    and beautiful, perfect for watching videos. Performance is smooth with no lag. 
    Design is elegant, but build quality could be better. The sound from the speakers
    is weak and quiet.
    """


@pytest.fixture
def sample_transcription_text():
    """Sample transcription text with phone model mentions."""
    return """
    Today we're reviewing the iPhone 15 Pro Max. The camera system is amazing with 
    excellent low light performance. The battery easily lasts all day which is fantastic.
    The screen is stunning with bright colors and smooth refresh rate.
    """


@pytest.fixture
def temp_static_dir(app):
    """Return the temporary static directory path."""
    return app.config["STATIC_DIR"]

