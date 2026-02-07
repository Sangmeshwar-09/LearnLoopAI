import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import UploadPDF from './pages/UploadPDF';
import Test from './pages/Test';
import Notes from './pages/Notes';
import Result from './pages/Result';
import Report from './pages/Report';

function AppContent() {
  const theme = useTheme();
  
  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-300 ${theme.bg.gradient}`}>
        <Navbar />
        
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/upload" element={<UploadPDF />} />
            <Route path="/test/:documentId" element={<Test />} />
            <Route path="/notes/:attemptId" element={<Notes />} />
            <Route path="/result" element={<Result />} />
            <Route path="/report/:attemptId" element={<Report />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className={`${theme.bg.primary} ${theme.text.secondary} text-center py-8 mt-20 border-t ${theme.border.light} transition-colors duration-300`}>
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-sm mb-2">© 2026 LearnLoop AI – Adaptive Learning Platform</p>
            <p className={`text-xs ${theme.text.tertiary}`}>Empowering learners with AI-powered adaptive education</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
