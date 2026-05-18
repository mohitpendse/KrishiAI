from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Date, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import os
from api.database import Base, DATABASE_URL

# Use String UUID for SQLite, UUID for PostgreSQL
def get_uuid_default():
    """Get appropriate UUID default based on database type"""
    if "sqlite" in DATABASE_URL.lower():
        return lambda: str(uuid.uuid4())
    else:
        return uuid.uuid4

if "sqlite" in DATABASE_URL.lower():
    from sqlalchemy import String as UUIDString
    UUIDType = UUIDString(36)  # UUID string format
    UUIDDefault = lambda: str(uuid.uuid4())
else:
    UUIDType = UUID(as_uuid=True)
    UUIDDefault = uuid.uuid4

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    mobile = Column(String(15), unique=True, nullable=False)
    email = Column(String(255), unique=True)
    password_hash = Column(String(255))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    preferred_language = Column(String(10), default='en')
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False)

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False)
    farm_size = Column(DECIMAL(10,2))  # in acres
    farm_location = Column(JSON)  # coordinates and address
    primary_crops = Column(JSON)  # array of crop names (stored as JSON for SQLite compatibility)
    farming_experience = Column(Integer)  # years
    annual_income = Column(DECIMAL(12,2))
    government_id = Column(String(50))  # Aadhaar/PAN
    bank_account = Column(JSON)  # account details
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    user = relationship("User", back_populates="farmer_profile")
    fields = relationship("Field", back_populates="farmer")
    financial_transactions = relationship("FinancialTransaction", back_populates="farmer")
    crop_listings = relationship("CropListing", back_populates="farmer")
    ai_alerts = relationship("AIAlert", back_populates="farmer")
    pest_detections = relationship("PestDetection", back_populates="farmer")
    scheme_applications = relationship("SchemeApplication", back_populates="farmer")

class Field(Base):
    __tablename__ = "fields"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_size = Column(DECIMAL(10,2))  # in acres
    coordinates = Column(JSON)  # polygon coordinates
    soil_type = Column(String(50))
    irrigation_type = Column(String(50))
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="fields")
    soil_reports = relationship("SoilReport", back_populates="field")
    crop_listings = relationship("CropListing", back_populates="field")
    pest_detections = relationship("PestDetection", back_populates="field")

class SoilReport(Base):
    __tablename__ = "soil_reports"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    field_id = Column(UUIDType, ForeignKey("fields.id"), nullable=False)
    report_type = Column(String(20))  # lab, image, video
    file_path = Column(String(500))
    analysis_data = Column(JSON)  # AI analysis results
    ph_level = Column(DECIMAL(3,1))
    moisture_content = Column(DECIMAL(5,2))
    nitrogen_content = Column(DECIMAL(5,2))
    phosphorus_content = Column(DECIMAL(5,2))
    potassium_content = Column(DECIMAL(5,2))
    organic_matter = Column(DECIMAL(5,2))
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    field = relationship("Field", back_populates="soil_reports")
    crop_recommendations = relationship("CropRecommendation", back_populates="soil_report")

class CropRecommendation(Base):
    __tablename__ = "crop_recommendations"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    soil_report_id = Column(UUIDType, ForeignKey("soil_reports.id"), nullable=False)
    crop_name = Column(String(100), nullable=False)
    suitability_score = Column(DECIMAL(3,2))  # 0.00 to 1.00
    expected_yield = Column(DECIMAL(8,2))
    profit_margin = Column(DECIMAL(5,2))
    sowing_season = Column(String(50))
    harvest_season = Column(String(50))
    fertilizer_recommendations = Column(JSON)
    irrigation_schedule = Column(JSON)
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    soil_report = relationship("SoilReport", back_populates="crop_recommendations")

class MarketPrice(Base):
    __tablename__ = "market_prices"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    crop_name = Column(String(100), nullable=False)
    location = Column(String(100))
    price_per_kg = Column(DECIMAL(8,2))
    price_date = Column(Date)
    market_name = Column(String(200))
    quality_grade = Column(String(20))
    created_at = Column(DateTime, default=func.current_timestamp())

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    transaction_type = Column(String(20))  # expense, income, loan
    category = Column(String(100))  # seeds, fertilizer, equipment, crop_sale, etc.
    amount = Column(DECIMAL(12,2), nullable=False)
    description = Column(Text)
    field_id = Column(UUIDType, ForeignKey("fields.id"))
    transaction_date = Column(Date)
    payment_method = Column(String(50))
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="financial_transactions")

