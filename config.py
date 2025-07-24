"""
Simple configuration for YouTube RAG Chatbot
"""

import os


class Config:
    """Simple configuration class"""

    # API Keys
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Proxy Settings (optional) - remove if not needed
    PROXY_USERNAME = os.getenv("PROXY_USERNAME")
    PROXY_PASSWORD = os.getenv("PROXY_PASSWORD")

    # Model Settings
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    LLM_MODEL: str = "gemini-2.0-flash"
    LLM_TEMPERATURE: float = 0.7

    # Text Processing Settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # Retrieval Settings
    RETRIEVAL_K: int = 4

    @classmethod
    def validate(cls) -> bool:
        """Validate that required configuration is present"""
        if not cls.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is required but not set")
        return True
