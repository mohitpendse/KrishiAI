from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from api.database import get_db
from api.models.user_model import User, FarmerProfile, FinancialTransaction, Field
from api.routes.auth import get_current_user
from api.utils.ai_engine import AIEngine

router = APIRouter()
ai_engine = AIEngine()

# Pydantic models
class FinancialTransactionCreate(BaseModel):
    transaction_type: str  # expense, income, loan
    category: str
    amount: float
    description: Optional[str] = None
    field_id: Optional[str] = None
    transaction_date: Optional[date] = None
    payment_method: Optional[str] = None

class FinancialTransactionResponse(BaseModel):
    id: str
    farmer_id: str
    transaction_type: str
    category: str
    amount: float
    description: Optional[str]
    field_id: Optional[str]
    transaction_date: Optional[date]
    payment_method: Optional[str]
    created_at: datetime

class FinancialSummary(BaseModel):
    total_income: float
    total_expenses: float
    net_profit: float
    loan_amount: float
    monthly_summary: List[dict]
    category_breakdown: dict

class FinanceChatRequest(BaseModel):
    query: str
    context: dict = {}

class FinanceChatResponse(BaseModel):
    reply: str
    ai_enabled: bool

# Routes
@router.post("/transactions", response_model=FinancialTransactionResponse)
async def create_transaction(
    transaction_data: FinancialTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new financial transaction"""
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
        
        # Validate field ownership if field_id is provided
        if transaction_data.field_id:
            field = db.query(Field).filter(
                Field.id == transaction_data.field_id,
                Field.farmer_id == farmer_profile.id
            ).first()
            
            if not field:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Field not found or access denied"
                )
        
        # Create transaction
        transaction = FinancialTransaction(
            farmer_id=farmer_profile.id,
            transaction_type=transaction_data.transaction_type,
            category=transaction_data.category,
            amount=transaction_data.amount,
            description=transaction_data.description,
            field_id=transaction_data.field_id,
            transaction_date=transaction_data.transaction_date or date.today(),
            payment_method=transaction_data.payment_method
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return FinancialTransactionResponse(
            id=str(transaction.id),
            farmer_id=str(transaction.farmer_id),
            transaction_type=transaction.transaction_type,
            category=transaction.category,
            amount=float(transaction.amount),
            description=transaction.description,
            field_id=str(transaction.field_id) if transaction.field_id else None,
            transaction_date=transaction.transaction_date,
            payment_method=transaction.payment_method,
            created_at=transaction.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating transaction: {str(e)}"
        )

@router.get("/transactions", response_model=List[FinancialTransactionResponse])
async def get_transactions(
    transaction_type: Optional[str] = None,
    category: Optional[str] = None,
    field_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial transactions with filters"""
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
        query = db.query(FinancialTransaction).filter(
            FinancialTransaction.farmer_id == farmer_profile.id
        )
        
        if transaction_type:
            query = query.filter(FinancialTransaction.transaction_type == transaction_type)
        if category:
            query = query.filter(FinancialTransaction.category.ilike(f"%{category}%"))
        if field_id:
            query = query.filter(FinancialTransaction.field_id == field_id)
        if start_date:
            query = query.filter(FinancialTransaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(FinancialTransaction.transaction_date <= end_date)
        
        transactions = query.order_by(FinancialTransaction.transaction_date.desc()).all()
        
        return [
            FinancialTransactionResponse(
                id=str(transaction.id),
                farmer_id=str(transaction.farmer_id),
                transaction_type=transaction.transaction_type,
                category=transaction.category,
                amount=float(transaction.amount),
                description=transaction.description,
                field_id=str(transaction.field_id) if transaction.field_id else None,
                transaction_date=transaction.transaction_date,
                payment_method=transaction.payment_method,
                created_at=transaction.created_at
            )
            for transaction in transactions
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching transactions: {str(e)}"
        )

@router.get("/summary", response_model=FinancialSummary)
async def get_financial_summary(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial summary for the farmer"""
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
        
        # Get transactions
        query = db.query(FinancialTransaction).filter(
            FinancialTransaction.farmer_id == farmer_profile.id
        )
        
        if year:
            query = query.filter(
                FinancialTransaction.transaction_date >= date(year, 1, 1),
                FinancialTransaction.transaction_date <= date(year, 12, 31)
            )
        
        transactions = query.all()
        
        # Calculate summary
        total_income = sum(float(t.amount) for t in transactions if t.transaction_type == "income")
        total_expenses = sum(float(t.amount) for t in transactions if t.transaction_type == "expense")
        loan_amount = sum(float(t.amount) for t in transactions if t.transaction_type == "loan")
        net_profit = total_income - total_expenses
        
        # Monthly summary
        monthly_summary = {}
        for transaction in transactions:
            month_key = transaction.transaction_date.strftime("%Y-%m")
            if month_key not in monthly_summary:
                monthly_summary[month_key] = {"income": 0, "expense": 0, "loan": 0}
            
            if transaction.transaction_type == "income":
                monthly_summary[month_key]["income"] += float(transaction.amount)
            elif transaction.transaction_type == "expense":
                monthly_summary[month_key]["expense"] += float(transaction.amount)
            elif transaction.transaction_type == "loan":
                monthly_summary[month_key]["loan"] += float(transaction.amount)
        
        # Category breakdown
        category_breakdown = {}
        for transaction in transactions:
            if transaction.category not in category_breakdown:
                category_breakdown[transaction.category] = {"income": 0, "expense": 0, "loan": 0}
            
            if transaction.transaction_type == "income":
                category_breakdown[transaction.category]["income"] += float(transaction.amount)
            elif transaction.transaction_type == "expense":
                category_breakdown[transaction.category]["expense"] += float(transaction.amount)
            elif transaction.transaction_type == "loan":
                category_breakdown[transaction.category]["loan"] += float(transaction.amount)
        
        return FinancialSummary(
            total_income=total_income,
            total_expenses=total_expenses,
            net_profit=net_profit,
            loan_amount=loan_amount,
            monthly_summary=[
                {"month": month, **data} for month, data in monthly_summary.items()
            ],
            category_breakdown=category_breakdown
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching financial summary: {str(e)}"
        )

@router.post("/chat", response_model=FinanceChatResponse)
async def finance_chat(
    request: FinanceChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ask the OpenAI-backed finance assistant."""
    try:
        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == current_user.id
        ).first()

        context = {
            **request.context,
            "user_id": str(current_user.id),
            "farmer_profile_id": str(farmer_profile.id) if farmer_profile else None,
        }
        reply = await ai_engine.generate_finance_chat_reply(request.query, context)
        return FinanceChatResponse(reply=reply, ai_enabled=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI finance chat failed: {str(e)}"
        )

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a financial transaction"""
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
        
        # Get transaction
        transaction = db.query(FinancialTransaction).filter(
            FinancialTransaction.id == transaction_id,
            FinancialTransaction.farmer_id == farmer_profile.id
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        db.delete(transaction)
        db.commit()
        
        return {"message": "Transaction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting transaction: {str(e)}"
        )

@router.get("/categories")
async def get_transaction_categories():
    """Get list of common transaction categories"""
    try:
        categories = {
            "expense": [
                "Seeds",
                "Fertilizer",
                "Pesticides",
                "Labor",
                "Irrigation",
                "Machinery",
                "Fuel",
                "Transportation",
                "Storage",
                "Insurance",
                "Other"
            ],
            "income": [
                "Crop Sale",
                "Livestock Sale",
                "Government Subsidy",
                "Loan",
                "Other"
            ],
            "loan": [
                "Bank Loan",
                "Government Loan",
                "Private Loan",
                "Equipment Loan"
            ]
        }
        
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching categories: {str(e)}"
        )
