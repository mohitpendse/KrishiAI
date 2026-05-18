from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import googlemaps
import os
import logging
import traceback
from dotenv import load_dotenv

from api.database import get_db
from api.models.user_model import User, FarmerProfile, Field, SoilReport, CropRecommendation, CropListing, PestDetection
from api.routes.auth import get_current_user

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Google Maps client (only if API key is provided)
google_maps_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
gmaps = None
if google_maps_api_key and google_maps_api_key != "your-google-maps-api-key" and len(google_maps_api_key) > 10:
    try:
        gmaps = googlemaps.Client(key=google_maps_api_key)
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize Google Maps client: {e}")
        gmaps = None

# Pydantic models
class FieldCreate(BaseModel):
    field_name: str
    field_size: float  # in acres
    coordinates: dict  # polygon coordinates
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None

class FieldUpdate(BaseModel):
    field_name: Optional[str] = None
    field_size: Optional[float] = None
    coordinates: Optional[dict] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None

class FieldResponse(BaseModel):
    id: str
    farmer_id: str
    field_name: str
    field_size: float
    coordinates: dict
    soil_type: Optional[str]
    irrigation_type: Optional[str]
    created_at: str
    updated_at: str

class FarmerProfileCreate(BaseModel):
    farm_size: float
    farm_location: dict  # coordinates and address
    primary_crops: List[str]
    farming_experience: int
    annual_income: Optional[float] = None
    government_id: Optional[str] = None
    bank_account: Optional[dict] = None

class FarmerProfileResponse(BaseModel):
    id: str
    user_id: str
    farm_size: float
    farm_location: dict
    primary_crops: List[str]
    farming_experience: int
    annual_income: Optional[float]
    government_id: Optional[str]
    bank_account: Optional[dict]
    created_at: str
    updated_at: str

def get_or_create_farmer_profile(current_user: User, db: Session) -> FarmerProfile:
    farmer_profile = db.query(FarmerProfile).filter(
        FarmerProfile.user_id == current_user.id
    ).first()
    if farmer_profile:
        return farmer_profile

    farmer_profile = FarmerProfile(
        user_id=current_user.id,
        farm_size=0,
        farm_location={},
        primary_crops=[],
        farming_experience=0,
    )
    db.add(farmer_profile)
    db.commit()
    db.refresh(farmer_profile)
    return farmer_profile

# Routes
@router.post("/profile", response_model=FarmerProfileResponse)
async def create_farmer_profile(
    profile_data: FarmerProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create farmer profile"""
    try:
        # Check if profile already exists
        existing_profile = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == current_user.id
        ).first()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farmer profile already exists"
            )
        
        # Create farmer profile
        farmer_profile = FarmerProfile(
            user_id=current_user.id,
            farm_size=profile_data.farm_size,
            farm_location=profile_data.farm_location,
            primary_crops=profile_data.primary_crops,
            farming_experience=profile_data.farming_experience,
            annual_income=profile_data.annual_income,
            government_id=profile_data.government_id,
            bank_account=profile_data.bank_account
        )
        
        db.add(farmer_profile)
        db.commit()
        db.refresh(farmer_profile)
        
        return FarmerProfileResponse(
            id=str(farmer_profile.id),
            user_id=str(farmer_profile.user_id),
            farm_size=float(farmer_profile.farm_size),
            farm_location=farmer_profile.farm_location,
            primary_crops=farmer_profile.primary_crops,
            farming_experience=farmer_profile.farming_experience,
            annual_income=float(farmer_profile.annual_income) if farmer_profile.annual_income else None,
            government_id=farmer_profile.government_id,
            bank_account=farmer_profile.bank_account,
            created_at=farmer_profile.created_at.isoformat(),
            updated_at=farmer_profile.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating farmer profile: {str(e)}"
        )

@router.get("/profile", response_model=FarmerProfileResponse)
async def get_farmer_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get farmer profile"""
    try:
        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == current_user.id
        ).first()
        
        if not farmer_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farmer profile not found"
            )
        
        return FarmerProfileResponse(
            id=str(farmer_profile.id),
            user_id=str(farmer_profile.user_id),
            farm_size=float(farmer_profile.farm_size),
            farm_location=farmer_profile.farm_location,
            primary_crops=farmer_profile.primary_crops,
            farming_experience=farmer_profile.farming_experience,
            annual_income=float(farmer_profile.annual_income) if farmer_profile.annual_income else None,
            government_id=farmer_profile.government_id,
            bank_account=farmer_profile.bank_account,
            created_at=farmer_profile.created_at.isoformat(),
            updated_at=farmer_profile.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching farmer profile: {str(e)}"
        )

