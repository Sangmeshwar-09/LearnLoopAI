import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateReport } from '../api';
import { AlertCircle, Download, FileText, Home, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function Report() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [attemptId]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateReport(parseInt(attemptId));
      setReport(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (report && report.pdf_url) {
      window.open(`http://localhost:8000${report.pdf_url}`, '_blank');
    } else {
      alert('PDF is not available. The report has been generated as text.');
    }
  };

  const theme = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-blue-50'} flex justify-center items-center`}>
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full border-4 ${theme.isDark ? 'border-slate-700' : 'border-indigo-200'}`}></div>
            <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin`}></div>
            <Loader className="absolute inset-0 m-auto text-indigo-600" size={40} />
          </div>
          <h2 className={`text-2xl font-bold ${theme.text.primary} mb-2`}>Generating Report</h2>
          <p className={theme.text.secondary}>Compiling your comprehensive performance analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme.isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-blue-50'} py-12 px-4`}>
        <div className="max-w-2xl mx-auto">
          <div className={`${theme.isDark ? 'bg-slate-800 border-red-800' : 'bg-white border-red-200'} rounded-2xl shadow-xl p-8 border-2`}>
            <div className="flex items-start gap-4 mb-6">
              <AlertCircle className={`${theme.isDark ? 'text-red-500' : 'text-red-600'} flex-shrink-0 mt-1`} size={32} />
              <div>
                <h3 className={`text-xl font-bold ${theme.isDark ? 'text-red-300' : 'text-red-900'}`}>Report Error</h3>
                <p className={`${theme.isDark ? 'text-red-200' : 'text-red-700'} mt-2`}>{error}</p>
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

  return (
    <div className={`min-h-screen ${theme.isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50'} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={`${theme.isDark ? 'bg-slate-800 border-indigo-500' : 'bg-white border-indigo-600'} rounded-2xl shadow-xl p-8 mb-8 border-l-4`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 ${theme.isDark ? 'bg-gradient-to-br from-green-900 to-emerald-900' : 'bg-gradient-to-br from-green-100 to-emerald-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <FileText className="text-green-600" size={32} />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${theme.text.primary} mb-2`}>Performance Report</h1>
                <p className={theme.text.secondary}>
                  Comprehensive analysis of your learning progress and achievements
                </p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={!report.pdf_available}
              className={`flex-shrink-0 ${
                report.pdf_available 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg'
                  : theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-400 cursor-not-allowed text-gray-600'
              } text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 flex items-center gap-2`}
            >
              <Download size={20} />
              {report.pdf_available ? 'Download PDF' : 'PDF Generating...'}
            </button>
          </div>
        </div>

        {/* Document Info */}
        {report && (
          <>
            <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-6 mb-8`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${theme.isDark ? 'bg-indigo-900 bg-opacity-40' : 'bg-indigo-100'} rounded-lg flex items-center justify-center`}>
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'} font-medium`}>DOCUMENT ANALYZED</p>
                  <p className={`text-xl font-bold ${theme.text.primary}`}>{report.document_title}</p>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8`}>
              <h2 className={`text-2xl font-bold ${theme.text.primary} mb-6`}>Report Summary</h2>
              <div className={`${theme.isDark ? 'bg-slate-700 bg-opacity-50 border-slate-600' : 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100'} rounded-xl p-8 border-2`}>
                <div className={`leading-relaxed space-y-4 font-medium ${theme.text.primary}`}>
                  {report.report_content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-base leading-8">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleDownload}
                disabled={!report.pdf_available}
                className={`py-4 px-6 rounded-xl font-bold text-lg ${
                  report.pdf_available
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl transition transform hover:scale-105'
                    : `${theme.isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-300 text-gray-500'} cursor-not-allowed`
                } flex items-center justify-center gap-2`}
              >
                <Download size={20} />
                {report.pdf_available ? 'Download Report as PDF' : 'PDF Not Available'}
              </button>
              <button
                onClick={() => navigate('/')}
                className={`py-4 px-6 rounded-xl font-bold text-lg ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-900 hover:border-indigo-400 hover:bg-indigo-50'} border-2 transition-all flex items-center justify-center gap-2`}
              >
                <Home size={20} />
                Upload New Document
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Report;
