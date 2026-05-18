import requests
import json
import logging
from typing import Dict, Any
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

async def send_otp_sms(mobile: str, otp_code: str) -> bool:
    """Send OTP via SMS using Twilio or similar service"""
    try:
        # Mock SMS sending - in production, integrate with Twilio
        logger.info(f"Sending OTP {otp_code} to {mobile}")
        print(f"KrishiAI OTP for {mobile}: {otp_code}")
        
        # Example Twilio integration:
        # from twilio.rest import Client
        # account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        # auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        # client = Client(account_sid, auth_token)
        # 
        # message = client.messages.create(
        #     body=f"Your KrishiAI OTP is: {otp_code}",
        #     from_=os.getenv("TWILIO_PHONE_NUMBER"),
        #     to=f"+91{mobile}"
        # )
        
        return True
    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        return False

async def send_otp_email(email: str, otp_code: str) -> bool:
    """Send OTP via SMTP. Falls back to terminal output when SMTP is not configured."""
    try:
        smtp_host = os.getenv("SMTP_HOST", "").strip()
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "no-reply@krishiai.local").strip()

        if not smtp_host or not smtp_username or not smtp_password:
            print(f"KrishiAI email OTP for {email}: {otp_code}")
            return True

        message = EmailMessage()
        message["Subject"] = "Your KrishiAI verification code"
        message["From"] = smtp_from
        message["To"] = email
        message.set_content(
            f"Your KrishiAI verification code is {otp_code}.\n\n"
            "This code expires in 5 minutes."
        )

        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)

        return True
    except Exception as e:
        logger.error(f"Error sending email OTP: {e}")
        return False

def validate_mobile_number(mobile: str) -> bool:
    """Validate Indian mobile number format"""
    if not mobile.isdigit():
        return False
    if len(mobile) != 10:
        return False
    if not mobile.startswith(('6', '7', '8', '9')):
        return False
    return True

def validate_email(email: str) -> bool:
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def format_currency(amount: float, currency: str = "INR") -> str:
    """Format currency amount"""
    if currency == "INR":
        return f"₹{amount:,.2f}"
    else:
        return f"{currency} {amount:,.2f}"

def format_date(date_obj) -> str:
    """Format date object to string"""
    if hasattr(date_obj, 'strftime'):
        return date_obj.strftime("%d %B %Y")
    return str(date_obj)

def format_datetime(datetime_obj) -> str:
    """Format datetime object to string"""
    if hasattr(datetime_obj, 'strftime'):
        return datetime_obj.strftime("%d %B %Y, %I:%M %p")
    return str(datetime_obj)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers"""
    from math import radians, cos, sin, asin, sqrt
    
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename with timestamp"""
    import uuid
    from datetime import datetime
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    file_extension = original_filename.split('.')[-1] if '.' in original_filename else ''
    
    if file_extension:
        return f"{timestamp}_{unique_id}.{file_extension}"
    else:
        return f"{timestamp}_{unique_id}"

def sanitize_filename(filename: str) -> str:
    """Sanitize filename by removing special characters"""
    import re
    # Remove special characters except dots and hyphens
    sanitized = re.sub(r'[^\w\-_\.]', '_', filename)
    return sanitized

def get_file_size_mb(file_path: str) -> float:
    """Get file size in MB"""
    import os
    if os.path.exists(file_path):
        size_bytes = os.path.getsize(file_path)
        return size_bytes / (1024 * 1024)
    return 0.0

def validate_file_type(filename: str, allowed_extensions: list) -> bool:
    """Validate file type based on extension"""
    if not filename:
        return False
    
    file_extension = filename.split('.')[-1].lower()
    return file_extension in allowed_extensions

def compress_image(image_path: str, max_size_mb: float = 2.0) -> str:
    """Compress image to reduce file size"""
    try:
        from PIL import Image
        import os
        
        # Open image
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Calculate compression quality
            original_size = get_file_size_mb(image_path)
            if original_size <= max_size_mb:
                return image_path
            
            # Calculate quality based on size reduction needed
            quality = int((max_size_mb / original_size) * 100)
            quality = max(10, min(95, quality))  # Keep quality between 10-95
            
            # Create compressed version
            compressed_path = image_path.replace('.', '_compressed.')
            img.save(compressed_path, 'JPEG', quality=quality, optimize=True)
            
            # Replace original if compressed version is smaller
            if get_file_size_mb(compressed_path) < original_size:
                os.replace(compressed_path, image_path)
                return image_path
            else:
                os.remove(compressed_path)
                return image_path
                
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        return image_path

def translate_text(text: str, target_language: str = "hi") -> str:
    """Translate text to target language"""
    try:
        from googletrans import Translator
        
        if target_language == "en":
            return text
        
        translator = Translator()
        result = translator.translate(text, dest=target_language)
        return result.text
        
    except Exception as e:
        logger.error(f"Error translating text: {e}")
        return text

def get_weather_emoji(weather_condition: str) -> str:
    """Get weather emoji based on condition"""
    weather_emojis = {
        "clear sky": "☀️",
        "few clouds": "⛅",
        "scattered clouds": "☁️",
        "broken clouds": "☁️",
        "shower rain": "🌦️",
        "rain": "🌧️",
        "thunderstorm": "⛈️",
        "snow": "❄️",
        "mist": "🌫️",
        "fog": "🌫️"
    }
    
    return weather_emojis.get(weather_condition.lower(), "🌤️")

def get_priority_color(priority: str) -> str:
    """Get color code for priority level"""
    priority_colors = {
        "low": "#28a745",      # Green
        "medium": "#ffc107",   # Yellow
        "high": "#fd7e14",     # Orange
        "urgent": "#dc3545"    # Red
    }
    
    return priority_colors.get(priority.lower(), "#6c757d")

def format_phone_number(phone: str) -> str:
    """Format phone number with country code"""
    if len(phone) == 10 and phone.isdigit():
        return f"+91 {phone[:5]} {phone[5:]}"
    return phone

def mask_sensitive_data(data: str, mask_char: str = "*") -> str:
    """Mask sensitive data like phone numbers or emails"""
    if "@" in data:  # Email
        username, domain = data.split("@")
        masked_username = username[0] + mask_char * (len(username) - 2) + username[-1]
        return f"{masked_username}@{domain}"
    elif len(data) == 10 and data.isdigit():  # Phone
        return f"{data[:2]}{mask_char * 6}{data[-2:]}"
    else:
        return mask_char * len(data)

def calculate_age_in_years(birth_date) -> int:
    """Calculate age in years from birth date"""
    from datetime import date
    
    if isinstance(birth_date, str):
        birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
    
    today = date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age

def get_season_from_date(date_obj) -> str:
    """Get season from date"""
    month = date_obj.month
    
    if month in [12, 1, 2]:
        return "Winter"
    elif month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    else:
        return "Autumn"

def is_valid_coordinate(lat: float, lng: float) -> bool:
    """Validate if coordinates are valid"""
    return -90 <= lat <= 90 and -180 <= lng <= 180

def generate_qr_code(data: str) -> str:
    """Generate QR code for given data"""
    try:
        import qrcode
        from io import BytesIO
        import base64
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{qr_code_base64}"
        
    except Exception as e:
        logger.error(f"Error generating QR code: {e}")
        return ""
