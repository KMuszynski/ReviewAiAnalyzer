import os
from flask import Flask
from dotenv import load_dotenv

load_dotenv()

from routes.transcription import transcription_bp
from routes.main import main_bp

app = Flask(__name__)

app.config["AZURE_SPEECH_KEY"] = os.getenv("AZURE_SPEECH_KEY")
app.config["AZURE_SPEECH_REGION"] = os.getenv("AZURE_SPEECH_REGION")
app.config["STATIC_DIR"] = os.path.join(os.getcwd(), "static")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size

os.makedirs(app.config["STATIC_DIR"], exist_ok=True)

app.register_blueprint(main_bp)
app.register_blueprint(transcription_bp, url_prefix="/api/transcription")


@app.errorhandler(404)
def not_found(error):
    return {"error": "Endpoint not found"}, 404


@app.errorhandler(500)
def internal_error(error):
    return {"error": "Internal server error"}, 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
