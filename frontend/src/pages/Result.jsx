import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ScoreBar from '../components/ScoreBar';
import ProgressDashboard from '../components/ProgressDashboard';
import { generateReport, reattemptTest, getAttempts } from '../api';
import { AlertCircle, BookOpen, CheckCircle2, Download, Home, RotateCw, TrendingUp } from 'lucide-react';

const logger = {
  info: (msg) => console.log('[INFO]', msg),
  error: (msg) => console.error('[ERROR]', msg)
};

function Result() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [allAttempts, setAllAttempts] = useState([]);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('testResult');
    const storedQuestions = sessionStorage.getItem('questions');
    const storedAnswers = sessionStorage.getItem('answers');

    if (storedResult) {
      const parsedResult = JSON.parse(storedResult);
      setResult(parsedResult);
      
      // Fetch all attempts if score is above 70
      if (parsedResult.score >= 70 && parsedResult.document_id) {
        fetchAllAttempts(parsedResult.document_id);
      }
    }
    if (storedQuestions) {
      setQuestions(JSON.parse(storedQuestions));
    }
    if (storedAnswers) {
      setAnswers(JSON.parse(storedAnswers));
    }
  }, []);

  const fetchAllAttempts = async (documentId) => {
    try {
      logger.info(`Fetching all attempts for document ${documentId}`);
      const attempts = await getAttempts(documentId);
      logger.info(`Retrieved ${attempts.length} attempts`);
      setAllAttempts(attempts);
    } catch (err) {
      logger.error(`Failed to fetch attempts: ${err.message}`);
    }
  };

  const handleViewNotes = () => {
    if (result && result.attempt_id) {
      navigate(`/notes/${result.attempt_id}`);
    }
  };

  const handleReattempt = async () => {
    if (!result || !result.document_id || !result.attempt_id) {
      alert('Unable to reattempt. Required data is missing.');
      return;
    }

    setLoading(true);
    try {
      logger.info('Starting reattempt test...');
      const reattemptResult = await reattemptTest(
        result.document_id,
        result.attempt_id
      );
      
      logger.info(`Generated ${reattemptResult.questions?.length || 0} new questions for reattempt`);
      
      sessionStorage.removeItem('testResult');
      sessionStorage.removeItem('questions');
      sessionStorage.removeItem('answers');
      
      if (reattemptResult.questions && reattemptResult.questions.length > 0) {
        sessionStorage.setItem('reattemptQuestions', JSON.stringify(reattemptResult.questions));
        sessionStorage.setItem('isReattempt', 'true');
        sessionStorage.setItem('documentId', result.document_id);
        logger.info('Navigating to reattempt test...');
        navigate(`/test/${result.document_id}`);
      } else {
        throw new Error('No questions generated for reattempt');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to generate reattempt test';
      alert(`Error: ${errorMsg}`);
      logger.error(`Reattempt failed: ${errorMsg}`);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!result || !result.attempt_id) return;

    setLoading(true);
    try {
      const reportData = await generateReport(result.attempt_id);
      navigate(`/report/${result.attempt_id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className={`min-h-screen py-12 px-4 ${theme.bg.gradient} transition-colors duration-300`}>
        <div className="max-w-2xl mx-auto">
          <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 border-2 ${theme.isDark ? 'border-yellow-700' : 'border-yellow-200'} transition-colors duration-300`}>
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle className={theme.isDark ? 'text-yellow-400' : 'text-yellow-600'} size={32} />
              <div>
                <h3 className={`text-xl font-bold ${theme.isDark ? 'text-yellow-300' : 'text-yellow-900'}`}>No Result Found</h3>
                <p className={`mt-2 ${theme.isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Please take a test first to see your results.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const passed = result.passed;
  const score = result.score || 0;

  return (
    <div className={`min-h-screen py-8 px-4 ${theme.bg.gradient} transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className={`rounded-2xl shadow-xl p-8 mb-8 border-l-4 ${
          passed 
            ? `border-green-600 ${theme.isDark ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`
            : `border-indigo-600 ${theme.bg.primary}`
        } transition-colors duration-300`}>
          <div className="flex items-center gap-4 mb-6">
            {passed ? (
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${theme.isDark ? 'bg-green-900/50' : 'bg-green-100'}`}>
                <CheckCircle2 className="text-green-600" size={40} />
              </div>
            ) : (
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${theme.isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                <TrendingUp className="text-indigo-600" size={40} />
              </div>
            )}
            <div>
              <h1 className={`text-4xl font-bold mb-2 ${passed ? 'text-green-900 dark:text-green-300' : theme.text.primary}`}>
                {passed ? 'Excellent Performance!' : 'Test Completed'}
              </h1>
              <p className={passed ? 'text-green-700 dark:text-green-400' : theme.text.secondary}>
                {passed 
                  ? 'You have mastered this content. Great job!'
                  : 'Review your results and focus on weak areas to improve.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Score Section */}
        <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 mb-8 border ${theme.border.light} transition-colors duration-300`}>
          <div className="mb-6">
            <p className={`${theme.text.secondary} text-lg font-medium mb-4`}>Your Score</p>
            <ScoreBar score={score} passed={passed} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className={`rounded-lg p-6 border ${theme.border.light} ${theme.isDark ? 'bg-blue-900/30' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
              <p className={`${theme.text.secondary} text-sm font-medium mb-2`}>Correct Answers</p>
              <p className="text-4xl font-bold text-blue-600 mb-1">
                {result.correct_answers}/{result.total_questions}
              </p>
              <p className={`text-sm ${theme.text.tertiary}`}>
                {Math.round((result.correct_answers / result.total_questions) * 100)}% success rate
              </p>
            </div>

            <div className={`rounded-lg p-6 border ${theme.border.light} ${theme.isDark ? 'bg-purple-900/30' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}>
              <p className={`${theme.text.secondary} text-sm font-medium mb-2`}>Attempt Number</p>
              <p className="text-4xl font-bold text-purple-600 mb-1">
                #{result.attempt_number}
              </p>
              <p className={`text-sm ${theme.text.tertiary}`}>
                {result.attempt_number === 1 ? 'First attempt' : 'Improvement attempt'}
              </p>
            </div>

            <div className={`rounded-lg p-6 border ${theme.border.light} ${theme.isDark ? 'bg-amber-900/30' : 'bg-gradient-to-br from-amber-50 to-orange-50'}`}>
              <p className={`${theme.text.secondary} text-sm font-medium mb-2`}>Score</p>
              <p className="text-4xl font-bold text-amber-600 mb-1">
                {score}%
              </p>
              <p className={`text-sm ${theme.text.tertiary}`}>
                {passed ? 'Passing score' : 'Keep improving'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Dashboard - Show when score >= 70 */}
        {passed && score >= 70 && (
          <ProgressDashboard result={result} allAttempts={allAttempts} />
        )}

        {/* Weak Topics */}
        {result.weak_topics && result.weak_topics.length > 0 && (
          <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 mb-8 border ${theme.border.light} transition-colors duration-300`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
                <span className="text-xl">⚠️</span>
              </div>
              <h2 className={`text-2xl font-bold ${theme.text.primary}`}>Areas to Improve</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.weak_topics.map((topic, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    theme.isDark 
                      ? 'bg-red-900/20 border-red-700' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className={`font-semibold ${theme.isDark ? 'text-red-300' : 'text-red-900'}`}>{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer Review */}
        <div className={`${theme.bg.primary} rounded-2xl shadow-xl p-8 mb-8 border ${theme.border.light} transition-colors duration-300`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
              <span className="text-xl">📋</span>
            </div>
            <h2 className={`text-2xl font-bold ${theme.text.primary}`}>Answer Review</h2>
          </div>

          <div className="space-y-3">
            {questions.map((question, index) => {
              const userAnswerIndex = answers[question.id];
              const userAnswer = question.options ? question.options[userAnswerIndex] : userAnswerIndex || 'Not answered';
              const isCorrect = question.correct_answer === userAnswer;
              
              return (
                <div
                  key={question.id}
                  className={`rounded-lg p-5 border-2 transition ${
                    isCorrect 
                      ? theme.isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200' 
                      : theme.isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`font-bold ${theme.text.primary}`}>
                        Question {index + 1}: {question.question}
                      </p>
                      {question.topic && (
                        <p className={`text-xs ${theme.text.tertiary} mt-1`}>Topic: {question.topic}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0 ml-4 ${
                      isCorrect
                        ? theme.isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-200 text-green-800'
                        : theme.isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-200 text-red-800'
                    }`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className={`font-semibold ${theme.text.primary}`}>Your answer:</span>
                      <span className={`ml-2 font-medium ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {userAnswer}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div className="text-sm">
                        <span className={`font-semibold ${theme.text.primary}`}>Correct answer:</span>
                        <span className="ml-2 font-medium text-green-700 dark:text-green-400">{question.correct_answer}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {!passed ? (
            <>
              <button
                onClick={handleViewNotes}
                disabled={loading}
                className={`py-4 px-6 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2 ${
                  loading
                    ? theme.isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                <BookOpen size={20} />
                View Study Notes
              </button>
              <button
                onClick={handleReattempt}
                disabled={loading}
                className={`py-4 px-6 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2 ${
                  loading
                    ? theme.isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                <RotateCw size={20} />
                Reattempt Test
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className={`py-4 px-6 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2 col-span-1 md:col-span-2 ${
                loading
                  ? theme.isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105'
              }`}
            >
              <Download size={20} />
              Generate Report
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            theme.isDark 
              ? 'bg-slate-700 border-2 border-slate-600 text-white hover:border-indigo-500 hover:bg-slate-600' 
              : 'bg-white border-2 border-gray-300 text-gray-900 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          <Home size={20} />
          Upload New Document
        </button>
      </div>
    </div>
  );
}

export default Result;
