"""
MockInterview.ai — Identity & Naming Utility (Backend)
Ensures consistent naming for Gemini FileSearchStores based on User/Judge IDs.
"""

import re

def get_store_name_for_user(user_id: str) -> str:
    """
    Formats a Gemini FileSearchStore name based on the user's UUID.
    Naming rules for Gemini stores:
    - Must start with a letter.
    - Can only contain lowercase letters, numbers, and hyphens.
    - Max length usually 64 chars.
    """
    # Clean the UUID: remove non-alphanumeric, lowercase
    clean_id = re.sub(r'[^a-zA-Z0-9]', '', user_id).lower()
    
    # We prefix to identify our app's resources
    return f"mock-interview-store-{clean_id[:12]}"

def get_display_name_for_user(user_id: str) -> str:
    """Friendly display name for the store in the Google AI Studio / GCP console."""
    return f"MockInterview AI Store ({user_id[:8]})"
