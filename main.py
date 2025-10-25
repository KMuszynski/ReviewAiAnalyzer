import os
from threading import Thread
from time import sleep
from yt_dlp import YoutubeDL
from flask import Flask, render_template_string
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment

load_dotenv()

app = Flask(__name__)

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")

url = "https://www.youtube.com/shorts/cJUVXUF7GNg?feature=share"

current_dir = os.getcwd()
static_dir = os.path.join(current_dir, "static")
os.makedirs(static_dir, exist_ok=True)

output_path = os.path.join(static_dir, "audio.%(ext)s")
audio_mp3 = os.path.join(static_dir, "audio.mp3")
audio_wav = os.path.join(static_dir, "audio.wav")
transcript_file = os.path.join(static_dir, "audio.txt")

transcription_done = False 

def download_and_prepare_audio():
    """Pobiera audio z YT i konwertuje do WAV 16kHz mono"""
    if not os.path.exists(audio_mp3):
        ydl_opts = {
            "format": "worstaudio",
            "outtmpl": output_path,
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "8"},
            ],
        }
        print("Pobieranie audio...")
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print("✅ Pobrano:", audio_mp3)
    
    if not os.path.exists(audio_wav):
        sound = AudioSegment.from_file(audio_mp3, format="mp3")
        sound = sound.set_channels(1).set_frame_rate(16000)
        sound.export(audio_wav, format="wav")
        print("🔄 Skonwertowano do WAV:", audio_wav)
        os.remove(audio_mp3)


def transcribe_audio_full(filepath):
    global transcription_done
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    speech_config.speech_recognition_language = "pl-PL"

    audio_config = speechsdk.audio.AudioConfig(filename=filepath)
    recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    all_text = []

    def recognized(evt):
        if evt.result.text:
            all_text.append(evt.result.text)

    recognizer.recognized.connect(recognized)

    done = False
    def stop(evt):
        nonlocal done
        done = True

    recognizer.session_stopped.connect(stop)
    recognizer.canceled.connect(stop)

    print("transkrypcję pliku...")
    recognizer.start_continuous_recognition()
    while not done:
        sleep(0.1)
    recognizer.stop_continuous_recognition()

    full_text = " ".join(all_text)

    with open(transcript_file, "w", encoding="utf-8") as f:
        f.write(full_text)

    transcription_done = True
    print(f"Transkrypcja w {transcript_file}")
    os.remove(filepath)
    
    


def start_background_transcription():
    download_and_prepare_audio()
    transcribe_audio_full(audio_wav)


thread = Thread(target=start_background_transcription)
thread.start()


@app.route("/")
def index():
    html = """
    <h3>🎧 YouTube Audio</h3>
    <audio controls>
        <source src="{{ url_for('static', filename='audio.mp3') }}" type="audio/mpeg">
    </audio><br><br>
    <a href="/transcribe" style="padding:10px 20px; background:#0078D7; color:white; border-radius:8px; text-decoration:none;">Zobacz transkrypcję</a>
    """
    return render_template_string(html)


@app.route("/transcribe")
def transcribe():
    if transcription_done and os.path.exists(transcript_file):
        with open(transcript_file, "r", encoding="utf-8") as f:
            text = f.read()
        return f"<h3>Transkrypcja:</h3><p style='white-space: pre-wrap;'>{text}</p>"
    else:
        return "<h3>Transkrypcja w toku, spróbuj odświeżyć stronę za chwilę...</h3>"


if __name__ == "__main__":
    app.run(debug=False)
