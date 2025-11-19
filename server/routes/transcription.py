import os
from flask import Blueprint, render_template_string, current_app, jsonify
from services.transcription_service import TranscriptionService
import time

transcription_bp = Blueprint("transcription", __name__)

# Initialize service
transcription_service = None


def get_transcription_service():
    """Get or create transcription service instance."""
    global transcription_service
    if transcription_service is None:
        transcription_service = TranscriptionService(
            azure_key=current_app.config["AZURE_SPEECH_KEY"],
            azure_region=current_app.config["AZURE_SPEECH_REGION"],
            static_dir=current_app.config["STATIC_DIR"],
        )
    return transcription_service


@transcription_bp.route("/status")
def transcription_status():
    """Get transcription status."""
    service = get_transcription_service()
    return (
        jsonify(
            {
                "transcription_done": service.is_transcription_done(),
                "transcript_available": service.has_transcript_file(),
                "timestamp": int(time.time()),
            }
        ),
        200,
    )


@transcription_bp.route("/text")
def get_transcription_text():
    """Get transcription text."""
    service = get_transcription_service()

    # If WAV file doesn't exist yet, start download/conversion
    if not os.path.exists(service.audio_wav):
        print(f"DEBUG: WAV file missing: {service.audio_wav}, starting preparation...")
        try:
            service._download_and_prepare_audio()
        except Exception as e:
            return jsonify({"error": "Failed to prepare audio", "details": str(e)}), 500

    # If transcription hasn't started yet, let the service start it
    if not service.is_transcription_done():
        return (
            jsonify(
                {
                    "error": "Transcription not yet complete",
                    "message": "Audio is being processed. Please wait...",
                }
            ),
            202,
        )

    # Try to read transcript
    text = service.get_transcript_text()
    if text:
        return jsonify({"text": text, "length": len(text)}), 200

    # Still nothing
    return (
        jsonify(
            {
                "error": "Transcript file not found",
                "message": "Transcription in progress or failed",
            }
        ),
        202,
    )


@transcription_bp.route("/page")
def transcription_page():
    """Transcription demo page."""
    html = """
<!DOCTYPE html>
<html>
<head>
    <title>Audio Transcription</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .back-link { display: inline-block; margin-bottom: 20px; color: #0078D7; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        .audio-player { margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; background: #0078D7; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 16px; }
        .button:hover { background: #005a9e; }
        #transcript { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; white-space: pre-wrap; line-height: 1.6; }
        .loading { color: #666; font-style: italic; }
        .analyze-section { margin-top: 30px; padding: 20px; background: #e8f4fd; border-radius: 5px; border-left: 4px solid #0078D7; display: none; }
    </style>
</head>
<body>
<div class="container">
    <a href="/" class="back-link">← Back to homepage</a>
    <h1>🎧 YouTube Audio Transcription</h1>

    <div class="audio-player">
        <h3>Audio:</h3>
        <audio controls>
            <source src="{{ url_for('static', filename='audio.mp3') }}" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>
    </div>

    <button onclick="loadTranscription()" class="button">📝 Load Transcription</button>
    <button onclick="checkStatus()" class="button" style="background: #5c9e5c;">🔍 Check Status</button>

    <div id="transcript"></div>
    <div id="analyzeSection" class="analyze-section">
        <h3>📊 Transcription Sentiment Analysis</h3>
        <p>Transcription ready! You can now analyze sentiment.</p>
        <button onclick="analyzeSentiment()" class="button" style="background: #9c27b0;">🎯 Analyze Sentiment</button>
    </div>
</div>

<script>
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function escapeHtml(unsafe) { return unsafe.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;"); }

async function checkStatus() {
    const transcript = document.getElementById('transcript');
    try {
        const resp = await fetch('/api/transcription/status');
        const data = await resp.json();
        transcript.innerHTML = '<h3>Status:</h3>' +
            '<p>Transcription complete: ' + (data.transcription_done ? '✅' : '❌') + '</p>' +
            '<p>File available: ' + (data.transcript_available ? '✅' : '❌') + '</p>' +
            '<p>Timestamp: ' + new Date(data.timestamp * 1000).toLocaleTimeString() + '</p>';
    } catch (err) {
        transcript.innerHTML = '<p style="color:red;">Error: ' + err.message + '</p>';
    }
}

async function loadTranscription() {
    const transcript = document.getElementById('transcript');
    transcript.innerHTML = '<p class="loading">Loading transcription…</p>';

    const maxWait = 1200000; // 2 min
    const startTime = Date.now();
    let attempt = 0;
    let delay = 1000;

    while (Date.now() - startTime < maxWait) {
        attempt++;
        try {
            const resp = await fetch('/api/transcription/text');
            if (resp.status === 200) {
                const data = await resp.json();
                transcript.innerHTML = '<h3>Transcription:</h3><p>' + escapeHtml(data.text) + '</p>' +
                    '<p><em>Length: ' + data.length + ' characters</em></p>';
                document.getElementById('analyzeSection').style.display = 'block';
                return;
            } else if (resp.status === 202) {
                const body = await resp.json().catch(() => ({}));
                transcript.innerHTML = '<p class="loading">Transcription in progress… (' + attempt + ') — ' + (body.message || 'Please wait') + '</p>';
            } else {
                const body = await resp.json().catch(() => ({}));
                transcript.innerHTML = '<p style="color:red;">❌ Error: ' + (body.error || resp.statusText) + '</p>';
                return;
            }
        } catch (err) {
            transcript.innerHTML = '<p style="color:red;">❌ Network error: ' + err.message + '</p>';
            return;
        }

        await sleep(delay + Math.floor(Math.random() * 300));
        delay = Math.min(10000, Math.round(delay * 1.8));
    }

    transcript.innerHTML = '<p style="color:orange;">⚠️ Timeout: transcription still not ready. Try again later.</p>';
}

async function analyzeSentiment() {
    try {
        const textResp = await fetch('/api/transcription/text');
        const textData = await textResp.json();
        const analyzeResp = await fetch('/api/sentiment/analyze-transcription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const analyzeData = await analyzeResp.json();
        sessionStorage.setItem('sentimentResults', JSON.stringify(analyzeData));
        window.location.href = '/api/sentiment/demo';
    } catch (err) {
        alert('Error during analysis: ' + err.message);
    }
}
</script>
</body>
</html>
"""
    return render_template_string(html)
