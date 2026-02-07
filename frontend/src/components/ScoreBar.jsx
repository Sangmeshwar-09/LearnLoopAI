import React from 'react';
import { useTheme } from '../context/ThemeContext';

function ScoreBar({ score, passed }) {
  const theme = useTheme();
  const percentage = Math.round(score);
  const colorClass = passed ? 'bg-green-500' : 'bg-red-500';
  const textColor = passed ? 'text-green-600' : 'text-red-600';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-4xl font-bold ${textColor}`}>
          {percentage}%
        </span>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            passed
              ? theme.isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
              : theme.isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
          }`}
        >
          {passed ? 'Passed ✓' : 'Failed ✗'}
        </span>
      </div>
      <div className={`w-full rounded-full h-4 ${theme.isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div
          className={`${colorClass} h-4 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <p className={`text-sm ${theme.text.secondary} mt-2`}>
        Minimum threshold: 70%
      </p>
    </div>
  );
}

export default ScoreBar;
