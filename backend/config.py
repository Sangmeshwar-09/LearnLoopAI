import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env file from project root
# Try multiple paths to ensure we find the .env file
env_paths = [
    Path(__file__).parent.parent / '.env',  # Project root
    Path('.env'),  # Current directory
    Path(__file__).parent.parent.parent / '.env'  # One level up
]

env_loaded = False
for env_path in env_paths:
    if env_path.exists():
        # Load with encoding to handle BOM
        try:
            load_dotenv(dotenv_path=env_path, override=True, encoding='utf-8-sig')
        except:
            # Fallback to default encoding
            load_dotenv(dotenv_path=env_path, override=True)
        env_loaded = True
        logger.info(f"Loaded .env file from: {env_path}")
        break

# Also try loading from current directory (fallback)
if not env_loaded:
    try:
        load_dotenv(override=True, encoding='utf-8-sig')
    except:
        load_dotenv(override=True)

# DeepSeek API Configuration
# Get the key and clean it (remove quotes, whitespace, BOM, etc.)
raw_key = os.getenv("DEEPSEEK_API_KEY", "")
# Remove BOM if present, quotes, and whitespace
DEEPSEEK_API_KEY = raw_key.strip().strip('"').strip("'").lstrip('\ufeff')

# Validate DeepSeek API Key
if not DEEPSEEK_API_KEY:
    logger.error("DEEPSEEK_API_KEY is not configured in .env file")
    raise ValueError(
        "DEEPSEEK_API_KEY is required but not found. "
        "Please create a .env file in the project root with: DEEPSEEK_API_KEY=your_api_key_here"
    )

DEEPSEEK_MODEL = "deepseek-chat"
DEEPSEEK_API_BASE = "https://api.deepseek.com"

# Log successful configuration (without exposing the key)
logger.info("DeepSeek API key loaded successfully")
logger.info(f"Using DeepSeek model: {DEEPSEEK_MODEL}")

# Database Configuration
DATABASE_URL = "sqlite:///./adaptive_test.db"

# Vector Database Configuration
CHROMA_DB_PATH = "./vector_db/chroma"

# Test Configuration
DEFAULT_MIN_SCORE_THRESHOLD = 70  # Percentage
CHUNK_SIZE = 400  # Tokens
CHUNK_OVERLAP = 50  # Tokens

# File Upload Configuration
UPLOAD_DIR = "./uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf"}
