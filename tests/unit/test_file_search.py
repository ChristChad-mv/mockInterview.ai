"""
MockInterview.ai — File Search Tool Tests
Verifies the integration with Gemini File Search, store identification, and RAG querying.
"""

import unittest
from unittest.mock import MagicMock, patch
from app.tools.cv_search import cv_search

class TestFileSearchTool(unittest.TestCase):

    @patch('app.tools.cv_search.get_gemini_client')
    @patch('app.tools.cv_search.ensure_global_store_exists')
    def test_cv_search_uses_correct_store_name_and_filter(self, mock_ensure_store, mock_get_client):
        """Test that cv_search correctly resolves the store name and applies user_id filter."""
        
        # 1. Setup Mock Store
        # Gemini API returns names like 'fileSearchStores/abc-123'
        mock_store = MagicMock()
        mock_store.name = "fileSearchStores/mock-id-999"
        mock_ensure_store.return_value = mock_store
        
        # 2. Setup Mock Client
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # 3. Setup Mock Response
        mock_response = MagicMock()
        mock_response.text = "Candidate has 5 years of experience in Python."
        mock_client.models.generate_content.return_value = mock_response
        
        # 4. Execute tool
        user_id = "christ_id_123"
        result = cv_search("What is the candidate's experience?", user_id)
        
        # 5. Verifications
        self.assertEqual(result, "Candidate has 5 years of experience in Python.")
        
        # Verify generate_content was called with correct FileSearch config
        call_args = mock_client.models.generate_content.call_args
        config = call_args.kwargs.get('config')
        
        # Check tools configuration
        file_search_tool = config.tools[0].file_search
        
        # CRITICAL: Verify it uses the system NAME (id), not display name
        self.assertEqual(file_search_tool.file_search_store_names, ["fileSearchStores/mock-id-999"])
        
        # Verify metadata filter uses the full user_id
        self.assertEqual(file_search_tool.metadata_filter, f'user_id="{user_id}"')

    @patch('app.tools.cv_search.get_gemini_client')
    @patch('app.tools.cv_search.ensure_global_store_exists')
    def test_cv_search_error_handling(self, mock_ensure_store, mock_get_client):
        """Test behavior when the File Search API fails."""
        mock_get_client.side_effect = Exception("API Quota Exceeded")
        
        result = cv_search("query", "user")
        self.assertIn("Error searching CV", result)
        self.assertIn("API Quota Exceeded", result)

if __name__ == "__main__":
    unittest.main()
