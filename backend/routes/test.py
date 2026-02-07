from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from backend.database.db import get_db
from backend.database.models import Document, Attempt
from backend.rag.retriever import retrieve_relevant_chunks, retrieve_chunks_by_topics
from backend.rag.generator import generate_questions, generate_adaptive_questions, generate_fallback_questions
from backend.config import DEFAULT_MIN_SCORE_THRESHOLD

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class GenerateTestRequest(BaseModel):
    document_id: int
    num_questions: int = 5
    user_id: int = 1

class ReattemptTestRequest(BaseModel):
    document_id: int
    attempt_id: int
    num_questions: int = 5
    user_id: int = 1

@router.post("/generate-test")
async def generate_test(request: GenerateTestRequest, db: Session = Depends(get_db)):
    """
    Generate test questions from uploaded document
    Questions are dynamically generated each time based on PDF content
    """
    # Get document
    document = db.query(Document).filter(Document.id == request.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Retrieve relevant chunks from vector DB - use diverse queries to get different content
    collection_name = document.vector_db_collection
    
    logger.info(f"📚 Generating {request.num_questions} questions for document: {document.filename}")
    
    # Retrieve multiple sets of chunks with different queries to ensure diversity
    # Each retrieval gets different content based on query
    query_variations = [
        "main topics and key concepts",
        "important details and explanations",
        "definitions and examples",
        "concepts and applications",
        "critical information",
        "important sections",
        "core principles",
        "fundamental ideas"
    ]
    
    all_chunks = []
    seen_texts = set()
    
    # Get diverse chunks from different semantic queries
    for query in query_variations[:min(6, request.num_questions)]:  # Scale queries with num_questions
        try:
            chunks = retrieve_relevant_chunks(collection_name, query, n_results=6)
            for chunk in chunks:
                if chunk.get('text') and chunk['text'] not in seen_texts:
                    all_chunks.append(chunk)
                    seen_texts.add(chunk['text'])
        except Exception as e:
            logger.warning(f"Could not retrieve chunks for query '{query}': {e}")
            continue
    
    # If we still don't have enough, get more with a general query
    if len(all_chunks) < 10:
        try:
            additional_chunks = retrieve_relevant_chunks(collection_name, "important content", n_results=12)
            for chunk in additional_chunks:
                if chunk.get('text') and chunk['text'] not in seen_texts:
                    all_chunks.append(chunk)
                    seen_texts.add(chunk['text'])
        except Exception as e:
            logger.warning(f"Could not retrieve additional chunks: {e}")
    
    # Combine chunks into context - ensure we have substantial content
    context = "\n\n".join([chunk['text'] for chunk in all_chunks[:20]])  # Use up to 20 diverse chunks
    
    if not context or len(context.strip()) < 200:
        logger.error(f"Insufficient content retrieved: {len(context)} chars from {len(all_chunks)} chunks")
        raise HTTPException(
            status_code=400, 
            detail="❌ Could not retrieve sufficient content from document. Please ensure the PDF contains readable text."
        )
    
    logger.info(f"✅ Retrieved {len(all_chunks)} unique chunks ({len(context)} chars) from document for question generation")
    
    # Generate questions based on retrieved content
    try:
        logger.info(f"🤖 Calling DeepSeek to generate questions from {len(context)} character context...")
        logger.info(f"📊 Context preview: {context[:200]}...")
        
        questions = generate_questions(context, num_questions=request.num_questions)
        
        if not questions:
            logger.error("❌ No questions returned from generator")
            raise ValueError("No questions generated")
        
        # Add question IDs and log each question
        for i, q in enumerate(questions, 1):
            q['id'] = f"q_{i}"
            q_text = q.get('question', 'Unknown')[:60]
            options = q.get('options', [])
            logger.info(f"✅ Q{i}: {q_text}... | Options: {len(options)} | Topic: {q.get('topic', 'N/A')}")
        
        logger.info(f"✅ Successfully generated {len(questions)} questions for document: {document.filename}")
        
        return {
            "success": True,
            "document_id": document.id,
            "document_title": document.title,
            "document_filename": document.filename,
            "questions": questions,
            "total_questions": len(questions),
            "message": f"Generated {len(questions)} unique questions from {document.filename}",
            "ai_available": True,
            "mode": "ai"
        }
    except ValueError as e:
        error_detail = f"❌ Error in test generation: {str(e)}"
        logger.error(error_detail)
        error_msg = str(e)
        
        # SWITCH TO FALLBACK MODE FOR AI FAILURES
        if any(err in error_msg for err in ["DEEPSEEK_INSUFFICIENT_BALANCE", "402", "insufficient", "balance"]):
            logger.warning("💡 Switching to FALLBACK MODE: Generating questions from PDF content (AI unavailable)")
            try:
                fallback_questions = generate_fallback_questions(context, None, request.num_questions)
                
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_filename": document.filename,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "message": f"Generated {len(fallback_questions)} questions from document (AI service unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback question generation also failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate test questions")
        
        elif any(err in error_msg for err in ["DEEPSEEK_AUTH_FAILED", "401", "unauthorized"]):
            logger.warning("💡 Switching to FALLBACK MODE: Auth failed")
            try:
                fallback_questions = generate_fallback_questions(context, None, request.num_questions)
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_filename": document.filename,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "message": f"Generated {len(fallback_questions)} questions from document",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate test questions")
        
        elif "temporarily unavailable" in error_msg.lower():
            logger.warning("💡 Switching to FALLBACK MODE: Service temporarily unavailable")
            try:
                fallback_questions = generate_fallback_questions(context, None, request.num_questions)
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "document_filename": document.filename,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "message": f"Generated {len(fallback_questions)} questions (AI temporarily unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate test questions")
        
        raise HTTPException(
            status_code=500,
            detail=error_msg if error_msg else "Server configuration error. Please ensure DeepSeek API is properly configured."
        )
    except Exception as e:
        error_detail = f"❌ Error generating questions: {str(e)}"
        logger.error(error_detail)
        error_msg = str(e)
        
        # Try fallback for unexpected errors too
        logger.warning("💡 Attempting FALLBACK MODE due to unexpected error")
        try:
            fallback_questions = generate_fallback_questions(context, None, request.num_questions)
            return {
                "success": True,
                "document_id": document.id,
                "document_title": document.title,
                "document_filename": document.filename,
                "questions": fallback_questions,
                "total_questions": len(fallback_questions),
                "message": f"Generated {len(fallback_questions)} questions from document",
                "ai_available": False,
                "mode": "fallback"
            }
        except Exception as fallback_e:
            logger.error(f"Fallback also failed: {fallback_e}")
            
            # Handle service unavailable
            if "temporarily unavailable" in error_msg.lower():
                raise HTTPException(
                    status_code=503,
                    detail="AI service is temporarily unavailable. Please try again later."
                )
            
            if "DEEPSEEK_API_KEY" in error_msg or "API key" in error_msg:
                error_msg = "Server configuration error. DeepSeek API key not properly configured."
            
            raise HTTPException(status_code=500, detail=error_msg if error_msg else "Error generating questions")

