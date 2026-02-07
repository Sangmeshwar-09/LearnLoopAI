import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, Zap, Brain, BookOpen, RotateCw, Sparkles } from 'lucide-react';

function Landing() {
  const theme = useTheme();
  
  const features = [
    {
      icon: Zap,
      title: 'PDF-based Test Generation',
      description: 'Automatically generate comprehensive tests from any PDF document using advanced AI analysis.'
    },
    {
      icon: Brain,
      title: 'Weak Topic Detection',
      description: 'Intelligent system identifies your weak areas and learning gaps from test responses.'
    },
    {
      icon: BookOpen,
      title: 'Personalized Study Notes',
      description: 'AI-generated study notes focused specifically on your weak topics from PDF content.'
    },
    {
      icon: RotateCw,
      title: 'Smart Reattempt System',
      description: 'Retake tests with new questions focused on areas you need to master.'
    }
  ];

  return (
    <div className={`min-h-screen ${theme.text.primary} transition-colors duration-300`}>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-indigo-600" size={24} />
              <span className="text-sm font-semibold text-indigo-600">Next-Gen Learning Platform</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                LearnLoop AI
              </span>
              <br />
              <span className={theme.text.primary}>Adaptive Learning & Smart Assessment</span>
            </h1>
            
            <p className={`text-xl ${theme.text.secondary} leading-relaxed`}>
              Transform your learning journey. Upload any PDF, take intelligent tests, discover weak areas, 
              and master concepts with personalized study notes. All powered by advanced AI.
            </p>

            {/* Flow Steps */}
            <div className="flex items-center gap-3 text-lg font-semibold flex-wrap">
              <span className={`px-4 py-2 rounded-lg ${theme.isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>📄 Upload</span>
              <ArrowRight className="text-indigo-600" size={24} />
              <span className={`px-4 py-2 rounded-lg ${theme.isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>📝 Test</span>
              <ArrowRight className="text-indigo-600" size={24} />
              <span className={`px-4 py-2 rounded-lg ${theme.isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>📊 Improve</span>
              <ArrowRight className="text-indigo-600" size={24} />
              <span className={`px-4 py-2 rounded-lg ${theme.isDark ? 'bg-pink-900 text-pink-300' : 'bg-pink-100 text-pink-700'}`}>🎓 Master</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 flex-wrap pt-4">
              <Link 
                to="/upload"
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-lg hover:shadow-xl transition transform hover:scale-105 font-semibold flex items-center gap-2"
              >
                Upload PDF Now <ArrowRight size={20} />
              </Link>
              <a 
                href="#features"
                className={`border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-lg transition font-semibold ${theme.isDark ? 'hover:bg-slate-700' : 'hover:bg-indigo-50'}`}
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-8 flex-wrap">
              <div>
                <p className="text-3xl font-bold text-indigo-600">10K+</p>
                <p className={theme.text.secondary}>Documents Processed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">50K+</p>
                <p className={theme.text.secondary}>Tests Generated</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">95%</p>
                <p className={theme.text.secondary}>Success Rate</p>
              </div>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="hidden lg:block">
            <div className={`${theme.isDark ? 'bg-gradient-to-br from-slate-700 to-slate-600' : 'bg-gradient-to-br from-indigo-200 via-blue-200 to-purple-200'} rounded-2xl p-8 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10 bg-grid-pattern"></div>
              
              {/* Animated Cards */}
              <div className="space-y-4 relative z-10">
                <div className={`${theme.bg.primary} rounded-lg p-4 shadow-lg transform -rotate-3 hover:rotate-0 transition`}>
                  <p className="text-sm font-semibold text-indigo-600">📄 PDF Uploaded</p>
                  <p className={`text-xs ${theme.text.secondary}`}>Advanced Mathematics.pdf</p>
                </div>
                
                <div className={`${theme.bg.primary} rounded-lg p-4 shadow-lg transform rotate-2 hover:rotate-0 transition ml-8`}>
                  <p className="text-sm font-semibold text-blue-600">📝 Test Generated</p>
                  <p className={`text-xs ${theme.text.secondary}`}>5 questions created</p>
                </div>
                
                <div className={`${theme.bg.primary} rounded-lg p-4 shadow-lg transform -rotate-1 hover:rotate-0 transition`}>
                  <p className="text-sm font-semibold text-purple-600">📊 Analysis Complete</p>
                  <p className={`text-xs ${theme.text.secondary}`}>Score: 72% | 2 weak areas</p>
                </div>
                
                <div className={`${theme.bg.primary} rounded-lg p-4 shadow-lg transform rotate-3 hover:rotate-0 transition ml-8`}>
                  <p className="text-sm font-semibold text-pink-600">📚 Study Notes Ready</p>
                  <p className={`text-xs ${theme.text.secondary}`}>Personalized for you</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={`${theme.bg.secondary} py-20 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-4 ${theme.text.primary}`}>Powerful Features</h2>
            <p className={`text-xl ${theme.text.secondary}`}>Everything you need for adaptive learning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className={`${theme.bg.primary} rounded-xl p-8 hover:shadow-lg transition transform hover:-translate-y-2 border ${theme.border.light}`}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className={`text-lg font-bold mb-3 ${theme.text.primary}`}>{feature.title}</h3>
                  <p className={`${theme.text.secondary} text-sm leading-relaxed`}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className={`text-4xl font-bold mb-4 ${theme.text.primary}`}>How LearnLoop AI Works</h2>
          <p className={`text-xl ${theme.text.secondary}`}>Simple, intelligent, effective learning</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: 1, title: 'Upload PDF', desc: 'Start with any educational PDF document', emoji: '📄' },
            { step: 2, title: 'Take Test', desc: 'Answer AI-generated questions', emoji: '✏️' },
            { step: 3, title: 'Get Analysis', desc: 'Identify your weak topics', emoji: '📊' },
            { step: 4, title: 'Study & Reattempt', desc: 'Master concepts with personalized notes', emoji: '📚' }
          ].map((item, index) => (
            <div key={index} className="relative text-center">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 mx-auto shadow-lg">
                {item.emoji}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${theme.text.primary}`}>{item.title}</h3>
              <p className={`${theme.text.secondary} text-sm`}>{item.desc}</p>
              {index < 3 && (
                <div className={`hidden lg:block absolute top-8 left-[60%] w-[40%] h-0.5 ${theme.isDark ? 'bg-gradient-to-r from-slate-600 to-transparent' : 'bg-gradient-to-r from-indigo-300 to-transparent'}`}></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 opacity-90">Start with any PDF and master concepts faster than ever before</p>
          <Link 
            to="/upload"
            className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-lg hover:shadow-xl transition transform hover:scale-105 font-bold"
          >
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Landing;
