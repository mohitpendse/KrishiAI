from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from api.database import get_db
from api.models.user_model import User, FarmerProfile, CropRecommendation, SoilReport, Field
from api.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class CropRecommendationResponse(BaseModel):
    id: str
    soil_report_id: str
    crop_name: str
    suitability_score: float
    expected_yield: float
    profit_margin: float
    sowing_season: str
    harvest_season: str
    fertilizer_recommendations: dict
    irrigation_schedule: dict
    created_at: datetime

class CropInfo(BaseModel):
    crop_name: str
    description: str
    growing_season: str
    water_requirement: str
    soil_type: str
    average_yield: str
    market_price_range: str

# Routes
@router.get("/recommendations", response_model=List[CropRecommendationResponse])
async def get_crop_recommendations(
    field_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get crop recommendations for farmer's fields"""
    try:
        # Get farmer profile
        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == current_user.id
        ).first()
        
        if not farmer_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farmer profile not found"
            )
        
        # Build query
        query = db.query(CropRecommendation).join(SoilReport).join(Field).filter(
            Field.farmer_id == farmer_profile.id
        )
        
        if field_id:
            query = query.filter(Field.id == field_id)
        
        recommendations = query.order_by(CropRecommendation.suitability_score.desc()).all()
        
        return [
            CropRecommendationResponse(
                id=str(rec.id),
                soil_report_id=str(rec.soil_report_id),
                crop_name=rec.crop_name,
                suitability_score=float(rec.suitability_score),
                expected_yield=float(rec.expected_yield),
                profit_margin=float(rec.profit_margin),
                sowing_season=rec.sowing_season,
                harvest_season=rec.harvest_season,
                fertilizer_recommendations=rec.fertilizer_recommendations,
                irrigation_schedule=rec.irrigation_schedule,
                created_at=rec.created_at
            )
            for rec in recommendations
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching crop recommendations: {str(e)}"
        )

@router.get("/info/{crop_name}", response_model=CropInfo)
async def get_crop_info(crop_name: str):
    """Get detailed information about a specific crop"""
    try:
        # Mock crop information - in real implementation, this would come from a database
        crop_info = {
            "tomato": {
                "crop_name": "Tomato",
                "description": "Tomato is a widely cultivated crop known for its nutritional value and versatility in cooking.",
                "growing_season": "October-November to February-March",
                "water_requirement": "500-600mm per season",
                "soil_type": "Well-drained loamy soil with pH 6.0-7.0",
                "average_yield": "25-30 tonnes per acre",
                "market_price_range": "₹20-50 per kg"
            },
            "chili": {
                "crop_name": "Chili",
                "description": "Chili peppers are widely used as a spice and have high commercial value.",
                "growing_season": "September-October to January-February",
                "water_requirement": "400-500mm per season",
                "soil_type": "Well-drained sandy loam soil with pH 6.5-7.5",
                "average_yield": "15-20 tonnes per acre",
                "market_price_range": "₹80-150 per kg"
            },
            "rice": {
                "crop_name": "Rice",
                "description": "Rice is a staple food crop in India with high nutritional value.",
                "growing_season": "June-July to October-November",
                "water_requirement": "1000-1200mm per season",
                "soil_type": "Clay loam soil with good water retention",
                "average_yield": "3-4 tonnes per acre",
                "market_price_range": "₹25-35 per kg"
            }
        }
        
        crop_data = crop_info.get(crop_name.lower())
        if not crop_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop information not found"
            )
        
        return CropInfo(**crop_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching crop information: {str(e)}"
        )

@router.get("/list")
async def get_crop_list():
    """Get list of all available crops"""
    try:
        crops = [
            {"name": "Tomato", "category": "Vegetables"},
            {"name": "Chili", "category": "Spices"},
            {"name": "Rice", "category": "Cereals"},
            {"name": "Wheat", "category": "Cereals"},
            {"name": "Cotton", "category": "Cash Crops"},
            {"name": "Sugarcane", "category": "Cash Crops"},
            {"name": "Potato", "category": "Vegetables"},
            {"name": "Onion", "category": "Vegetables"},
            {"name": "Maize", "category": "Cereals"},
            {"name": "Soybean", "category": "Oilseeds"},
            {"name": "Groundnut", "category": "Oilseeds"},
            {"name": "Turmeric", "category": "Spices"},
            {"name": "Ginger", "category": "Spices"},
            {"name": "Coriander", "category": "Spices"},
            {"name": "Cumin", "category": "Spices"}
        ]
        
        return {"crops": crops}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching crop list: {str(e)}"
        )
