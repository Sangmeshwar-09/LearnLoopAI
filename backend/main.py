from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from backend.database.db import init_db
from backend.routes import upload, test, evaluate, notes, report
import os
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Validate configuration on startup
try:
    from backend.config import DEEPSEEK_API_KEY
    logger.info("✅ Backend configuration validated successfully")
except ValueError as e:
    logger.error(f"❌ Configuration error: {e}")
    raise

# Initialize database
try:
    init_db()
    logger.info("✅ Database initialized successfully")
except Exception as e:
    logger.error(f"❌ Database initialization failed: {e}")
    raise

# Create FastAPI app
app = FastAPI(
    title="AI Adaptive Test & Learning System", 
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# CORS middleware - Allow requests from frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to catch any unhandled exceptions
    Prevents backend from crashing and returns proper error response
    """
    # Log the full traceback
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again or contact support.",
            "error_type": type(exc).__name__
        }
    )

# Mount static files for reports
reports_dir = "./reports"
os.makedirs(reports_dir, exist_ok=True)
app.mount("/reports", StaticFiles(directory=reports_dir), name="reports")

# Include routers with error boundaries
try:
    app.include_router(upload.router, prefix="/api", tags=["Upload"])
    app.include_router(test.router, prefix="/api", tags=["Test"])
    app.include_router(evaluate.router, prefix="/api", tags=["Evaluate"])
    app.include_router(notes.router, prefix="/api", tags=["Notes"])
    app.include_router(report.router, prefix="/api", tags=["Report"])
    logger.info("✅ All routers loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load routers: {e}")
    raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Adaptive Test & Learning System API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health():
    """API health check endpoint"""
    return {"status": "healthy"}

@app.get("/health")
async def health_check():
    """Standalone health check endpoint for monitoring"""
    return {"status": "Backend running"}

@app.get("/api/version")
async def version():
    """Get API version"""
    return {"version": "1.0.0"}

# Startup event
@app.on_event("startup")
def startup_event():
    logger.info("=" * 60)
    logger.info("🚀 AI Adaptive Test & Learning System Backend Starting")
    logger.info("=" * 60)
    logger.info("Backend running on: http://127.0.0.1:8000")
    logger.info("API Documentation: http://127.0.0.1:8000/docs")
    logger.info("=" * 60)

# Shutdown event
@app.on_event("shutdown")
def shutdown_event():
    logger.info("=" * 60)
    logger.info("🛑 Backend shutting down...")
    logger.info("=" * 60)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting uvicorn server...")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
