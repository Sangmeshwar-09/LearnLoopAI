from openai import OpenAI
from typing import List, Dict
import logging
import time
import random
import json
from backend.config import DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_API_BASE

# Configure logging
logger = logging.getLogger(__name__)

# Configure DeepSeek API once at module level
# This happens when the module is imported, ensuring configuration happens once
try:
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY is not configured in backend/config.py")
    # Initialize OpenAI client with DeepSeek endpoint
    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_BASE)
    logger.info("DeepSeek API configured successfully in generator module")
except ValueError as e:
    logger.error(f"Failed to configure DeepSeek API: {e}")
    # Re-raise ValueError so it can be caught by route handlers
    raise
except Exception as e:
    logger.error(f"Unexpected error configuring DeepSeek API: {e}")
    raise ValueError(f"DeepSeek API configuration failed: {str(e)}")

def _call_deepseek_with_retry(prompt: str, temperature: float = 1.0, max_retries: int = 3) -> str:
    """
    Call DeepSeek API with retry logic for rate limiting.
    Handles 402 (Insufficient Balance) and other errors gracefully.
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"🔄 DeepSeek API call (attempt {attempt + 1}/{max_retries})...")
            response = client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                top_p=0.95,
                max_tokens=1024,
            )
            
            if not response or not response.choices:
                raise ValueError("DeepSeek returned empty response")
            
            result_text = response.choices[0].message.content
            if not result_text:
                raise ValueError("DeepSeek returned empty message")
            
            logger.info(f"✅ DeepSeek API succeeded on attempt {attempt + 1}")
            return result_text
            
        except Exception as e:
            error_str = str(e)
            logger.error(f"DeepSeek API error (attempt {attempt + 1}): {error_str}")
            
            # Check for 402 Insufficient Balance (billing issue, not retryable)
            if "402" in error_str or "insufficient" in error_str.lower() or "balance" in error_str.lower():
                logger.error("❌ DeepSeek API: Insufficient balance. Account has no remaining credits.")
                raise ValueError("DEEPSEEK_INSUFFICIENT_BALANCE")
            
            # Check if it's a quota/rate limit error (429)
            if "429" in error_str or "quota" in error_str.lower() or "rate_limit" in error_str.lower():
                if attempt < max_retries - 1:
                    # Calculate backoff: 2^attempt + random jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"⏳ Rate limited (429). Waiting {wait_time:.1f}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise ValueError(f"❌ Quota exceeded after {max_retries} retries. Please wait before retrying.")
            
            # Check for authentication errors (401)
            if "401" in error_str or "unauthorized" in error_str.lower() or "invalid api" in error_str.lower():
                logger.error("❌ DeepSeek API: Authentication failed. Invalid API key.")
                raise ValueError("DEEPSEEK_AUTH_FAILED")
            
            # For other errors, raise immediately
            raise

def _generate_demo_questions(context: str, num_questions: int = 5) -> List[Dict]:
    """
    DEMO MODE: Generate sample questions when AI service is unavailable.
    Shows that the system works while allowing time to resolve billing issues.
    """
    logger.warning("⚠️ Using DEMO MODE - AI service unavailable. Generating sample questions from PDF content.")
    
    # Extract first few sentences from context as topics
    sentences = [s.strip() for s in context.split('.') if s.strip() and len(s.strip()) > 20]
    sentences = sentences[:num_questions]
    
    demo_questions = []
    
    for i, sentence in enumerate(sentences[:num_questions], 1):
        # Create a question based on the sentence
        question_text = f"Which of the following best describes the concept: '{sentence[:60]}...'?"
        
        # Generate plausible options based on the context
        demo_question = {
            "id": f"q_{i}",
            "question_type": "multiple_choice",
            "question": question_text,
            "options": [
                sentence[:80] if len(sentence) > 80 else sentence,
                "A related concept from the document",
                "An alternative interpretation",
                "A different topic area"
            ],
            "correct_answer": sentence[:80] if len(sentence) > 80 else sentence,
            "correct_answer_index": 0,
            "topic": "Document Content"
        }
        demo_questions.append(demo_question)
    
    logger.info(f"✅ Generated {len(demo_questions)} DEMO questions")
    return demo_questions

def generate_questions(context: str, num_questions: int = 5, question_types: List[str] = None) -> List[Dict]:
    """
    Generate test questions from context using DeepSeek
    Questions are strictly based on the provided PDF content
    Each call generates DIFFERENT questions using high randomness and varied prompts
    """
    # Validate API key before making request
    if not DEEPSEEK_API_KEY:
        logger.error("DEEPSEEK_API_KEY not configured - cannot generate questions")
        raise ValueError("DEEPSEEK_API_KEY is not configured")
    
    if question_types is None:
        question_types = ["multiple_choice", "short_answer"]
    
    # Ensure we have enough context
    if not context or len(context.strip()) < 100:
        raise ValueError("Insufficient content from PDF to generate questions")
    
    # Use random sampling to get different sections of context
    sentences = [s.strip() for s in context.split('.') if s.strip()]
    random.shuffle(sentences)
    sampled_context = '. '.join(sentences[:max(10, len(sentences)//2)]) + '.'
    
    # Vary the prompt instruction for diversity
    prompt_variations = [
        "challenging",
        "intermediate difficulty",
        "covering different angles",
        "with analytical thinking",
        "based on comprehensive understanding"
    ]
    variation = random.choice(prompt_variations)
    
    prompt = f"""You are generating {variation} exam questions strictly from the given PDF content.
