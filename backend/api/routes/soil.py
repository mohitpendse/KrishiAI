from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import logging
import traceback
from datetime import datetime

from api.database import get_db
from api.models.user_model import User, FarmerProfile, Field, SoilReport, CropRecommendation
from api.routes.auth import get_current_user
from api.utils.ai_engine import AIEngine

router = APIRouter()
ai_engine = AIEngine()
logger = logging.getLogger(__name__)

def get_field_state(field: Field) -> str:
    farm_location = field.farmer.farm_location if field.farmer else None
    return farm_location.get("state", "") if isinstance(farm_location, dict) else ""

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

# Pydantic models
class SoilReportResponse(BaseModel):
    id: str
    field_id: str
    report_type: str
    file_path: Optional[str]
    analysis_data: dict
    ph_level: Optional[float]
    moisture_content: Optional[float]
    nitrogen_content: Optional[float]
    phosphorus_content: Optional[float]
    potassium_content: Optional[float]
    organic_matter: Optional[float]
    created_at: datetime

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

class SoilAnalysisRequest(BaseModel):
    field_id: str
    analysis_type: str  # image, video, lab_report

# Routes
@router.post("/upload-image")
async def upload_soil_image(
    field_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload soil image for AI analysis"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)

        # Validate field ownership
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found or access denied"
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = "uploads/soil_images"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Analyze image with AI
        analysis_result = await ai_engine.analyze_soil_image(file_path)
        
        if "error" in analysis_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=analysis_result["error"]
            )
        if analysis_result.get("soil_type") and analysis_result.get("soil_type") != "Unknown":
            field.soil_type = analysis_result.get("soil_type")
        
        # Save soil report to database
        soil_report = SoilReport(
            field_id=field_id,
            report_type="image",
            file_path=file_path,
            analysis_data=analysis_result,
            ph_level=analysis_result.get("ph_level"),
            moisture_content=analysis_result.get("moisture_content"),
            nitrogen_content=analysis_result.get("nitrogen_content"),
            phosphorus_content=analysis_result.get("phosphorus_content"),
            potassium_content=analysis_result.get("potassium_content"),
            organic_matter=analysis_result.get("organic_matter")
        )
        
        db.add(soil_report)
        db.commit()
        db.refresh(soil_report)
        
        # Generate crop recommendations
        recommendations = await ai_engine.recommend_crops(
            analysis_result, 
            get_field_state(field), 
            "current",
            {
                "field_size": float(field.field_size or 0),
                "irrigation_type": field.irrigation_type,
                "soil_type": field.soil_type,
                "coordinates": field.coordinates or {},
            }
        )
        
        # Save recommendations to database
        for rec in recommendations:
            crop_rec = CropRecommendation(
                soil_report_id=soil_report.id,
                crop_name=rec["crop_name"],
                suitability_score=rec["suitability_score"],
                expected_yield=rec["expected_yield"],
                profit_margin=rec["profit_margin"],
                sowing_season=rec["sowing_season"],
                harvest_season=rec["harvest_season"],
                fertilizer_recommendations=rec["fertilizer_recommendations"],
                irrigation_schedule=rec["irrigation_schedule"]
            )
            db.add(crop_rec)
        
        db.commit()
        
        return {
            "message": "Soil image analyzed successfully",
            "soil_report_id": str(soil_report.id),
            "analysis_result": analysis_result,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing soil image: {str(e)}"
        )

@router.post("/upload-video")
async def upload_soil_video(
    field_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload soil video for AI analysis"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)

        # Validate field ownership
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found or access denied"
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = "uploads/soil_videos"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Analyze video with AI
        analysis_result = await ai_engine.analyze_soil_video(file_path)
        
        if "error" in analysis_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=analysis_result["error"]
            )
        if analysis_result.get("soil_type") and analysis_result.get("soil_type") != "Unknown":
            field.soil_type = analysis_result.get("soil_type")
        
        # Save soil report to database
        soil_report = SoilReport(
            field_id=field_id,
            report_type="video",
            file_path=file_path,
            analysis_data=analysis_result,
            ph_level=analysis_result.get("ph_level"),
            moisture_content=analysis_result.get("moisture_content"),
            nitrogen_content=analysis_result.get("nitrogen_content"),
            phosphorus_content=analysis_result.get("phosphorus_content"),
            potassium_content=analysis_result.get("potassium_content"),
            organic_matter=analysis_result.get("organic_matter")
        )
        
        db.add(soil_report)
        db.commit()
        db.refresh(soil_report)
        
        # Generate crop recommendations
        recommendations = await ai_engine.recommend_crops(
            analysis_result, 
            get_field_state(field), 
            "current",
            {
                "field_size": float(field.field_size or 0),
                "irrigation_type": field.irrigation_type,
                "soil_type": field.soil_type,
                "coordinates": field.coordinates or {},
            }
        )
        
        # Save recommendations to database
        for rec in recommendations:
            crop_rec = CropRecommendation(
                soil_report_id=soil_report.id,
                crop_name=rec["crop_name"],
                suitability_score=rec["suitability_score"],
                expected_yield=rec["expected_yield"],
                profit_margin=rec["profit_margin"],
                sowing_season=rec["sowing_season"],
                harvest_season=rec["harvest_season"],
                fertilizer_recommendations=rec["fertilizer_recommendations"],
                irrigation_schedule=rec["irrigation_schedule"]
            )
            db.add(crop_rec)
        
        db.commit()
        
        return {
            "message": "Soil video analyzed successfully",
            "soil_report_id": str(soil_report.id),
            "analysis_result": analysis_result,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing soil video: {str(e)}"
        )

