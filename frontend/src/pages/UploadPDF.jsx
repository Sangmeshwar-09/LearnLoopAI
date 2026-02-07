import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { uploadPDF } from '../api';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader, Cloud } from 'lucide-react';

function UploadPDF() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('⚠️ Please upload a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('⚠️ File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const selectedFile = e.dataTransfer.files[0];
    processFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('⚠️ Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await uploadPDF(file);
      navigate(`/test/${result.document_id}`);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload PDF';
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-12 ${theme.text.primary} transition-colors duration-300`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Cloud className="text-indigo-600" size={48} />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Upload Your Document
            </span>
          </h1>
          <p className={`text-xl ${theme.text.secondary}`}>
            Select a PDF and let LearnLoop AI generate intelligent tests
          </p>
        </div>

        {/* Upload Card */}
        <div className={`${theme.bg.primary} rounded-2xl shadow-xl overflow-hidden border ${theme.border.light} transition-colors duration-300`}>
          <div className="p-8 sm:p-12">
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
                dragActive
                  ? `border-indigo-600 ${theme.isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}`
                  : `border-${theme.isDark ? 'slate-600' : 'gray-300'} ${theme.isDark ? 'bg-slate-700/30' : 'bg-gray-50'} hover:border-indigo-400`
              }`}
            >
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf"
                onChange={handleFileChange}
              />

              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition transform ${
                    dragActive
                      ? 'bg-indigo-600 text-white scale-110'
                      : theme.isDark ? 'bg-slate-700 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {file ? (
                      <FileText size={32} />
                    ) : (
                      <Upload size={32} />
                    )}
                  </div>

                  <div className="text-center">
                    <p className={`text-lg font-semibold ${theme.text.primary}`}>
                      {file ? file.name : 'Drag & drop your PDF'}
                    </p>
                    <p className={`text-sm ${theme.text.secondary} mt-1`}>
                      or click to browse
                    </p>
                  </div>

                  <p className={`text-xs ${theme.text.tertiary}`}>
                    PDF files up to 10MB • Educational content recommended
                  </p>
                </div>
              </label>
            </div>

            {/* File Info */}
            {file && (
              <div className={`mt-6 border rounded-lg p-4 flex items-center gap-3 ${
                theme.isDark 
                  ? 'bg-emerald-900/30 border-emerald-700' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <CheckCircle2 className={theme.isDark ? 'text-emerald-400' : 'text-green-600'} size={24} />
                <div>
                  <p className={`font-semibold ${theme.isDark ? 'text-emerald-300' : 'text-green-900'}`}>{file.name}</p>
                  <p className={`text-sm ${theme.isDark ? 'text-emerald-400' : 'text-green-700'}`}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={`mt-6 border rounded-lg p-4 flex items-start gap-3 ${
                theme.isDark 
                  ? 'bg-red-900/30 border-red-700' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <AlertCircle className={`flex-shrink-0 mt-0.5 ${theme.isDark ? 'text-red-400' : 'text-red-600'}`} size={24} />
                <p className={theme.isDark ? 'text-red-300' : 'text-red-900'}>{error}</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full mt-8 py-4 px-6 rounded-lg font-semibold text-lg transition transform flex items-center justify-center gap-2 ${
                loading || !file
                  ? theme.isDark ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Processing PDF...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Generate Test
                </>
              )}
            </button>

            {/* Info Sections */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { num: '1', title: 'Upload', desc: 'Select your PDF document', icon: '📄' },
                { num: '2', title: 'Analyze', desc: 'AI generates smart questions', icon: '🧠' },
                { num: '3', title: 'Learn', desc: 'Get personalized feedback', icon: '🚀' }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className={`w-10 h-10 ${theme.isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-600'} rounded-lg flex items-center justify-center mx-auto mb-3 font-bold`}>
                    {item.num}
                  </div>
                  <h3 className={`font-semibold ${theme.text.primary} mb-2`}>{item.title}</h3>
                  <p className={`text-sm ${theme.text.secondary}`}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className={`mt-12 rounded-xl p-8 border ${theme.border.light} ${
          theme.isDark 
            ? 'bg-gradient-to-r from-slate-700 to-slate-600' 
            : 'bg-gradient-to-r from-indigo-50 to-blue-50'
        } transition-colors duration-300`}>
          <h3 className={`text-lg font-semibold ${theme.text.primary} mb-4`}>Why Upload Here?</h3>
          <ul className="space-y-3">
            {[
              'AI-powered test generation from any PDF',
              'Automatic weak topic identification',
              'Personalized study notes generation',
              'Unlimited reattempts with new questions'
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span className={theme.text.secondary}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UploadPDF;
