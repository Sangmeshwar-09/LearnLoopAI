import axios from 'axios';

// Use relative paths in development to leverage Vite proxy
// This avoids CORS issues and uses Vite's proxy to 127.0.0.1:8000
const API_BASE_URL = process.env.NODE_ENV === 'development' ? '/api' : 'http://127.0.0.1:8000/api';

console.log('API Configuration:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    const statusCode = error.response?.status || 'N/A';
    
    console.error(`[API Error] ${statusCode}:`, errorMessage);
    console.error('[Full Error]', error);
    
    // Ensure error is properly formatted for UI
    if (!error.response) {
      error.response = {
        status: 0,
        data: {
          detail: error.message || 'Connection failed. Please check if backend is running.'
        }
      };
    }
    
    return Promise.reject(error);
  }
);

// Upload PDF
export const uploadPDF = async (file, userId = 1) => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  
  try {
    const response = await api.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    // Enrich error with context
    if (error.response?.status === 500) {
      throw new Error(error.response?.data?.detail || 'Server error processing PDF');
    }
    throw error;
  }
};

// Generate test
export const generateTest = async (documentId, numQuestions = 5, userId = 1) => {
  try {
    const response = await api.post('/generate-test', {
      document_id: documentId,
      num_questions: numQuestions,
      user_id: userId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Submit test
export const submitTest = async (documentId, questions, answers, userId = 1) => {
  try {
    const response = await api.post('/submit-test', {
      document_id: documentId,
      questions: questions,
      answers: answers,
      user_id: userId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generate notes
export const generateNotes = async (attemptId) => {
  try {
    const response = await api.get('/generate-notes', {
      params: { attempt_id: attemptId },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reattempt test
export const reattemptTest = async (documentId, attemptId, numQuestions = 5, userId = 1) => {
  try {
    const response = await api.post('/reattempt-test', {
      document_id: documentId,
      attempt_id: attemptId,
      num_questions: numQuestions,
      user_id: userId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Generate report
export const generateReport = async (attemptId) => {
  try {
    const response = await api.get('/generate-report', {
      params: { attempt_id: attemptId },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Download report
export const downloadReport = async (reportId) => {
  try {
    const response = await api.get(`/download-report/${reportId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all attempts for a document
export const getAttempts = async (documentId, userId = 1) => {
  try {
    const response = await api.get('/attempts', {
      params: { document_id: documentId, user_id: userId },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
