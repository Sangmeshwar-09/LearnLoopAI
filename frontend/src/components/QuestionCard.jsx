import React from 'react';
import { useTheme } from '../context/ThemeContext';

function QuestionCard({ question, index, answer, onAnswerChange }) {
  const theme = useTheme();
  const isMultipleChoice = question.question_type === 'multiple_choice';
  
  // Handle answer change - ensure we pass both questionId and answer value
  const handleRadioChange = (optionIndex) => {
    if (onAnswerChange) {
      onAnswerChange(question.id, optionIndex);
    }
  };

  return (
    <div className={`${theme.isDark ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-md p-6`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className={`text-lg font-semibold ${theme.text.primary}`}>
          Question {index}
        </h3>
        {question.topic && (
          <span className={`${theme.isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded text-xs font-medium`}>
            {question.topic}
          </span>
        )}
      </div>

      <p className={`${theme.text.primary} mb-4`}>{question.question}</p>

      {isMultipleChoice ? (
        <div className="space-y-2">
          {question.options && question.options.map((option, optIndex) => {
            // Use option index as value for consistent state management
            const optionIndex = optIndex;
            // answer is expected to be the index (integer)
            const isSelected = answer === optionIndex;
            
            return (
              <label
                key={optIndex}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? theme.isDark ? 'bg-indigo-900 bg-opacity-40 border-indigo-500' : 'bg-indigo-50 border-indigo-500'
                    : theme.isDark ? 'bg-slate-700 border-slate-600 hover:border-indigo-500' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={optionIndex}
                  checked={isSelected}
                  onChange={() => handleRadioChange(optionIndex)}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={theme.text.primary}>{option}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer here..."
          className={`w-full px-4 py-2 border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white focus:ring-indigo-500 focus:border-indigo-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-transparent'} rounded-md focus:outline-none focus:ring-2 resize-none`}
          rows={4}
        />
      )}
    </div>
  );
}

export default QuestionCard;
