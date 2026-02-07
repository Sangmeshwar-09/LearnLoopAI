import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { generateTest, submitTest } from '../api';
import QuestionCard from '../components/QuestionCard';
import { AlertCircle, CheckCircle2, Loader, ZapOff } from 'lucide-react';

// Logger object for debugging
const logger = {
  info: (msg) => console.log(`[TEST] ${msg}`),
  error: (msg) => console.error(`[TEST ERROR] ${msg}`),
  warn: (msg) => console.warn(`[TEST WARN] ${msg}`),
  debug: (msg) => console.debug(`[TEST DEBUG] ${msg}`)
};

function Test() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isReattempt, setIsReattempt] = useState(false);
  const [reattemptTopics, setReattemptTopics] = useState([]);

  useEffect(() => {
    // Check if this is a reattempt
    const isReattemptFlag = sessionStorage.getItem('isReattempt') === 'true';
    const reattemptQuestions = sessionStorage.getItem('reattemptQuestions');
    const reattemptTopicsStr = sessionStorage.getItem('reattemptTopics');
    
    if (isReattemptFlag && reattemptQuestions) {
      logger.info('Loading reattempt test');
      
      // Load reattempt questions
      try {
        const questions = JSON.parse(reattemptQuestions);
        setQuestions(questions);
        setAnswers({}); // CRITICAL: Reset all answers for reattempt
        setIsReattempt(true);
        
        if (reattemptTopicsStr) {
          setReattemptTopics(JSON.parse(reattemptTopicsStr));
        }
        
        logger.info(`Loaded ${questions.length} reattempt questions, answers cleared`);
        
        // Clean up session storage
        sessionStorage.removeItem('isReattempt');
        sessionStorage.removeItem('reattemptQuestions');
        sessionStorage.removeItem('reattemptTopics');
        
      } catch (err) {
        logger.error(`Failed to parse reattempt data: ${err.message}`);
        setError('Failed to load reattempt questions. Starting fresh test.');
        loadTest();
      } finally {
        setLoading(false);
      }
    } else {
      logger.info('Loading initial test');
      loadTest();
    }
  }, [documentId]);

  const loadTest = async () => {
    setLoading(true);
    setError('');
    setIsReattempt(false);
    
    try {
      logger.info(`Generating test for document ${documentId}`);
      const result = await generateTest(parseInt(documentId));
      
      setQuestions(result.questions || []);
      setAnswers({}); // Start with no answers
      
      logger.info(`Generated ${result.questions?.length || 0} questions`);
      logger.info(`AI available: ${result.ai_available}, Mode: ${result.mode}`);
      
      // Show notification if in fallback mode
      if (!result.ai_available || result.mode === 'fallback') {
        logger.warn('Fallback mode active - generating from PDF content');
        setError('⚠️ ' + (result.message || 'Questions generated from PDF content (AI service unavailable)'));
      }
    } catch (err) {
      let errorMessage = 'Failed to generate test';
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      logger.error(`Test generation failed - Status: ${status}, Detail: ${detail}`);
      
      // Handle specific error cases
      if (status === 503 || detail?.includes('temporarily unavailable')) {
        errorMessage = '⚠️ AI service is temporarily unavailable. Please try again in a few moments.';
      } else if (status === 402 || detail?.includes('insufficient balance') || detail?.includes('402')) {
        errorMessage = '⚠️ AI service quota exceeded. Please try again later.';
      } else if (detail?.includes('configuration error') || detail?.includes('not properly configured')) {
        errorMessage = '⚠️ Server configuration error. Please contact administrator.';
      } else if (detail?.includes('API key')) {
        errorMessage = '⚠️ API authentication failed. Please contact administrator.';
      } else if (status === 500) {
        errorMessage = detail || 'Server error. Please try again later.';
      } else {
        errorMessage = detail || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    // Use functional update to ensure state consistency
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    // Note: answer can be 0 (valid index), so check for undefined/null specifically
    const unanswered = questions.filter(q => answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '');
    if (unanswered.length > 0) {
      setError(`Please answer all questions. ${unanswered.length} remaining.`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      logger.info(`Submitting test with ${questions.length} answers`);
      
      // Prepare answers for submission
      const answerSubmissions = questions.map(q => {
        const userAnswerIndex = answers[q.id];
        // Get the actual option text from the index
        let userAnswerText = '';
        if (q.question_type === 'multiple_choice' && q.options) {
          userAnswerText = q.options[userAnswerIndex] || '';
        } else {
          userAnswerText = userAnswerIndex || '';
        }
        
        return {
          question_id: q.id,
          question_text: q.question,
          user_answer: userAnswerText,
          correct_answer: q.correct_answer,
          question_type: q.question_type,
          topic: q.topic || 'General',
        };
      });

      logger.debug(`Answer submissions prepared: ${answerSubmissions.length} answers`);

      const result = await submitTest(parseInt(documentId), questions, answerSubmissions);
      
      logger.info(`Test submitted - Score: ${result.score}%, Weak topics: ${result.weak_topics?.length || 0}`);
      
      // Store result in sessionStorage for Result page
      sessionStorage.setItem('testResult', JSON.stringify(result));
      sessionStorage.setItem('questions', JSON.stringify(questions));
      sessionStorage.setItem('answers', JSON.stringify(answers));
      
      logger.info('Navigating to result page');
      navigate('/result');
      
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to submit test';
      logger.error(`Submission failed: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${theme.bg.gradient} transition-colors duration-300`}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative w-20 h-20">
              <div className={`absolute inset-0 rounded-full border-4 ${theme.isDark ? 'border-slate-700' : 'border-indigo-200'}`}></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
              <Loader className="absolute inset-0 m-auto text-indigo-600" size={40} />
            </div>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${theme.text.primary}`}>
            {isReattempt ? 'Loading Your Reattempt' : 'Generating Test Questions'}
          </h2>
          <p className={`${theme.text.secondary} mb-4`}>This may take a moment...</p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className={`min-h-screen py-12 ${theme.bg.gradient} transition-colors duration-300`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 border-2 ${theme.isDark ? 'border-red-700' : 'border-red-200'} transition-colors duration-300`}>
            <div className="flex items-start gap-4">
              <AlertCircle className={theme.isDark ? 'text-red-400' : 'text-red-600'} size={32} />
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${theme.isDark ? 'text-red-300' : 'text-red-900'}`}>Failed to Load Test</h3>
                <p className={theme.isDark ? 'text-red-400' : 'text-red-700'} p-margin-bottom-6>
                  {error}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition transform hover:scale-105"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 ${theme.bg.gradient} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 mb-8 border-l-4 border-indigo-600 transition-colors duration-300`}>
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                  {isReattempt ? '🔄 Adaptive Review' : '📝 Knowledge Assessment'}
                </span>
              </div>
              <h1 className={`text-4xl font-bold mb-2 ${theme.text.primary}`}>
                {isReattempt ? 'Focused Review Test' : 'Test Your Knowledge'}
              </h1>
              <p className={`text-lg ${theme.text.secondary}`}>
                {isReattempt 
                  ? reattemptTopics.length > 0
                    ? `Strengthening weak areas: ${reattemptTopics.join(', ')}`
                    : 'Practice your weak topics with adaptive questions'
                  : 'Complete the test to identify learning gaps'
                }
              </p>
            </div>
            <div className={`rounded-xl p-6 text-center min-w-fit ${
              theme.isDark 
                ? 'bg-indigo-900/30 border border-indigo-700' 
                : 'bg-gradient-to-br from-indigo-100 to-blue-100'
            }`}>
              <p className="text-4xl font-bold text-indigo-600">{questions.length}</p>
              <p className={`text-sm font-medium mt-1 ${theme.text.secondary}`}>Questions</p>
            </div>
          </div>
        </div>

        {/* Notification Banners */}
        {error && (
          <div className={`rounded-xl p-5 mb-8 flex items-start gap-4 border-l-4 transition-colors duration-300 ${
            error.includes('⚠️')
              ? theme.isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-500'
              : theme.isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-500'
          }`}>
            {error.includes('⚠️') ? (
              <ZapOff className={`flex-shrink-0 mt-1 ${theme.isDark ? 'text-yellow-400' : 'text-yellow-600'}`} size={24} />
            ) : (
              <CheckCircle2 className={`flex-shrink-0 mt-1 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
            )}
            <div>
              <p className={`font-semibold ${
                error.includes('⚠️')
                  ? theme.isDark ? 'text-yellow-300' : 'text-yellow-900'
                  : theme.isDark ? 'text-blue-300' : 'text-blue-900'
              }`}>
                  ? 'text-yellow-900'
                  : 'text-blue-900'
              }`}>
                {error.includes('⚠️') ? 'Fallback Mode Active' : 'Notice'}
              </p>
              <p className={`text-sm mt-1 ${
                error.includes('⚠️')
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}>{error.replace('⚠️ ', '').replace('ℹ️ ', '')}</p>
            </div>
          </div>
        )}

        {/* Questions Section */}
        <div className="space-y-4 mb-32">
          {questions.map((question, index) => {
            const isUnanswered = answers[question.id] === undefined || answers[question.id] === null || answers[question.id] === '';
            return (
              <div 
                key={question.id}
                className={`transition-all duration-200 transform ${
                  isUnanswered 
                    ? 'ring-2 ring-yellow-300 shadow-lg scale-102' 
                    : 'hover:shadow-lg'
                } rounded-xl overflow-hidden`}
              >
                <div className={`${isUnanswered ? 'bg-yellow-50' : 'bg-white'} rounded-xl`}>
                  {/* Question Number Badge */}
                  <div className="flex items-start gap-4 p-6 border-b border-gray-100">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                        isUnanswered
                          ? 'bg-yellow-500'
                          : 'bg-gradient-to-br from-indigo-600 to-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 break-words">{question.question}</p>
                      {question.topic && (
                        <span className="inline-block mt-2 text-xs font-medium px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                          {question.topic}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="p-6 space-y-3">
                    {question.options && question.options.map((option, optionIndex) => {
                      const isSelected = answers[question.id] === optionIndex;
                      return (
                        <label 
                          key={optionIndex}
                          className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={optionIndex}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(question.id, optionIndex)}
                            className="w-5 h-5 text-indigo-600 cursor-pointer"
                          />
                          <span className={`ml-4 font-medium text-gray-900 select-none ${isSelected ? 'text-indigo-900' : ''}`}>
                            {String.fromCharCode(65 + optionIndex)}) {option}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="ml-auto text-indigo-600" size={20} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Footer with Progress */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 shadow-2xl">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-indigo-600">
                    {Object.keys(answers).length} / {questions.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 h-2.5 transition-all duration-300"
                    style={{ 
                      width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length * 100) : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || questions.some(q => answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '')}
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all transform flex items-center justify-center gap-2 ${
                  submitting || questions.some(q => answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '')
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Submitting Test...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Submit Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Test;
