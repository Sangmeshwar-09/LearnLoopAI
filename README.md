# LearnLoop AI

LearnLoop AI is an adaptive learning app that turns a PDF into an interactive study flow. The user uploads a document, the backend extracts and indexes the content, generates questions, evaluates answers, highlights weak topics, and produces personalized notes and reports.

## Features

- PDF upload and text extraction.
- Chunking and vector retrieval with ChromaDB.
- AI-assisted question generation and answer evaluation.
- Personalized notes based on weak areas.
- Performance reports with downloadable PDF output.
- React frontend with route-based navigation.

## Tech Stack

Backend:

- FastAPI
- SQLite with SQLAlchemy-style models
- ChromaDB
- DeepSeek API
- Uvicorn

Frontend:

- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React

## Project Structure

```text
backend/
  config.py
  main.py
  database/
  rag/
  routes/
  utils/
frontend/
  src/
    api.js
    App.jsx
    components/
    context/
    pages/
reports/
uploads/
vector_db/
requirements.txt
run_backend.py
```

## Requirements

- Python 3.12 or compatible Python 3.x environment.
- Node.js 18 or newer.
- A valid DeepSeek API key.

## Setup

Create a `.env` file in the project root:

```env
DEEPSEEK_API_KEY=your_api_key_here
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Run Locally

Start the backend from the project root:

```bash
python run_backend.py
```

Start the frontend from the `frontend` folder:

```bash
npm run dev
```

## Default URLs

- Backend API: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`
- Frontend: `http://127.0.0.1:5173`

## How It Works

1. Upload a PDF.
2. Extract and chunk the text.
3. Store embeddings in ChromaDB.
4. Save document metadata in SQLite.
5. Generate a test from the uploaded content.
6. Submit answers and calculate the score.
7. Identify weak topics from incorrect answers.
8. Generate notes and a performance report.

## API Endpoints

- `POST /api/upload-pdf`
- `POST /api/generate-test`
- `POST /api/submit-test`
- `GET /api/generate-notes?attempt_id=...`
- `POST /api/reattempt-test`
- `GET /api/generate-report?attempt_id=...`
- `GET /api/download-report/{report_id}`
- `GET /api/attempts?document_id=...&user_id=...`
- `GET /api/health`
- `GET /api/version`

## Notes

- The app currently uses a default `user_id=1` in the API flow.
- Reports are only generated for passed attempts.
- The backend includes fallback logic if AI requests fail.
- The upload flow works best with readable text-based PDFs.

## Troubleshooting

- If the backend fails on startup, confirm that `.env` exists and includes `DEEPSEEK_API_KEY`.
- If a PDF upload fails, check that the file is a valid PDF and within the size limit.
- If the frontend cannot reach the backend, confirm the backend is running on port `8000` and Vite is using the `/api` proxy.
- If question generation is slow or fails, the AI service may be temporarily unavailable; the fallback mode should still try to produce usable output.
- If the frontend cannot reach the backend, confirm both servers are running and that the Vite proxy is targeting `http://127.0.0.1:8000`.

## Good Places To Start Reading The Code

- Backend entry point: `backend/main.py`
- Upload workflow: `backend/routes/upload.py`
- Test generation and reattempt logic: `backend/routes/test.py`
- Answer submission and weak-topic capture: `backend/routes/evaluate.py`
- Personalized notes: `backend/routes/notes.py`
- Reports: `backend/routes/report.py`
- Frontend route setup: `frontend/src/App.jsx`
- API wrapper: `frontend/src/api.js`

## Summary

This project is a closed learning loop: upload a document, test knowledge, measure weak areas, generate focused notes, and retest until the learner improves. The codebase is already organized around that flow, so this README should be enough for a new contributor or user to understand how the whole system fits together.