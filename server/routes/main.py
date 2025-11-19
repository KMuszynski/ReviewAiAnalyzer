from flask import Blueprint, render_template_string

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Homepage with links to all features."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Audio Analysis Platform</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 900px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
                border-bottom: 3px solid #0078D7;
                padding-bottom: 10px;
            }
            .section {
                margin: 30px 0;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 8px;
                border-left: 4px solid #0078D7;
            }
            .section h2 {
                color: #0078D7;
                margin-top: 0;
            }
            .link-button {
                display: inline-block;
                padding: 12px 24px;
                margin: 10px 10px 10px 0;
                background: #0078D7;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                transition: background 0.3s;
            }
            .link-button:hover {
                background: #005a9e;
            }
            .api-endpoint {
                background: #f0f0f0;
                padding: 8px 12px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                margin: 5px 0;
            }
            .method {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-weight: bold;
                font-size: 12px;
                margin-right: 8px;
            }
            .get {
                background: #61affe;
                color: white;
            }
            .post {
                background: #49cc90;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎯 Audio Analysis Platform</h1>
            <p>A platform for audio transcription and analysis</p>
            
            <div class="section">
                <h2>🎧 Audio Transcription</h2>
                <p>Download and transcribe audio from YouTube using Azure Speech Services</p>
                <a href="/api/transcription/page" class="link-button">View Transcription</a>
                
                <h3>API Endpoints:</h3>
                <div class="api-endpoint">
                    <span class="method get">GET</span>
                    /api/transcription/status - Transcription status
                </div>
                <div class="api-endpoint">
                    <span class="method get">GET</span>
                    /api/transcription/text - Get transcription text
                </div>
            </div>
            <div class="section">
                <h2>📊 Analiza Sentymentu</h2>
                <p>Automatyczna analiza sentymentu dla cech urządzeń (kamera, bateria, ekran, etc.)</p>
                <a href="/api/sentiment/demo" class="link-button">Demo analizy</a>
                
                <h3>API Endpoints:</h3>
                <div class="api-endpoint">
                    <span class="method post">POST</span>
                    /api/sentiment/analyze - Analizuj sentiment tekstu
                </div>
                <div class="api-endpoint">
                    <span class="method get">GET</span>
                    /api/sentiment/features - Dostępne cechy do analizy
                </div>
                <div class="api-endpoint">
                    <span class="method post">POST</span>
                    /api/sentiment/analyze-transcription - Analizuj transkrypcję
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)
