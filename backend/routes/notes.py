from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from backend.database.db import get_db
from backend.database.models import Attempt, Document
from backend.rag.retriever import retrieve_chunks_by_topics
from backend.rag.generator import generate_notes, generate_fallback_notes

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/generate-notes")
async def generate_notes_endpoint(attempt_id: int, db: Session = Depends(get_db)):
    """
    Generate personalized study notes based on weak topics from the test attempt.
    Uses RAG to retrieve relevant PDF content for those topics.
    Returns actual, PDF-based study notes - NOT generic placeholders.
    """
    logger.info(f"📝 Generating notes for attempt_id: {attempt_id}")
    
    # Get attempt
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        logger.error(f"Attempt {attempt_id} not found")
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Get document
    document = db.query(Document).filter(Document.id == attempt.document_id).first()
    if not document:
        logger.error(f"Document for attempt {attempt_id} not found")
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get weak topics from attempt
    weak_topics = attempt.weak_topics or []
    
    logger.info(f"📚 Weak topics identified: {weak_topics}")
    logger.info(f"📊 Attempt score: {attempt.score}%, Correct: {attempt.correct_answers}/{attempt.total_questions}")
    
    if not weak_topics:
        logger.warning(f"No weak topics identified for attempt {attempt_id} - student scored {attempt.score}%")
        return {
            "focus_areas": [],
            "notes": "Congratulations! You performed well on this test. No specific weak topics identified for further study.",
            "attempt_id": attempt_id,
            "score": attempt.score,
            "message": "Great performance!"
        }
    
    # Retrieve relevant chunks for weak topics using RAG
    collection_name = document.vector_db_collection
    logger.info(f"🔍 Retrieving PDF chunks for {len(weak_topics)} weak topics from collection: {collection_name}")
    
    try:
        # Retrieve multiple chunks per topic for comprehensive notes
        chunks = retrieve_chunks_by_topics(collection_name, weak_topics, n_results_per_topic=8)
        logger.info(f"✅ Retrieved {len(chunks)} chunks from vector DB for note generation")
        
        if not chunks:
            logger.error(f"No chunks retrieved for weak topics: {weak_topics}")
            raise HTTPException(
                status_code=400, 
                detail="Could not retrieve relevant content from document for the identified weak topics. The PDF may lack sufficient information on these topics."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving chunks for notes: {str(e)}")
        raise HTTPException(status_code=400, detail="Could not retrieve content for weak topics from document")
    
    # Combine chunks into context - ensure substantial content
    context = "\n\n".join([chunk['text'] for chunk in chunks])
    
    if not context or len(context.strip()) < 150:
        logger.error(f"Insufficient context retrieved: only {len(context)} characters from {len(chunks)} chunks")
        raise HTTPException(status_code=400, detail="Retrieved content is insufficient for comprehensive note generation. Please ensure PDF contains substantial content.")
    
    logger.info(f"📄 Combined context of {len(context)} characters from {len(chunks)} chunks for notes")
    logger.info(f"📋 Weak topics to focus on: {', '.join(weak_topics)}")
    
    # Generate detailed, PDF-based notes
    try:
        logger.info(f"🤖 Calling DeepSeek API to generate study notes for: {weak_topics}")
        notes = generate_notes(context, weak_topics)
        
        if not notes or len(notes.strip()) < 100:
            logger.error("Generated notes are too short - likely invalid response")
            raise HTTPException(status_code=500, detail="Generated notes are incomplete. Please try again.")
        
        logger.info(f"✅ Study notes generated successfully ({len(notes)} characters)")
        
        return {
            "focus_areas": weak_topics,
            "notes": notes,
            "attempt_id": attempt_id,
            "score": attempt.score,
            "message": f"Generated personalized study notes for {len(weak_topics)} weak topic(s)",
            "ai_available": True,
            "mode": "ai"
        }
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"ValueError in notes generation: {error_msg}")
        
        # Handle specific DeepSeek API errors - SWITCH TO FALLBACK
        if "DEEPSEEK_INSUFFICIENT_BALANCE" in error_msg or "402" in error_msg or "insufficient" in error_msg.lower():
            logger.warning("💡 Switching to FALLBACK MODE: Generating notes from PDF content only")
            try:
                fallback_notes = generate_fallback_notes(context, weak_topics)
                return {
                    "focus_areas": weak_topics,
                    "notes": fallback_notes,
                    "attempt_id": attempt_id,
                    "score": attempt.score,
                    "message": f"Generated study notes from document (AI service unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback note generation also failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate notes. Please try again.")
        
        elif "DEEPSEEK_AUTH_FAILED" in error_msg or "401" in error_msg:
            logger.warning("💡 Switching to FALLBACK MODE: Auth failed")
            try:
                fallback_notes = generate_fallback_notes(context, weak_topics)
                return {
                    "focus_areas": weak_topics,
                    "notes": fallback_notes,
                    "attempt_id": attempt_id,
                    "score": attempt.score,
                    "message": f"Generated study notes from document (service temporarily unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback note generation failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate notes.")
        
        elif "temporarily unavailable" in error_msg.lower() or "503" in error_msg:
            logger.warning("💡 Switching to FALLBACK MODE: Service temporarily unavailable")
            try:
                fallback_notes = generate_fallback_notes(context, weak_topics)
                return {
                    "focus_areas": weak_topics,
                    "notes": fallback_notes,
                    "attempt_id": attempt_id,
                    "score": attempt.score,
                    "message": f"Generated study notes from document (AI service temporarily unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback note generation failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate notes.")
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to generate notes: {error_msg[:100]}. Please try again later."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating notes: {str(e)}")
        
        # Even on unexpected errors, try fallback
        logger.warning("💡 Attempting FALLBACK MODE due to unexpected error")
        try:
            fallback_notes = generate_fallback_notes(context, weak_topics)
            return {
                "focus_areas": weak_topics,
                "notes": fallback_notes,
                "attempt_id": attempt_id,
                "score": attempt.score,
                "message": f"Generated study notes from document",
                "ai_available": False,
                "mode": "fallback"
            }
        except Exception as fallback_e:
            logger.error(f"Fallback also failed: {fallback_e}")
            raise HTTPException(
                status_code=500,
                detail="Error generating notes. Please try again later."
            )
