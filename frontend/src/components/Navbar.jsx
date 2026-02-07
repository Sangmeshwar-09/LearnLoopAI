import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Menu, X, Moon, Sun } from 'lucide-react';

function Navbar() {
  const location = useLocation();
  const theme = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path 
      ? `${theme.text.accent} font-semibold` 
      : `${theme.text.secondary} hover:${theme.text.accent}`;
  };

  return (
    <nav className={`${theme.bg.primary} shadow-lg sticky top-0 z-50 transition-colors duration-300 border-b ${theme.border.light}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition transform group-hover:scale-110">
              <span className="text-white font-bold text-xl">🎓</span>
            </div>
            <div>
              <span className={`text-xl font-bold ${theme.text.primary} transition`}>LearnLoop AI</span>
              <p className={`text-xs ${theme.text.tertiary}`}>Adaptive Learning</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex gap-8 items-center">
            <Link to="/" className={`transition text-sm font-medium ${isActive('/')}`}>
              Home
            </Link>
            <Link to="/upload" className={`transition text-sm font-medium ${isActive('/upload')}`}>
              Upload
            </Link>
            <a href="#features" className={`transition text-sm font-medium ${theme.text.secondary} hover:${theme.text.accent}`}>
              Features
            </a>
          </div>

          {/* Right Side - Theme Toggle & CTA */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={theme.toggleTheme}
              className={`p-2 rounded-lg transition transform hover:scale-110 ${
                theme.isDark 
                  ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' 
                  : 'bg-slate-100 text-orange-500 hover:bg-slate-200'
              }`}
              aria-label="Toggle theme"
              title={theme.isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {theme.isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* CTA Button */}
            <Link 
              to="/upload"
              className="hidden sm:block bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition transform hover:scale-105 text-sm font-medium"
            >
              Get Started
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden pb-4 ${theme.bg.secondary} border-t ${theme.border.light}`}>
            <Link to="/" className={`block px-4 py-2 ${theme.text.secondary} hover:${theme.text.accent} transition`}>
              Home
            </Link>
            <Link to="/upload" className={`block px-4 py-2 ${theme.text.secondary} hover:${theme.text.accent} transition`}>
              Upload
            </Link>
            <a href="#features" className={`block px-4 py-2 ${theme.text.secondary} hover:${theme.text.accent} transition`}>
              Features
            </a>
            <Link 
              to="/upload"
              className="block mx-4 mt-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-lg text-center font-medium"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