class GovernmentScheme(Base):
    __tablename__ = "government_schemes"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    scheme_name = Column(String(200), nullable=False)
    state = Column(String(100))
    description = Column(Text)
    eligibility_criteria = Column(JSON)
    benefits = Column(JSON)
    application_process = Column(Text)
    contact_info = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    applications = relationship("SchemeApplication", back_populates="scheme")

class SchemeApplication(Base):
    __tablename__ = "scheme_applications"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    scheme_id = Column(UUIDType, ForeignKey("government_schemes.id"), nullable=False)
    application_status = Column(String(20), default='pending')
    application_data = Column(JSON)
    submitted_at = Column(DateTime, default=func.current_timestamp())
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="scheme_applications")
    scheme = relationship("GovernmentScheme", back_populates="applications")

class CropListing(Base):
    __tablename__ = "crop_listings"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    field_id = Column(UUIDType, ForeignKey("fields.id"), nullable=False)
    crop_name = Column(String(100), nullable=False)
    quantity = Column(DECIMAL(10,2))  # in kg
    price_per_kg = Column(DECIMAL(8,2))
    quality_grade = Column(String(20))
    harvest_date = Column(Date)
    location = Column(String(200))
    images = Column(JSON)  # array of image URLs (stored as JSON for SQLite compatibility)
    description = Column(Text)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="crop_listings")
    field = relationship("Field", back_populates="crop_listings")
    orders = relationship("MarketplaceOrder", back_populates="listing")

class MarketplaceOrder(Base):
    __tablename__ = "marketplace_orders"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    listing_id = Column(UUIDType, ForeignKey("crop_listings.id"), nullable=False)
    buyer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    quantity = Column(DECIMAL(10,2))
    total_amount = Column(DECIMAL(12,2))
    order_status = Column(String(20), default='pending')
    payment_status = Column(String(20), default='pending')
    delivery_address = Column(JSON)
    order_date = Column(DateTime, default=func.current_timestamp())
    delivery_date = Column(DateTime)
    
    # Relationships
    listing = relationship("CropListing", back_populates="orders")

class AIAlert(Base):
    __tablename__ = "ai_alerts"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    alert_type = Column(String(50))  # weather, pest, market, irrigation
    title = Column(String(200))
    message = Column(Text)
    priority = Column(String(10))  # low, medium, high, urgent
    is_read = Column(Boolean, default=False)
    action_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="ai_alerts")

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    location = Column(String(100))
    temperature = Column(DECIMAL(5,2))
    humidity = Column(DECIMAL(5,2))
    rainfall = Column(DECIMAL(5,2))
    wind_speed = Column(DECIMAL(5,2))
    weather_condition = Column(String(50))
    forecast_data = Column(JSON)
    recorded_at = Column(DateTime, default=func.current_timestamp())

class PestDetection(Base):
    __tablename__ = "pest_detection"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    farmer_id = Column(UUIDType, ForeignKey("farmer_profiles.id"), nullable=False)
    field_id = Column(UUIDType, ForeignKey("fields.id"), nullable=False)
    crop_name = Column(String(100))
    image_path = Column(String(500))
    detection_type = Column(String(50))  # pest, disease, nutrient_deficiency
    pest_name = Column(String(100))
    confidence_score = Column(DECIMAL(3,2))
    treatment_recommendations = Column(JSON)
    detected_at = Column(DateTime, default=func.current_timestamp())
    
    # Relationships
    farmer = relationship("FarmerProfile", back_populates="pest_detections")
    field = relationship("Field", back_populates="pest_detections")

class NewsArticle(Base):
    __tablename__ = "news_articles"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    title = Column(String(500))
    content = Column(Text)
    source = Column(String(200))
    category = Column(String(50))  # innovation, market, technology, policy
    language = Column(String(10))
    translated_content = Column(JSON)  # translations in different languages
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=func.current_timestamp())

class OTPVerification(Base):
    __tablename__ = "otp_verification"
    
    id = Column(UUIDType, primary_key=True, default=UUIDDefault)
    mobile = Column(String(15), nullable=False)
    otp_code = Column(String(6), nullable=False)
    is_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.current_timestamp())