Focus on testing different aspects and concepts.

Context:
<PDF_CHUNKS>
{sampled_context}
</PDF_CHUNKS>

CRITICAL REQUIREMENTS:
- Generate {num_questions} COMPLETELY UNIQUE MCQs
- Each question MUST test a different concept from the PDF
- NEVER repeat any previously generated questions
- Each question MUST have 4 COMPLETELY DIFFERENT options
- Options must be semantically distinct and not similar
- Make options plausible but clearly distinguish correct answer
- Clearly indicate which option is correct (use index 0-3)
- Return ONLY valid JSON (no extra text)
- ENSURE NO TWO QUESTIONS HAVE IDENTICAL OR SIMILAR OPTION SETS
- Shuffle options randomly for each question
- All four options must differ in meaning and content

RESPONSE FORMAT (STRICTLY):
{{
  "questions": [
    {{
      "id": "q1",
      "question": "Clear, specific question about PDF content",
      "options": ["Option A (completely different)", "Option B (different)", "Option C (different)", "Option D (different)"],
      "correct_answer": 0,
      "topic": "Specific topic from PDF"
    }}
  ]
}}

Generate NOW with maximum variety and ensure options are DISTINCT:"""
    
    try:
        # Add unique seed combining timestamp and random value for uniqueness
        unique_seed = f"\n\nUnique generation seed: {int(time.time() * 1000)}-{random.randint(10000, 99999)}"
        
        logger.info(f"🔄 Calling DeepSeek API to generate {num_questions} questions...")
        logger.info(f"📝 Context length: {len(context)} characters")
        logger.info(f"📄 Context preview: {context[:150]}...")
        
        # Use retry logic with backoff for quota errors
        text = _call_deepseek_with_retry(prompt + unique_seed, temperature=1.0, max_retries=3)
        
        logger.info(f"✅ DeepSeek API responded with {len(text)} characters")
        
        # Parse JSON from response
        import json
        import re
        
        logger.info(f"Raw response from DeepSeek:\n{text[:300]}...")  # Log first 300 chars for debugging
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        
        if not json_match:
            # Try to find array
            json_match = re.search(r'\[.*?\]', text, re.DOTALL)
            if json_match:
                logger.info("Found JSON array in response")
                questions = json.loads(json_match.group())
                if not isinstance(questions, list):
                    raise ValueError("Response is not a valid questions array")
            else:
                raise ValueError(f"No valid JSON found in DeepSeek response: {text[:200]}")
        else:
            json_str = json_match.group(1) if json_match.groups() else json_match.group()
            logger.info(f"Extracted JSON: {json_str[:200]}...")
            data = json.loads(json_str)
            if isinstance(data, dict):
                questions = data.get("questions", [])
                if not questions:
                    raise ValueError("No 'questions' key found in JSON response")
            elif isinstance(data, list):
                questions = data
            else:
                raise ValueError(f"Invalid JSON structure: {type(data)}")
        
        if not questions or len(questions) == 0:
            raise ValueError(f"❌ DeepSeek generated 0 questions. Raw response: {text[:200]}")
        
        logger.info(f"✅ Parsed {len(questions)} questions from DeepSeek response")
        
        # Validate and normalize questions
        normalized_questions = []
        for i, q in enumerate(questions):
            if not q.get('question'):
                raise ValueError(f"Question {i+1} has no question text")
            
            # Ensure correct_answer is an integer index
            if isinstance(q.get('correct_answer'), str):
                # Try to find index of correct answer in options
                options = q.get('options', [])
                correct_text = q.get('correct_answer', '')
                try:
                    correct_index = options.index(correct_text)
                except ValueError:
                    correct_index = 0  # Default to first option
            else:
                correct_index = int(q.get('correct_answer', 0))
            
            # Ensure we have exactly 4 options for MCQ
            options = q.get('options', [])
            if len(options) < 4:
                raise ValueError(f"Question {i+1} has only {len(options)} options, need exactly 4")
            
            options = options[:4]  # Take only first 4 if more provided
            
            # CRITICAL: Validate that all options are completely different
            # Check for exact duplicates
            if len(set(options)) != 4:
                duplicates = [opt for opt in options if options.count(opt) > 1]
                raise ValueError(f"Question {i+1} has duplicate options: {duplicates}")
            
            # Check for near-duplicates (similar wording)
            for idx, opt1 in enumerate(options):
                for opt2 in options[idx+1:]:
                    # Check if options are too similar (more than 70% overlap)
                    opt1_words = set(opt1.lower().split())
                    opt2_words = set(opt2.lower().split())
                    
                    if len(opt1_words) > 0 and len(opt2_words) > 0:
                        intersection = len(opt1_words & opt2_words)
                        overlap_ratio = intersection / min(len(opt1_words), len(opt2_words))
                        
                        if overlap_ratio > 0.7:  # More than 70% word overlap
                            logger.warning(f"⚠️ Q{i+1}: Options are too similar (overlap: {overlap_ratio:.1%})")
                            logger.warning(f"  Option A: {opt1[:50]}")
                            logger.warning(f"  Option B: {opt2[:50]}")
            
            # Shuffle options to ensure correct answer is not always at same position
            shuffled_indices = list(range(4))
            random.shuffle(shuffled_indices)
            
            # Get the correct answer index before shuffling
            if isinstance(q.get('correct_answer'), str):
                try:
                    original_correct_index = options.index(q.get('correct_answer'))
                except ValueError:
                    original_correct_index = 0
            else:
                original_correct_index = int(q.get('correct_answer', 0))
            
            # Shuffle and find where correct answer ended up
            shuffled_options = [options[j] for j in shuffled_indices]
            correct_index_after_shuffle = shuffled_indices.index(original_correct_index)
            
            normalized_q = {
                "question_type": "multiple_choice",
                "question": q.get('question', ''),
                "options": shuffled_options,  # Use shuffled options
                "correct_answer": shuffled_options[correct_index_after_shuffle],
                "correct_answer_index": correct_index_after_shuffle,
                "topic": q.get('topic', 'PDF Content')
            }
            
            normalized_questions.append(normalized_q)
            logger.info(f"✅ Q{i+1}: {q.get('question', '')[:50]}... | Options shuffled | Correct: {chr(65 + correct_index_after_shuffle)}")
        
        if len(normalized_questions) != num_questions:
            logger.warning(f"Expected {num_questions} questions, got {len(normalized_questions)}")
        
        logger.info(f"✅ Successfully generated {len(normalized_questions)} questions from PDF content")
        return normalized_questions
        
    except ValueError as e:
        error_str = str(e)
        logger.error(f"❌ Question generation error: {error_str}")
        
        # Handle insufficient balance error (402)
        if "DEEPSEEK_INSUFFICIENT_BALANCE" in error_str:
            logger.warning("⚠️ DeepSeek API: Insufficient balance. Activating DEMO MODE.")
            try:
                demo_qs = _generate_demo_questions(context, num_questions)
                logger.info("✅ Demo questions generated successfully")
                return demo_qs
            except Exception as demo_error:
                logger.error(f"Demo mode also failed: {demo_error}")
                raise ValueError("AI service temporarily unavailable. Please try again later.")
        
        # Handle authentication error
        if "DEEPSEEK_AUTH_FAILED" in error_str:
            raise ValueError("Invalid DeepSeek API key. Please contact administrator.")
        
        # Re-raise other validation errors
        raise ValueError(f"Question generation error: {error_str}")
        
    except Exception as e:
        # API or parsing errors
        error_str = str(e)
        logger.error(f"❌ DeepSeek API error: {error_str}")
        
        # Try demo mode as fallback for any API error
        try:
            logger.warning("⚠️ Falling back to DEMO MODE due to API error")
            demo_qs = _generate_demo_questions(context, num_questions)
            return demo_qs
        except Exception as demo_error:
            logger.error(f"Demo mode failed: {demo_error}")
            raise Exception("AI service temporarily unavailable. Please try again later.")

def generate_adaptive_questions(context: str, weak_topics: List[str], num_questions: int = 5) -> List[Dict]:
    """
    Generate questions focused on weak topics - strictly based on PDF content
    Each call generates DIFFERENT targeted questions using high randomness
    """
    # Validate API key
    if not DEEPSEEK_API_KEY:
        logger.error("DEEPSEEK_API_KEY not configured - cannot generate questions")
        raise ValueError("DEEPSEEK_API_KEY is not configured")
    
    topics_str = ", ".join(weak_topics)
    
    if not context or len(context.strip()) < 100:
        raise ValueError("Insufficient content from PDF to generate questions")
    
    # Use random sampling to get different context sections
    sentences = [s.strip() for s in context.split('.') if s.strip()]
    random.shuffle(sentences)
    sampled_context = '. '.join(sentences[:max(10, len(sentences)//2)]) + '.'
    
    # Vary question difficulty based on weak areas
    difficulty_level = random.choice(["challenging", "intermediate", "advanced", "detailed"])
    
    prompt = f"""You are generating {difficulty_level} exam questions to help master weak areas.
