from typing import List
import re

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """
    Split text into chunks with overlap for better context retention
    Uses token approximation (roughly 4 characters per token)
    """
    # Approximate tokens (roughly 4 chars per token)
    char_per_token = 4
    chunk_char_size = chunk_size * char_per_token
    overlap_char_size = overlap * char_per_token
    
    # Split by sentences first for better chunking
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    current_size = 0
    
    for sentence in sentences:
        sentence_size = len(sentence)
        
        # If adding this sentence would exceed chunk size
        if current_size + sentence_size > chunk_char_size and current_chunk:
            chunks.append(current_chunk.strip())
            
            # Start new chunk with overlap
            if overlap_char_size > 0:
                # Get last few sentences for overlap
                words = current_chunk.split()
                overlap_words = words[-int(overlap_char_size / 5):]  # Rough word count
                current_chunk = " ".join(overlap_words) + " " + sentence
                current_size = len(current_chunk)
            else:
                current_chunk = sentence
                current_size = sentence_size
        else:
            current_chunk += " " + sentence if current_chunk else sentence
            current_size += sentence_size
    
    # Add the last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def chunk_text_simple(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """
    Simple chunking by character count with overlap
    """
    char_per_token = 4
    chunk_char_size = chunk_size * char_per_token
    overlap_char_size = overlap * char_per_token
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_char_size
        chunk = text[start:end]
        chunks.append(chunk.strip())
        
        # Move start position with overlap
        start = end - overlap_char_size
        if start >= text_length:
            break
    
    return chunks
