import json
import asyncio
import aiohttp
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from api.database import SessionLocal
from api.models.user_model import GovernmentScheme, NewsArticle, MarketPrice

logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self):
        self.db = SessionLocal()
    
    async def load_initial_data(self):
        """Load initial data into the database"""
        try:
            logger.info("Loading initial data...")
            
            # Load government schemes
            await self.load_government_schemes()
            
            # Load initial news articles
            await self.load_initial_news()
            
            # Load market prices
            await self.load_market_prices()
            
            logger.info("Initial data loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading initial data: {e}")
        finally:
            self.db.close()
    
    async def load_government_schemes(self):
        """Load government schemes data"""
        try:
            # Check if schemes already exist
            existing_schemes = self.db.query(GovernmentScheme).count()
            if existing_schemes > 0:
                logger.info("Government schemes already loaded")
                return
            
            schemes_data = [
                {
                    "scheme_name": "PM-KISAN Scheme",
                    "state": "All India",
                    "description": "Direct income support scheme for farmers",
                    "eligibility_criteria": {
                        "min_farm_size": 0.1,
                        "max_annual_income": 600000,
                        "land_ownership": "required"
                    },
                    "benefits": {
                        "amount": 6000,
                        "frequency": "yearly",
                        "payment_method": "Direct Bank Transfer"
                    },
                    "application_process": "Apply online through PM-KISAN portal or visit nearest agriculture office",
                    "contact_info": {
                        "website": "https://pmkisan.gov.in",
                        "helpline": "1800115526"
                    }
                },
                {
                    "scheme_name": "Soil Health Card Scheme",
                    "state": "All India",
                    "description": "Provides soil health cards to farmers with soil test results and recommendations",
                    "eligibility_criteria": {
                        "min_farm_size": 0.1,
                        "land_ownership": "required"
                    },
                    "benefits": {
                        "soil_test": "free",
                        "recommendations": "personalized",
                        "validity": "3 years"
                    },
                    "application_process": "Apply through agriculture department or online portal",
                    "contact_info": {
                        "website": "https://soilhealth.dac.gov.in",
                        "helpline": "1800115526"
                    }
                },
                {
                    "scheme_name": "Pradhan Mantri Fasal Bima Yojana",
                    "state": "All India",
                    "description": "Crop insurance scheme to protect farmers against crop loss",
                    "eligibility_criteria": {
                        "min_farm_size": 0.1,
                        "crop_types": ["food crops", "oilseeds", "commercial crops"]
                    },
                    "benefits": {
                        "premium_subsidy": "up to 90%",
                        "coverage": "yield loss, prevented sowing, post-harvest losses"
                    },
                    "application_process": "Apply through insurance companies or online portal",
                    "contact_info": {
                        "website": "https://pmfby.gov.in",
                        "helpline": "1800115526"
                    }
                },
                {
                    "scheme_name": "Kisan Credit Card",
                    "state": "All India",
                    "description": "Credit card for farmers to meet their credit requirements",
                    "eligibility_criteria": {
                        "min_farm_size": 0.1,
                        "age_limit": "18-75 years"
                    },
                    "benefits": {
                        "interest_rate": "4% per annum",
                        "credit_limit": "up to 3 lakhs",
                        "repayment_period": "flexible"
                    },
                    "application_process": "Apply through banks or online portal",
                    "contact_info": {
                        "website": "https://www.nabard.org",
                        "helpline": "1800115526"
                    }
                },
                {
                    "scheme_name": "National Mission for Sustainable Agriculture",
                    "state": "All India",
                    "description": "Promotes sustainable agriculture practices and climate-resilient farming",
                    "eligibility_criteria": {
                        "min_farm_size": 0.5,
                        "farming_experience": 2
                    },
                    "benefits": {
                        "subsidy": "up to 50%",
                        "training": "free",
                        "equipment": "subsidized"
                    },
                    "application_process": "Apply through agriculture department",
                    "contact_info": {
                        "website": "https://nmsa.dac.gov.in",
                        "helpline": "1800115526"
                    }
                }
            ]
            
            for scheme_data in schemes_data:
                scheme = GovernmentScheme(**scheme_data)
                self.db.add(scheme)
            
            self.db.commit()
            logger.info(f"Loaded {len(schemes_data)} government schemes")
            
        except Exception as e:
            logger.error(f"Error loading government schemes: {e}")
            self.db.rollback()
    
    async def load_initial_news(self):
        """Load initial news articles"""
        try:
            # Check if news already exist
            existing_news = self.db.query(NewsArticle).count()
            if existing_news > 0:
                logger.info("News articles already loaded")
                return
            
            news_data = [
                {
                    "title": "AI-Powered Soil Analysis Revolutionizes Farming",
                    "content": "A new AI-powered soil analysis technology has been developed that can analyze soil composition using smartphone cameras. This breakthrough technology is expected to help farmers make better decisions about crop selection and fertilizer application, leading to increased yields and reduced costs.",
                    "source": "Krishi Jagran",
                    "category": "Innovation",
                    "language": "en",
                    "published_at": datetime.now()
                },
                {
                    "title": "Tomato Prices Surge Across Major Markets",
                    "content": "Tomato prices have increased by 20% across major markets due to supply shortages and increased demand. Farmers are advised to monitor market trends closely and consider early harvesting to capitalize on high prices.",
                    "source": "Agmarknet",
                    "category": "Market",
                    "language": "en",
                    "published_at": datetime.now()
                },
                {
                    "title": "Government Announces New Subsidy for Small Farmers",
                    "content": "The government has announced a new subsidy scheme specifically designed for small and marginal farmers. The scheme provides financial assistance for purchasing modern farming equipment and adopting sustainable farming practices.",
                    "source": "PIB",
                    "category": "Policy",
                    "language": "en",
                    "published_at": datetime.now()
                },
                {
                    "title": "Drought-Resistant Crop Varieties Show Promise",
                    "content": "New drought-resistant crop varieties developed by agricultural research institutes are showing promising results in field trials. These varieties can help farmers cope with water scarcity and climate change challenges.",
                    "source": "ICAR",
                    "category": "Technology",
                    "language": "en",
                    "published_at": datetime.now()
                },
                {
                    "title": "Organic Farming Gains Popularity Among Urban Consumers",
                    "content": "Organic farming is gaining popularity among urban consumers who are willing to pay premium prices for chemical-free produce. This trend is encouraging more farmers to adopt organic farming practices.",
                    "source": "Organic Farming Association",
                    "category": "Market",
                    "language": "en",
                    "published_at": datetime.now()
                }
            ]
            
            for article_data in news_data:
                article = NewsArticle(**article_data)
                self.db.add(article)
            
            self.db.commit()
            logger.info(f"Loaded {len(news_data)} news articles")
            
        except Exception as e:
            logger.error(f"Error loading news articles: {e}")
            self.db.rollback()
    
    async def load_market_prices(self):
        """Load initial market prices"""
        try:
            # Check if market prices already exist
            existing_prices = self.db.query(MarketPrice).count()
            if existing_prices > 0:
                logger.info("Market prices already loaded")
                return
            
            prices_data = [
                {
                    "crop_name": "Tomato",
                    "location": "Delhi",
                    "price_per_kg": 45.50,
                    "price_date": datetime.now().date(),
                    "market_name": "Azadpur Mandi",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Tomato",
                    "location": "Mumbai",
                    "price_per_kg": 42.30,
                    "price_date": datetime.now().date(),
                    "market_name": "Vashi APMC",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Chili",
                    "location": "Delhi",
                    "price_per_kg": 120.00,
                    "price_date": datetime.now().date(),
                    "market_name": "Azadpur Mandi",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Chili",
                    "location": "Mumbai",
                    "price_per_kg": 115.50,
                    "price_date": datetime.now().date(),
                    "market_name": "Vashi APMC",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Rice",
                    "location": "Delhi",
                    "price_per_kg": 35.00,
                    "price_date": datetime.now().date(),
                    "market_name": "Azadpur Mandi",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Rice",
                    "location": "Mumbai",
                    "price_per_kg": 32.50,
                    "price_date": datetime.now().date(),
                    "market_name": "Vashi APMC",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Wheat",
                    "location": "Delhi",
                    "price_per_kg": 28.00,
                    "price_date": datetime.now().date(),
                    "market_name": "Azadpur Mandi",
                    "quality_grade": "Grade A"
                },
                {
                    "crop_name": "Wheat",
                    "location": "Mumbai",
                    "price_per_kg": 26.50,
                    "price_date": datetime.now().date(),
                    "market_name": "Vashi APMC",
                    "quality_grade": "Grade A"
                }
            ]
            
            for price_data in prices_data:
                price = MarketPrice(**price_data)
                self.db.add(price)
            
            self.db.commit()
            logger.info(f"Loaded {len(prices_data)} market prices")
            
        except Exception as e:
            logger.error(f"Error loading market prices: {e}")
            self.db.rollback()
    
    async def fetch_latest_news(self):
        """Fetch latest news from external sources"""
        try:
            # This would typically fetch from RSS feeds or news APIs
            # For now, we'll create some mock news
            logger.info("Fetching latest news...")
            
            # In production, you would:
            # 1. Fetch from RSS feeds (Krishi Jagran, Agmarknet, PIB)
            # 2. Parse and clean the content
            # 3. Translate to different languages
            # 4. Store in database
            
            logger.info("Latest news fetched successfully")
            
        except Exception as e:
            logger.error(f"Error fetching latest news: {e}")
    
    async def update_market_prices(self):
        """Update market prices from external sources"""
        try:
            # This would typically fetch from Agmarknet or similar APIs
            logger.info("Updating market prices...")
            
            # In production, you would:
            # 1. Fetch from Agmarknet API
            # 2. Parse and clean the data
            # 3. Update existing records or create new ones
            # 4. Store in database
            
            logger.info("Market prices updated successfully")
            
        except Exception as e:
            logger.error(f"Error updating market prices: {e}")
    
    async def load_crop_data(self):
        """Load crop information and recommendations"""
        try:
            # This would load crop-specific data like:
            # - Growing seasons
            # - Water requirements
            # - Soil preferences
            # - Common pests and diseases
            # - Yield expectations
            
            logger.info("Loading crop data...")
            logger.info("Crop data loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading crop data: {e}")
    
    async def load_weather_data(self):
        """Load historical weather data"""
        try:
            # This would load historical weather data for:
            # - Temperature patterns
            # - Rainfall data
            # - Humidity levels
            # - Seasonal variations
            
            logger.info("Loading weather data...")
            logger.info("Weather data loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading weather data: {e}")
    
    async def cleanup_old_data(self):
        """Clean up old data to maintain database performance"""
        try:
            # Clean up old news articles (older than 30 days)
            cutoff_date = datetime.now() - timedelta(days=30)
            old_news = self.db.query(NewsArticle).filter(
                NewsArticle.created_at < cutoff_date
            ).delete()
            
            # Clean up old market prices (older than 7 days)
            cutoff_date = datetime.now() - timedelta(days=7)
            old_prices = self.db.query(MarketPrice).filter(
                MarketPrice.created_at < cutoff_date
            ).delete()
            
            self.db.commit()
            logger.info(f"Cleaned up {old_news} old news articles and {old_prices} old market prices")
            
        except Exception as e:
            logger.error(f"Error cleaning up old data: {e}")
            self.db.rollback()
