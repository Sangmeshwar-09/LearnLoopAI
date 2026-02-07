from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from backend.database.db import get_db
from backend.database.models import Attempt, Document, Report, Score
from backend.rag.generator import generate_report
from backend.utils.pdf_report import generate_pdf_report
import os
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/generate-report")
async def generate_report_endpoint(attempt_id: int, db: Session = Depends(get_db)):
    """
    Generate detailed performance report and PDF
    """
    # Get attempt
    attempt = db.query(Attempt).filter(Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Check if attempt passed
    if attempt.passed != 1:
        raise HTTPException(status_code=400, detail="Report can only be generated for passed attempts")
    
    # Get document
    document = db.query(Document).filter(Document.id == attempt.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get all attempts for this document and user
    all_attempts = db.query(Attempt).filter(
        Attempt.document_id == attempt.document_id,
        Attempt.user_id == attempt.user_id
    ).order_by(Attempt.attempt_number).all()
    
    # Prepare attempt history
    attempt_history = []
    for att in all_attempts:
        attempt_history.append({
            "attempt_number": att.attempt_number,
            "score": att.score,
            "correct_answers": att.correct_answers,
            "total_questions": att.total_questions,
            "weak_topics": att.weak_topics or []
        })
    
    # Generate report content
    try:
        report_content = generate_report(attempt_history, document.title)
        if not report_content:
            raise ValueError("Report generation returned empty content")
        logger.info(f"✅ Report generated successfully for attempt {attempt_id}")
    except ValueError as e:
        logger.error(f"Configuration error in report generation: {str(e)}")
        # Fall back to basic report structure
        attempts_summary = "\n".join([
            f"Attempt {a['attempt_number']}: Score {a['score']}% ({a['correct_answers']}/{a['total_questions']})"
            for a in attempt_history
        ])
        report_content = f"""Performance Report - {document.title}

ATTEMPT HISTORY:
{attempts_summary}

This is a summary of your test attempts. Please contact support for detailed analysis.
"""
        logger.info(f"📝 Using fallback report for attempt {attempt_id} due to configuration error")
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        # Fall back to basic report structure
        attempts_summary = "\n".join([
            f"Attempt {a['attempt_number']}: Score {a['score']}% ({a['correct_answers']}/{a['total_questions']})"
            for a in attempt_history
        ])
        report_content = f"""Performance Report - {document.title}

ATTEMPT HISTORY:
{attempts_summary}

This is a summary of your test attempts. Please contact support for detailed analysis.
"""
        logger.info(f"📝 Using fallback report for attempt {attempt_id}")
    
    # Generate PDF
    reports_dir = "./reports"
    os.makedirs(reports_dir, exist_ok=True)
    pdf_filename = f"report_{attempt_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    try:
        generate_pdf_report(report_content, pdf_path, f"Performance Report - {document.title}")
        logger.info(f"✅ PDF report generated successfully: {pdf_path}")
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        # Don't fail the entire request if PDF generation fails - user can view report without PDF
        pdf_path = None
        logger.warning(f"⚠️ PDF generation failed for attempt {attempt_id}, continuing without PDF")
    
    # Save report to database
    # First, check if a report already exists for this attempt
    existing_report = db.query(Report).filter(Report.attempt_id == attempt_id).first()
    
    if existing_report:
        # Delete old PDF file if it exists
        try:
            if os.path.exists(existing_report.pdf_path):
                os.remove(existing_report.pdf_path)
                logger.info(f"Deleted old report PDF: {existing_report.pdf_path}")
        except Exception as e:
            logger.warning(f"Could not delete old PDF file: {str(e)}")
        
        # Update existing report
        existing_report.report_content = report_content
        existing_report.pdf_path = pdf_path
        existing_report.generated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_report)
        report = existing_report
        logger.info(f"Updated existing report for attempt {attempt_id}")
    else:
        # Create new report
        report = Report(
            attempt_id=attempt_id,
            report_content=report_content,
            pdf_path=pdf_path
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        logger.info(f"Created new report for attempt {attempt_id}")
    
    return {
        "report_id": report.id,
        "report_content": report_content,
        "pdf_path": pdf_path,
        "pdf_url": f"/reports/{pdf_filename}" if pdf_path else None,
        "attempt_id": attempt_id,
        "document_title": document.title,
        "pdf_available": pdf_path is not None
    }

@router.get("/download-report/{report_id}")
async def download_report(report_id: int, db: Session = Depends(get_db)):
    """
    Get report PDF file path for download
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found or not yet generated")
    
    return {
        "pdf_path": report.pdf_path,
        "filename": os.path.basename(report.pdf_path)
    }

@router.get("/attempts")
async def get_attempts(document_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """
    Get all attempts for a specific document and user
    Returns attempt history with scores and weak topics for progress dashboard
    """
    try:
        attempts = db.query(Attempt).filter(
            Attempt.document_id == document_id,
            Attempt.user_id == user_id
        ).order_by(Attempt.attempt_number).all()
        
        if not attempts:
            logger.info(f"No attempts found for document {document_id}, user {user_id}")
            return []
        
        # Convert to response format
        attempts_data = []
        for attempt in attempts:
            attempts_data.append({
                "id": attempt.id,
                "attempt_number": attempt.attempt_number,
                "score": attempt.score,
                "correct_answers": attempt.correct_answers,
                "total_questions": attempt.total_questions,
                "passed": attempt.passed == 1,
                "weak_topics": attempt.weak_topics or [],
                "created_at": attempt.created_at.isoformat() if attempt.created_at else None
            })
        
        logger.info(f"Retrieved {len(attempts_data)} attempts for progress dashboard")
        return attempts_data
        
    except Exception as e:
        logger.error(f"Error fetching attempts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching attempts: {str(e)}")