Focus ONLY on these specific topics: {topics_str}

Context (from PDF):
<PDF_CHUNKS>
{sampled_context}
</PDF_CHUNKS>

CRITICAL REQUIREMENTS:
- Generate {num_questions} COMPLETELY UNIQUE MCQs focused on weak topics
- Each question MUST target a DIFFERENT aspect of the weak topics
- Create questions that test DEEP UNDERSTANDING
- NEVER repeat previous questions
- Each option MUST be distinct and plausible
- Make correct answer not immediately obvious
- Return ONLY valid JSON

RESPONSE FORMAT (STRICTLY):
{{
  "questions": [
    {{
      "id": "q1",
      "question": "Specific question testing weak topic from PDF",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "topic": "Weak topic from: {topics_str}"
    }}
  ]
}}

Generate NOW with maximum variety focused on weak areas:"""
    
    try:
        # Add unique seed
        unique_seed = f"\n\nGeneration ID: {int(time.time() * 1000)}-{random.randint(10000, 99999)}"
        
        logger.info(f"🔄 Calling DeepSeek to generate adaptive questions for topics: {topics_str}")
        
        # Use retry logic with backoff for quota errors
        text = _call_deepseek_with_retry(prompt + unique_seed, temperature=1.0, max_retries=3)
        
        if not text:
            raise ValueError("DeepSeek API returned empty response for adaptive questions")
        
        # Parse JSON from response (same logic as generate_questions)
        import json
        import re
        
        logger.info(f"Adaptive questions response: {text[:300]}...")
        
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        
        if not json_match:
            json_match = re.search(r'\[.*?\]', text, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
            else:
                raise ValueError(f"No valid JSON found in adaptive questions response: {text[:200]}")
        else:
            json_str = json_match.group(1) if json_match.groups() else json_match.group()
            data = json.loads(json_str)
            if isinstance(data, dict):
                questions = data.get("questions", [])
                if not questions:
                    raise ValueError("No questions key in adaptive response")
            elif isinstance(data, list):
                questions = data
            else:
                raise ValueError(f"Invalid JSON structure in adaptive response: {type(data)}")
        
        if not questions or len(questions) == 0:
            raise ValueError(f"❌ DeepSeek generated 0 adaptive questions. Raw response: {text[:200]}")
        
        # Normalize questions (same as generate_questions)
        normalized_questions = []
        for i, q in enumerate(questions):
            if not q.get('question'):
                raise ValueError(f"Adaptive question {i+1} has no question text")
            
            if isinstance(q.get('correct_answer'), str):
                options = q.get('options', [])
                correct_text = q.get('correct_answer', '')
                try:
                    original_correct_index = options.index(correct_text)
                except ValueError:
                    original_correct_index = 0
            else:
                original_correct_index = int(q.get('correct_answer', 0))
            
            options = q.get('options', [])
            if len(options) < 4:
                raise ValueError(f"Adaptive question {i+1} has only {len(options)} options, need exactly 4")
            
            options = options[:4]
            
            # CRITICAL: Validate all options are different
            if len(set(options)) != 4:
                duplicates = [opt for opt in options if options.count(opt) > 1]
                raise ValueError(f"Adaptive question {i+1} has duplicate options: {duplicates}")
            
            # Check for near-duplicates (similar wording)
            for idx, opt1 in enumerate(options):
                for opt2 in options[idx+1:]:
                    opt1_words = set(opt1.lower().split())
                    opt2_words = set(opt2.lower().split())
                    
                    if len(opt1_words) > 0 and len(opt2_words) > 0:
                        intersection = len(opt1_words & opt2_words)
                        overlap_ratio = intersection / min(len(opt1_words), len(opt2_words))
                        
                        if overlap_ratio > 0.7:
                            logger.warning(f"⚠️ Adaptive Q{i+1}: Options are too similar (overlap: {overlap_ratio:.1%})")
            
            # Shuffle options for randomness
            shuffled_indices = list(range(4))
            random.shuffle(shuffled_indices)
            
            shuffled_options = [options[j] for j in shuffled_indices]
            correct_index_after_shuffle = shuffled_indices.index(original_correct_index)
            
            normalized_q = {
                "question_type": "multiple_choice",
                "question": q.get('question', ''),
                "options": shuffled_options,
                "correct_answer": shuffled_options[correct_index_after_shuffle],
                "correct_answer_index": correct_index_after_shuffle,
                "topic": q.get('topic', topics_str)
            }
            
            normalized_questions.append(normalized_q)
            logger.info(f"✅ Adaptive Q{i+1}: {q.get('question', '')[:50]}... | Options shuffled | Correct: {chr(65 + correct_index_after_shuffle)}")
        
        logger.info(f"✅ Generated {len(normalized_questions)} adaptive questions for weak topics")
        return normalized_questions
        
    except ValueError as e:
        error_msg = f"❌ Adaptive question generation error: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    except Exception as e:
        error_msg = f"❌ DeepSeek adaptive API error: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)

def generate_notes(context: str, weak_topics: List[str]) -> str:
    """
    Generate personalized, PDF-based study notes for weak topics.
    
    CRITICAL: Notes must be:
    - Based ONLY on the provided PDF context
    - Focused on weak topics identified from incorrect answers
    - Exam-oriented with definitions, key points, and examples
    - Comprehensive but concise for effective study
    
    NO generic content. NO external information.
    """
    if not weak_topics:
        raise ValueError("No weak topics provided for note generation")
    
    if not context or len(context.strip()) < 100:
        raise ValueError("Insufficient context for note generation. Could not retrieve relevant content.")
    
    topics_str = ", ".join(weak_topics)
    
    # Detailed prompt to generate REAL notes from PDF content
    prompt = f"""You are an expert study guide creator generating targeted revision notes from actual PDF content.

