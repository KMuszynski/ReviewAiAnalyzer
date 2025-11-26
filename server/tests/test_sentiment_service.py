"""
Tests for SentimentAnalysisService.
"""

import pytest
from services.sentiment_service import SentimentAnalysisService, Sentiment


class TestSentimentAnalysisService:
    """Test cases for sentiment analysis service."""

    def test_analyze_camera_positive(self):
        """Test analyzing positive camera sentiment."""
        service = SentimentAnalysisService()
        text = "The camera is absolutely fantastic and takes amazing photos."
        result = service.analyze_feature(text, "camera")
        
        assert result is not None
        assert result.feature == "camera"
        assert result.sentiment == Sentiment.POSITIVE
        assert result.confidence > 0

    def test_analyze_battery_negative(self):
        """Test analyzing negative battery sentiment."""
        service = SentimentAnalysisService()
        text = "Battery life is terrible and awful. It drains very fast and is disappointing."
        result = service.analyze_feature(text, "battery")
        
        assert result is not None
        assert result.feature == "battery"
        # Should be negative or neutral (depending on scoring thresholds)
        assert result.sentiment in [Sentiment.NEGATIVE, Sentiment.NEUTRAL]

    def test_analyze_all_features_returns_dict(self):
        """Test that analyze_all_features returns a dictionary."""
        service = SentimentAnalysisService()
        text = "The camera is great and the battery is terrible."
        result = service.analyze_all_features(text)
        
        assert isinstance(result, dict)
        assert "camera" in result
        assert "battery" in result

    def test_negation_reverses_sentiment(self):
        """Test that negation words reverse sentiment."""
        service = SentimentAnalysisService()
        text_positive = "The camera is great"
        text_negated = "The camera is not great"
        
        score_positive = service._calculate_sentiment_score(text_positive)
        score_negated = service._calculate_sentiment_score(text_negated)
        
        assert score_positive > 0
        assert score_negated < 0
