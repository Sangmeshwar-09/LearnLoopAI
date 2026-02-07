from openai import OpenAI
from typing import List
import logging
from backend.config import DEEPSEEK_API_KEY, DEEPSEEK_API_BASE

# Configure logging
logger = logging.getLogger(__name__)

# Configure DeepSeek API once at module level
# This happens when the module is imported, ensuring configuration happens once
try:
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY is not configured in backend/config.py")
    # Initialize OpenAI client with DeepSeek endpoint
    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_BASE)
    logger.info("DeepSeek API configured successfully in embeddings module")
except ValueError as e:
    logger.error(f"Failed to configure DeepSeek API: {e}")
    # Re-raise ValueError so it can be caught by route handlers
    raise
except Exception as e:
    logger.error(f"Unexpected error configuring DeepSeek API: {e}")
    raise ValueError(f"DeepSeek API configuration failed: {str(e)}")

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings using DeepSeek embedding API
    Uses OpenAI-compatible embedding endpoint
    Falls back to local embedding generation if API fails
    """
    # Validate API key before making request
    if not DEEPSEEK_API_KEY:
        logger.error("DEEPSEEK_API_KEY not configured - cannot generate embeddings")
        raise ValueError("DEEPSEEK_API_KEY is not configured")
    
    embeddings = []
    failed_texts = []
    
    try:
        # Use DeepSeek's embedding API (OpenAI-compatible)
        for idx, text in enumerate(texts):
            try:
                response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=text
                )
                if response.data and len(response.data) > 0:
                    embeddings.append(response.data[0].embedding)
                else:
                    logger.warning(f"Embedding {idx}/{len(texts)}: response missing data, using fallback")
                    embeddings.append(_generate_embedding_fallback(text))
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"Embedding {idx}/{len(texts)}: API error ({error_msg}), using fallback")
                failed_texts.append(text)
                embeddings.append(_generate_embedding_fallback(text))
        
        if failed_texts:
            logger.info(f"Generated embeddings with fallback for {len(failed_texts)}/{len(texts)} texts")
        else:
            logger.info(f"✅ Generated embeddings for all {len(texts)} texts using API")
    
    except ValueError as e:
        # Re-raise configuration errors
        logger.error(f"Configuration error generating embeddings: {e}")
        raise
    except Exception as e:
        logger.warning(f"Unexpected error generating embeddings, using fallback for all: {e}")
        # Fallback to simple embedding for all texts
        embeddings = [_generate_embedding_fallback(text) for text in texts]
    
    return embeddings

def _generate_embedding_fallback(text: str) -> List[float]:
    """
    Fallback embedding generation using simple hash-based approach
    For production, use proper embedding model
    """
    import hashlib
    import struct
    
    # Create a deterministic embedding-like vector
    hash_obj = hashlib.sha256(text.encode())
    hash_bytes = hash_obj.digest()
    
    # Convert to list of floats (128 dimensions)
    embedding = []
    for i in range(0, min(len(hash_bytes), 128), 4):
        if i + 4 <= len(hash_bytes):
            val = struct.unpack('f', hash_bytes[i:i+4])[0]
            embedding.append(val % 1.0)  # Normalize to 0-1
    
    # Pad to 128 dimensions
    while len(embedding) < 128:
        embedding.append(0.0)
    
    return embedding[:128]

def get_embedding(text: str) -> List[float]:
    """Get embedding for a single text"""
    return get_embeddings([text])[0]
