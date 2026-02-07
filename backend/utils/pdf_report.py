from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from datetime import datetime

def generate_pdf_report(report_content: str, output_path: str, document_title: str = "Performance Report"):
    """
    Generate PDF report from text content
    """
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    
    # Create PDF document
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#2c3e50',
        spaceAfter=12,
        spaceBefore=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor='#333333',
        spaceAfter=6,
        alignment=TA_LEFT
    )
    
    # Add title
    story.append(Paragraph(document_title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Add date
    date_str = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(f"Generated on: {date_str}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Parse and add report content
    lines = report_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.1*inch))
            continue
        
        # Check if it's a heading (starts with # or is all caps)
        if line.startswith('#') or (line.isupper() and len(line) < 50):
            # Remove # and format as heading
            heading_text = line.lstrip('#').strip()
            story.append(Paragraph(heading_text, heading_style))
        else:
            # Regular paragraph
            story.append(Paragraph(line, normal_style))
    
    # Build PDF
    doc.build(story)
    return output_path
