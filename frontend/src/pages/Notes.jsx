import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateNotes, reattemptTest } from '../api';
import { AlertCircle, BookOpen, CheckCircle2, Download, Loader, RotateCw, Upload, ZapOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Logger object for debugging
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  debug: (msg) => console.debug(`[DEBUG] ${msg}`)
};

function Notes() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [focusAreas, setFocusAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reattemptLoading, setReattemptLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNotes();
  }, [attemptId]);

  const loadNotes = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      logger.info(`Loading notes for attempt ${attemptId}`);
      const result = await generateNotes(parseInt(attemptId));
      
      logger.info(`Notes loaded - Mode: ${result.mode}, AI available: ${result.ai_available}`);
      logger.info(`Focus areas: ${result.focus_areas?.length || 0}`);
      logger.debug(`Response: ${JSON.stringify(result).substring(0, 200)}...`);
      
      // Extract notes content from API response
      const notesContent = result.notes || '';
      const focusTopics = result.focus_areas || [];
      
      if (!notesContent || notesContent.length < 20) {
        logger.warn('Notes content is very short or empty');
        setNotes('No detailed notes could be generated. Please try again.');
        setError('Insufficient content to generate notes.');
      } else {
        setNotes(notesContent);
        
        // Show warning if in fallback mode
        if (!result.ai_available || result.mode === 'fallback') {
          logger.warn('Notes generated in FALLBACK MODE');
          setMessage('⚠️ ' + (result.message || 'Notes generated from PDF content (AI service unavailable)'));
        } else {
          setMessage(result.message || '✅ Study notes generated successfully');
        }
      }
      
      setFocusAreas(focusTopics);
      
    } catch (err) {
      let errorMessage = 'Failed to generate notes';
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      
      logger.error(`Failed to load notes - Status: ${status}, Detail: ${detail}`);
      
      // Handle specific errors with better messages
      if (status === 503 || detail?.includes('temporarily unavailable')) {
        errorMessage = '⚠️ AI service is temporarily unavailable. Please try again in a moment.';
      } else if (status === 402 || detail?.includes('insufficient balance')) {
        errorMessage = '⚠️ AI service quota exceeded. Please contact administrator.';
      } else if (status === 404) {
        errorMessage = '❌ Attempt or document not found. Please start a new test.';
      } else if (detail?.includes('configuration error')) {
        errorMessage = '⚠️ Server configuration error. Please contact administrator.';
      } else if (detail?.includes('insufficient') && detail?.includes('content')) {
        errorMessage = '⚠️ PDF does not contain sufficient information on your weak topics. Review the material manually.';
      } else {
        errorMessage = detail || errorMessage;
      }
      
      setError(errorMessage);
      logger.error(`Final error message: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNotes = () => {
    if (!notes) {
      setError('No notes available to download');
      return;
    }

    // Create a text file with the notes
    const element = document.createElement('a');
    const file = new Blob([notes], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `study-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    logger.info('Notes downloaded successfully');
  };

  const handleReattempt = async () => {
    logger.info('Reattempt button clicked');
    
    // Get test result from sessionStorage
    const testResultStr = sessionStorage.getItem('testResult');
    if (!testResultStr) {
      logger.warn('No testResult in sessionStorage');
      setError('Session lost. Please start a new test.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    
    const result = JSON.parse(testResultStr);
    logger.debug(`Test result from session: ${JSON.stringify(result).substring(0, 150)}...`);
    
    // Validate required fields
    if (!result.document_id || !result.attempt_id) {
      logger.error('Missing document_id or attempt_id in session');
      setError('Unable to reattempt - session information invalid. Please start a new test.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    
    setReattemptLoading(true);
    setError('');
    setMessage('Generating new questions for reattempt...');
    
    try {
      logger.info(`Calling reattemptTest API with document ${result.document_id}, attempt ${result.attempt_id}`);
      
      const reattemptResult = await reattemptTest(
        parseInt(result.document_id),
        result.attempt_id
      );
      
      logger.info(`Reattempt API response received - ${reattemptResult.total_questions} questions`);
      logger.debug(`Response: ${JSON.stringify(reattemptResult).substring(0, 200)}...`);
      
      // Validate response
      if (!reattemptResult.questions || reattemptResult.questions.length === 0) {
        throw new Error('No questions generated for reattempt');
      }
      
      // Store reattempt questions and flags in sessionStorage
      sessionStorage.setItem('reattemptQuestions', JSON.stringify(reattemptResult.questions));
      sessionStorage.setItem('isReattempt', 'true');
      sessionStorage.setItem('reattemptTopics', JSON.stringify(reattemptResult.focus_topics || []));
      sessionStorage.setItem('previousScore', reattemptResult.previous_score || result.score);
      
      logger.info(`Stored ${reattemptResult.questions.length} reattempt questions in session`);
      logger.info(`Navigating to /test/${result.document_id}`);
      
      setMessage(`✅ Generated ${reattemptResult.total_questions} new questions. Redirecting to test...`);
      
      // Redirect to test page
      setTimeout(() => {
        navigate(`/test/${result.document_id}`);
      }, 1000);
      
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to generate reattempt test';
      
      logger.error(`Reattempt error - Status: ${status}, Detail: ${detail}`);
      
      if (status === 503 || detail?.includes('temporarily unavailable')) {
        errorMsg = '⚠️ AI service temporarily unavailable. Please try again later.';
      } else if (status === 402 || detail?.includes('insufficient')) {
        errorMsg = '⚠️ AI service quota exceeded. Please try again later.';
      } else if (status === 404) {
        errorMsg = '❌ Attempt not found. Please start a new test.';
      } else {
        errorMsg = detail || err.message || errorMsg;
      }
      
      setError(errorMsg);
      logger.error(`Reattempt failed: ${errorMsg}`);
    } finally {
      setReattemptLoading(false);
    }
  };

  if (loading) {
    const theme = useTheme();
    return (
      <div className={`min-h-screen flex justify-center items-center ${theme.isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-blue-50'}`}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative w-20 h-20">
              <div className={`absolute inset-0 rounded-full border-4 ${theme.isDark ? 'border-slate-700' : 'border-indigo-200'}`}></div>
              <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin`}></div>
              <BookOpen className="absolute inset-0 m-auto text-indigo-600" size={40} />
            </div>
          </div>
          <h2 className={`text-2xl font-bold ${theme.text.primary} mb-2`}>Generating Study Notes</h2>
          <p className={`${theme.text.secondary} mb-4`}>Analyzing your weak areas and preparing study material...</p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const theme = useTheme();

  return (
    <div className={`min-h-screen ${theme.isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50'} py-8 px-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className={`${theme.isDark ? 'bg-slate-800 border-indigo-500' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8 border-l-4`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 ${theme.isDark ? 'bg-gradient-to-br from-indigo-900 to-blue-900' : 'bg-gradient-to-br from-indigo-100 to-blue-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <BookOpen className="text-indigo-600" size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                <span className={`text-sm font-semibold ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-wider`}>📚 Learning Materials</span>
              </div>
              <h1 className={`text-4xl font-bold ${theme.text.primary} mb-2`}>Personalized Study Notes</h1>
              <p className={`${theme.text.secondary} text-lg`}>
                Focus on your weak areas with curated study material based on your test performance
              </p>
            </div>
          </div>
        </div>

        {/* Focus Areas Section */}
        {focusAreas.length > 0 && (
          <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 ${theme.isDark ? 'bg-yellow-900' : 'bg-yellow-100'} rounded-lg flex items-center justify-center`}>
                <span className="text-xl">🎯</span>
              </div>
              <h2 className={`text-2xl font-bold ${theme.text.primary}`}>Areas to Focus On</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {focusAreas.map((topic, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 ${theme.isDark ? 'bg-yellow-900 bg-opacity-30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border-2 rounded-lg ${theme.isDark ? 'hover:border-yellow-600' : 'hover:border-yellow-400'} transition`}
                >
                  <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span className={`font-semibold ${theme.isDark ? 'text-yellow-300' : 'text-yellow-900'}`}>{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification Banners */}
        {message && (
          <div className={`rounded-xl p-5 mb-8 flex items-start gap-4 border-l-4 ${
            message.includes('⚠️')
              ? theme.isDark ? 'bg-yellow-900 bg-opacity-20 border-yellow-600' : 'bg-yellow-50 border-yellow-500'
              : theme.isDark ? 'bg-green-900 bg-opacity-20 border-green-600' : 'bg-green-50 border-green-500'
          }`}>
            {message.includes('⚠️') ? (
              <ZapOff className={`${theme.isDark ? 'text-yellow-500' : 'text-yellow-600'} flex-shrink-0 mt-1`} size={24} />
            ) : (
              <CheckCircle2 className={`${theme.isDark ? 'text-green-500' : 'text-green-600'} flex-shrink-0 mt-1`} size={24} />
            )}
            <p className={`font-semibold ${
              message.includes('⚠️')
                ? theme.isDark ? 'text-yellow-300' : 'text-yellow-900'
                : theme.isDark ? 'text-green-300' : 'text-green-900'
            }`}>
              {message.replace('⚠️ ', '').replace('✅ ', '')}
            </p>
          </div>
        )}

        {error && (
          <div className={`rounded-xl p-5 mb-8 flex items-start gap-4 border-l-4 ${theme.isDark ? 'bg-red-900 bg-opacity-20 border-red-600' : 'bg-red-50 border-red-500'}`}>
            <AlertCircle className={`${theme.isDark ? 'text-red-500' : 'text-red-600'} flex-shrink-0 mt-1`} size={24} />
            <p className={`font-semibold ${theme.isDark ? 'text-red-300' : 'text-red-900'}`}>{error}</p>
          </div>
        )}

        {/* Study Notes Section */}
        {!error && notes && (
          <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8 overflow-hidden`}>
            <div className="mb-6">
              <h2 className={`text-2xl font-bold ${theme.text.primary} mb-2`}>Study Material</h2>
              <p className={theme.text.secondary}>Review these concepts carefully before your reattempt</p>
            </div>
            <div className={`${theme.isDark ? 'bg-slate-700 bg-opacity-50 border-slate-600' : 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100'} rounded-xl p-8 border-2`}>
              <div className={`leading-relaxed whitespace-pre-wrap text-base font-medium space-y-4 ${theme.text.primary}`}>
                {notes.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className={`leading-8 ${theme.text.primary}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && !notes && (
          <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-12 mb-8 text-center`}>
            <div className="mb-4 flex justify-center">
              <div className={`w-16 h-16 ${theme.isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                <BookOpen className={`${theme.isDark ? 'text-slate-500' : 'text-gray-400'}`} size={32} />
              </div>
            </div>
            <p className={`text-xl ${theme.text.primary} font-semibold`}>
              No study notes could be generated for your weak areas.
            </p>
            <p className={`${theme.text.secondary} mt-2`}>Try reattempting the test or upload a new document.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleDownloadNotes}
            disabled={!notes || reattemptLoading || loading}
            className={`py-4 px-6 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2 ${
              !notes || reattemptLoading || loading
                ? `${theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-300 text-gray-600'} cursor-not-allowed`
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
            }`}
          >
            <Download size={20} />
            Download Notes
          </button>

          <button
            onClick={handleReattempt}
            disabled={reattemptLoading || loading}
            className={`py-4 px-6 rounded-xl font-bold text-lg transition-all transform flex items-center justify-center gap-2 ${
              reattemptLoading || loading
                ? `${theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-300 text-gray-600'} cursor-not-allowed`
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
            }`}
          >
            {reattemptLoading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Preparing Reattempt...
              </>
            ) : (
              <>
                <RotateCw size={20} />
                Reattempt Test
              </>
            )}
          </button>
          
          <button
            onClick={() => navigate('/')}
            className={`py-4 px-6 rounded-xl font-bold text-lg ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-900 hover:border-indigo-400 hover:bg-indigo-50'} border-2 transition-all flex items-center justify-center gap-2`}
          >
            <Upload size={20} />
            New Document
          </button>
        </div>

        {/* Tips Section */}
        <div className={`${theme.isDark ? 'bg-blue-900 bg-opacity-20 border-blue-700' : 'bg-blue-50 border-blue-200'} rounded-2xl p-8 border-2`}>
          <div className="flex gap-4">
            <div className="text-3xl flex-shrink-0">💡</div>
            <div>
              <h3 className={`font-bold ${theme.isDark ? 'text-blue-300' : 'text-blue-900'} mb-2`}>Pro Tips</h3>
              <ul className={`${theme.isDark ? 'text-blue-200' : 'text-blue-800'} space-y-2`}>
                <li className="flex items-start gap-2">
                  <span className={`font-bold mt-0.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Take notes while reading the study material above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`font-bold mt-0.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Focus on the areas highlighted in yellow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className={`font-bold mt-0.5 ${theme.isDark ? 'text-blue-400' : 'text-blue-600'}`}>•</span>
                  <span>Try to understand concepts before retaking the test</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notes;
