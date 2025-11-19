"""
Transcription Service
Handles YouTube audio download and Azure Speech transcription
"""

import os
from threading import Thread, Lock
from time import sleep
from yt_dlp import YoutubeDL
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
from pydub.utils import which

AudioSegment.converter = which("ffmpeg") or os.environ.get("FFMPEG_BINARY")
AudioSegment.ffprobe = which("ffprobe") or os.environ.get("FFPROBE_BINARY")

if AudioSegment.converter is None or AudioSegment.ffprobe is None:
    print(
        "WARNING: ffmpeg/ffprobe not found on PATH and FFMPEG_BINARY/FFPROBE_BINARY not set."
        " Install ffmpeg or set env vars. Continue anyway (conversion will fail later)."
    )


class TranscriptionService:
    """Service for handling audio transcription from YouTube."""

    def __init__(
        self, azure_key, azure_region, static_dir, youtube_url=None, filename=None
    ):
        """Initialize transcription service."""
        # Keep this check to prevent re-initialization
        if hasattr(self, "_initialized"):
            return

        self.azure_key = azure_key
        self.azure_region = azure_region
        self.static_dir = static_dir
        self.youtube_url = (
            youtube_url or "https://www.youtube.com/shorts/cJUVXUF7GNg?feature=share"
        )

        # Use custom filename prefix to avoid conflicts
        if filename is None:
            filename = "audio"

        self.output_path = os.path.join(static_dir, f"{filename}.%(ext)s")
        self.audio_mp3 = os.path.join(static_dir, f"{filename}.mp3")
        self.audio_wav = os.path.join(static_dir, f"{filename}.wav")
        self.transcript_file = os.path.join(static_dir, f"{filename}.txt")

        self._transcription_done = False
        self._transcription_started = False
        self._initialized = True

        print(f"TranscriptionService initialized:")
        print(f"  URL: {self.youtube_url}")
        print(f"  Filename: {filename}")
        print(f"  Azure region: {azure_region}")
        print(f"  ffmpeg: {AudioSegment.converter}")

        # Start background transcription
        self._start_background_process()

    def _start_background_process(self):
        """Start background transcription thread."""
        if not self._transcription_started:
            self._transcription_started = True
            thread = Thread(target=self._transcription_workflow, daemon=True)
            thread.start()
            print("Background transcription thread started")

    def _transcription_workflow(self):
        """Complete transcription workflow."""
        try:
            print("=== Starting transcription workflow ===")
            self._download_and_prepare_audio()
            if os.path.exists(self.audio_wav):
                print(f"WAV file exists: {self.audio_wav}")
                self._transcribe_audio_full(self.audio_wav)
            else:
                print(f"ERROR: WAV file not found: {self.audio_wav}")
        except Exception as e:
            print(f"ERROR in transcription workflow: {e}")
            import traceback

            traceback.print_exc()

    def _download_and_prepare_audio(self):
        """Download audio from YouTube and convert to WAV 16kHz mono."""
        print("=== Download and prepare audio ===")

        # Check if MP3 already exists
        if os.path.exists(self.audio_mp3):
            print(f"✓ Audio file already exists: {self.audio_mp3}")
        else:
            ydl_opts = {
                "format": "worstaudio",
                "outtmpl": self.output_path,
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "8",
                    },
                ],
                "quiet": False,
                "no_warnings": False,
            }
            print(f"Downloading audio from: {self.youtube_url}")
            try:
                with YoutubeDL(ydl_opts) as ydl:
                    ydl.download([self.youtube_url])
                print(f"✅ Downloaded: {self.audio_mp3}")
            except Exception as e:
                print(f"ERROR downloading audio: {e}")
                raise

        # Convert to WAV if needed
        if not os.path.exists(self.audio_wav):
            print("Converting audio to WAV format...")
            try:
                # pydub uses ffmpeg/ffprobe: ensure they are available
                sound = AudioSegment.from_file(self.audio_mp3, format="mp3")
                sound = sound.set_channels(1).set_frame_rate(16000)
                sound.export(self.audio_wav, format="wav")
                print(f"✅ Converted to WAV: {self.audio_wav}")

                # Verify file size
                wav_size = os.path.getsize(self.audio_wav)
                print(f"WAV file size: {wav_size} bytes")
            except Exception as e:
                print(f"ERROR converting audio: {e}")
                raise
        else:
            print(f"✓ WAV file already exists: {self.audio_wav}")

    def _transcribe_audio_full(self, filepath):
        """Transcribe audio file using Azure Speech Services."""
        print("=== Starting transcription ===")

        if not self.azure_key or not self.azure_region:
            print("ERROR: Azure credentials not configured!")
            print(f"  Key: {'SET' if self.azure_key else 'NOT SET'}")
            print(f"  Region: {self.azure_region}")
            return

        if not os.path.exists(filepath):
            print(f"ERROR: Audio file not found: {filepath}")
            return

        file_size = os.path.getsize(filepath)
        print(f"Transcribing file: {filepath} ({file_size} bytes)")

        # Debug: print audio diagnostics using pydub
        try:
            dbg = AudioSegment.from_wav(filepath)
            print("DEBUG audio duration (s):", len(dbg) / 1000.0)
            print("DEBUG channels:", dbg.channels)
            print("DEBUG frame_rate:", dbg.frame_rate)
            print("DEBUG dBFS (loudness):", dbg.dBFS)
        except Exception as ex:
            print("DEBUG: failed to read WAV with pydub:", ex)

        try:
            speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_key, region=self.azure_region
            )
            speech_config.speech_recognition_language = "en-US"

            audio_config = speechsdk.audio.AudioConfig(filename=filepath)
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config, audio_config=audio_config
            )

            all_text = []

            def recognizing(evt):
                # partial results
                try:
                    print(f"Recognizing: {evt.result.text}")
                except Exception:
                    pass

            def recognized(evt):
                try:
                    if evt.result and evt.result.text:
                        print(f"✓ Recognized: {evt.result.text}")
                        all_text.append(evt.result.text)
                except Exception:
                    pass

            def canceled(evt):
                # More detailed cancellation logging
                print("Recognition canceled event:", evt)
                try:
                    print("  Cancellation reason:", evt.reason)
                except Exception:
                    pass
                try:
                    # Try to obtain CancellationDetails from the SDK
                    details = speechsdk.CancellationDetails(evt.result)
                    print("  cancellation.reason:", details.reason)
                    print("  cancellation.error_details:", details.error_details)
                except Exception:
                    try:
                        print("  error_details:", getattr(evt, "error_details", None))
                    except Exception:
                        pass

            def session_started(evt):
                print("Session started")

            def session_stopped(evt):
                print("Session stopped")

            recognizer.recognizing.connect(recognizing)
            recognizer.recognized.connect(recognized)
            recognizer.canceled.connect(canceled)
            recognizer.session_started.connect(session_started)
            recognizer.session_stopped.connect(session_stopped)

            done = False

            def stop(evt):
                nonlocal done
                print("Stopping recognition...")
                done = True

            recognizer.session_stopped.connect(stop)
            recognizer.canceled.connect(stop)

            print("Starting continuous recognition...")
            recognizer.start_continuous_recognition()

            # Wait for recognition to complete (with timeout)
            timeout = 1200  # 20 minutes
            elapsed = 0.0
            while not done and elapsed < timeout:
                sleep(0.5)
                elapsed += 0.5
                if int(elapsed) % 5 == 0:
                    print(f"Still recognizing... ({elapsed:.1f}s elapsed)")

            if elapsed >= timeout:
                print("WARNING: Recognition timeout!")

            recognizer.stop_continuous_recognition()

            # Save transcription
            full_text = " ".join(all_text).strip()

            print(f"=== Transcription complete ===")
            print(f"Recognized {len(all_text)} segments")
            print(f"Total text length: {len(full_text)} characters")

            if full_text:
                with open(self.transcript_file, "w", encoding="utf-8") as f:
                    f.write(full_text)
                print(f"✅ Transcription saved to {self.transcript_file}")

                # Verify file was written
                if os.path.exists(self.transcript_file):
                    saved_size = os.path.getsize(self.transcript_file)
                    print(f"Transcript file size: {saved_size} bytes")
                else:
                    print("ERROR: Transcript file was not created!")

                self._transcription_done = True
            else:
                print("⚠️  WARNING: No text was transcribed!")
                print("This could mean:")
                print("  - Audio file is silent or corrupted")
                print("  - Azure Speech API issue")
                print("  - Wrong language setting (currently: en-UA)")

                # Write empty file to indicate completion
                with open(self.transcript_file, "w", encoding="utf-8") as f:
                    f.write("[No speech detected]")
                print(f"Empty transcript saved to {self.transcript_file}")

            # --------------------------------------------------------
            # DEBUG NOTE: keep WAV for inspection instead of deleting it.
            # Comment out deletion while debugging. Restore when stable.
            # --------------------------------------------------------
            if os.path.exists(filepath):
                # os.remove(filepath)
                print(f"(DEBUG) WAV preserved for inspection: {filepath}")
            # --------------------------------------------------------

        except Exception as e:
            print(f"ERROR during transcription: {e}")
            import traceback

            traceback.print_exc()

    def quick_recognize_once(self, filepath):
        """Helper: single-shot recognition for quick tests."""
        print("=== Quick one-shot recognition ===")
        if not os.path.exists(filepath):
            print("ERROR: file not found:", filepath)
            return
        try:
            speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_key, region=self.azure_region
            )
            speech_config.speech_recognition_language = "en-US"
            audio_config = speechsdk.audio.AudioConfig(filename=filepath)
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config, audio_config=audio_config
            )
            result = recognizer.recognize_once_async().get()
            print("one-shot result reason:", result.reason)
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                print("one-shot text:", result.text)
            elif result.reason == speechsdk.ResultReason.NoMatch:
                print("NoMatch details:", getattr(result, "no_match_details", None))
            elif result.reason == speechsdk.ResultReason.Canceled:
                try:
                    cancellation = speechsdk.CancellationDetails(result)
                    print("Canceled. Reason:", cancellation.reason)
                    print("Cancellation details:", cancellation.error_details)
                except Exception:
                    print("Canceled but could not get details.")
        except Exception as e:
            print("ERROR in quick_recognize_once:", e)

    def is_transcription_done(self):
        """Check if transcription is complete."""
        return self._transcription_done

    def has_transcript_file(self):
        """Check if transcript file exists."""
        exists = os.path.exists(self.transcript_file)
        if exists:
            size = os.path.getsize(self.transcript_file)
            print(f"Transcript file exists: {self.transcript_file} ({size} bytes)")
        else:
            print(f"Transcript file does not exist: {self.transcript_file}")
        return exists

    def get_transcript_text(self):
        """Get transcription text."""
        if not self.has_transcript_file():
            return None

        try:
            with open(self.transcript_file, "r", encoding="utf-8") as f:
                text = f.read()
            print(f"Read {len(text)} characters from transcript")
            return text
        except Exception as e:
            print(f"ERROR reading transcript: {e}")
            return None
