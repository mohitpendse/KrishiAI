from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables from the api directory explicitly so the app
# picks up backend/api/.env even when uvicorn is started from the repository root.
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

from api.database import engine, Base
from api.routes import auth, users, crops, soil, fields, marketplace, financial, schemes, news, ai_alerts, weather
from api.utils.ai_engine import AIEngine
from api.utils.data_loader import DataLoader

# Load environment variables
load_dotenv()

# Initialize AI Engine and Data Loader
ai_engine = AIEngine()
data_loader = DataLoader()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting KrishiAI Backend...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("📊 Database tables created successfully")
    
    # Initialize AI models
    await ai_engine.initialize_models()
    print("🤖 AI models loaded successfully")
    
    # Load initial data
    await data_loader.load_initial_data()
    print("📈 Initial data loaded successfully")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down KrishiAI Backend...")

# Create FastAPI app
app = FastAPI(
    title="KrishiAI - Smart Farming Companion",
    description="AI-Powered Farming Platform for Indian Farmers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "krishi-ai-indol-phi.vercel.app"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(crops.router, prefix="/api/crops", tags=["Crops"])
app.include_router(soil.router, prefix="/api/soil", tags=["Soil Analysis"])
app.include_router(fields.router, prefix="/api/fields", tags=["Land Management"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(financial.router, prefix="/api/financial", tags=["Financial Management"])
app.include_router(schemes.router, prefix="/api/schemes", tags=["Government Schemes"])
app.include_router(news.router, prefix="/api/news", tags=["News & Innovation"])
app.include_router(ai_alerts.router, prefix="/api/alerts", tags=["AI Alerts"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to KrishiAI - Smart Farming Companion",
        "version": "1.0.0",
        "status": "active",
        "features": [
            "Soil Analysis",
            "Crop Recommendations", 
            "Market Intelligence",
            "Financial Management",
            "Government Schemes",
            "Direct Marketplace"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
