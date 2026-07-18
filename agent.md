# LearnLoop AI Project Agent Guide

## Project Summary

LearnLoop AI is an adaptive study application that turns a PDF into an interactive learning loop. A user uploads a PDF, the backend extracts and indexes the content, generates questions, evaluates the answers, identifies weak areas, and produces personalized notes and performance reports.

## Core Flow

1. Upload a PDF from the frontend.
2. Validate and store the file in the backend.
3. Extract text, chunk it, and embed it into ChromaDB.
4. Save document metadata and attempt data in SQLite.
5. Generate a test from the uploaded content.
6. Evaluate submitted answers and calculate the score.
7. Detect weak topics from incorrect responses.
8. Generate focused notes and a report for review.

## Architecture

### Backend

The backend is a FastAPI application started from `run_backend.py`. It registers routes for upload, testing, evaluation, notes, and reporting. It also initializes SQLite, exposes health and version endpoints, and serves generated reports as static files.

### Frontend

The frontend is a React 18 app built with Vite. It provides the upload, test, result, notes, and report screens, and it communicates with the backend through API requests under `/api`.

### Data and Storage

- SQLite stores users, documents, attempts, scores, and reports.
- ChromaDB stores the PDF embeddings for retrieval.
- Uploaded PDFs are saved in `uploads/`.
- Generated report files are saved in `reports/`.

## Main Modules

### Backend folders

- `backend/config.py` loads environment configuration.
- `backend/database/` defines the SQLite models and DB setup.
- `backend/rag/` handles loading, chunking, retrieval, embeddings, and generation.
- `backend/routes/` contains the HTTP endpoints.
- `backend/utils/` contains report generation helpers.

### Frontend folders

- `frontend/src/api.js` contains the API client.
- `frontend/src/components/` contains shared UI components.
- `frontend/src/context/` contains shared React context.
- `frontend/src/pages/` contains the main screens.

## API Overview

Base URL in development: `http://127.0.0.1:8000/api`

- `POST /api/upload-pdf` uploads and processes a PDF.
- `POST /api/generate-test` generates test questions.
- `POST /api/submit-test` evaluates answers and stores the attempt.
- `GET /api/generate-notes?attempt_id=...` generates personalized notes.
- `POST /api/reattempt-test` creates focused retry questions.
- `GET /api/generate-report?attempt_id=...` generates a report and optional PDF.
- `GET /api/download-report/{report_id}` returns report PDF metadata.
- `GET /api/attempts?document_id=...&user_id=...` returns attempt history.
- `GET /api/health` checks API health.
- `GET /api/version` returns the API version.

## Environment Setup

Create a `.env` file in the project root:

```env
DEEPSEEK_API_KEY=your_api_key_here
```

The backend reads this value on startup. If it is missing, the app will stop with a configuration error.

## Running Locally

### Backend

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend from the project root:

```bash
python run_backend.py
```

### Frontend

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

## Default Local URLs

- Backend API: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`
- Frontend: `http://127.0.0.1:5173`

## Project Behavior Notes

- The app currently uses a default `user_id=1` in the API flow.
- Reports are only generated for passed attempts.
- The backend includes fallback generation logic when the AI service is unavailable.
- The upload flow is intended for readable text-based PDFs.

## Troubleshooting

- Check that `.env` exists and includes `DEEPSEEK_API_KEY` if the backend fails on startup.
- Confirm the uploaded file is a valid PDF and is under the size limit if upload processing fails.
- If the frontend cannot reach the backend, confirm both apps are running and the `/api` proxy is still pointing at `http://127.0.0.1:8000`.