import pypdf
import pdfplumber
from typing import List
import os

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from PDF file using multiple methods for better coverage
    """
    text = ""
    
    # Method 1: Try pdfplumber (better for complex PDFs)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"pdfplumber failed: {e}")
    
    # Method 2: Fallback to pypdf
    if not text.strip():
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"pypdf failed: {e}")
    
    if not text.strip():
        raise ValueError("Could not extract text from PDF. The PDF might be image-based or corrupted.")
    
    return text.strip()

def validate_pdf(pdf_path: str) -> bool:
    """Validate PDF file"""
    if not os.path.exists(pdf_path):
        return False
    
    if not pdf_path.lower().endswith('.pdf'):
        return False
    
    try:
        with open(pdf_path, 'rb') as file:
            # Try to read first few bytes to check if it's a valid PDF
            header = file.read(4)
            if header != b'%PDF':
                return False
    except:
        return False
    
    return True
