from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.database.models import User, Document
from backend.rag.pdf_loader import extract_text_from_pdf, validate_pdf
from backend.rag.chunker import chunk_text
from backend.rag.retriever import add_documents_to_collection
from backend.config import UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS, DEEPSEEK_API_KEY
import os
import uuid
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: int = 1,  # Default user, in production use authentication
    db: Session = Depends(get_db)
):
    """
    Upload PDF document and process it for RAG
    Comprehensive error handling ensures backend never crashes
    """
    file_path = None
    
    try:
        # ========== STEP 1: VALIDATE INPUT ==========
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Only {ALLOWED_EXTENSIONS} files are allowed"
            )
        
        logger.info(f"Starting PDF upload: {file.filename}")
        
        # ========== STEP 2: VALIDATE CONFIGURATION ==========
        if not DEEPSEEK_API_KEY:
            logger.error("DEEPSEEK_API_KEY not configured - cannot process PDF")
            raise HTTPException(
                status_code=500,
                detail="Server configuration error. AI service not available. Please contact administrator."
            )
        
        # ========== STEP 3: READ AND SAVE FILE ==========
        try:
            contents = await file.read()
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Failed to read file. Please try again."
            )
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.2f}MB"
            )
        
        # Save file
        try:
            file_id = str(uuid.uuid4())
            filename = f"{file_id}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            
            with open(file_path, "wb") as f:
                f.write(contents)
            
            logger.info(f"File saved to: {file_path}")
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save file on server. Please try again."
            )
        
        # ========== STEP 4: VALIDATE PDF ==========
        try:
            if not validate_pdf(file_path):
                raise ValueError("File is not a valid PDF")
        except Exception as e:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"PDF validation failed: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF file. Please upload a valid PDF."
            )
        
        # ========== STEP 5: EXTRACT TEXT ==========
        try:
            logger.info(f"🔍 Extracting text from PDF: {file.filename}")
            text = extract_text_from_pdf(file_path)
            
            if not text or len(text.strip()) < 10:
                raise ValueError("PDF contains no readable text")
            
            logger.info(f"✅ Text extracted: {len(text)} characters from {file.filename}")
            logger.debug(f"Text preview: {text[:200]}...")
        except Exception as e:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"❌ Text extraction failed: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Failed to extract text from PDF. The PDF might be image-based or corrupted."
            )
        
        # ========== STEP 6: CHUNK TEXT ==========
        try:
            chunks = chunk_text(text)
            
            if not chunks or len(chunks) == 0:
                raise ValueError("Failed to create text chunks")
            
            logger.info(f"Text chunked into {len(chunks)} chunks")
        except Exception as e:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"Text chunking failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to process PDF content."
            )
        
        # ========== STEP 7: STORE IN CHROMADB ==========
        try:
            collection_name = f"doc_{file_id}"
            add_documents_to_collection(collection_name, chunks)
            logger.info(f"ChromaDB collection created: {collection_name}")
        except Exception as e:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"ChromaDB error: {str(e)}")
            # Provide a more helpful error message
            raise HTTPException(
                status_code=500,
                detail="Failed to index document content. This may be a temporary issue. Please try again."
            )
        
        # ========== STEP 8: SAVE TO DATABASE ==========
        try:
            document = Document(
                user_id=user_id,
                filename=file.filename,
                file_path=file_path,
                title=os.path.splitext(file.filename)[0],
                vector_db_collection=collection_name
            )
            db.add(document)
            db.commit()
            db.refresh(document)
            logger.info(f"Document saved to database: ID={document.id}")
        except Exception as e:
            db.rollback()
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"Database save error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to save document. Please try again."
            )
        
        # ========== SUCCESS ==========
        logger.info(f"✅ PDF uploaded successfully: {document.id} - {document.title}")
        return {
            "message": "PDF uploaded and processed successfully",
            "document_id": document.id,
            "title": document.title,
            "chunks_count": len(chunks),
            "text_length": len(text)
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors
        logger.error(f"❌ Unexpected error in upload_pdf: {str(e)}", exc_info=True)
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again or contact support."
        )
