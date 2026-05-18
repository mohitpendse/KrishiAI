#!/bin/bash

# Navigate to backend directory
cd /Users/mohitpendse/KrishiAI/backend

# Activate virtual environment
source api/.venv/bin/activate

# Install all essential dependencies
echo "📦 Installing dependencies..."
pip install -q fastapi uvicorn sqlalchemy python-dotenv "python-jose[cryptography]" "passlib[bcrypt]" python-multipart PyJWT httpx aiofiles requests beautifulsoup4 pandas numpy aiohttp alembic pydantic-settings googletrans twilio razorpay googlemaps || true

# Set up database and .env file
cd api
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please edit it to add your API keys if needed."
    else
        # Create basic .env if .env.example doesn't exist
        cat > .env << EOF
DATABASE_URL=sqlite:///./krishi_ai.db
SECRET_KEY=dev-secret-key-change-in-production-$(openssl rand -hex 16)
GOOGLE_MAPS_API_KEY=
OPENWEATHER_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
EOF
        echo "✅ Basic .env file created."
    fi
else
    echo "✅ .env file already exists."
fi
cd ..

# Start server
echo "🚀 Starting backend server..."
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
