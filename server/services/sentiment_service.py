import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class Sentiment(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


@dataclass
class FeatureSentiment:
    feature: str
    sentiment: Sentiment
    confidence: float
    relevant_text: List[str]


class SentimentAnalysisService:
    """Service for analyzing sentiment of device features using a lexicon-based model."""

    # Define feature keywords and their variations (ROZSZERZONE)
    FEATURE_KEYWORDS = {
        "camera": [
            "camera", "photo", "picture", "lens", "megapixel", "zoom", "selfie", 
            "video", "recording", "aparat", "zdjęcie", "zdjęcia", "obiektyw", 
            "nagrywanie", "nagrania"
        ],
        "battery": [
            "battery", "charge", "charging", "power", "autonomy", "mah", "life", 
            "bateria", "ładowanie", "zasilanie", "żywotność", "czas pracy", "drain"
        ],
        "screen": [
            "screen", "display", "brightness", "resolution", "oled", "lcd", "panel", 
            "ekran", "wyświetlacz", "jasność", "dotyk", "touch"
        ],
        "performance": [
            "performance", "speed", "fast", "slow", "lag", "processor", "ram", 
            "cpu", "gpu", "chip", "wydajność", "szybkość", "procesor", "opóźnienie",
            "płynność", "responsive", "smooth"
        ],
        "design": [
            "design", "look", "appearance", "build", "quality", "material", 
            "aesthetic", "wygląd", "jakość wykonania", "materiał", "estetyka", 
            "kształt", "feeling", "feel"
        ],
        "sound": [
            "sound", "audio", "speaker", "volume", "music", "headphone", "mic",
            "dźwięk", "głośnik", "głośniki", "muzyka", "mikrofon", "słuchawki"
        ],
    }

    # Positive and negative keywords with weights (ROZSZERZONA I UJEDNOLICONA LISTA)
    POSITIVE_KEYWORDS = {
        # English (Rozszerzone)
        "excellent": 0.9, "amazing": 0.9, "great": 0.8, "good": 0.7, "nice": 0.6,
        "love": 0.8, "perfect": 0.9, "fantastic": 0.9, "awesome": 0.8, 
        "wonderful": 0.8, "impressive": 0.8, "outstanding": 0.9, "superb": 0.9, 
        "best": 0.9, "beautiful": 0.7, "solid": 0.6, "smooth": 0.7, "fast": 0.7,
        "bright": 0.6, "clear": 0.6, "sharp": 0.7, "long-lasting": 0.8, 
        "efficient": 0.7, "top-notch": 0.9, "flawless": 0.9, "decent": 0.5,
        "reliable": 0.7, "stunning": 0.8, "vibrant": 0.7, "quick": 0.7,
        "premium": 0.6, "brilliant": 0.8, "crisp": 0.7, "vivid": 0.7,
        
        # Polish
        "doskonały": 0.9, "fantastyczny": 0.9, "świetny": 0.8, "dobry": 0.7, 
        "ładny": 0.6, "rewelacyjny": 0.9, "znakomity": 0.9, "wspaniały": 0.8, 
        "imponujący": 0.8, "piękny": 0.7, "szybki": 0.7, "jasny": 0.6, 
        "ostry": 0.7, "wydajny": 0.7, "idealny": 0.9, "genialny": 0.9, 
        "super": 0.7, "fajny": 0.6, "elegancki": 0.7, "solidny": 0.6,
    }

    NEGATIVE_KEYWORDS = {
        # English (Rozszerzone)
        "terrible": -0.9, "awful": -0.9, "bad": -0.7, "poor": -0.7, "horrible": -0.9, 
        "hate": -0.8, "worst": -0.9, "disappointing": -0.8, "useless": -0.9, 
        "slow": -0.7, "lag": -0.7, "dim": -0.6, "dark": -0.6, "short": -0.6, 
        "weak": -0.7, "mediocre": -0.5, "issue": -0.6, "problem": -0.7, 
        "fails": -0.8, "broken": -0.9, "unreliable": -0.7, "fuzzy": -0.6,
        "blurry": -0.7, "drain": -0.8, "glitch": -0.6, "expensive": -0.5,
        "overheat": -0.7, "buggy": -0.6, "useless": -0.9, "clunky": -0.5,
        
        # Polish
        "okropny": -0.9, "straszny": -0.9, "zły": -0.7, "kiepski": -0.7, 
        "fatalny": -0.9, "rozczarowujący": -0.8, "słaby": -0.7, "wolny": -0.7, 
        "ciemny": -0.6, "krótki": -0.6, "problem": -0.7, "wadliwy": -0.8, 
        "nieudany": -0.8, "marny": -0.7, "beznadziejny": -0.9, 
        "niedostateczny": -0.7, "drogi": -0.5, "grzeje": -0.7,
    }

    def __init__(self):
        pass

    def _extract_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        sentences = re.split(r"[.!?]+", text)
        return [s.strip() for s in sentences if s.strip()]

    def _find_feature_sentences(self, text: str, feature: str) -> List[str]:
        """Find sentences that mention a specific feature."""
        sentences = self._extract_sentences(text)
        keywords = self.FEATURE_KEYWORDS.get(feature.lower(), [feature.lower()])

        relevant_sentences = []
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(keyword in sentence_lower for keyword in keywords):
                relevant_sentences.append(sentence)

        return relevant_sentences

    def _calculate_sentiment_score(self, text: str) -> float:
        """Calculate sentiment score for a piece of text."""
        text_lower = text.lower()
        score = 0.0
        count = 0

        # Check for negations
        negation_words = [
            "not", "no", "never", "don't", "doesn't", "didn't", "won't", "cannot",
            "nie", "nigdy", "żaden", "bez",
        ]
        words = text_lower.split()

        for i, word in enumerate(words):
            # Check if previous word is a negation
            is_negated = i > 0 and words[i - 1] in negation_words

            if word in self.POSITIVE_KEYWORDS:
                weight = self.POSITIVE_KEYWORDS[word]
                score += -weight if is_negated else weight
                count += 1
            elif word in self.NEGATIVE_KEYWORDS:
                weight = self.NEGATIVE_KEYWORDS[word]
                score += -weight if is_negated else weight
                count += 1

        # Normalize score
        if count > 0:
            return score / count
        return 0.0

    def _determine_sentiment(self, score: float) -> Sentiment:
        """Convert numerical score to sentiment category."""
        # Utrzymujemy progi
        if score > 0.15:
            return Sentiment.POSITIVE
        elif score < -0.15:
            return Sentiment.NEGATIVE
        else:
            return Sentiment.NEUTRAL

    def analyze_feature(self, text: str, feature: str) -> Optional[FeatureSentiment]:
        """Analyze sentiment for a specific feature in the text."""
        relevant_sentences = self._find_feature_sentences(text, feature)

        if not relevant_sentences:
            return None

        # Calculate overall sentiment from relevant sentences
        total_score = 0.0
        for sentence in relevant_sentences:
            total_score += self._calculate_sentiment_score(sentence)

        avg_score = total_score / len(relevant_sentences)
        sentiment = self._determine_sentiment(avg_score)
        
        # POPRAWKA PEWNOŚCI: Zapewnienie, że sentymenty inne niż neutralne mają widoczną pewność
        confidence = 0.0
        if sentiment != Sentiment.NEUTRAL:
             # Skalowanie od progu (0.15) do 1.0. 
             confidence = min(1.0, max(0.15, abs(avg_score))) 
        else:
             # Niska pewność dla neutralnego wyniku, jeśli wynik jest bliski 0.0
             confidence = 1.0 - min(1.0, abs(avg_score))
             confidence = max(0.01, confidence - 0.5) 
             
        # Upewniamy się, że confidence jest w zakresie 0.0 do 1.0
        confidence = min(1.0, max(0.0, confidence)) 

        # Jeśli wynik jest neutralny i nie znaleziono żadnych słów sentymentu (score=0), ustaw confidence na 0.01
        if avg_score == 0.0 and len(relevant_sentences) > 0 and sentiment == Sentiment.NEUTRAL:
             confidence = 0.01
        
        return FeatureSentiment(
            feature=feature,
            sentiment=sentiment,
            confidence=confidence,
            relevant_text=relevant_sentences[:3],  # Limit to 3 examples
        )

    def analyze_all_features(
        self, text: str, features: Optional[List[str]] = None
    ) -> Dict[str, Dict]:
        """Analyze sentiment for all specified features."""
        if features is None:
            features = list(self.FEATURE_KEYWORDS.keys())

        results = {}
        for feature in features:
            analysis = self.analyze_feature(text, feature)
            if analysis:
                results[feature] = {
                    "sentiment": analysis.sentiment.value,
                    "confidence": round(analysis.confidence, 2),
                    "relevant_text": analysis.relevant_text,
                }

        return results

    def get_available_features(self) -> List[str]:
        """Get list of available features."""
        return list(self.FEATURE_KEYWORDS.keys())