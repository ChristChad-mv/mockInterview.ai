"""
MockInterview.ai — File Search Utility Tests
Verifies store creation, indexing wait logic, and file uploading.
"""

import unittest
from unittest.mock import MagicMock, patch
from app.app_utils.file_search import upload_resume_to_store, ensure_global_store_exists

class TestFileSearchUtils(unittest.TestCase):

    @patch('app.app_utils.file_search.get_gemini_client')
    def test_ensure_global_store_exists_finds_existing(self, mock_get_client):
        """Verify that we reuse an existing store if the display name matches."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Setup existing stores
        store1 = MagicMock()
        store1.display_name = "other-store"
        store1.name = "stores/1"
        
        store2 = MagicMock()
        store2.display_name = "mockinterview-global-store"
        store2.name = "stores/target"
        
        mock_client.file_search_stores.list.return_value = [store1, store2]
        
        # Call function
        with patch('app.app_utils.file_search.settings') as mock_settings:
            mock_settings.FILE_SEARCH_STORE_NAME = "mockinterview-global-store"
            store = ensure_global_store_exists(mock_client)
        
        # Should return store2
        self.assertEqual(store.name, "stores/target")
        # Should NOT call create
        mock_client.file_search_stores.create.assert_not_called()

    @patch('app.app_utils.file_search.get_gemini_client')
    @patch('app.app_utils.file_search.ensure_global_store_exists')
    @patch('time.sleep', return_value=None) # Don't actually wait
    def test_upload_resume_waits_for_indexing(self, mock_sleep, mock_ensure_store, mock_get_client):
        """Test the upload and polling logic for file indexing."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_store = MagicMock()
        mock_store.name = "stores/target"
        mock_ensure_store.return_value = mock_store
        
        # Mocking the upload operation
        mock_op = MagicMock()
        mock_op.done = False
        mock_client.file_search_stores.upload_to_file_search_store.return_value = mock_op
        
        # Mocking the polling (first call not done, second call done)
        mock_op_step1 = MagicMock()
        mock_op_step1.done = False
        
        mock_op_step2 = MagicMock()
        mock_op_step2.done = True
        mock_op_step2.name = "operations/indexing-complete"
        
        mock_client.operations.get.side_effect = [mock_op_step1, mock_op_step2]
        
        # Execute
        op_name = upload_resume_to_store("user1", "/tmp/cv.pdf", "cv.pdf")
        
        # Verify
        self.assertEqual(op_name, "operations/indexing-complete")
        self.assertEqual(mock_client.operations.get.call_count, 2)
        
if __name__ == "__main__":
    unittest.main()
