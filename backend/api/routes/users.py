from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from api.database import get_db
from api.models.user_model import User, FarmerProfile
from api.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    preferred_language: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    mobile: str
    email: Optional[str]
    first_name: str
    last_name: Optional[str]
    preferred_language: str
    is_verified: bool
    created_at: str
    farm_location: Optional[dict] = None

# Routes
@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    farm_location = current_user.farmer_profile.farm_location if current_user.farmer_profile else None
    return UserResponse(
        id=str(current_user.id),
        mobile=current_user.mobile,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        preferred_language=current_user.preferred_language,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat(),
        farm_location=farm_location
    )

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        # Update user fields
        if user_data.first_name is not None:
            current_user.first_name = user_data.first_name
        if user_data.last_name is not None:
            current_user.last_name = user_data.last_name
        if user_data.email is not None:
            current_user.email = user_data.email
        if user_data.preferred_language is not None:
            current_user.preferred_language = user_data.preferred_language
        
        db.commit()
        db.refresh(current_user)
        
        return UserResponse(
            id=str(current_user.id),
            mobile=current_user.mobile,
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            preferred_language=current_user.preferred_language,
            is_verified=current_user.is_verified,
            created_at=current_user.created_at.isoformat(),
            farm_location=current_user.farmer_profile.farm_location if current_user.farmer_profile else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user profile: {str(e)}"
        )

@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account"""
    try:
        db.delete(current_user)
        db.commit()
        
        return {"message": "Account deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting account: {str(e)}"
        )
