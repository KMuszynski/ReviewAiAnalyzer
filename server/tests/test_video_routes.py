"""
Tests for video analysis routes.
"""

import json
import pytest
from unittest.mock import patch, MagicMock


class TestVideoAnalyzeEndpoint:
    """Test cases for POST /api/video/analyze endpoint."""

    def test_analyze_returns_400_for_unsupported_platform(self, client):
        """Test that unsupported platform returns 400 error."""
        response = client.post(
            "/api/video/analyze",
            data=json.dumps({"url": "https://unsupported-site.com/video/123"}),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data
        assert "unsupported" in data["error"].lower()

    def test_extract_iphone_model(self):
        """Test extraction of iPhone model names."""
        from routes.video import _extract_phone_name
        text = "Today we're reviewing the iPhone 15 Pro Max and it's amazing."
        result = _extract_phone_name(text)
        assert "iPhone" in result