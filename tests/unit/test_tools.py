"""
MockInterview.ai — Tool Unit Tests
Unit tests for the custom tools used by the AI agent (e.g., getting enterprise culture).
"""

import unittest
from app.tools.get_entreprise_culture import get_entreprise_culture

class TestEnterpriseCultureTool(unittest.TestCase):
    
    def test_get_culture_exact_match(self):
        """Test getting culture for a known company with exact name."""
        result = get_entreprise_culture("Google")
        self.assertIn("Google Culture & Values", result)
        self.assertIn("Googlyness", result)
        
    def test_get_culture_alias_match(self):
        """Test getting culture using an alias."""
        result = get_entreprise_culture("FB")
        self.assertIn("Meta Culture & Values", result)
        
    def test_get_culture_case_insensitive(self):
        """Test that search is case insensitive."""
        result = get_entreprise_culture("amazon")
        self.assertIn("Amazon Culture & Values", result)
        
    def test_get_culture_partial_match(self):
        """Test partial string matching."""
        result = get_entreprise_culture("Micro")
        self.assertIn("Microsoft Culture & Values", result)
        
    def test_get_culture_unknown(self):
        """Test behavior for unknown companies."""
        result = get_entreprise_culture("UnknownCorp")
        self.assertIn("I don't have detailed culture information", result)
        self.assertIn("general high-level behavioral interview best practices", result)

if __name__ == "__main__":
    unittest.main()
