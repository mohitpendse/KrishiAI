from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import uuid

from api.database import get_db
from api.models.user_model import User, FarmerProfile, CropListing, MarketplaceOrder, Field
from api.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class CropListingCreate(BaseModel):
    field_id: str
    crop_name: str
    quantity: float
    price_per_kg: float
    quality_grade: Optional[str] = None
    harvest_date: Optional[date] = None
    location: str
    description: Optional[str] = None

class CropListingUpdate(BaseModel):
    crop_name: Optional[str] = None
    quantity: Optional[float] = None
    price_per_kg: Optional[float] = None
    quality_grade: Optional[str] = None
    harvest_date: Optional[date] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_available: Optional[bool] = None

class CropListingResponse(BaseModel):
    id: str
    farmer_id: str
    field_id: str
    crop_name: str
    quantity: float
    price_per_kg: float
    quality_grade: Optional[str]
    harvest_date: Optional[date]
    location: str
    images: List[str]
    description: Optional[str]
    is_available: bool
    created_at: datetime
    updated_at: datetime

class OrderCreate(BaseModel):
    listing_id: str
    quantity: float
    delivery_address: dict

class OrderResponse(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    quantity: float
    total_amount: float
    order_status: str
    payment_status: str
    delivery_address: dict
    order_date: datetime
    delivery_date: Optional[datetime]

# Routes
@router.post("/listings", response_model=CropListingResponse)
async def create_crop_listing(
    listing_data: CropListingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new crop listing"""
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
        
        # Validate field ownership
        field = db.query(Field).filter(
            Field.id == listing_data.field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found or access denied"
            )
        
        # Create crop listing
        listing = CropListing(
            farmer_id=farmer_profile.id,
            field_id=listing_data.field_id,
            crop_name=listing_data.crop_name,
            quantity=listing_data.quantity,
            price_per_kg=listing_data.price_per_kg,
            quality_grade=listing_data.quality_grade,
            harvest_date=listing_data.harvest_date,
            location=listing_data.location,
            description=listing_data.description
        )
        
        db.add(listing)
        db.commit()
        db.refresh(listing)
        
        return CropListingResponse(
            id=str(listing.id),
            farmer_id=str(listing.farmer_id),
            field_id=str(listing.field_id),
            crop_name=listing.crop_name,
            quantity=float(listing.quantity),
            price_per_kg=float(listing.price_per_kg),
            quality_grade=listing.quality_grade,
            harvest_date=listing.harvest_date,
            location=listing.location,
            images=listing.images or [],
            description=listing.description,
            is_available=listing.is_available,
            created_at=listing.created_at,
            updated_at=listing.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating crop listing: {str(e)}"
        )

@router.get("/listings", response_model=List[CropListingResponse])
async def get_crop_listings(
    crop_name: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get all available crop listings with filters"""
    try:
        query = db.query(CropListing).filter(CropListing.is_available == True)
        
        if crop_name:
            query = query.filter(CropListing.crop_name.ilike(f"%{crop_name}%"))
        if location:
            query = query.filter(CropListing.location.ilike(f"%{location}%"))
        if min_price:
            query = query.filter(CropListing.price_per_kg >= min_price)
        if max_price:
            query = query.filter(CropListing.price_per_kg <= max_price)
        
        listings = query.order_by(CropListing.created_at.desc()).all()
        
        return [
            CropListingResponse(
                id=str(listing.id),
                farmer_id=str(listing.farmer_id),
                field_id=str(listing.field_id),
                crop_name=listing.crop_name,
                quantity=float(listing.quantity),
                price_per_kg=float(listing.price_per_kg),
                quality_grade=listing.quality_grade,
                harvest_date=listing.harvest_date,
                location=listing.location,
                images=listing.images or [],
                description=listing.description,
                is_available=listing.is_available,
                created_at=listing.created_at,
                updated_at=listing.updated_at
            )
            for listing in listings
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching crop listings: {str(e)}"
        )

@router.get("/listings/my", response_model=List[CropListingResponse])
async def get_my_crop_listings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's crop listings"""
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
        
        # Get listings
        listings = db.query(CropListing).filter(
            CropListing.farmer_id == farmer_profile.id
        ).order_by(CropListing.created_at.desc()).all()
        
        return [
            CropListingResponse(
                id=str(listing.id),
                farmer_id=str(listing.farmer_id),
                field_id=str(listing.field_id),
                crop_name=listing.crop_name,
                quantity=float(listing.quantity),
                price_per_kg=float(listing.price_per_kg),
                quality_grade=listing.quality_grade,
                harvest_date=listing.harvest_date,
                location=listing.location,
                images=listing.images or [],
                description=listing.description,
                is_available=listing.is_available,
                created_at=listing.created_at,
                updated_at=listing.updated_at
            )
            for listing in listings
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching crop listings: {str(e)}"
        )

@router.put("/listings/{listing_id}", response_model=CropListingResponse)
async def update_crop_listing(
    listing_id: str,
    listing_data: CropListingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update crop listing"""
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
        
        # Get listing
        listing = db.query(CropListing).filter(
            CropListing.id == listing_id,
            CropListing.farmer_id == farmer_profile.id
        ).first()
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop listing not found"
            )
        
        # Update listing fields
        if listing_data.crop_name is not None:
            listing.crop_name = listing_data.crop_name
        if listing_data.quantity is not None:
            listing.quantity = listing_data.quantity
        if listing_data.price_per_kg is not None:
            listing.price_per_kg = listing_data.price_per_kg
        if listing_data.quality_grade is not None:
            listing.quality_grade = listing_data.quality_grade
        if listing_data.harvest_date is not None:
            listing.harvest_date = listing_data.harvest_date
        if listing_data.location is not None:
            listing.location = listing_data.location
        if listing_data.description is not None:
            listing.description = listing_data.description
        if listing_data.is_available is not None:
            listing.is_available = listing_data.is_available
        
        db.commit()
        db.refresh(listing)
        
        return CropListingResponse(
            id=str(listing.id),
            farmer_id=str(listing.farmer_id),
            field_id=str(listing.field_id),
            crop_name=listing.crop_name,
            quantity=float(listing.quantity),
            price_per_kg=float(listing.price_per_kg),
            quality_grade=listing.quality_grade,
            harvest_date=listing.harvest_date,
            location=listing.location,
            images=listing.images or [],
            description=listing.description,
            is_available=listing.is_available,
            created_at=listing.created_at,
            updated_at=listing.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating crop listing: {str(e)}"
        )

@router.delete("/listings/{listing_id}")
async def delete_crop_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete crop listing"""
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
        
        # Get listing
        listing = db.query(CropListing).filter(
            CropListing.id == listing_id,
            CropListing.farmer_id == farmer_profile.id
        ).first()
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop listing not found"
            )
        
        db.delete(listing)
        db.commit()
        
        return {"message": "Crop listing deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting crop listing: {str(e)}"
        )

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
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
        
        # Get listing
        listing = db.query(CropListing).filter(
            CropListing.id == order_data.listing_id,
            CropListing.is_available == True
        ).first()
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop listing not found or not available"
            )
        
        # Check if buyer is not the seller
        if listing.farmer_id == farmer_profile.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot order your own crop listing"
            )
        
        # Check quantity availability
        if order_data.quantity > listing.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested quantity exceeds available quantity"
            )
        
        # Calculate total amount
        total_amount = order_data.quantity * listing.price_per_kg
        
        # Create order
        order = MarketplaceOrder(
            listing_id=order_data.listing_id,
            buyer_id=farmer_profile.id,
            quantity=order_data.quantity,
            total_amount=total_amount,
            delivery_address=order_data.delivery_address
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        return OrderResponse(
            id=str(order.id),
            listing_id=str(order.listing_id),
            buyer_id=str(order.buyer_id),
            quantity=float(order.quantity),
            total_amount=float(order.total_amount),
            order_status=order.order_status,
            payment_status=order.payment_status,
            delivery_address=order.delivery_address,
            order_date=order.order_date,
            delivery_date=order.delivery_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating order: {str(e)}"
        )

@router.get("/orders/my", response_model=List[OrderResponse])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's orders"""
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
        
        # Get orders
        orders = db.query(MarketplaceOrder).filter(
            MarketplaceOrder.buyer_id == farmer_profile.id
        ).order_by(MarketplaceOrder.order_date.desc()).all()
        
        return [
            OrderResponse(
                id=str(order.id),
                listing_id=str(order.listing_id),
                buyer_id=str(order.buyer_id),
                quantity=float(order.quantity),
                total_amount=float(order.total_amount),
                order_status=order.order_status,
                payment_status=order.payment_status,
                delivery_address=order.delivery_address,
                order_date=order.order_date,
                delivery_date=order.delivery_date
            )
            for order in orders
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching orders: {str(e)}"
        )
