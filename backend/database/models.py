from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    documents = relationship("Document", back_populates="user")
    attempts = relationship("Attempt", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    file_path = Column(String)
    title = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    vector_db_collection = Column(String)  # ChromaDB collection name
    
    user = relationship("User", back_populates="documents")
    attempts = relationship("Attempt", back_populates="document")

class Attempt(Base):
    __tablename__ = "attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    document_id = Column(Integer, ForeignKey("documents.id"))
    attempt_number = Column(Integer, default=1)
    score = Column(Float)
    total_questions = Column(Integer)
    correct_answers = Column(Integer)
    passed = Column(Integer, default=0)  # 0 = failed, 1 = passed
    weak_topics = Column(JSON)  # List of topics user struggled with
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="attempts")
    document = relationship("Document", back_populates="attempts")
    scores = relationship("Score", back_populates="attempt")
    report = relationship("Report", back_populates="attempt", uselist=False)

class Score(Base):
    __tablename__ = "scores"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"))
    question_id = Column(String)  # Question identifier
    question_text = Column(Text)
    user_answer = Column(Text)
    correct_answer = Column(Text)
    is_correct = Column(Integer, default=0)  # 0 = wrong, 1 = correct
    topic = Column(String)  # Topic/category of the question
    
    attempt = relationship("Attempt", back_populates="scores")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id"), unique=True)
    report_content = Column(Text)  # JSON or formatted text
    pdf_path = Column(String)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    attempt = relationship("Attempt", back_populates="report")
