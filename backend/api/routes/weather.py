from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
import requests
import os
from datetime import datetime, timedelta

from api.database import get_db
from api.models.user_model import User, FarmerProfile, WeatherData
from api.routes.auth import get_current_user
from api.utils.helpers import get_weather_emoji

router = APIRouter()

# OpenWeather API configuration
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
WEATHER_CACHE_MINUTES = 30  # Cache weather data for 30 minutes

@router.get("/current")
async def get_current_weather(
    location: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """Get current weather for a requested location or Goa fallback."""
    try:
        requested_location = (location or "Goa").strip() or "Goa"
        cache_location = f"{lat:.4f},{lon:.4f}" if lat is not None and lon is not None else requested_location

        # Check for recent cached weather data
        cached_weather = db.query(WeatherData).filter(
            WeatherData.location == cache_location,
            WeatherData.recorded_at >= datetime.now() - timedelta(minutes=WEATHER_CACHE_MINUTES)
        ).first()

        if cached_weather:
            return {
                "temperature": float(cached_weather.temperature),
                "humidity": float(cached_weather.humidity),
                "rainfall": float(cached_weather.rainfall),
                "wind_speed": float(cached_weather.wind_speed),
                "condition": cached_weather.weather_condition,
                "emoji": get_weather_emoji(cached_weather.weather_condition),
                "forecast": cached_weather.forecast_data.get('description', ''),
                "cached": True,
                "location": cached_weather.forecast_data.get('location', cached_weather.location)
            }

        # Call OpenWeather API
        if not OPENWEATHER_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OPENWEATHER_API_KEY is not configured"
            )

        try:
            params = {
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }
            if lat is not None and lon is not None:
                params.update({"lat": lat, "lon": lon})
            else:
                params["q"] = requested_location if "," in requested_location else f"{requested_location},IN"

            response = requests.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params=params,
                timeout=10
            )
        except Exception as req_exc:
            # Log the underlying request exception for debugging
            print(f"[weather] request exception: {req_exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error fetching weather data"
            )

        if response.status_code != 200:
            # Log response body to help debug API/key issues
            try:
                body = response.text
            except Exception:
                body = "<unreadable body>"
            print(f"[weather] non-200 from OpenWeather: {response.status_code} body={body}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error fetching weather data: {response.status_code}"
            )
        
        weather_data = response.json()
        display_location = weather_data.get("name") or requested_location
        
        # Extract relevant data
        temperature = weather_data['main']['temp']
        humidity = weather_data['main']['humidity']
        rainfall = weather_data.get('rain', {}).get('1h', 0)  # mm in last hour
        wind_speed = weather_data['wind']['speed']
        condition = weather_data['weather'][0]['main']
        description = weather_data['weather'][0]['description']

        # Create forecast message
        forecast = (
            f"{description.capitalize()}. "
            f"Temperature is {temperature}°C with {humidity}% humidity. "
        )
        
        if rainfall > 0:
            forecast += f"Rainfall: {rainfall}mm in last hour. "
        
        if temperature > 35:
            forecast += "Consider increasing irrigation frequency."
        elif temperature < 15:
            forecast += "Watch for cold stress in crops."
        else:
            forecast += "Good conditions for field work."

        # Cache the weather data
        new_weather = WeatherData(
            location=cache_location,
            temperature=temperature,
            humidity=humidity,
            rainfall=rainfall,
            wind_speed=wind_speed,
            weather_condition=condition,
            forecast_data={
                "description": forecast,
                "location": display_location,
                "details": weather_data
            }
        )
        db.add(new_weather)
        db.commit()
        
        return {
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "wind_speed": wind_speed,
            "condition": condition,
            "emoji": get_weather_emoji(condition),
            "forecast": forecast,
            "cached": False,
            "location": display_location
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting weather data: {str(e)}"
        )

@router.get("")
async def get_weather(
    location: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    return await get_current_weather(location=location, lat=lat, lon=lon, db=db)
