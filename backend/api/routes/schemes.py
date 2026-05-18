from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from api.database import get_db
from api.models.user_model import User, FarmerProfile, GovernmentScheme, SchemeApplication
from api.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class GovernmentSchemeResponse(BaseModel):
    id: str
    scheme_name: str
    state: Optional[str]
    description: str
    eligibility_criteria: dict
    benefits: dict
    application_process: str
    contact_info: dict
    is_active: bool
    created_at: datetime

class SchemeApplicationCreate(BaseModel):
    scheme_id: str
    application_data: dict

class SchemeApplicationResponse(BaseModel):
    id: str
    farmer_id: str
    scheme_id: str
    application_status: str
    application_data: dict
    submitted_at: datetime
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

# Routes
@router.get("/schemes", response_model=List[GovernmentSchemeResponse])
async def get_government_schemes(
    state: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get government schemes with optional state filter"""
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
        query = db.query(GovernmentScheme).filter(GovernmentScheme.is_active == True)
        
        if state:
            query = query.filter(GovernmentScheme.state.ilike(f"%{state}%"))
        
        schemes = query.order_by(GovernmentScheme.created_at.desc()).all()
        
        return [
            GovernmentSchemeResponse(
                id=str(scheme.id),
                scheme_name=scheme.scheme_name,
                state=scheme.state,
                description=scheme.description,
                eligibility_criteria=scheme.eligibility_criteria,
                benefits=scheme.benefits,
                application_process=scheme.application_process,
                contact_info=scheme.contact_info,
                is_active=scheme.is_active,
                created_at=scheme.created_at
            )
            for scheme in schemes
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching government schemes: {str(e)}"
        )

@router.get("/schemes/{scheme_id}", response_model=GovernmentSchemeResponse)
async def get_scheme_details(
    scheme_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific scheme"""
    try:
        scheme = db.query(GovernmentScheme).filter(
            GovernmentScheme.id == scheme_id,
            GovernmentScheme.is_active == True
        ).first()
        
        if not scheme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Government scheme not found"
            )
        
        return GovernmentSchemeResponse(
            id=str(scheme.id),
            scheme_name=scheme.scheme_name,
            state=scheme.state,
            description=scheme.description,
            eligibility_criteria=scheme.eligibility_criteria,
            benefits=scheme.benefits,
            application_process=scheme.application_process,
            contact_info=scheme.contact_info,
            is_active=scheme.is_active,
            created_at=scheme.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching scheme details: {str(e)}"
        )

@router.post("/applications", response_model=SchemeApplicationResponse)
async def create_scheme_application(
    application_data: SchemeApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new scheme application"""
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
        
        # Validate scheme exists
        scheme = db.query(GovernmentScheme).filter(
            GovernmentScheme.id == application_data.scheme_id,
            GovernmentScheme.is_active == True
        ).first()
        
        if not scheme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Government scheme not found"
            )
        
        # Check if application already exists
        existing_application = db.query(SchemeApplication).filter(
            SchemeApplication.farmer_id == farmer_profile.id,
            SchemeApplication.scheme_id == application_data.scheme_id
        ).first()
        
        if existing_application:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application already exists for this scheme"
            )
        
        # Create application
        application = SchemeApplication(
            farmer_id=farmer_profile.id,
            scheme_id=application_data.scheme_id,
            application_data=application_data.application_data
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        return SchemeApplicationResponse(
            id=str(application.id),
            farmer_id=str(application.farmer_id),
            scheme_id=str(application.scheme_id),
            application_status=application.application_status,
            application_data=application.application_data,
            submitted_at=application.submitted_at,
            approved_at=application.approved_at,
            rejection_reason=application.rejection_reason
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating scheme application: {str(e)}"
        )

@router.get("/applications/my", response_model=List[SchemeApplicationResponse])
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's scheme applications"""
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
        
        # Get applications
        applications = db.query(SchemeApplication).filter(
            SchemeApplication.farmer_id == farmer_profile.id
        ).order_by(SchemeApplication.submitted_at.desc()).all()
        
        return [
            SchemeApplicationResponse(
                id=str(application.id),
                farmer_id=str(application.farmer_id),
                scheme_id=str(application.scheme_id),
                application_status=application.application_status,
                application_data=application.application_data,
                submitted_at=application.submitted_at,
                approved_at=application.approved_at,
                rejection_reason=application.rejection_reason
            )
            for application in applications
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching applications: {str(e)}"
        )

@router.get("/applications/{application_id}", response_model=SchemeApplicationResponse)
async def get_application_details(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific application"""
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
        
        # Get application
        application = db.query(SchemeApplication).filter(
            SchemeApplication.id == application_id,
            SchemeApplication.farmer_id == farmer_profile.id
        ).first()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        return SchemeApplicationResponse(
            id=str(application.id),
            farmer_id=str(application.farmer_id),
            scheme_id=str(application.scheme_id),
            application_status=application.application_status,
            application_data=application.application_data,
            submitted_at=application.submitted_at,
            approved_at=application.approved_at,
            rejection_reason=application.rejection_reason
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching application details: {str(e)}"
        )

@router.get("/eligible-schemes", response_model=List[GovernmentSchemeResponse])
async def get_eligible_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get schemes eligible for the current farmer"""
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
        
        # Get all active schemes
        schemes = db.query(GovernmentScheme).filter(
            GovernmentScheme.is_active == True
        ).all()
        
        # Filter eligible schemes based on farmer's profile
        eligible_schemes = []
        for scheme in schemes:
            is_eligible = True
            
            # Check state eligibility
            if scheme.state and scheme.state.lower() != farmer_profile.farm_location.get("state", "").lower():
                is_eligible = False
            
            # Check other eligibility criteria
            eligibility_criteria = scheme.eligibility_criteria or {}
            
            # Check farm size eligibility
            if "min_farm_size" in eligibility_criteria:
                if farmer_profile.farm_size < eligibility_criteria["min_farm_size"]:
                    is_eligible = False
            
            # Check income eligibility
            if "max_annual_income" in eligibility_criteria:
                if farmer_profile.annual_income and farmer_profile.annual_income > eligibility_criteria["max_annual_income"]:
                    is_eligible = False
            
            # Check experience eligibility
            if "min_experience" in eligibility_criteria:
                if farmer_profile.farming_experience < eligibility_criteria["min_experience"]:
                    is_eligible = False
            
            if is_eligible:
                eligible_schemes.append(scheme)
        
        return [
            GovernmentSchemeResponse(
                id=str(scheme.id),
                scheme_name=scheme.scheme_name,
                state=scheme.state,
                description=scheme.description,
                eligibility_criteria=scheme.eligibility_criteria,
                benefits=scheme.benefits,
                application_process=scheme.application_process,
                contact_info=scheme.contact_info,
                is_active=scheme.is_active,
                created_at=scheme.created_at
            )
            for scheme in eligible_schemes
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching eligible schemes: {str(e)}"
        )
