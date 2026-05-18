from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from api.database import get_db
from api.models.user_model import User, FarmerProfile, AIAlert
from api.routes.auth import get_current_user
from api.utils.ai_engine import AIEngine

router = APIRouter()
ai_engine = AIEngine()

# Pydantic models
class AIAlertResponse(BaseModel):
    id: str
    farmer_id: str
    alert_type: str
    title: str
    message: str
    priority: str
    is_read: bool
    action_required: bool
    created_at: datetime

class AlertSummary(BaseModel):
    total_alerts: int
    unread_alerts: int
    high_priority_alerts: int
    alerts_by_type: dict

# Routes
@router.get("/alerts", response_model=List[AIAlertResponse])
async def get_alerts(
    alert_type: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI alerts for the current farmer"""
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
        query = db.query(AIAlert).filter(AIAlert.farmer_id == farmer_profile.id)
        
        if alert_type:
            query = query.filter(AIAlert.alert_type == alert_type)
        if priority:
            query = query.filter(AIAlert.priority == priority)
        if is_read is not None:
            query = query.filter(AIAlert.is_read == is_read)
        
        alerts = query.order_by(AIAlert.created_at.desc()).all()
        
        return [
            AIAlertResponse(
                id=str(alert.id),
                farmer_id=str(alert.farmer_id),
                alert_type=alert.alert_type,
                title=alert.title,
                message=alert.message,
                priority=alert.priority,
                is_read=alert.is_read,
                action_required=alert.action_required,
                created_at=alert.created_at
            )
            for alert in alerts
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching alerts: {str(e)}"
        )

@router.get("/alerts/summary", response_model=AlertSummary)
async def get_alert_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert summary for the current farmer"""
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
        
        # Get all alerts
        alerts = db.query(AIAlert).filter(AIAlert.farmer_id == farmer_profile.id).all()
        
        # Calculate summary
        total_alerts = len(alerts)
        unread_alerts = len([a for a in alerts if not a.is_read])
        high_priority_alerts = len([a for a in alerts if a.priority in ["high", "urgent"]])
        
        # Count by type
        alerts_by_type = {}
        for alert in alerts:
            if alert.alert_type not in alerts_by_type:
                alerts_by_type[alert.alert_type] = 0
            alerts_by_type[alert.alert_type] += 1
        
        return AlertSummary(
            total_alerts=total_alerts,
            unread_alerts=unread_alerts,
            high_priority_alerts=high_priority_alerts,
            alerts_by_type=alerts_by_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching alert summary: {str(e)}"
        )

@router.put("/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an alert as read"""
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
        
        # Get alert
        alert = db.query(AIAlert).filter(
            AIAlert.id == alert_id,
            AIAlert.farmer_id == farmer_profile.id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Mark as read
        alert.is_read = True
        db.commit()
        
        return {"message": "Alert marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking alert as read: {str(e)}"
        )

@router.put("/alerts/mark-all-read")
async def mark_all_alerts_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all alerts as read for the current farmer"""
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
        
        # Mark all alerts as read
        db.query(AIAlert).filter(
            AIAlert.farmer_id == farmer_profile.id,
            AIAlert.is_read == False
        ).update({"is_read": True})
        
        db.commit()
        
        return {"message": "All alerts marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking all alerts as read: {str(e)}"
        )

@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an alert"""
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
        
        # Get alert
        alert = db.query(AIAlert).filter(
            AIAlert.id == alert_id,
            AIAlert.farmer_id == farmer_profile.id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        db.delete(alert)
        db.commit()
        
        return {"message": "Alert deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting alert: {str(e)}"
        )

@router.post("/generate-alerts")
async def generate_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate new AI alerts for the current farmer"""
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
        
        # Generate alerts using AI engine
        location = farmer_profile.farm_location.get("state", "India")
        crops = farmer_profile.primary_crops or []
        
        alerts = await ai_engine.generate_farming_alerts(
            str(farmer_profile.id),
            location,
            crops
        )
        
        # Save alerts to database
        created_alerts = []
        for alert_data in alerts:
            alert = AIAlert(
                farmer_id=farmer_profile.id,
                alert_type=alert_data["type"],
                title=alert_data["title"],
                message=alert_data["message"],
                priority=alert_data["priority"],
                action_required=alert_data.get("action_required", False)
            )
            db.add(alert)
            created_alerts.append(alert)
        
        db.commit()
        
        return {
            "message": f"Successfully generated {len(created_alerts)} alerts",
            "alerts_count": len(created_alerts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating alerts: {str(e)}"
        )

@router.get("/alert-types")
async def get_alert_types():
    """Get list of available alert types"""
    try:
        alert_types = [
            {
                "type": "weather",
                "name": "Weather Alert",
                "description": "Weather-related alerts and recommendations",
                "icon": "🌦️"
            },
            {
                "type": "pest",
                "name": "Pest Alert",
                "description": "Pest and disease detection alerts",
                "icon": "🐛"
            },
            {
                "type": "market",
                "name": "Market Alert",
                "description": "Market price and demand alerts",
                "icon": "💰"
            },
            {
                "type": "irrigation",
                "name": "Irrigation Alert",
                "description": "Irrigation and water management alerts",
                "icon": "💧"
            },
            {
                "type": "fertilizer",
                "name": "Fertilizer Alert",
                "description": "Fertilizer application and soil health alerts",
                "icon": "🌱"
            },
            {
                "type": "harvest",
                "name": "Harvest Alert",
                "description": "Harvest timing and preparation alerts",
                "icon": "🌾"
            }
        ]
        
        return {"alert_types": alert_types}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching alert types: {str(e)}"
        )
