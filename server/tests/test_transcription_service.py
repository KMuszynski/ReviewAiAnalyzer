"""
Tests for TranscriptionService.
"""

import os
import pytest
from unittest.mock import patch, MagicMock


class TestTranscriptionService:
    """Test cases for TranscriptionService."""

    @patch("services.transcription_service.Thread")
    @patch("services.transcription_service.AudioSegment")
    def test_get_transcript_text_returns_content(self, mock_audio, mock_thread, temp_static_dir):
        """Test that get_transcript_text returns file content."""
        mock_thread.return_value.start = MagicMock()
        
        from services.transcription_service import TranscriptionService
        
        service = TranscriptionService(
            azure_key="test-key",
            azure_region="test-region",
            static_dir=temp_static_dir,
        )
        
        expected_text = "This is the transcription text."
        with open(service.transcript_file, "w", encoding="utf-8") as f:
            f.write(expected_text)
        
        result = service.get_transcript_text()
        assert result == expected_text


class TestTranscriptionServiceIntegration:
    """Integration tests for TranscriptionService with real audio files."""

    def test_transcribe_real_audio_file(self, temp_static_dir):
        """Test transcription of real audio file using Azure Speech Services."""
        import os
        import subprocess
        from pydub import AudioSegment
        from services.transcription_service import TranscriptionService
        from dotenv import load_dotenv
        
        # Load .env file if it exists (conftest loads it, but ensure it's loaded here too)
        server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        env_path = os.path.join(server_dir, ".env")
        if os.path.exists(env_path):
            load_dotenv(env_path)
        
        # Get Azure credentials from environment (loaded from .env by conftest)
        azure_key = os.getenv("AZURE_SPEECH_KEY")
        azure_region = os.getenv("AZURE_SPEECH_REGION")
        
        if not azure_key or not azure_region:
            pytest.skip("Azure Speech credentials not found in environment (set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env)")
        
        # Get paths to test files
        test_dir = os.path.dirname(os.path.abspath(__file__))
        audio_mp3_path = os.path.join(test_dir, "test_audio.mp3")
        expected_text_path = os.path.join(test_dir, "test_audio_transcribed.txt")
        
        # Skip if test files don't exist
        if not os.path.exists(audio_mp3_path) or not os.path.exists(expected_text_path):
            pytest.skip("Test audio files not found")
        
        # Find real ffmpeg/ffprobe paths
        try:
            ffmpeg_path = subprocess.check_output(["which", "ffmpeg"], text=True).strip()
            ffprobe_path = subprocess.check_output(["which", "ffprobe"], text=True).strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            pytest.skip("ffmpeg/ffprobe not found in PATH")
        
        # Set pydub to use real ffmpeg paths
        AudioSegment.converter = ffmpeg_path
        AudioSegment.ffprobe = ffprobe_path
        
        # Read expected transcription
        with open(expected_text_path, "r", encoding="utf-8") as f:
            expected_text = f.read().strip()
        
        # Convert MP3 to WAV (Azure Speech Services requires WAV format)
        wav_path = os.path.join(temp_static_dir, "test_audio.wav")
        try:
            audio = AudioSegment.from_mp3(audio_mp3_path)
            # Convert to mono 16kHz as required by Azure
            audio = audio.set_channels(1).set_frame_rate(16000)
            audio.export(wav_path, format="wav")
        except Exception as e:
            pytest.skip(f"Failed to convert audio file: {e}")
        
        # Initialize transcription service with real credentials
        service = TranscriptionService(
            azure_key=azure_key,
            azure_region=azure_region,
            static_dir=temp_static_dir,
            filename="test_audio",
        )
        
        # Disable background thread for this test
        service._transcription_started = True
        
        # Transcribe the audio file
        service._transcribe_audio_full(wav_path)
        
        # Get the transcription result
        result_text = service.get_transcript_text()
        
        # Verify transcription was successful
        assert result_text is not None, "Transcription should not be None"
        assert len(result_text) > 0, "Transcription should not be empty"
        
        # Normalize text for comparison (lowercase, remove extra spaces)
        def normalize_text(text):
            return " ".join(text.lower().split())
        
        normalized_result = normalize_text(result_text)
        normalized_expected = normalize_text(expected_text)
        
        # Compare normalized texts (allowing for some differences in punctuation/spacing)
        # Check if key phrases are present
        key_phrases = [
            "google pixel",
            "best phone",
            "camera",
            "megapixel",
        ]
        
        for phrase in key_phrases:
            assert phrase in normalized_result, f"Expected phrase '{phrase}' not found in transcription"
        
        # Check overall similarity (at least 70% of expected text should match)
        # Simple word overlap check
        result_words = set(normalized_result.split())
        expected_words = set(normalized_expected.split())
        overlap = len(result_words & expected_words)
        total_expected = len(expected_words)
        
        similarity = overlap / total_expected if total_expected > 0 else 0
        assert similarity >= 0.7, f"Transcription similarity too low: {similarity:.2%} (expected >= 70%)"
