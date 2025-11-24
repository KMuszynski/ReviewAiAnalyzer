from flask import Blueprint, request, jsonify, current_app
import os
import uuid
import time
import re
from urllib.parse import urlparse, parse_qs
from services.transcription_service import TranscriptionService
from services.sentiment_service import SentimentAnalysisService

video_bp = Blueprint("video", __name__)


def _extract_phone_name(transcription: str) -> str:
    """Extract phone model name from transcription."""
    # Common phone model patterns
    phone_patterns = [
        r'\b(iPhone\s+\d+[a-z]*(?:\s+(?:Pro|Max|Plus|Mini))?)\b',
        r'\b(Samsung\s+Galaxy\s+[A-Z]\d+[a-z]*(?:\s+(?:Ultra|Plus|Note))?)\b',
        r'\b(Google\s+Pixel\s+\d+[a-z]*(?:\s+(?:Pro|XL))?)\b',
        r'\b(OnePlus\s+\d+[a-z]*(?:\s+(?:Pro|T))?)\b',
        r'\b(Xiaomi\s+(?:Mi|Redmi|POCO)\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Huawei\s+(?:P|Mate|Nova)\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Oppo\s+(?:Find|Reno)\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Vivo\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Realme\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Motorola\s+(?:Edge|Razr|Moto)\s+[A-Z0-9]+[a-z]*)\b',
        r'\b(Nothing\s+Phone\s+\d+)\b',
    ]
    
    import re
    transcription_lower = transcription.lower()
    
    # Try to find phone model in transcription
    for pattern in phone_patterns:
        match = re.search(pattern, transcription, re.IGNORECASE)
        if match:
            return match.group(1)
    
    # Fallback: look for common phone-related keywords
    phone_keywords = ['iphone', 'samsung', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'huawei']
    for keyword in phone_keywords:
        if keyword in transcription_lower:
            # Try to extract more context
            keyword_index = transcription_lower.find(keyword)
            context = transcription[max(0, keyword_index - 20):keyword_index + 40]
            # Look for numbers or model names near the keyword
            model_match = re.search(rf'{keyword}\s+([A-Z0-9]+[a-z]*)', context, re.IGNORECASE)
            if model_match:
                return f"{keyword.capitalize()} {model_match.group(1)}"
            return keyword.capitalize()
    
    return "Unknown Phone"


def _generate_embed_url(url: str, platform: str) -> str:
    """Generate embed URL for different video platforms."""
    if platform == "youtube":
        # Extract video ID from YouTube URL
        video_id = None
        if "youtube.com/watch" in url:
            parsed = urlparse(url)
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[1].split("?")[0]
        elif "youtube.com/embed/" in url:
            video_id = url.split("youtube.com/embed/")[1].split("?")[0]
        
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
        return url  # Fallback to original URL
    
    elif platform == "vimeo":
        # Extract video ID from Vimeo URL
        video_id_match = re.search(r"vimeo\.com/(\d+)", url)
        if video_id_match:
            video_id = video_id_match.group(1)
            return f"https://player.vimeo.com/video/{video_id}"
        return url  # Fallback to original URL
    
    elif platform == "tiktok":
        # TikTok doesn't have a simple embed URL, return original
        # Note: TikTok embeds require special handling and may not work in iframes
        return url
    
    # Fallback to original URL for unsupported platforms
    return url


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

    # Detect supported video platform
    supported_platforms = {
        "youtube.com": "youtube",
        "youtu.be": "youtube",
        "vimeo.com": "vimeo",
        "tiktok.com": "tiktok",
        "vm.tiktok.com": "tiktok",
    }
    
    platform = None
    for domain, platform_name in supported_platforms.items():
        if domain in url:
            platform = platform_name
            break
    
    if not platform:
        return jsonify({
            "error": "Unsupported video platform",
            "supported_platforms": list(set(supported_platforms.values())),
            "message": "Currently supported: YouTube, Vimeo, TikTok"
        }), 400

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
            youtube_url=url,  # yt-dlp supports multiple platforms, parameter name kept for compatibility
            filename=request_id,
            platform=platform,
        )
        
        # Generate embed URL based on platform
        embed_url = _generate_embed_url(url, platform)

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
        
        # Extract phone name from transcription
        phone_name = _extract_phone_name(transcription_text)
        
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
                    "embedUrl": embed_url,  # Embed URL for the video player
                    "platform": platform,  # Platform name (youtube, vimeo, tiktok)
                    "phoneName": phone_name,  # Extracted phone model name
                    "analysisData": {
                        "title": f"Video Analysis - {phone_name} ({request_id[:8]})",
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