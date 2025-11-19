from flask import Blueprint, request, jsonify, render_template_string, current_app
from services.sentiment_service import SentimentAnalysisService
from services.transcription_service import TranscriptionService

sentiment_bp = Blueprint("sentiment", __name__)

# Initialize services
sentiment_service = SentimentAnalysisService()


@sentiment_bp.route("/analyze", methods=["POST"])
def analyze_sentiment():
    """
    Analyze sentiment for device features from provided text.

    Request body:
    {
        "text": "The camera is amazing but the battery life is terrible...",
        "features": ["camera", "battery", "screen"]  // optional
    }
    """
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({"error": "Missing required field: text"}), 400

        text = data["text"]
        features = data.get("features", None)

        if not text.strip():
            return jsonify({"error": "Text cannot be empty"}), 400

        results = sentiment_service.analyze_all_features(text, features)

        return (
            jsonify({"results": results, "analyzed_features": list(results.keys())}),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sentiment_bp.route("/features", methods=["GET"])
def get_available_features():
    """Get list of available features that can be analyzed."""
    return jsonify({"features": sentiment_service.get_available_features()}), 200


@sentiment_bp.route("/analyze-transcription", methods=["POST"])
def analyze_transcription():
    """Analyze sentiment from the current transcription."""
    try:
        transcription_service = TranscriptionService(
            azure_key=current_app.config["AZURE_SPEECH_KEY"],
            azure_region=current_app.config["AZURE_SPEECH_REGION"],
            static_dir=current_app.config["STATIC_DIR"],
        )

        if not transcription_service.is_transcription_done():
            return jsonify({"error": "Transcription not yet complete"}), 202

        text = transcription_service.get_transcript_text()
        if text is None:
            return jsonify({"error": "Transcript file not found"}), 404

        # Analyze sentiment
        results = sentiment_service.analyze_all_features(text)

        return (
            jsonify(
                {
                    "results": results,
                    "analyzed_features": list(results.keys()),
                    "source": "transcription",
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Demo page
@sentiment_bp.route("/demo")
def sentiment_demo_page():
    """Sentiment analysis demo page."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sentiment Analysis</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .back-link { display: inline-block; margin-bottom: 20px; color: #0078D7; text-decoration: none; }
            .back-link:hover { text-decoration: underline; }
            textarea { width: 100%; min-height: 150px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; font-family: inherit; resize: vertical; }
            .button { display: inline-block; padding: 12px 24px; margin: 10px 10px 10px 0; background: #0078D7; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; font-size: 16px; }
            .button:hover { background: #005a9e; }
            #results { margin-top: 30px; }
            .feature-card { background: #f9f9f9; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ccc; }
            .feature-card.positive { border-left-color: #4caf50; background: #f1f8f4; }
            .feature-card.negative { border-left-color: #f44336; background: #fef5f5; }
            .feature-card.neutral { border-left-color: #ff9800; background: #fff8f0; }
            .feature-name { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .sentiment-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-right: 10px; }
            .sentiment-badge.positive { background: #4caf50; color: white; }
            .sentiment-badge.negative { background: #f44336; color: white; }
            .sentiment-badge.neutral { background: #ff9800; color: white; }
            .confidence { color: #666; font-size: 14px; }
            .relevant-text { margin-top: 15px; padding: 10px; background: white; border-radius: 5px; font-size: 14px; line-height: 1.6; }
            .example-buttons { margin: 15px 0; }
            .example-btn { background: #5c9e5c; margin: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-link">← Back to homepage</a>
            
            <h1>📊 Device Sentiment Analysis</h1>
            
            <p>Enter a device review text and the system will automatically analyze sentiment for each feature.</p>
            
            <div class="example-buttons">
                <strong>Examples:</strong><br>
                <button onclick="loadExample('phone')" class="button example-btn">Phone</button>
                <button onclick="loadExample('laptop')" class="button example-btn">Laptop</button>
                <button onclick="loadExample('camera')" class="button example-btn">Camera</button>
            </div>
            
            <textarea id="reviewText" placeholder="Enter review text..."></textarea>
            
            <button onclick="analyzeSentiment()" class="button">
                🎯 Analyze Sentiment
            </button>
            
            <div id="results"></div>
        </div>
        
        <script>
            // Check if we have results from transcription analysis
            const savedResults = sessionStorage.getItem('sentimentResults');
            if (savedResults) {
                displayResults(JSON.parse(savedResults));
                sessionStorage.removeItem('sentimentResults');
            }
            
            const examples = {
                phone: `I have been using this phone for a month. The camera is absolutely fantastic - sharp photos with vivid colors. Night mode works great. However, battery life is disappointing and barely lasts a day with moderate use. The screen is bright and beautiful, perfect for watching videos. Performance is smooth with no lag. Design is elegant, but build quality could be better.`,
                
                laptop: `This laptop is amazing for work! The screen is clear and bright, ideal for long coding sessions. Performance is excellent - everything runs instantly. Battery lasts a full 10 hours, which is impressive. The only downside is the speakers - sound is weak and quiet. The webcam is terrible, images are blurry.`,
                
                camera: `The camera meets all expectations. Photo quality is excellent, colors are natural, and sharpness is outstanding. Autofocus works fast and precise. Unfortunately, the battery drains quickly, especially when recording video. The LCD screen is readable even in sunlight. Ergonomics and design are well thought out; the camera fits comfortably in hand.`
            };
            
            function loadExample(type) {
                document.getElementById('reviewText').value = examples[type];
            }
            
            function analyzeSentiment() {
                const text = document.getElementById('reviewText').value.trim();
                
                if (!text) {
                    alert('Please enter text for analysis!');
                    return;
                }
                
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML = '<p style="color: #666; font-style: italic;">Analyzing...</p>';
                
                fetch('/api/sentiment/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                })
                .then(response => response.json())
                .then(data => {
                    displayResults(data);
                })
                .catch(error => {
                    resultsDiv.innerHTML = '<p style="color: red;">❌ Error: ' + error.message + '</p>';
                });
            }
            
            function displayResults(data) {
                const resultsDiv = document.getElementById('results');
                
                if (!data.results || Object.keys(data.results).length === 0) {
                    resultsDiv.innerHTML = '<p>No features were found for analysis in the text.</p>';
                    return;
                }
                
                let html = '<h2>Analysis Results</h2>';
                
                for (const [feature, result] of Object.entries(data.results)) {
                    const sentiment = result.sentiment;
                    const confidence = (result.confidence * 100).toFixed(0);
                    
                    html += `
                        <div class="feature-card ${sentiment}">
                            <div class="feature-name">${capitalizeFirst(feature)}</div>
                            <div>
                                <span class="sentiment-badge ${sentiment}">
                                    ${getSentimentEmoji(sentiment)} ${getSentimentText(sentiment)}
                                </span>
                                <span class="confidence">Confidence: ${confidence}%</span>
                            </div>
                            <div class="relevant-text">
                                <strong>Relevant text snippets:</strong><br>
                                ${result.relevant_text.map(t => '• ' + t).join('<br>')}
                            </div>
                        </div>
                    `;
                }
                
                resultsDiv.innerHTML = html;
            }
            
            function capitalizeFirst(str) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            }
            
            function getSentimentEmoji(sentiment) {
                return sentiment === 'positive' ? '😊' : 
                       sentiment === 'negative' ? '😞' : '😐';
            }
            
            function getSentimentText(sentiment) {
                return sentiment === 'positive' ? 'Positive' : 
                       sentiment === 'negative' ? 'Negative' : 'Neutral';
            }
        </script>
    </body>
    </html>
    """
    return render_template_string(html)