@router.put("/profile", response_model=FarmerProfileResponse)
async def update_farmer_profile(
    profile_data: FarmerProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update farmer profile"""
    try:
        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == current_user.id
        ).first()
        
        if not farmer_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farmer profile not found"
            )
        
        # Update profile fields
        farmer_profile.farm_size = profile_data.farm_size
        farmer_profile.farm_location = profile_data.farm_location
        farmer_profile.primary_crops = profile_data.primary_crops
        farmer_profile.farming_experience = profile_data.farming_experience
        farmer_profile.annual_income = profile_data.annual_income
        farmer_profile.government_id = profile_data.government_id
        farmer_profile.bank_account = profile_data.bank_account
        
        db.commit()
        db.refresh(farmer_profile)
        
        return FarmerProfileResponse(
            id=str(farmer_profile.id),
            user_id=str(farmer_profile.user_id),
            farm_size=float(farmer_profile.farm_size),
            farm_location=farmer_profile.farm_location,
            primary_crops=farmer_profile.primary_crops,
            farming_experience=farmer_profile.farming_experience,
            annual_income=float(farmer_profile.annual_income) if farmer_profile.annual_income else None,
            government_id=farmer_profile.government_id,
            bank_account=farmer_profile.bank_account,
            created_at=farmer_profile.created_at.isoformat(),
            updated_at=farmer_profile.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating farmer profile: {str(e)}"
        )

@router.post("/fields", response_model=FieldResponse)
async def create_field(
    field_data: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new field"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)
        
        # Create field
        field = Field(
            farmer_id=farmer_profile.id,
            field_name=field_data.field_name,
            field_size=field_data.field_size,
            coordinates=field_data.coordinates,
            soil_type=field_data.soil_type,
            irrigation_type=field_data.irrigation_type
        )
        
        db.add(field)
        db.commit()
        db.refresh(field)
        
        return FieldResponse(
            id=str(field.id),
            farmer_id=str(field.farmer_id),
            field_name=field.field_name,
            field_size=float(field.field_size),
            coordinates=field.coordinates,
            soil_type=field.soil_type,
            irrigation_type=field.irrigation_type,
            created_at=field.created_at.isoformat(),
            updated_at=field.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating field: {str(e)}"
        )

@router.get("/fields", response_model=List[FieldResponse])
async def get_fields(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all fields for the farmer"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)
        
        # Get fields
        fields = db.query(Field).filter(
            Field.farmer_id == farmer_profile.id
        ).order_by(Field.created_at.desc()).all()
        
        return [
            FieldResponse(
                id=str(field.id),
                farmer_id=str(field.farmer_id),
                field_name=field.field_name,
                field_size=float(field.field_size),
                coordinates=field.coordinates,
                soil_type=field.soil_type,
                irrigation_type=field.irrigation_type,
                created_at=field.created_at.isoformat(),
                updated_at=field.updated_at.isoformat()
            )
            for field in fields
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching fields: {str(e)}"
        )

@router.get("/fields/{field_id}", response_model=FieldResponse)
async def get_field(
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific field details"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)
        
        # Get field
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found"
            )
        
        return FieldResponse(
            id=str(field.id),
            farmer_id=str(field.farmer_id),
            field_name=field.field_name,
            field_size=float(field.field_size),
            coordinates=field.coordinates,
            soil_type=field.soil_type,
            irrigation_type=field.irrigation_type,
            created_at=field.created_at.isoformat(),
            updated_at=field.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching field: {str(e)}"
        )

@router.put("/fields/{field_id}", response_model=FieldResponse)
async def update_field(
    field_id: str,
    field_data: FieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update field details"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)
        
        # Get field
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found"
            )
        
        # Update field fields
        if field_data.field_name is not None:
            field.field_name = field_data.field_name
        if field_data.field_size is not None:
            field.field_size = field_data.field_size
        if field_data.coordinates is not None:
            field.coordinates = field_data.coordinates
        if field_data.soil_type is not None:
            field.soil_type = field_data.soil_type
        if field_data.irrigation_type is not None:
            field.irrigation_type = field_data.irrigation_type
        
        db.commit()
        db.refresh(field)
        
        return FieldResponse(
            id=str(field.id),
            farmer_id=str(field.farmer_id),
            field_name=field.field_name,
            field_size=float(field.field_size),
            coordinates=field.coordinates,
            soil_type=field.soil_type,
            irrigation_type=field.irrigation_type,
            created_at=field.created_at.isoformat(),
            updated_at=field.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating field: {str(e)}"
        )

@router.delete("/fields/{field_id}")
async def delete_field(
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a field"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)
        
        # Get field
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found"
            )
        
        soil_reports = db.query(SoilReport).filter(SoilReport.field_id == field.id).all()
        for report in soil_reports:
            db.query(CropRecommendation).filter(
                CropRecommendation.soil_report_id == report.id
            ).delete(synchronize_session=False)
            db.delete(report)

        db.query(CropListing).filter(
            CropListing.field_id == field.id
        ).delete(synchronize_session=False)
        db.query(PestDetection).filter(
            PestDetection.field_id == field.id
        ).delete(synchronize_session=False)

        db.delete(field)
        db.commit()
        
        return {"message": "Field deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Field delete failed: %s", e)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting field: {str(e)}"
        )

@router.get("/geocode")
async def geocode_address(address: str):
    """Get coordinates for an address using Google Maps API"""
    try:
        if not gmaps:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Maps API key not configured"
            )
        geocode_result = gmaps.geocode(address)
        
        if geocode_result:
            location = geocode_result[0]['geometry']['location']
            formatted_address = geocode_result[0]['formatted_address']
            
            return {
                "address": formatted_address,
                "coordinates": {
                    "lat": location['lat'],
                    "lng": location['lng']
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error geocoding address: {str(e)}"
        )

@router.get("/reverse-geocode")
async def reverse_geocode(lat: float, lng: float):
    """Get address for coordinates using Google Maps API"""
    try:
        if not gmaps:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Maps API key not configured"
            )
        reverse_geocode_result = gmaps.reverse_geocode((lat, lng))
        
        if reverse_geocode_result:
            formatted_address = reverse_geocode_result[0]['formatted_address']
            
            return {
                "address": formatted_address,
                "coordinates": {
                    "lat": lat,
                    "lng": lng
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reverse geocoding: {str(e)}"
        )
