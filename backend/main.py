"""
Main FastAPI application entry point.
Registers core middleware and feature routers with their respective prefixes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

from shared.health import router as health_router
from features.subjects_ai.router import router as subjects_ai_router
from features.daily_quiz.router import router as daily_quiz_router

app = FastAPI(title="CampusHub API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared health check
app.include_router(health_router, prefix="/api/v1")

# Feature routers included with their own prefixes
app.include_router(subjects_ai_router, prefix="/api/v1/subjects-ai", tags=["subjects-ai"])
app.include_router(daily_quiz_router, prefix="/api/v1/daily-quiz", tags=["daily-quiz"])