STUDENT'S WEAK AREAS (topics they answered incorrectly):
{topics_str}

DOCUMENT CONTENT (from PDF - everything you know about these topics):
{context}

STRICT REQUIREMENTS:
1. Create focused, exam-oriented study notes for ONLY the weak topics above
2. Base EVERYTHING on the provided PDF content
3. Do NOT add information outside the document
4. Do NOT create generic or placeholder content
5. Structure notes for easy understanding and memorization

INCLUDE IN NOTES:
- Key definitions from the PDF for each weak topic
- Important explanations and concepts
- Real examples from the document content
- Critical points to remember
- How topics relate to each other (if evident from PDF)
- Summary of essential facts for each topic

FORMATTING:
- Use clear sections for each topic
- Use bullet points for easy scanning
- Bold key terms
- Include page-relevant examples
- Make it study-guide quality

CRITICAL: Every statement must come from the PDF content provided above.
Do NOT include generic study tips.
Do NOT reference content not in the PDF.
Focus 100% on helping the student master these weak areas using PDF material.

Generate comprehensive, PDF-based study notes NOW:"""
    
    try:
        logger.info(f"🔄 Generating study notes for topics: {topics_str}")
        logger.info(f"📄 Context length: {len(context)} characters")
        
        # Use retry logic with backoff for DeepSeek API
        response = _call_deepseek_with_retry(prompt, temperature=0.7, max_retries=3)
        
        logger.info(f"✅ Study notes generated successfully ({len(response)} chars)")
        
        # Validate response quality
        if not response or len(response.strip()) < 150:
            logger.warning(f"Generated notes are too short: {len(response)} chars")
            raise ValueError("Generated notes are insufficient for study purposes")
        
        return response
        
    except ValueError as e:
        error_msg = str(e)
        logger.error(f"Error in note generation: {error_msg}")
        
        # Re-raise so calling code can handle it
        if "DEEPSEEK_INSUFFICIENT_BALANCE" in error_msg:
            raise ValueError("DEEPSEEK_INSUFFICIENT_BALANCE")
        elif "DEEPSEEK_AUTH_FAILED" in error_msg:
            raise ValueError("DEEPSEEK_AUTH_FAILED")
        elif "insufficient" in error_msg.lower():
            raise ValueError("Insufficient content to generate comprehensive notes")
        else:
            raise ValueError("AI service temporarily unavailable. Please try again later.")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Unexpected error in note generation: {error_msg}")
        raise ValueError("AI service temporarily unavailable. Please try again later.")

def evaluate_answer(question: Dict, user_answer: str, correct_answer: str) -> Dict:
    """
    Evaluate user's answer using Gemini for semantic understanding
    """
    prompt = f"""Evaluate if the student's answer is correct.

