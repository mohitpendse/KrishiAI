#!/usr/bin/env python3
"""
Script to create a test user for login testing
Usage: cd backend && python create_test_user.py
"""
import sys
import os

# Add api directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(script_dir, 'api')
sys.path.insert(0, script_dir)
sys.path.insert(0, api_dir)

from api.database import SessionLocal
from api.models.user_model import User
from api.routes.auth import get_password_hash

def create_test_user():
    """Create a test user with mobile and password"""
    db = SessionLocal()
    try:
        # Test user credentials
        mobile = "9876543210"
        password = "test123"  # Short password to avoid bcrypt issues
        first_name = "Test"
        last_name = "User"
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.mobile == mobile).first()
        
        if existing_user:
            print(f"✅ User with mobile {mobile} already exists!")
            print("   You can login with:")
            print(f"   Mobile: {mobile}")
            print(f"   Password: {password}")
            
            # Update password if it doesn't exist
            if not existing_user.password_hash:
                existing_user.password_hash = get_password_hash(password)
                db.commit()
                print("   ✅ Password has been set!")
            return
        
        # Create new user
        new_user = User(
            mobile=mobile,
            first_name=first_name,
            last_name=last_name,
            password_hash=get_password_hash(password),
            is_verified=True,
            preferred_language="en"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ Test user created successfully!")
        print("\n📋 Login Credentials:")
        print(f"   Mobile: {mobile}")
        print(f"   Password: {password}")
        print("\n💡 You can now login using these credentials")
        
    except Exception as e:
        print(f"❌ Error creating test user: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creating test user...")
    create_test_user()

