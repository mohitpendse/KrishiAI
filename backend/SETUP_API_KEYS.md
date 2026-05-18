# 🔑 API Keys Setup Guide

## Where to Put Your API Keys

All API keys go in the file: **`backend/api/.env`**

## Quick Setup

### Step 1: Create the .env file (if it doesn't exist)

```bash
cd /Users/mohitpendse/KrishiAI/backend/api

# Option A: Copy from template
cp .env.example .env

# Option B: Create manually
nano .env
```

### Step 2: Edit the .env file

Open `backend/api/.env` in any text editor and replace the placeholder values:

```env
DATABASE_URL=sqlite:///./krishi_ai.db

# REQUIRED (for production)
SECRET_KEY=your-actual-secret-key-here

# OPTIONAL - Add your keys here
GOOGLE_MAPS_API_KEY=your-actual-google-maps-key
OPENWEATHER_API_KEY=your-actual-openweather-key
TWILIO_ACCOUNT_SID=your-actual-twilio-sid
TWILIO_AUTH_TOKEN=your-actual-twilio-token
TWILIO_PHONE_NUMBER=your-actual-twilio-number
RAZORPAY_KEY_ID=your-actual-razorpay-key
RAZORPAY_KEY_SECRET=your-actual-razorpay-secret
```

## 📋 Complete List of API Keys

### 1. **SECRET_KEY** (Required for production)
- **What**: JWT token signing key
- **Generate**: `openssl rand -hex 32`
- **Location**: `backend/api/.env`

### 2. **GOOGLE_MAPS_API_KEY** (Optional)
- **What**: Google Maps API
- **Get from**: https://console.cloud.google.com/
- **Enable**: Maps JavaScript API, Geocoding API
- **Cost**: Free tier available

### 3. **OPENWEATHER_API_KEY** (Optional)
- **What**: Weather data API
- **Get from**: https://openweathermap.org/api
- **Cost**: Free tier (1000 calls/day)

### 4. **TWILIO_ACCOUNT_SID** (Optional)
- **What**: Twilio account identifier
- **Get from**: https://www.twilio.com/

### 5. **TWILIO_AUTH_TOKEN** (Optional)
- **What**: Twilio authentication token
- **Get from**: https://www.twilio.com/

### 6. **TWILIO_PHONE_NUMBER** (Optional)
- **What**: Your Twilio phone number
- **Format**: +1234567890
- **Get from**: Twilio dashboard

### 7. **RAZORPAY_KEY_ID** (Optional)
- **What**: Razorpay public key
- **Get from**: https://razorpay.com/

### 8. **RAZORPAY_KEY_SECRET** (Optional)
- **What**: Razorpay secret key
- **Get from**: https://razorpay.com/

## ✅ Minimum Setup (for testing)

If you just want to run the app without any external services:

```env
DATABASE_URL=sqlite:///./krishi_ai.db
SECRET_KEY=replace_with_generated_secret_key
```

Everything else can be left empty!

## 🚀 After Adding API Keys

1. **Save the .env file**
2. **Restart the backend server** (Ctrl+C and run `./start_server.sh` again)
3. **The app will automatically load the new keys**

## 📝 Example .env File

```env
# Database
DATABASE_URL=sqlite:///./krishi_ai.db

# Security
SECRET_KEY=replace_with_generated_secret_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Weather
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
```

## ⚠️ Important Notes

- **Never commit `.env` to git** (it's already in .gitignore)
- **Keep your API keys secret** - don't share them
- **Generate a new SECRET_KEY for production**
- **Empty values are OK** - features will use mock data

## 🆘 Need Help?

- Check if `.env` file exists: `ls -la backend/api/.env`
- View current config: `cat backend/api/.env`
- Copy from template: `cp backend/api/.env.example backend/api/.env`