Question: {question.get('question', '')}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}

Determine if the student's answer is correct. For multiple-choice questions, exact match is required.
For short-answer questions, check if the student's answer demonstrates understanding of the concept.

Respond with JSON:
{{
    "is_correct": true/false,
    "score": 0.0 to 1.0,
    "feedback": "Brief feedback"
}}
"""
    
    try:
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=512,
        )
        
        import json
        import re
        
        text = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(text)
        
        return result
    except Exception as e:
        print(f"Error evaluating answer: {e}")
        # Fallback: simple string matching
        is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
        return {
            "is_correct": is_correct,
            "score": 1.0 if is_correct else 0.0,
            "feedback": "Correct" if is_correct else "Incorrect"
        }

def generate_report(attempt_history: List[Dict], document_title: str) -> str:
    """
    Generate detailed performance report
    """
    attempts_summary = "\n".join([
        f"Attempt {a['attempt_number']}: Score {a['score']}% ({a['correct_answers']}/{a['total_questions']})"
        for a in attempt_history
    ])
    
    prompt = f"""Generate a comprehensive performance report for a student.

Document: {document_title}

Attempt History:
{attempts_summary}

Create a detailed report that includes:
1. Overall Performance Summary
2. Progress Analysis (improvement over attempts)
3. Strengths and Weaknesses
4. Topics Mastered vs Topics Needing Improvement
5. Recommendations for Further Study
6. Final Assessment

