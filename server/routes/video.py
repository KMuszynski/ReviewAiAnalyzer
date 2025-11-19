from flask import Blueprint, request, jsonify, current_app
import os
import uuid
import time
from services.transcription_service import TranscriptionService
from services.sentiment_service import SentimentAnalysisService

video_bp = Blueprint("video", __name__)


@video_bp.route("/analyze", methods=["POST"])
def analyze_video():
    """
    Complete video analysis workflow:
    1. Download YouTube video
    2. Convert to WAV
    3. Transcribe with Azure (REAL LOGIC)
    4. Analyze sentiment (REAL LOGIC)
    5. Return full results
    """
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "Missing required field: url"}), 400

    url = data["url"].strip()
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return jsonify({"error": "Invalid URL format"}), 400

    # Validate YouTube URL
    if not any(domain in url for domain in ["youtube.com", "youtu.be"]):
        return jsonify({"error": "Only YouTube URLs are currently supported"}), 400

    # Generate unique ID to avoid file conflicts
    request_id = str(uuid.uuid4())
    static_dir = current_app.config.get("STATIC_DIR", "static")
    os.makedirs(static_dir, exist_ok=True)

    try:
        # Initialize transcription service with unique filename
        transcription_service = TranscriptionService(
            azure_key=current_app.config["AZURE_SPEECH_KEY"],
            azure_region=current_app.config["AZURE_SPEECH_REGION"],
            static_dir=static_dir,
            youtube_url=url,
            filename=request_id,
        )

        # Wait for transcription (blocking with timeout) - KLUCZOWE
        max_wait = 600  # 10 minutes
        start_time = time.time()

        while not transcription_service.is_transcription_done():
            if time.time() - start_time > max_wait:
                return jsonify({"error": "Transcription timeout"}), 504

            # Check for failure indicators
            if transcription_service.has_transcript_file():
                text = transcription_service.get_transcript_text()
                if text and text.startswith("["):
                    return jsonify({"error": f"Transcription failed: {text}"}), 500

            time.sleep(2)

        # Get transcription
        transcription_text = transcription_service.get_transcript_text()
        if transcription_text is None:
            return jsonify({"error": "Transcription completed but no text found"}), 500

        # Analyze sentiment
        sentiment_service = SentimentAnalysisService()
        sentiment_results = sentiment_service.analyze_all_features(transcription_text)
        
        # --- LOGIKA FORMATOWANIA WYNIKÓW DLA FRONTENDU ---
        
        # OBLICZANIE OGÓLNEGO SENTYMENTU (Heurystyka)
        positive_count = sum(1 for res in sentiment_results.values() if res.get('sentiment') == 'positive')
        negative_count = sum(1 for res in sentiment_results.values() if res.get('sentiment') == 'negative')
        total_count = len(sentiment_results)
        
        if total_count > 0:
            if positive_count > negative_count:
                general_score_value = "Pozytywna"
                general_score_trend = "up"
            elif negative_count > positive_count:
                general_score_value = "Negatywna"
                general_score_trend = "down"
            else:
                general_score_value = "Neutralna"
                general_score_trend = "neutral"
        else:
            general_score_value = "Brak Cech"
            general_score_trend = "neutral"
        
        # 1. Przekształcenie szczegółów sentymentu na format "stats"
        detailed_stats = [
            {
                "label": feature.capitalize(),
                "value": f"{result['sentiment'].capitalize()} ({int(result['confidence'] * 100)}%)",
                "trend": 'up' if result['sentiment'] == 'positive' else ('down' if result['sentiment'] == 'negative' else 'neutral'),
            }
            for feature, result in sentiment_results.items()
        ]

        # 2. Statystyki ogólne
        initial_stats = [
            {
                "label": "Ogólna Ocena",
                "value": general_score_value, 
                "trend": general_score_trend,
            },
            {
                "label": "Transcription Length",
                "value": f"{len(transcription_text)} characters",
                "trend": "neutral",
            },
            {
                "label": "Features Analyzed",
                "value": len(sentiment_results),
                "trend": "up",
            },
        ]
        
        # Clean up temporary files
        try:
            for ext in ["mp3", "wav", "txt"]:
                filepath = os.path.join(static_dir, f"{request_id}.ext")
                if os.path.exists(filepath):
                    os.remove(filepath)
        except Exception as cleanup_error:
            print(f"Warning: File cleanup failed: {cleanup_error}")

        # ZWRACANIE PEŁNEGO PAKIETU DANYCH
        return (
            jsonify(
                {
                    # To pole jest używane do wyświetlania fragmentów tekstu w ReviewTable
                    "sentiment": sentiment_results, 
                    "fullTranscription": transcription_text, # <--- DODANE
                    "analysisData": {
                        "title": f"Video Analysis ({request_id[:8]})",
                        "stats": initial_stats + detailed_stats, # <--- PEŁNE STATYSTYKI SENTYMENTU
                    },
                }
            ),
            200,
        )

    except KeyError as e:
        return jsonify({"error": f"Missing configuration: {str(e)}"}), 500
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500