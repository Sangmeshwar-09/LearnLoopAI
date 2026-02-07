#!/usr/bin/env python
"""
Setup script to initialize the project
Creates necessary directories and checks configuration
"""
import os
import sys

def create_directories():
    """Create necessary directories"""
    directories = [
        'uploads',
        'reports',
        'vector_db',
        'vector_db/chroma'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def check_env_file():
    """Check if .env file exists"""
    if not os.path.exists('.env'):
        print("\n⚠ Warning: .env file not found!")
        print("Please create a .env file with your GEMINI_API_KEY")
        print("Example:")
        print("  GEMINI_API_KEY=your_api_key_here")
        return False
    else:
        print("✓ .env file found")
        return True

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'google.generativeai',
        'chromadb',
        'PyPDF2',
        'pdfplumber',
        'reportlab'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('.', '_') if '.' in package else package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"\n⚠ Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    else:
        print("✓ All required packages installed")
        return True

def main():
    print("=" * 50)
    print("AI Adaptive Test & Learning System - Setup")
    print("=" * 50)
    print()
    
    print("Creating directories...")
    create_directories()
    print()
    
    print("Checking configuration...")
    env_ok = check_env_file()
    print()
    
    print("Checking dependencies...")
    deps_ok = check_dependencies()
    print()
    
    if env_ok and deps_ok:
        print("=" * 50)
        print("✓ Setup complete! You can now run the backend.")
        print("=" * 50)
        print("\nNext steps:")
        print("1. Make sure .env file has your GEMINI_API_KEY")
        print("2. Run backend: python run_backend.py")
        print("3. In another terminal, run frontend: cd frontend && npm install && npm run dev")
    else:
        print("=" * 50)
        print("⚠ Setup incomplete. Please fix the issues above.")
        print("=" * 50)
        sys.exit(1)

if __name__ == "__main__":
    main()
