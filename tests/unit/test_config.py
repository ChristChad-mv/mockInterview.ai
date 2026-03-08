"""
MockInterview.ai — Config Unit Tests
Unit tests for the application configuration and environment variable loading.
"""

import unittest
import os
from unittest.mock import patch
from app.app_utils.config import Config

class TestConfig(unittest.TestCase):
    
    @patch.dict(os.environ, {"GOOGLE_CLOUD_PROJECT": "test-project", "GEMINI_API_KEY": "test-key"})
    def test_config_loading(self):
        """Test that config loads from environment variables."""
        config = Config()
        self.assertEqual(config.PROJECT_ID, "test-project")
        self.assertEqual(config.GEMINI_API_KEY, "test-key")
        self.assertEqual(config.GOOGLE_API_KEY, "test-key")
        
    @patch.dict(os.environ, {"ACCESS_PASSCODE": "SECRET123"})
    def test_config_passcode(self):
        """Test custom passcode loading."""
        config = Config()
        self.assertEqual(config.ACCESS_PASSCODE, "SECRET123")
        
    @patch.dict(os.environ, {"USE_VERTEXAI": "false"})
    def test_config_bool_parsing(self):
        """Test boolean parsing for USE_VERTEXAI."""
        config = Config()
        self.assertFalse(config.USE_VERTEXAI)

if __name__ == "__main__":
    unittest.main()
