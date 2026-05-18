# KrishiAI - Smart Farming Companion

🌾 **AI-Powered Farming Platform for Indian Farmers**

KrishiAI is a comprehensive farming platform that empowers farmers with data-driven insights, smart management tools, and direct market access. Built with modern technologies and AI capabilities, it helps farmers increase their profits while promoting sustainable farming practices.

## 🚀 Features

### Core Modules

1. **🔐 Authentication & Profile Management**
   - OTP-based mobile authentication
   - Multi-language support (English, Hindi, Tamil, Telugu)
   - Comprehensive farmer profile setup

2. **🧪 AI-Powered Soil Analysis**
   - Upload soil images, videos, or lab reports
   - AI analysis of soil composition, pH, moisture, and nutrients
   - Personalized crop recommendations based on soil data

3. **🗺️ Land Management**
   - Google Maps integration for field mapping
   - Multiple field management
   - Field-specific soil and crop tracking

4. **📊 Real-Time Dashboard**
   - Weather forecasts and alerts
   - Market price tracking
   - AI-generated farming alerts and recommendations
   - Financial overview and insights

5. **🤖 AI Market Advisor**
   - Intelligent crop recommendations
   - Profit margin analysis
   - Seasonal farming calendar
   - Market trend analysis

6. **🌱 Fertilizer & Pest Management**
   - AI-powered pest and disease detection from crop images
   - Treatment recommendations (organic and chemical)
   - Regional pest alerts

7. **💰 Financial Management**
   - Expense and income tracking
   - Profit-loss analysis
   - Budget planning and loan management
   - Government scheme integration

8. **🏛️ Government Schemes & Subsidies**
   - Auto-detection of eligible schemes
   - Application guidance
   - Scheme tracking and status updates

9. **📰 News & Innovation Feed**
   - Real-time farming news aggregation
   - AI-powered summarization and translation
   - Innovation updates and tech news

10. **🛒 Direct Marketplace**
    - Crop listing and selling
    - Buyer-farmer matching
    - Payment integration (Razorpay, UPI)
    - Logistics and delivery management

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with OTP verification
- **AI/ML**: TensorFlow, OpenCV, scikit-learn
- **APIs**: Google Maps, OpenWeather, Twilio SMS
- **Payments**: Razorpay integration

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Lucide React

### DevOps & Deployment
- **Containerization**: Docker
- **Database**: PostgreSQL
- **File Storage**: Local/AWS S3
- **Environment**: Python virtual environment

## 📁 Project Structure

```
KrishiAI/
├── backend/
│   ├── api/
│   │   ├── main.py                 # FastAPI application entry point
│   │   ├── database.py             # Database configuration
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── routes/                 # API route handlers
│   │   └── utils/                  # Utility functions and AI engine
├── frontend/
│   ├── assets/                     # App images and brand assets
│   ├── src/
│   │   ├── components/             # Reusable React components
│   │   ├── contexts/               # React contexts (Auth, Theme, Language)
│   │   ├── pages/                  # Page components
│   │   ├── locales/                # Translation files
│   │   └── utils/                  # Frontend utilities
├── database/
│   └── schema.sql                  # Database schema
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd KrishiAI
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r api/requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp api/.env.example api/.env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb krishi_ai
   
   # Run migrations
   psql -d krishi_ai -f database/schema.sql
   ```

5. **Start the backend server**
   ```bash
   cd api
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost/krishi_ai
SECRET_KEY=your-secret-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_OPENWEATHER_API_KEY=your-openweather-api-key
VITE_TWILIO_ACCOUNT_SID=your-twilio-account-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-auth-token
VITE_TWILIO_PHONE_NUMBER=your-twilio-phone-number
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
```

## 📱 API Documentation

The API documentation is automatically generated and available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key API Endpoints

- `POST /api/auth/send-otp` - Send OTP to mobile number
- `POST /api/auth/verify-otp` - Verify OTP and authenticate
- `POST /api/soil/upload-image` - Upload soil image for analysis
- `GET /api/crops/recommendations` - Get crop recommendations
- `GET /api/marketplace/listings` - Browse crop listings
- `POST /api/financial/transactions` - Add financial transaction
- `GET /api/schemes/eligible-schemes` - Get eligible government schemes

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

### Production Deployment

1. **Backend**: Deploy to cloud platforms (AWS, GCP, Azure)
2. **Frontend**: Deploy to Vercel, Netlify, or similar
3. **Database**: Use managed PostgreSQL service
4. **File Storage**: Configure AWS S3 or similar

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Indian farmers for their invaluable feedback
- Open source community for amazing tools and libraries
- Government of India for agricultural data and schemes
- AI/ML community for cutting-edge research

## 📞 Support

For support, email support@krishiai.com or join our community Discord.

---

**Made with ❤️ for Indian Farmers**
