-- KrishiAI Database Schema
-- AI-Powered Farming Platform Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for farmer profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer profiles with detailed information
CREATE TABLE farmer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_size DECIMAL(10,2), -- in acres
    farm_location JSONB, -- coordinates and address
    primary_crops TEXT[], -- array of crop names
    farming_experience INTEGER, -- years
    annual_income DECIMAL(12,2),
    government_id VARCHAR(50), -- Aadhaar/PAN
    bank_account JSONB, -- account details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Land/Field management
CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_size DECIMAL(10,2), -- in acres
    coordinates JSONB, -- polygon coordinates
    soil_type VARCHAR(50),
    irrigation_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Soil analysis reports
CREATE TABLE soil_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    report_type VARCHAR(20) CHECK (report_type IN ('lab', 'image', 'video')),
    file_path VARCHAR(500),
    analysis_data JSONB, -- AI analysis results
    ph_level DECIMAL(3,1),
    moisture_content DECIMAL(5,2),
    nitrogen_content DECIMAL(5,2),
    phosphorus_content DECIMAL(5,2),
    potassium_content DECIMAL(5,2),
    organic_matter DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop recommendations based on soil analysis
CREATE TABLE crop_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    soil_report_id UUID REFERENCES soil_reports(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    suitability_score DECIMAL(3,2), -- 0.00 to 1.00
    expected_yield DECIMAL(8,2),
    profit_margin DECIMAL(5,2),
    sowing_season VARCHAR(50),
    harvest_season VARCHAR(50),
    fertilizer_recommendations JSONB,
    irrigation_schedule JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market prices tracking
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    price_per_kg DECIMAL(8,2),
    price_date DATE,
    market_name VARCHAR(200),
    quality_grade VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial transactions
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('expense', 'income', 'loan')),
    category VARCHAR(100), -- seeds, fertilizer, equipment, crop_sale, etc.
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    field_id UUID REFERENCES fields(id),
    transaction_date DATE,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Government schemes and subsidies
CREATE TABLE government_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_name VARCHAR(200) NOT NULL,
    state VARCHAR(100),
    description TEXT,
    eligibility_criteria JSONB,
    benefits JSONB,
    application_process TEXT,
    contact_info JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer scheme applications
CREATE TABLE scheme_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES government_schemes(id) ON DELETE CASCADE,
    application_status VARCHAR(20) DEFAULT 'pending',
    application_data JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejection_reason TEXT
);

-- Crop listings for marketplace
CREATE TABLE crop_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2), -- in kg
    price_per_kg DECIMAL(8,2),
    quality_grade VARCHAR(20),
    harvest_date DATE,
    location VARCHAR(200),
    images TEXT[], -- array of image URLs
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace orders
CREATE TABLE marketplace_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES crop_listings(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2),
    total_amount DECIMAL(12,2),
    order_status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    delivery_address JSONB,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP
);

-- AI alerts and notifications
CREATE TABLE ai_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    alert_type VARCHAR(50), -- weather, pest, market, irrigation
    title VARCHAR(200),
    message TEXT,
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    action_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather data
CREATE TABLE weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location VARCHAR(100),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    rainfall DECIMAL(5,2),
    wind_speed DECIMAL(5,2),
    weather_condition VARCHAR(50),
    forecast_data JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pest and disease detection
CREATE TABLE pest_detection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
    crop_name VARCHAR(100),
    image_path VARCHAR(500),
    detection_type VARCHAR(50), -- pest, disease, nutrient_deficiency
    pest_name VARCHAR(100),
    confidence_score DECIMAL(3,2),
    treatment_recommendations JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News and articles
CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    content TEXT,
    source VARCHAR(200),
    category VARCHAR(50), -- innovation, market, technology, policy
    language VARCHAR(10),
    translated_content JSONB, -- translations in different languages
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP verification table
CREATE TABLE otp_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_farmer_profiles_user_id ON farmer_profiles(user_id);
CREATE INDEX idx_fields_farmer_id ON fields(farmer_id);
CREATE INDEX idx_soil_reports_field_id ON soil_reports(field_id);
CREATE INDEX idx_crop_recommendations_soil_report_id ON crop_recommendations(soil_report_id);
CREATE INDEX idx_market_prices_crop_location ON market_prices(crop_name, location);
CREATE INDEX idx_financial_transactions_farmer_id ON financial_transactions(farmer_id);
CREATE INDEX idx_crop_listings_farmer_id ON crop_listings(farmer_id);
CREATE INDEX idx_ai_alerts_farmer_id ON ai_alerts(farmer_id);
CREATE INDEX idx_weather_data_location ON weather_data(location);
CREATE INDEX idx_otp_verification_mobile ON otp_verification(mobile);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_farmer_profiles_updated_at BEFORE UPDATE ON farmer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crop_listings_updated_at BEFORE UPDATE ON crop_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
