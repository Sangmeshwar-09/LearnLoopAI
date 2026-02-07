from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict
from backend.database.db import get_db
from backend.database.models import Document, Attempt, Score
from backend.rag.generator import evaluate_answer
from backend.config import DEFAULT_MIN_SCORE_THRESHOLD
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class AnswerSubmission(BaseModel):
    question_id: str
    question_text: str
    user_answer: str
    correct_answer: str
    question_type: str
    topic: str

class SubmitTestRequest(BaseModel):
    document_id: int
    questions: List[Dict]
    answers: List[AnswerSubmission]
    user_id: int = 1

@router.post("/submit-test")
async def submit_test(request: SubmitTestRequest, db: Session = Depends(get_db)):
    """
    Evaluate test answers and capture weak topics for personalized study notes.
    
    PROCESS:
    1. Evaluate each answer (correct/incorrect)
    2. For INCORRECT answers, capture the topic as a weak topic
    3. Store attempt with weak_topics for later use in notes generation
    4. Return attempt_id and weak_topics to frontend
    """
    logger.info(f"📝 Submitting test for document {request.document_id}")
    
    # Get document
    document = db.query(Document).filter(Document.id == request.document_id).first()
    if not document:
        logger.error(f"Document {request.document_id} not found")
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get previous attempts count
    previous_attempts = db.query(Attempt).filter(
        Attempt.document_id == request.document_id,
        Attempt.user_id == request.user_id
    ).count()
    
    attempt_number = previous_attempts + 1
    
    # Evaluate answers and identify weak topics
    scores = []
    correct_count = 0
    weak_topics = set()  # Topics from INCORRECT answers
    weak_topic_details = []  # Track which questions led to weak topics
    
    logger.info(f"📊 Evaluating {len(request.answers)} answers for attempt {attempt_number}")
    
    for answer_submission in request.answers:
        # Find corresponding question
        question = next((q for q in request.questions if q.get('id') == answer_submission.question_id), None)
        if not question:
            logger.warning(f"Question {answer_submission.question_id} not found in questions list")
            continue
        
        # Evaluate answer
        try:
            evaluation = evaluate_answer(
                question,
                answer_submission.user_answer,
                answer_submission.correct_answer
            )
        except Exception as e:
            logger.warning(f"Error evaluating question {answer_submission.question_id}: {str(e)}")
            evaluation = {"is_correct": False}
        
        is_correct = evaluation.get('is_correct', False)
        
        if is_correct:
            correct_count += 1
            logger.debug(f"✅ Q: {answer_submission.question_id} - CORRECT - Topic: {answer_submission.topic}")
        else:
            # IMPORTANT: Add topic to weak_topics ONLY for incorrect answers
            if answer_submission.topic:
                weak_topics.add(answer_submission.topic)
                weak_topic_details.append({
                    "question_id": answer_submission.question_id,
                    "topic": answer_submission.topic,
                    "user_answer": answer_submission.user_answer[:100],
                    "correct_answer": answer_submission.correct_answer[:100]
                })
                logger.info(f"❌ Q: {answer_submission.question_id} - INCORRECT - Weak Topic: {answer_submission.topic}")
        
        # Store score record
        score = Score(
            question_id=answer_submission.question_id,
            question_text=answer_submission.question_text,
            user_answer=answer_submission.user_answer,
            correct_answer=answer_submission.correct_answer,
            is_correct=1 if is_correct else 0,
            topic=answer_submission.topic
        )
        scores.append(score)
    
    # Calculate final score
    total_questions = len(request.answers)
    final_score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    passed = 1 if final_score >= DEFAULT_MIN_SCORE_THRESHOLD else 0
    
    logger.info(f"📈 Final Score: {final_score:.1f}% ({correct_count}/{total_questions} correct)")
    logger.info(f"🎯 Weak topics identified: {list(weak_topics)}")
    
    # Create attempt record with weak topics
    attempt = Attempt(
        user_id=request.user_id,
        document_id=request.document_id,
        attempt_number=attempt_number,
        score=final_score,
        total_questions=total_questions,
        correct_answers=correct_count,
        passed=passed,
        weak_topics=list(weak_topics)  # Store topics from incorrect answers
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    logger.info(f"✅ Attempt {attempt.id} created with {len(weak_topics)} weak topics")
    
    # Add scores to attempt
    for score in scores:
        score.attempt_id = attempt.id
        db.add(score)
    
    db.commit()
    
    # Prepare response
    response = {
        "attempt_id": attempt.id,
        "document_id": request.document_id,
        "score": round(final_score, 2),
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "passed": passed == 1,
        "weak_topics": list(weak_topics),
        "weak_topic_count": len(weak_topics),
        "attempt_number": attempt_number,
        "min_threshold": DEFAULT_MIN_SCORE_THRESHOLD,
        "message": f"Score: {final_score:.1f}% | Weak areas: {', '.join(weak_topics) if weak_topics else 'None'}"
    }
    
    logger.info(f"📤 Returning submission response: {response}")
    return response
