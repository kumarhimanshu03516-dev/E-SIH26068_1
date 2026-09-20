from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    language: Literal["en", "hi"] = "en"
    location: Optional[Dict[str, float]] = None
    role: Literal["farmer", "fisherman", "general"] = "general"


class GroundingData(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[int] = None
    precipitation_probability: Optional[int] = None
    wind_speed: Optional[float] = None
    condition: Optional[str] = None
    alert_severity: Optional[str] = None
    source: str


class ChatResponse(BaseModel):
    answer: str
    language: str
    data_source: str
    cached: bool
    timestamp: datetime
    intent: str
    entities: Dict[str, Any]
    grounding: GroundingData


class TranslateRequest(BaseModel):
    text: str
    source: Literal["en", "hi"]
    target: Literal["en", "hi"]


class TranslateResponse(BaseModel):
    translated_text: str
    cached: bool