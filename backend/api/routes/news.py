from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import asyncio
import aiohttp

from api.database import get_db
from api.models.user_model import User, NewsArticle
from api.routes.auth import get_current_user

router = APIRouter()

# Pydantic models
class NewsArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    source: str
    category: str
    language: str
    translated_content: dict
    published_at: Optional[datetime]
    created_at: datetime

class NewsSummary(BaseModel):
    total_articles: int
    categories: dict
    latest_articles: List[NewsArticleResponse]

# Routes
@router.get("/articles", response_model=List[NewsArticleResponse])
async def get_news_articles(
    category: Optional[str] = None,
    language: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get news articles with optional filters"""
    try:
        query = db.query(NewsArticle)
        
        if category:
            query = query.filter(NewsArticle.category == category)
        if language:
            query = query.filter(NewsArticle.language == language)
        
        articles = query.order_by(NewsArticle.published_at.desc()).limit(limit).all()
        
        return [
            NewsArticleResponse(
                id=str(article.id),
                title=article.title,
                content=article.content,
                source=article.source,
                category=article.category,
                language=article.language,
                translated_content=article.translated_content or {},
                published_at=article.published_at,
                created_at=article.created_at
            )
            for article in articles
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching news articles: {str(e)}"
        )

@router.get("/articles/{article_id}", response_model=NewsArticleResponse)
async def get_article_details(
    article_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific article"""
    try:
        article = db.query(NewsArticle).filter(
            NewsArticle.id == article_id
        ).first()
        
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found"
            )
        
        return NewsArticleResponse(
            id=str(article.id),
            title=article.title,
            content=article.content,
            source=article.source,
            category=article.category,
            language=article.language,
            translated_content=article.translated_content or {},
            published_at=article.published_at,
            created_at=article.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching article details: {str(e)}"
        )

@router.get("/summary", response_model=NewsSummary)
async def get_news_summary(db: Session = Depends(get_db)):
    """Get news summary with categories and latest articles"""
    try:
        # Get total articles count
        total_articles = db.query(NewsArticle).count()
        
        # Get category breakdown
        categories = {}
        articles = db.query(NewsArticle).all()
        for article in articles:
            if article.category not in categories:
                categories[article.category] = 0
            categories[article.category] += 1
        
        # Get latest articles
        latest_articles = db.query(NewsArticle).order_by(
            NewsArticle.published_at.desc()
        ).limit(5).all()
        
        return NewsSummary(
            total_articles=total_articles,
            categories=categories,
            latest_articles=[
                NewsArticleResponse(
                    id=str(article.id),
                    title=article.title,
                    content=article.content,
                    source=article.source,
                    category=article.category,
                    language=article.language,
                    translated_content=article.translated_content or {},
                    published_at=article.published_at,
                    created_at=article.created_at
                )
                for article in latest_articles
            ]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching news summary: {str(e)}"
        )

@router.get("/categories")
async def get_news_categories():
    """Get list of available news categories"""
    try:
        categories = [
            {"name": "Innovation", "description": "Latest farming innovations and technologies"},
            {"name": "Market", "description": "Market trends and price updates"},
            {"name": "Technology", "description": "Agricultural technology and digital farming"},
            {"name": "Policy", "description": "Government policies and regulations"},
            {"name": "Weather", "description": "Weather updates and forecasts"},
            {"name": "Crop", "description": "Crop-specific news and updates"},
            {"name": "Livestock", "description": "Livestock and animal husbandry news"},
            {"name": "Organic", "description": "Organic farming and sustainable agriculture"}
        ]
        
        return {"categories": categories}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching categories: {str(e)}"
        )

@router.post("/fetch-news")
async def fetch_latest_news(db: Session = Depends(get_db)):
    """Fetch latest news from various sources"""
    try:
        # This would typically be a background task
        # For now, we'll create some mock news articles
        
        mock_articles = [
            {
                "title": "New AI-Powered Soil Analysis Technology Launched",
                "content": "A revolutionary AI-powered soil analysis technology has been launched that can analyze soil composition in real-time using smartphone cameras. This technology is expected to help farmers make better decisions about crop selection and fertilizer application.",
                "source": "Krishi Jagran",
                "category": "Innovation",
                "language": "en"
            },
            {
                "title": "Tomato Prices Rise by 20% in Major Markets",
                "content": "Tomato prices have increased significantly across major markets due to supply shortages and increased demand. Farmers are advised to monitor market trends closely.",
                "source": "Agmarknet",
                "category": "Market",
                "language": "en"
            },
            {
                "title": "Government Announces New Subsidy Scheme for Small Farmers",
                "content": "The government has announced a new subsidy scheme specifically designed for small and marginal farmers. The scheme provides financial assistance for purchasing modern farming equipment.",
                "source": "PIB",
                "category": "Policy",
                "language": "en"
            }
        ]
        
        created_articles = []
        for article_data in mock_articles:
            article = NewsArticle(
                title=article_data["title"],
                content=article_data["content"],
                source=article_data["source"],
                category=article_data["category"],
                language=article_data["language"],
                published_at=datetime.now()
            )
            db.add(article)
            created_articles.append(article)
        
        db.commit()
        
        return {
            "message": f"Successfully fetched {len(created_articles)} news articles",
            "articles_count": len(created_articles)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching news: {str(e)}"
        )

@router.get("/search")
async def search_news(
    query: str,
    category: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Search news articles by keyword"""
    try:
        search_query = db.query(NewsArticle).filter(
            NewsArticle.title.ilike(f"%{query}%") |
            NewsArticle.content.ilike(f"%{query}%")
        )
        
        if category:
            search_query = search_query.filter(NewsArticle.category == category)
        
        articles = search_query.order_by(NewsArticle.published_at.desc()).limit(limit).all()
        
        return [
            NewsArticleResponse(
                id=str(article.id),
                title=article.title,
                content=article.content,
                source=article.source,
                category=article.category,
                language=article.language,
                translated_content=article.translated_content or {},
                published_at=article.published_at,
                created_at=article.created_at
            )
            for article in articles
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching news: {str(e)}"
        )
