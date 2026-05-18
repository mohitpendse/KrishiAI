from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional
import random
import string
import hashlib
import re
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import requests
import os
from dotenv import load_dotenv
import bcrypt

from api.database import get_db
from api.models.user_model import User, OTPVerification, FarmerProfile
from api.utils.helpers import send_otp_sms, send_otp_email

load_dotenv()

router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic models
class OTPRequest(BaseModel):
    mobile: str
    
    @validator('mobile')
    def validate_mobile(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Mobile number must be 10 digits')
        return v

class OTPVerify(BaseModel):
    mobile: str
    otp_code: str

class EmailOTPRequest(BaseModel):
    email: str

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v or ''):
            raise ValueError('Valid email is required')
        return v.lower().strip()

class EmailOTPVerify(BaseModel):
    email: str
    otp_code: str

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v or ''):
            raise ValueError('Valid email is required')
        return v.lower().strip()

class UserRegister(BaseModel):
    mobile: str
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    preferred_language: str = "en"
    farm_location: Optional[dict] = None

class UserLogin(BaseModel):
    mobile: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str

class UserResponse(BaseModel):
    id: str
    mobile: str
    email: Optional[str]
    first_name: str
    last_name: Optional[str]
    preferred_language: str
    is_verified: bool

# Helper functions
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def email_to_mobile_key(email: str) -> str:
    digest = hashlib.sha256(email.lower().encode("utf-8")).hexdigest()
    return "9" + str(int(digest[:12], 16) % 1_000_000_000).zfill(9)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    # Use bcrypt directly to avoid passlib issues
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password, hashed_password)

def get_password_hash(password):
    # Use bcrypt directly to avoid passlib issues
    if isinstance(password, str):
        password = password.encode('utf-8')
    # Truncate to 72 bytes (bcrypt limit)
    password = password[:72]
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), 
                    db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Routes
@router.post("/send-otp", response_model=dict)
async def send_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP to mobile number"""
    try:
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        # Store OTP in database
        otp_record = OTPVerification(
            mobile=request.mobile,
            otp_code=otp_code,
            expires_at=expires_at
        )
        db.add(otp_record)
        db.commit()
        
        # Send OTP via SMS (mock implementation)
        # In production, integrate with SMS service like Twilio
        sms_sent = await send_otp_sms(request.mobile, otp_code)
        
        if sms_sent:
            return {
                "message": "OTP sent successfully",
                "mobile": request.mobile,
                "expires_in": 300  # 5 minutes
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending OTP: {str(e)}"
        )

@router.post("/verify-otp", response_model=dict)
async def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and create/update user"""
    try:
        # Find OTP record
        otp_record = db.query(OTPVerification).filter(
            OTPVerification.mobile == request.mobile,
            OTPVerification.otp_code == request.otp_code,
            OTPVerification.is_verified == False,
            OTPVerification.expires_at > datetime.utcnow()
        ).first()
        
        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        # Mark OTP as verified
        otp_record.is_verified = True
        db.commit()
        
        # Check if user exists
        user = db.query(User).filter(User.mobile == request.mobile).first()
        
        if not user:
            # Create new user
            user = User(
                mobile=request.mobile,
                first_name="",
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "message": "OTP verified successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "is_new_user": not bool(user.first_name)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying OTP: {str(e)}"
        )

@router.post("/send-email-otp", response_model=dict)
async def send_email_otp(request: EmailOTPRequest, db: Session = Depends(get_db)):
    """Send OTP to email address"""
    try:
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        otp_record = OTPVerification(
            mobile=request.email,
            otp_code=otp_code,
            expires_at=expires_at
        )
        db.add(otp_record)
        db.commit()

        email_sent = await send_otp_email(request.email, otp_code)
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email OTP"
            )

        return {
            "message": "OTP sent successfully",
            "email": request.email,
            "expires_in": 300
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending email OTP: {str(e)}"
        )

@router.post("/verify-email-otp", response_model=dict)
async def verify_email_otp(request: EmailOTPVerify, db: Session = Depends(get_db)):
    """Verify email OTP and create/update user shell"""
    try:
        otp_record = db.query(OTPVerification).filter(
            OTPVerification.mobile == request.email,
            OTPVerification.otp_code == request.otp_code,
            OTPVerification.is_verified == False,
            OTPVerification.expires_at > datetime.utcnow()
        ).first()

        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        otp_record.is_verified = True

        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            user = User(
                mobile=email_to_mobile_key(request.email),
                email=request.email,
                first_name="",
                is_verified=True
            )
            db.add(user)
        else:
            user.is_verified = True

        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})
        return {
            "message": "Email verified successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "is_new_user": not bool(user.first_name)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying email OTP: {str(e)}"
        )

@router.post("/register", response_model=Token)
async def register_user(request: UserRegister, db: Session = Depends(get_db)):
    """Complete user registration"""
    try:
        user = db.query(User).filter(User.mobile == request.mobile).first()
        
        if user and user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists. Please login."
            )

        if not user:
            user = User(
                mobile=request.mobile,
                first_name=request.first_name,
                is_verified=True
            )
            db.add(user)
        
        # Update user details
        user.email = request.email.lower().strip() if request.email else None
        user.mobile = request.mobile
        user.first_name = request.first_name
        user.last_name = request.last_name
        user.preferred_language = request.preferred_language
        user.is_verified = True
        
        if request.password:
            user.password_hash = get_password_hash(request.password)

        if request.farm_location:
            db.flush()
            farmer_profile = db.query(FarmerProfile).filter(
                FarmerProfile.user_id == user.id
            ).first()
            if not farmer_profile:
                farmer_profile = FarmerProfile(
                    user_id=user.id,
                    farm_location=request.farm_location,
                    primary_crops=[],
                )
                db.add(farmer_profile)
            else:
                farmer_profile.farm_location = request.farm_location
        
        db.commit()
        db.refresh(user)
        
        access_token = create_access_token(data={"sub": str(user.id)})
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering user: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login_user(request: UserLogin, db: Session = Depends(get_db)):
    """Login with mobile and password"""
    try:
        identifier = request.mobile.strip().lower()
        if "@" in identifier:
            user = db.query(User).filter(User.email == identifier).first()
        else:
            user = db.query(User).filter(User.mobile == request.mobile).first()
        
        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging in: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user.id),
        mobile=current_user.mobile,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        preferred_language=current_user.preferred_language,
        is_verified=current_user.is_verified
    )

@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Logout user (client should remove token)"""
    return {"message": "Logged out successfully"}

@router.post("/refresh-token", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token"""
    access_token = create_access_token(data={"sub": str(current_user.id)})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=str(current_user.id)
    )
