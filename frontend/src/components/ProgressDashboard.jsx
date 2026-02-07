import React, { useRef } from 'react';
import { Download, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function ProgressDashboard({ result, allAttempts = [] }) {
  const dashboardRef = useRef(null);

  // Calculate progress data
  const calculateProgressData = () => {
    if (!allAttempts || allAttempts.length === 0) {
      return {
        attempts: [result],
        scoreProgression: [result.score],
        avgScore: result.score,
        maxScore: result.score,
        minScore: result.score,
        totalAttempts: 1,
        improvement: 0,
      };
    }

    const attempts = [...allAttempts, result].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    const scoreProgression = attempts.map(a => a.score);
    const avgScore = Math.round(scoreProgression.reduce((a, b) => a + b, 0) / scoreProgression.length);
    const maxScore = Math.max(...scoreProgression);
    const minScore = Math.min(...scoreProgression);
    const improvement = scoreProgression.length > 1 
      ? scoreProgression[scoreProgression.length - 1] - scoreProgression[0]
      : 0;

    return {
      attempts,
      scoreProgression,
      avgScore,
      maxScore,
      minScore,
      totalAttempts: attempts.length,
      improvement,
    };
  };

  const progressData = calculateProgressData();

  // Create bar graph SVG
  const createBarGraph = () => {
    const width = 600;
    const height = 300;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    const barSpacing = graphWidth / Math.max(progressData.scoreProgression.length, 1);
    const maxScoreValue = 100;

    let bars = '';
    let labels = '';

    progressData.scoreProgression.forEach((score, index) => {
      const x = padding + index * barSpacing + barSpacing / 4;
      const barHeight = (score / maxScoreValue) * graphHeight;
      const y = padding + graphHeight - barHeight;

      const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

      bars += `
        <rect x="${x}" y="${y}" width="${barSpacing / 2}" height="${barHeight}" 
              fill="${color}" rx="4"/>
        <text x="${x + barSpacing / 4}" y="${padding + graphHeight + 20}" 
              text-anchor="middle" font-size="12" fill="#374151">
          Attempt ${index + 1}
        </text>
        <text x="${x + barSpacing / 4}" y="${y - 5}" 
              text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">
          ${score}%
        </text>
      `;
    });

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const yValue = (i * 20);
      const yPos = padding + graphHeight - (yValue / 100) * graphHeight;
      labels += `
        <line x1="${padding - 5}" y1="${yPos}" x2="${padding}" y2="${yPos}" 
              stroke="#d1d5db" stroke-width="1"/>
        <text x="${padding - 10}" y="${yPos + 5}" text-anchor="end" 
              font-size="12" fill="#6b7280">${yValue}%</text>
      `;
    }

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="white" rx="8"/>
        
        <!-- Grid lines -->
        ${Array.from({ length: 5 }).map((_, i) => {
          const yPos = padding + (graphHeight * (i + 1)) / 5;
          return `<line x1="${padding}" y1="${yPos}" x2="${width - padding}" y2="${yPos}" 
                  stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4"/>`;
        }).join('')}
        
        <!-- Axes -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + graphHeight}" 
              stroke="#1f2937" stroke-width="2"/>
        <line x1="${padding}" y1="${padding + graphHeight}" x2="${width - padding}" y2="${padding + graphHeight}" 
              stroke="#1f2937" stroke-width="2"/>
        
        <!-- Y-axis labels -->
        ${labels}
        
        <!-- Bars -->
        ${bars}
        
        <!-- Title -->
        <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" 
              font-weight="bold" fill="#1f2937">
          Score Progression
        </text>
      </svg>
    `;
  };

  const downloadAsText = () => {
    const textContent = `
╔══════════════════════════════════════════════════════════════════╗
║           LEARNING PROGRESS DASHBOARD - TEXT REPORT              ║
╚══════════════════════════════════════════════════════════════════╝

📊 PROGRESS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Attempts:           ${progressData.totalAttempts}
Current Score:            ${result.score}%
Average Score:            ${progressData.avgScore}%
Highest Score:            ${progressData.maxScore}%
Lowest Score:             ${progressData.minScore}%
Score Improvement:        ${progressData.improvement >= 0 ? '+' : ''}${progressData.improvement.toFixed(1)}%

📈 ATTEMPT HISTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${progressData.attempts.map((attempt, index) => `
Attempt ${index + 1}:
  • Score:              ${attempt.score}%
  • Correct Answers:    ${attempt.correct_answers}/${attempt.total_questions}
  • Status:             ${attempt.score >= 70 ? '✓ PASSED' : '✗ NOT PASSED'}
  • Date:               ${new Date(attempt.created_at).toLocaleDateString()}
${attempt.weak_topics && attempt.weak_topics.length > 0 ? 
  `  • Weak Topics:        ${attempt.weak_topics.join(', ')}` : ''}
`).join('')}

🎯 PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success Rate:             ${Math.round((result.correct_answers / result.total_questions) * 100)}%
Correct Answers:          ${result.correct_answers}/${result.total_questions}
Current Status:           ${result.score >= 70 ? '✓ MASTERED' : '⚠ NEEDS IMPROVEMENT'}

${result.weak_topics && result.weak_topics.length > 0 ? `
⚠️ AREAS FOR IMPROVEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.weak_topics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}
` : ''}

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${result.score >= 70 ? 
  '✓ Excellent! You have mastered this content. Consider moving to the next topic.' :
  `⚠ Review weak areas and reattempt the test to improve your score.\n  Target: Achieve 70% or higher for mastery.`}

╔══════════════════════════════════════════════════════════════════╗
║              Generated on ${new Date().toLocaleString()}           ║
╚══════════════════════════════════════════════════════════════════╝
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent));
    element.setAttribute('download', `progress_report_${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAsPDF = async () => {
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`progress_report_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="bg-transparent rounded-2xl shadow-2xl p-8 mb-8 border-2 border-green-300">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <TrendingUp className="text-green-600" size={28} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Progress Dashboard</h2>
      </div>

      <div ref={dashboardRef} className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl mb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Attempts</p>
            <p className="text-4xl font-bold text-green-600">
              {progressData.totalAttempts}
            </p>
            <p className="text-xs text-gray-500 mt-2">Learning journey</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Average Score</p>
            <p className="text-4xl font-bold text-blue-600">
              {progressData.avgScore}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Across attempts</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Highest Score</p>
            <p className="text-4xl font-bold text-purple-600">
              {progressData.maxScore}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Best performance</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md border-l-4 border-amber-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Improvement</p>
            <p className={`text-4xl font-bold ${progressData.improvement >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {progressData.improvement >= 0 ? '+' : ''}{progressData.improvement.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Since first attempt</p>
          </div>
        </div>

        {/* Bar Graph */}
        <div className="bg-white rounded-xl p-8 mb-8 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-indigo-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">Score Progression Chart</h3>
          </div>
          <div 
            dangerouslySetInnerHTML={{ __html: createBarGraph() }}
            className="flex justify-center"
          />
        </div>

        {/* Detailed Attempt History */}
        <div className="bg-white rounded-xl p-8 shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Attempt Details</h3>
          <div className="space-y-3">
            {progressData.attempts.map((attempt, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">Attempt {index + 1}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(attempt.created_at).toLocaleDateString()} at{' '}
                      {new Date(attempt.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{attempt.score}%</p>
                    <p className={`text-xs font-semibold ${attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {attempt.score >= 70 ? '✓ PASSED' : '✗ NEEDS WORK'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Correct:</span>
                    <span className="font-semibold text-gray-900 ml-2">
                      {attempt.correct_answers}/{attempt.total_questions}
                    </span>
                  </div>
                  {attempt.weak_topics && attempt.weak_topics.length > 0 && (
                    <div>
                      <span className="text-gray-600">Weak Areas:</span>
                      <span className="font-semibold text-red-600 ml-2">
                        {attempt.weak_topics.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={downloadAsText}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
        >
          <Download size={20} />
          Download as Text
        </button>
        <button
          onClick={downloadAsPDF}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
        >
          <Download size={20} />
          Download as PDF
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <Award className="inline mr-2" size={18} />
          <strong>Great Achievement!</strong> Your score of {result.score}% demonstrates your mastery of this content.
          Download your progress report to track your learning journey.
        </p>
      </div>
    </div>
  );
}

export default ProgressDashboard;