@router.post("/reattempt-test")
async def reattempt_test(request: ReattemptTestRequest, db: Session = Depends(get_db)):
    """
    Generate fresh test focused on weak topics from previous attempt.
    
    PROCESS:
    1. Get the previous attempt and extract weak_topics
    2. Retrieve PDF chunks ONLY for those weak topics
    3. Generate NEW, UNIQUE questions focused on weak areas
    4. Return questions to allow student to reattempt
    """
    logger.info(f"🔄 Reattempt test requested - Attempt ID: {request.attempt_id}, Document ID: {request.document_id}")
    
    # Get previous attempt
    attempt = db.query(Attempt).filter(Attempt.id == request.attempt_id).first()
    if not attempt:
        logger.error(f"Attempt {request.attempt_id} not found for reattempt")
        raise HTTPException(status_code=404, detail="Previous attempt not found")
    
    # Get document
    document = db.query(Document).filter(Document.id == request.document_id).first()
    if not document:
        logger.error(f"Document {request.document_id} not found for reattempt")
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get weak topics from previous attempt
    weak_topics = attempt.weak_topics or []
    logger.info(f"📚 Previous attempt weak topics: {weak_topics}")
    logger.info(f"📊 Previous score: {attempt.score}%, Passed: {attempt.passed}")
    
    if not weak_topics:
        logger.warning(f"No weak topics found in attempt {request.attempt_id} - will generate general questions")
        # Fall back to general questions if no weak topics
        try:
            chunks = retrieve_relevant_chunks(document.vector_db_collection, "main concepts and topics", n_results=12)
        except Exception as e:
            logger.error(f"Error retrieving general chunks: {str(e)}")
            raise HTTPException(status_code=400, detail="Could not retrieve content from document")
    else:
        # Retrieve chunks ONLY for weak topics - focused learning
        try:
            logger.info(f"🔍 Retrieving PDF chunks for weak topics: {weak_topics}")
            chunks = retrieve_chunks_by_topics(
                document.vector_db_collection, 
                weak_topics, 
                n_results_per_topic=8  # Get more chunks per topic for comprehensive reattempt
            )
            logger.info(f"✅ Retrieved {len(chunks)} chunks focused on weak topics")
            
            if not chunks:
                logger.warning(f"No chunks found for weak topics {weak_topics}, falling back to general retrieval")
                chunks = retrieve_relevant_chunks(document.vector_db_collection, "main content", n_results=12)
        except Exception as e:
            logger.error(f"Error retrieving chunks for weak topics: {str(e)}")
            raise HTTPException(status_code=400, detail="Could not retrieve content for weak topics")
    
    # Combine chunks into context for question generation
    context = "\n\n".join([chunk.get('text', '') for chunk in chunks if chunk.get('text')])
    
    if not context or len(context.strip()) < 200:
        logger.error(f"Insufficient context for reattempt: {len(context)} chars")
        raise HTTPException(status_code=400, detail="Could not retrieve sufficient content from document for reattempt")
    
    logger.info(f"📄 Generated context: {len(context)} characters from {len(chunks)} chunks")
    
    # Generate FRESH, UNIQUE questions focused on weak topics
    try:
        if weak_topics:
            logger.info(f"🤖 Generating adaptive questions focused on: {weak_topics}")
            questions = generate_adaptive_questions(
                context, 
                weak_topics, 
                num_questions=request.num_questions
            )
        else:
            logger.info(f"🤖 Generating general reattempt questions")
            questions = generate_questions(context, num_questions=request.num_questions)
        
        if not questions or len(questions) == 0:
            logger.error("No questions generated for reattempt")
            raise ValueError("Failed to generate reattempt questions")
        
        # Add/normalize question IDs
        for i, q in enumerate(questions, 1):
            if 'id' not in q:
                q['id'] = f"q_{i}"
        
        logger.info(f"✅ Generated {len(questions)} reattempt questions focused on weak topics")
        
        return {
            "success": True,
            "document_id": document.id,
            "document_title": document.title,
            "questions": questions,
            "total_questions": len(questions),
            "focus_topics": weak_topics,
            "previous_score": attempt.score,
            "previous_attempt_id": request.attempt_id,
            "message": f"Generated {len(questions)} new questions focused on your weak areas: {', '.join(weak_topics) if weak_topics else 'general review'}",
            "ai_available": True,
            "mode": "ai"
        }
        
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"Error in reattempt question generation: {error_msg}")
        
        # HANDLE AI FAILURES WITH FALLBACK MODE
        if any(err in error_msg for err in ["DEEPSEEK_INSUFFICIENT_BALANCE", "402", "insufficient", "balance"]):
            logger.warning("💡 Switching to FALLBACK MODE: Reusing questions from PDF content (AI unavailable)")
            try:
                fallback_questions = generate_fallback_questions(context, weak_topics, request.num_questions)
                
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "focus_topics": weak_topics,
                    "previous_score": attempt.score,
                    "previous_attempt_id": request.attempt_id,
                    "message": f"Generated {len(fallback_questions)} questions from document (AI service unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback question generation failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate reattempt questions")
        
        elif any(err in error_msg for err in ["DEEPSEEK_AUTH_FAILED", "401", "unauthorized", "auth"]):
            logger.warning("💡 Switching to FALLBACK MODE: Auth failed")
            try:
                fallback_questions = generate_fallback_questions(context, weak_topics, request.num_questions)
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "focus_topics": weak_topics,
                    "previous_score": attempt.score,
                    "previous_attempt_id": request.attempt_id,
                    "message": f"Generated {len(fallback_questions)} questions from document",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate reattempt questions")
        
        elif any(err in error_msg.lower() for err in ["temporarily unavailable", "503", "timeout"]):
            logger.warning("💡 Switching to FALLBACK MODE: Service temporarily unavailable")
            try:
                fallback_questions = generate_fallback_questions(context, weak_topics, request.num_questions)
                return {
                    "success": True,
                    "document_id": document.id,
                    "document_title": document.title,
                    "questions": fallback_questions,
                    "total_questions": len(fallback_questions),
                    "focus_topics": weak_topics,
                    "previous_score": attempt.score,
                    "previous_attempt_id": request.attempt_id,
                    "message": f"Generated {len(fallback_questions)} questions (AI temporarily unavailable)",
                    "ai_available": False,
                    "mode": "fallback"
                }
            except Exception as fallback_e:
                logger.error(f"Fallback failed: {fallback_e}")
                raise HTTPException(status_code=500, detail="Could not generate reattempt questions")
        
        else:
            raise HTTPException(status_code=500, detail=error_msg or "Failed to generate reattempt questions")
            
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Unexpected error in reattempt: {error_msg}")
        
        # Last resort: try fallback
        logger.warning("💡 Attempting FALLBACK MODE due to unexpected error")
        try:
            fallback_questions = generate_fallback_questions(context, weak_topics, request.num_questions)
            return {
                "success": True,
                "document_id": document.id,
                "document_title": document.title,
                "questions": fallback_questions,
                "total_questions": len(fallback_questions),
                "focus_topics": weak_topics,
                "previous_score": attempt.score,
                "previous_attempt_id": request.attempt_id,
                "message": f"Generated {len(fallback_questions)} questions from document",
                "ai_available": False,
                "mode": "fallback"
            }
        except Exception as fallback_e:
            logger.error(f"Fallback also failed: {fallback_e}")
            raise HTTPException(status_code=500, detail="Error generating reattempt questions. Please try again later.")
