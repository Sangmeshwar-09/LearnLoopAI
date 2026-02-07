import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update document class for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const theme = {
    isDark,
    toggleTheme,
    // Color palette
    bg: {
      primary: isDark ? 'bg-slate-900' : 'bg-white',
      secondary: isDark ? 'bg-slate-800' : 'bg-slate-50',
      tertiary: isDark ? 'bg-slate-700' : 'bg-slate-100',
      gradient: isDark 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    },
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
      accent: 'text-indigo-600'
    },
    border: {
      light: isDark ? 'border-slate-700' : 'border-gray-200',
      medium: isDark ? 'border-slate-600' : 'border-gray-300'
    },
    card: {
      bg: isDark ? 'bg-slate-800' : 'bg-white',
      border: isDark ? 'border-slate-700' : 'border-gray-200'
    },
    input: {
      bg: isDark ? 'bg-slate-700' : 'bg-white',
      text: isDark ? 'text-white' : 'text-gray-900',
      border: isDark ? 'border-slate-600' : 'border-gray-300'
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
