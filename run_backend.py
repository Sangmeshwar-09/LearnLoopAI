#!/usr/bin/env python
"""
Backend startup script
Run this from the project root directory
"""
import subprocess
import sys
import os

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    print("Starting AI Adaptive Test & Learning System Backend...")
    print("API will be available at http://localhost:8000")
    print("API docs at http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Use subprocess to run uvicorn directly, keeping process alive
    cmd = [
        sys.executable, 
        "-m", 
        "uvicorn",
        "backend.main:app",
        "--host", "127.0.0.1",
        "--port", "8000",
        "--log-level", "info"
    ]
    
    try:
        # Change to project directory
        os.chdir(project_root)
        # Run uvicorn in subprocess - this will block and keep running
        # Don't catch the exception, let it propagate
        subprocess.run(cmd, check=False)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