@router.post("/upload-lab-report")
async def upload_lab_report(
    field_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload lab soil report"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)

        # Validate field ownership
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found or access denied"
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = "uploads/lab_reports"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        original_filename = file.filename or "lab-report.pdf"
        file_extension = original_filename.rsplit('.', 1)[-1] if '.' in original_filename else 'pdf'
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        analysis_result = await ai_engine.analyze_lab_report(file_path)
        
        if "error" in analysis_result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=analysis_result["error"]
            )
        if analysis_result.get("soil_type") and analysis_result.get("soil_type") != "Unknown":
            field.soil_type = analysis_result.get("soil_type")
        
        # Save soil report to database
        soil_report = SoilReport(
            field_id=field_id,
            report_type="lab",
            file_path=file_path,
            analysis_data=analysis_result,
            ph_level=analysis_result.get("ph_level"),
            moisture_content=analysis_result.get("moisture_content"),
            nitrogen_content=analysis_result.get("nitrogen_content"),
            phosphorus_content=analysis_result.get("phosphorus_content"),
            potassium_content=analysis_result.get("potassium_content"),
            organic_matter=analysis_result.get("organic_matter")
        )
        
        db.add(soil_report)
        db.commit()
        db.refresh(soil_report)
        
        recommendations = []
        try:
            recommendations = await ai_engine.recommend_crops(
                analysis_result,
                get_field_state(field),
                "current",
                {
                    "field_size": float(field.field_size or 0),
                    "irrigation_type": field.irrigation_type,
                    "soil_type": field.soil_type,
                    "coordinates": field.coordinates or {},
                }
            )

            for rec in recommendations:
                crop_rec = CropRecommendation(
                    soil_report_id=soil_report.id,
                    crop_name=rec.get("crop_name", "Crop"),
                    suitability_score=rec.get("suitability_score", 0),
                    expected_yield=rec.get("expected_yield", 0),
                    profit_margin=rec.get("profit_margin", 0),
                    sowing_season=rec.get("sowing_season", ""),
                    harvest_season=rec.get("harvest_season", ""),
                    fertilizer_recommendations=rec.get("fertilizer_recommendations", {}),
                    irrigation_schedule=rec.get("irrigation_schedule", {})
                )
                db.add(crop_rec)

            db.commit()
        except Exception as rec_error:
            logger.error("Crop recommendation generation failed after lab upload: %s", rec_error)
            logger.error(traceback.format_exc())
            db.rollback()
            recommendations = []
        
        return {
            "message": "Lab report uploaded and analyzed successfully",
            "soil_report_id": str(soil_report.id),
            "analysis_result": analysis_result,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Lab report upload failed: %s", e)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading lab report: {str(e)}"
        )

@router.get("/reports/{field_id}", response_model=List[SoilReportResponse])
async def get_soil_reports(
    field_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all soil reports for a field"""
    try:
        farmer_profile = get_or_create_farmer_profile(current_user, db)

        # Validate field ownership
        field = db.query(Field).filter(
            Field.id == field_id,
            Field.farmer_id == farmer_profile.id
        ).first()
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found or access denied"
            )
        
        # Get soil reports
        reports = db.query(SoilReport).filter(
            SoilReport.field_id == field_id
        ).order_by(SoilReport.created_at.desc()).all()
        
        return [
            SoilReportResponse(
                id=str(report.id),
                field_id=str(report.field_id),
                report_type=report.report_type,
                file_path=report.file_path,
                analysis_data=report.analysis_data,
                ph_level=float(report.ph_level) if report.ph_level else None,
                moisture_content=float(report.moisture_content) if report.moisture_content else None,
                nitrogen_content=float(report.nitrogen_content) if report.nitrogen_content else None,
                phosphorus_content=float(report.phosphorus_content) if report.phosphorus_content else None,
                potassium_content=float(report.potassium_content) if report.potassium_content else None,
                organic_matter=float(report.organic_matter) if report.organic_matter else None,
                created_at=report.created_at
            )
            for report in reports
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching soil reports: {str(e)}"
        )

@router.get("/recommendations/{soil_report_id}", response_model=List[CropRecommendationResponse])
async def get_crop_recommendations(
    soil_report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get crop recommendations for a soil report"""
    try:
        # Validate soil report ownership
        soil_report = db.query(SoilReport).join(Field).filter(
            SoilReport.id == soil_report_id,
            Field.farmer_id == get_or_create_farmer_profile(current_user, db).id
        ).first()
        
        if not soil_report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Soil report not found or access denied"
            )
        
        # Get crop recommendations
        recommendations = db.query(CropRecommendation).filter(
            CropRecommendation.soil_report_id == soil_report_id
        ).order_by(CropRecommendation.suitability_score.desc()).all()
        
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