Format the report professionally with clear sections and insights.
"""
    
    try:
        logger.info(f"🤖 Generating report for {document_title} with {len(attempt_history)} attempts...")
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024,
        )
        report_content = response.choices[0].message.content
        if report_content:
            logger.info(f"✅ Report generated successfully ({len(report_content)} chars)")
            return report_content
        else:
            logger.warning("Empty response from API, using fallback report")
            return f"Performance Report for {document_title}\n\n{attempts_summary}"
    except Exception as e:
        logger.warning(f"Error generating report via API: {e}, using fallback report")
        # Always return a report, even if API fails
        fallback_report = f"""Performance Report for {document_title}

ATTEMPT HISTORY:
{attempts_summary}

Your detailed performance analysis:
- Review your attempt scores above to track progress
- Identify weak topics from incorrect answers
- Focus on areas where you scored lower
- Practice reattempts to improve your understanding

For detailed AI-powered insights, please try again later when the service is available.
"""
        return fallback_report

def generate_fallback_notes(context: str, weak_topics: List[str]) -> str:
    """
    FALLBACK MODE: Generate study notes directly from PDF chunks when AI is unavailable.
    
    This ensures notes are ALWAYS generated, even if DeepSeek API is down or quota exceeded.
    Notes are created by extracting and organizing the provided PDF content.
    """
    logger.warning("⚠️ FALLBACK MODE: Generating study notes from PDF content (AI service unavailable)")
    
    try:
        if not weak_topics:
            return "No weak topics identified from your test attempt."
        
        if not context or len(context.strip()) < 100:
            return "Insufficient content available in document for note generation."
        
        topics_str = ", ".join(weak_topics)
        
        # Extract sentences that relate to weak topics
        sentences = [s.strip() for s in context.split('.') if s.strip() and len(s.strip()) > 20]
        
        # Build notes from PDF content with structure
        notes_parts = [
            f"📚 STUDY NOTES: Focus Areas - {topics_str}\n",
            "=" * 60,
            "\nThese notes are extracted from your document. Review carefully:\n"
        ]
        
        # Add key content from context, organized into topics
        topic_contents = {}
        
        for topic in weak_topics:
            # Find sentences that might relate to this topic
            related_sents = [
                s for s in sentences 
                if any(word in s.lower() for word in topic.lower().split())
            ]
            
            if related_sents:
                topic_contents[topic] = related_sents[:3]  # Take top 3 related sentences
        
        # Format notes
        for topic, sents in topic_contents.items():
            notes_parts.append(f"\n📌 {topic.upper()}")
            notes_parts.append("-" * 40)
            for sent in sents:
                notes_parts.append(f"• {sent}")
        
        # Add general notes from PDF if no specific topic matches
        if not topic_contents:
            notes_parts.append("\n📝 KEY CONTENT FROM DOCUMENT:")
            notes_parts.append("-" * 40)
            for sent in sentences[:8]:  # Take first 8 sentences
                notes_parts.append(f"• {sent}")
        
        notes = "\n".join(notes_parts)
        
        if len(notes.strip()) < 100:
            # If extraction didn't yield enough, return a structured version of context
            notes = f"📚 STUDY NOTES: Focus Areas - {topics_str}\n" + \
                   "=" * 60 + "\n" + \
                   "📝 KEY CONTENT FROM DOCUMENT:\n" + \
                   "-" * 40 + "\n" + \
                   context[:1000]  # Return first 1000 chars of context
        
        logger.info(f"✅ Fallback notes generated: {len(notes)} characters")
        return notes
        
    except Exception as e:
        logger.error(f"Error generating fallback notes: {e}")
        # Last resort - return the context itself
        return f"📚 STUDY NOTES: Focus Areas - {weak_topics}\n\n{context[:1500]}"


def generate_fallback_questions(context: str, weak_topics: List[str] = None, num_questions: int = 5) -> List[Dict]:
    """
    FALLBACK MODE: Generate questions directly from PDF chunks when AI is unavailable.
    
    Uses simple heuristics to create questions from document content.
    Questions will be similar across reattempts but system remains functional.
    """
    logger.warning("⚠️ FALLBACK MODE: Generating questions from PDF content (AI service unavailable)")
    
    try:
        if not context or len(context.strip()) < 100:
            raise ValueError("Insufficient content in PDF for question generation")
        
        # Extract sentences - these will become question basis
        sentences = [s.strip() for s in context.split('.') if s.strip() and len(s.strip()) > 30]
        
        if len(sentences) < num_questions:
            sentences = sentences * ((num_questions // len(sentences)) + 1)
        
        random.shuffle(sentences)
        selected_sentences = sentences[:num_questions]
        
        questions = []
        
        for idx, sentence in enumerate(selected_sentences, 1):
            # Create question from sentence
            words = sentence.split()
            
            # Simple keyword-based question (not ideal but functional)
            if len(words) > 5:
                key_phrase = " ".join(words[:5])
                question_text = f"Which statement best describes: '{key_phrase}...'?"
            else:
                question_text = f"What is the significance of: '{sentence[:40]}...'?"
            
            # Generate 4 plausible options
            # Option 0: The actual concept (paraphrased from sentence)
            option_0 = sentence[:80] if len(sentence) > 80 else sentence
            
            # Options 1-3: Slight variations (simulating wrong answers)
            option_1 = f"A related concept from the document: {' '.join(words[1:4]) if len(words) > 3 else 'different aspect'}"
            option_2 = f"An alternative interpretation: {' '.join(words[2:5]) if len(words) > 4 else 'broader view'}"
            option_3 = f"A contrasting idea: {' '.join(words[3:6]) if len(words) > 5 else 'different angle'}"
            
            options = [option_0, option_1, option_2, option_3]
            
            # Shuffle options but remember correct index
            shuffled_indices = list(range(4))
            random.shuffle(shuffled_indices)
            
            correct_index = shuffled_indices.index(0)  # Find where the correct answer ended up
            shuffled_options = [options[i] for i in shuffled_indices]
            
            # Determine topic (first few words of sentence)
            topic = " ".join(words[:3]) if len(words) >= 3 else "Main Topic"
            
            question_obj = {
                "id": f"q_{idx}",
                "question": question_text,
                "options": shuffled_options,
                "correct_answer": shuffled_options[correct_index],
                "correct_answer_index": correct_index,
                "question_type": "multiple_choice",
                "topic": topic,
                "source": "fallback_mode",
                "based_on": sentence[:50]
            }
            
            questions.append(question_obj)
            logger.info(f"✅ Fallback Q{idx}: {question_text[:60]}... | Topic: {topic}")
        
        logger.info(f"✅ Generated {len(questions)} fallback questions")
        return questions
        
    except Exception as e:
        logger.error(f"Error generating fallback questions: {e}")
        raise ValueError(f"Cannot generate questions even in fallback mode: {str(e)}")
