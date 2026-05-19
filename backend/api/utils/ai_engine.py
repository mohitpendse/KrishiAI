"""AI Engine utilities.

This module conditionally imports heavy ML/image dependencies so the backend
can run in environments where TensorFlow/OpenCV/Pillow are not installed.
When unavailable, functions return mocked results that keep the API working.
"""

import base64
import mimetypes
import os
import re
import tempfile

# Optional dependencies (guarded imports)
try:
    import tensorflow as tf  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    tf = None  # type: ignore

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None  # type: ignore

import numpy as np
try:
    from PIL import Image  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Image = None  # type: ignore
import requests
import json
from typing import Dict, List, Optional, Tuple
import asyncio
import aiohttp
import httpx
from datetime import datetime, timedelta
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class AIEngine:
    def __init__(self):
        self.soil_model = None
        self.pest_model = None
        self.crop_recommendation_model = None
        self.weather_api_key = "your_openweather_api_key"
        self.google_maps_api_key = "your_google_maps_api_key"
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
    async def initialize_models(self):
        """Initialize AI models for soil analysis, pest detection, and crop recommendations"""
        try:
            # Initialize soil analysis model
            await self._load_soil_model()
            
            # Initialize pest detection model
            await self._load_pest_model()
            
            # Initialize crop recommendation model
            await self._load_crop_recommendation_model()
            
            logger.info("All AI models loaded successfully")
        except Exception as e:
            logger.error(f"Error initializing AI models: {e}")
    
    async def _load_soil_model(self):
        """Load soil analysis model"""
        # This would load a pre-trained model for soil analysis
        # For now, we'll use a mock implementation
        self.soil_model = "soil_model_loaded"
    
    async def _load_pest_model(self):
        """Load pest detection model"""
        # This would load a pre-trained model for pest detection
        # For now, we'll use a mock implementation
        self.pest_model = "pest_model_loaded"
    
    async def _load_crop_recommendation_model(self):
        """Load crop recommendation model"""
        # This would load a pre-trained model for crop recommendations
        # For now, we'll use a mock implementation
        self.crop_recommendation_model = "crop_recommendation_model_loaded"
    
    async def analyze_soil_image(self, image_path: str) -> Dict:
        """Analyze soil from uploaded image"""
        try:
            if self.openai_api_key:
                return await self._analyze_with_openai(
                    [{"type": "input_image", "image_url": self._file_as_data_url(image_path), "detail": "high"}],
                    "soil image"
                )

            return self._fallback_soil_analysis("image", "Set OPENAI_API_KEY for vision analysis.")
        except Exception as e:
            logger.error(f"Error analyzing soil image: {e}")
            return self._fallback_soil_analysis("image", f"AI image analysis failed: {str(e)[:160]}")
    
    async def analyze_soil_video(self, video_path: str) -> Dict:
        """Analyze soil from uploaded video"""
        try:
            if self.openai_api_key:
                frame_paths = self._extract_video_frames(video_path)
                if frame_paths:
                    try:
                        content = [
                            {"type": "input_image", "image_url": self._file_as_data_url(path), "detail": "auto"}
                            for path in frame_paths
                        ]
                        return await self._analyze_with_openai(content, "soil field video frames")
                    finally:
                        for path in frame_paths:
                            try:
                                os.remove(path)
                            except OSError:
                                pass

            return self._fallback_soil_analysis("video", "Set OPENAI_API_KEY and install OpenCV for video frame analysis.")
        except Exception as e:
            logger.error(f"Error analyzing soil video: {e}")
            return self._fallback_soil_analysis("video", f"AI video analysis failed: {str(e)[:160]}")

    async def analyze_lab_report(self, file_path: str) -> Dict:
        """Analyze a soil lab report PDF or image and return normalized soil data."""
        try:
            if self.openai_api_key:
                mime_type, _ = mimetypes.guess_type(file_path)
                if mime_type and mime_type.startswith("image/"):
                    content = [{"type": "input_image", "image_url": self._file_as_data_url(file_path), "detail": "high"}]
                else:
                    content = [{
                        "type": "input_file",
                        "filename": os.path.basename(file_path),
                        "file_data": self._file_as_data_url(file_path),
                    }]
                return await self._analyze_with_openai(content, "soil lab report")

            return self._fallback_soil_analysis("lab", "Set OPENAI_API_KEY for lab report parsing.")
        except Exception as e:
            logger.error(f"Error analyzing lab report: {e}")
            return self._fallback_soil_analysis("lab", f"AI lab report analysis failed: {str(e)[:160]}")
    
    async def detect_pests_and_diseases(self, image_path: str, crop_name: str) -> Dict:
        """Detect pests and diseases from crop image"""
        try:
            if cv2 is not None:
                # Load and preprocess image
                image = cv2.imread(image_path)
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                image = cv2.resize(image, (224, 224))
            
            # Mock detection - in real implementation, this would use the trained model
            detection_result = {
                "detections": [
                    {
                        "type": "pest",
                        "name": "Aphids",
                        "confidence": 0.92,
                        "severity": "moderate",
                        "treatment": {
                            "organic": ["Neem oil spray", "Garlic spray"],
                            "chemical": ["Imidacloprid 0.5ml/liter"],
                            "prevention": ["Regular monitoring", "Beneficial insects"]
                        }
                    }
                ],
                "overall_health": "fair",
                "recommendations": [
                    "Apply neem oil spray immediately",
                    "Monitor for 3-5 days",
                    "Consider introducing beneficial insects"
                ]
            }
            
            return detection_result
        except Exception as e:
            logger.error(f"Error detecting pests: {e}")
            return {"error": "Failed to detect pests and diseases"}
    
    async def recommend_crops(self, soil_data: Dict, location: str, season: str, field_data: Optional[Dict] = None) -> List[Dict]:
        """Recommend crops based on soil analysis and conditions"""
        try:
            if self.openai_api_key:
                response = await self._openai_json(
                    [
                        {
                            "type": "input_text",
                            "text": (
                                "Recommend Indian crops from this soil analysis. Return JSON only with key "
                                "crop_recommendations, an array of 3-5 items. Each item must contain: "
                                "crop_name, suitability_score 0-1, expected_yield as tons per acre number, "
                                "profit_margin 0-1, sowing_season, harvest_season, "
                                "fertilizer_recommendations {nitrogen, phosphorus, potassium, type}, "
                                "irrigation_schedule {frequency, amount, season}. "
                                "Use crop history to avoid poor rotations, explain nutrient depletion indirectly through fertilizer choices, "
                                "and favor crops that improve profitability after low-yield past crops. "
                                f"Location/state: {location or 'unknown'}. Season: {season or 'current'}. "
                                f"Soil analysis JSON: {json.dumps(soil_data, default=str)}"
                                f"Field data JSON including crop history: {json.dumps(field_data or {}, default=str)}"
                            )
                        }
                    ],
                    "You are an agronomist. Base recommendations only on the provided field and soil data."
                )
                recommendations = response.get("crop_recommendations", [])
                if isinstance(recommendations, list) and recommendations:
                    return [self._normalize_crop_recommendation(rec) for rec in recommendations]

            recommendations = [
                {
                    "crop_name": "Maize",
                    "suitability_score": 0.72,
                    "expected_yield": 2.4,
                    "profit_margin": 0.18,
                    "sowing_season": "Kharif",
                    "harvest_season": "Kharif",
                    "fertilizer_recommendations": {"nitrogen": 50, "phosphorus": 25, "potassium": 25, "type": "Balanced NPK split application"},
                    "irrigation_schedule": {"frequency": "7-10 days", "amount": 20, "season": "Kharif"},
                },
                {
                    "crop_name": "Groundnut",
                    "suitability_score": 0.68,
                    "expected_yield": 1.6,
                    "profit_margin": 0.16,
                    "sowing_season": "Kharif",
                    "harvest_season": "Rabi",
                    "fertilizer_recommendations": {"nitrogen": 20, "phosphorus": 40, "potassium": 20, "type": "Phosphorus-rich basal dose"},
                    "irrigation_schedule": {"frequency": "10-14 days", "amount": 15, "season": "Kharif"},
                }
            ]
            
            return recommendations
        except Exception as e:
            logger.error(f"Error recommending crops: {e}")
            return []

    async def generate_finance_chat_reply(self, query: str, context: Dict) -> str:
        """Generate a finance assistant reply with OpenAI when configured."""
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")

        payload = {
            "model": self.openai_model,
            "input": [
                {
                    "role": "system",
                    "content": [{
                        "type": "input_text",
                        "text": (
                            "You are KrishiAI's farm finance assistant for Indian farmers. "
                            "Give concise, practical advice using only the provided financial context. "
                            "If the user mentions a transaction, acknowledge it and explain cash-flow impact. "
                            "Do not provide legal, tax, or investment guarantees."
                        ),
                    }],
                },
                {
                    "role": "user",
                    "content": [{
                        "type": "input_text",
                        "text": f"User question: {query}\nFinancial context JSON: {json.dumps(context, default=str)}",
                    }],
                },
            ],
            "temperature": 0.3,
        }

        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        text = data.get("output_text") or ""
        if text:
            return text.strip()

        chunks = []
        for item in data.get("output", []):
            for part in item.get("content", []):
                if part.get("type") == "output_text":
                    chunks.append(part.get("text", ""))
        return "\n".join(chunks).strip()

    def _fallback_soil_analysis(self, source: str, note: str) -> Dict:
        return {
            "soil_type": "Unknown",
            "ph_level": None,
            "moisture_content": None,
            "nitrogen_content": None,
            "phosphorus_content": None,
            "potassium_content": None,
            "organic_matter": None,
            "confidence_score": 0.0,
            "source": source,
            "conclusion": "The file was stored, but AI analysis is not configured on this server.",
            "recommendations": [note],
            "limitations": ["No AI provider API key is configured."],
        }

    def _file_as_data_url(self, file_path: str) -> str:
        mime_type, _ = mimetypes.guess_type(file_path)
        mime_type = mime_type or "application/octet-stream"
        with open(file_path, "rb") as file:
            encoded = base64.b64encode(file.read()).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"

    def _extract_video_frames(self, video_path: str, max_frames: int = 6) -> List[str]:
        if cv2 is None:
            return []

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        indexes = [0] if total_frames <= 1 else [
            int(i * max(total_frames - 1, 1) / max(max_frames - 1, 1))
            for i in range(max_frames)
        ]

        frame_paths: List[str] = []
        for index in indexes:
            cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            ok, frame = cap.read()
            if not ok:
                continue
            fd, path = tempfile.mkstemp(suffix=".jpg")
            os.close(fd)
            cv2.imwrite(path, frame)
            frame_paths.append(path)

        cap.release()
        return frame_paths

    async def _analyze_with_openai(self, evidence_content: List[Dict], source_name: str) -> Dict:
        response = await self._openai_json(
            [
                {
                    "type": "input_text",
                    "text": (
                        f"Analyze this {source_name} for farm soil and crop planning. Return JSON only with keys: "
                        "soil_type, ph_level, moisture_content, nitrogen_content, phosphorus_content, "
                        "potassium_content, organic_matter, confidence_score, conclusion, recommendations, "
                        "limitations. Use null for values not visible or not present. recommendations must be "
                        "short actionable strings. conclusion should be one concise paragraph."
                    )
                },
                *evidence_content,
            ],
            "You are an agronomist. Be honest about uncertainty; do not invent lab values that are not visible."
        )
        return self._normalize_soil_analysis(response, source_name)

    async def _openai_json(self, content: List[Dict], system_prompt: str) -> Dict:
        payload = {
            "model": self.openai_model,
            "input": [
                {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
                {"role": "user", "content": content},
            ],
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        text = data.get("output_text") or ""
        if not text:
            chunks = []
            for item in data.get("output", []):
                for part in item.get("content", []):
                    if part.get("type") == "output_text":
                        chunks.append(part.get("text", ""))
            text = "\n".join(chunks)

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("AI response did not contain JSON")
        return json.loads(match.group(0))

    def _as_float_or_none(self, value) -> Optional[float]:
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _normalize_soil_analysis(self, data: Dict, source: str) -> Dict:
        recommendations = data.get("recommendations") or []
        limitations = data.get("limitations") or []
        return {
            "soil_type": data.get("soil_type") or "Unknown",
            "ph_level": self._as_float_or_none(data.get("ph_level")),
            "moisture_content": self._as_float_or_none(data.get("moisture_content")),
            "nitrogen_content": self._as_float_or_none(data.get("nitrogen_content")),
            "phosphorus_content": self._as_float_or_none(data.get("phosphorus_content")),
            "potassium_content": self._as_float_or_none(data.get("potassium_content")),
            "organic_matter": self._as_float_or_none(data.get("organic_matter")),
            "confidence_score": self._as_float_or_none(data.get("confidence_score")) or 0.0,
            "source": source,
            "conclusion": data.get("conclusion") or "Analysis completed.",
            "recommendations": recommendations if isinstance(recommendations, list) else [str(recommendations)],
            "limitations": limitations if isinstance(limitations, list) else [str(limitations)],
        }

    def _normalize_crop_recommendation(self, rec: Dict) -> Dict:
        fertilizer = rec.get("fertilizer_recommendations") or {}
        irrigation = rec.get("irrigation_schedule") or {}
        return {
            "crop_name": str(rec.get("crop_name") or "Crop"),
            "suitability_score": min(max(self._as_float_or_none(rec.get("suitability_score")) or 0, 0), 1),
            "expected_yield": self._as_float_or_none(rec.get("expected_yield")) or 0,
            "profit_margin": min(max(self._as_float_or_none(rec.get("profit_margin")) or 0, 0), 1),
            "sowing_season": str(rec.get("sowing_season") or "Seasonal"),
            "harvest_season": str(rec.get("harvest_season") or "Seasonal"),
            "fertilizer_recommendations": {
                "nitrogen": self._as_float_or_none(fertilizer.get("nitrogen")),
                "phosphorus": self._as_float_or_none(fertilizer.get("phosphorus")),
                "potassium": self._as_float_or_none(fertilizer.get("potassium")),
                "type": fertilizer.get("type") or fertilizer.get("npk_ratio") or "Based on soil report",
            },
            "irrigation_schedule": {
                "frequency": irrigation.get("frequency") or irrigation.get("method"),
                "amount": self._as_float_or_none(irrigation.get("amount")),
                "season": irrigation.get("season") or "Current season",
            },
        }
    
    async def get_weather_data(self, location: str) -> Dict:
        """Get current weather and forecast data"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"http://api.openweathermap.org/data/2.5/weather"
                params = {
                    "q": location,
                    "appid": self.weather_api_key,
                    "units": "metric"
                }
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "temperature": data["main"]["temp"],
                            "humidity": data["main"]["humidity"],
                            "weather_condition": data["weather"][0]["description"],
                            "wind_speed": data["wind"]["speed"],
                            "location": location,
                            "timestamp": datetime.now().isoformat()
                        }
                    else:
                        return {"error": "Failed to fetch weather data"}
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return {"error": "Failed to fetch weather data"}
    
    async def get_weather_forecast(self, location: str, days: int = 7) -> List[Dict]:
        """Get weather forecast for specified days"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"http://api.openweathermap.org/data/2.5/forecast"
                params = {
                    "q": location,
                    "appid": self.weather_api_key,
                    "units": "metric"
                }
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        forecast = []
                        
                        for item in data["list"][:days * 8]:  # 8 forecasts per day
                            forecast.append({
                                "date": item["dt_txt"],
                                "temperature": item["main"]["temp"],
                                "humidity": item["main"]["humidity"],
                                "weather_condition": item["weather"][0]["description"],
                                "wind_speed": item["wind"]["speed"],
                                "rain_probability": item.get("pop", 0) * 100
                            })
                        
                        return forecast
                    else:
                        return []
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {e}")
            return []
    
    async def generate_farming_alerts(self, farmer_id: str, location: str, crops: List[str]) -> List[Dict]:
        """Generate AI-powered farming alerts"""
        try:
            alerts = []
            
            # Get weather data
            weather = await self.get_weather_data(location)
            if "error" not in weather:
                # Weather-based alerts
                if weather["temperature"] > 35:
                    alerts.append({
                        "type": "weather",
                        "priority": "high",
                        "title": "High Temperature Alert",
                        "message": f"Temperature is {weather['temperature']}°C. Consider increasing irrigation frequency.",
                        "action_required": True
                    })
                
                if weather["humidity"] > 80:
                    alerts.append({
                        "type": "weather",
                        "priority": "medium",
                        "title": "High Humidity Alert",
                        "message": "High humidity detected. Watch for fungal diseases and pests.",
                        "action_required": True
                    })
            
            # Market-based alerts (mock)
            alerts.append({
                "type": "market",
                "priority": "medium",
                "title": "Price Alert",
                "message": "Tomato prices have increased by 15% in your area. Consider harvesting early.",
                "action_required": False
            })
            
            return alerts
        except Exception as e:
            logger.error(f"Error generating alerts: {e}")
            return []
    
    async def analyze_market_trends(self, crop_name: str, location: str) -> Dict:
        """Analyze market trends for specific crop"""
        try:
            # Mock market analysis
            analysis = {
                "crop_name": crop_name,
                "location": location,
                "current_price": 45.50,  # per kg
                "price_trend": "increasing",
                "price_change_percentage": 12.5,
                "demand_level": "high",
                "supply_level": "moderate",
                "best_selling_periods": ["January-March", "October-December"],
                "competitor_analysis": {
                    "nearby_farmers": 15,
                    "average_price": 42.30,
                    "quality_standards": "Grade A"
                },
                "recommendations": [
                    "Harvest during peak demand periods",
                    "Focus on quality to command premium prices",
                    "Consider direct selling to avoid middlemen"
                ]
            }
            
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing market trends: {e}")
            return {"error": "Failed to analyze market trends"}
    
    async def calculate_profit_margin(self, crop_name: str, yield_per_acre: float, 
                                    market_price: float, expenses: Dict) -> Dict:
        """Calculate profit margin for crop cultivation"""
        try:
            # Calculate total expenses
            total_expenses = (
                expenses.get("seeds", 0) +
                expenses.get("fertilizer", 0) +
                expenses.get("pesticides", 0) +
                expenses.get("labor", 0) +
                expenses.get("irrigation", 0) +
                expenses.get("machinery", 0) +
                expenses.get("other", 0)
            )
            
            # Calculate total revenue
            total_revenue = yield_per_acre * market_price
            
            # Calculate profit
            profit = total_revenue - total_expenses
            profit_margin = (profit / total_revenue) * 100 if total_revenue > 0 else 0
            
            return {
                "crop_name": crop_name,
                "yield_per_acre": yield_per_acre,
                "market_price": market_price,
                "total_revenue": total_revenue,
                "total_expenses": total_expenses,
                "profit": profit,
                "profit_margin": profit_margin,
                "roi": (profit / total_expenses) * 100 if total_expenses > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error calculating profit margin: {e}")
            return {"error": "Failed to calculate profit margin"}
