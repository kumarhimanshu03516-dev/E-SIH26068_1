from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AlertItem(BaseModel):
    id: str
    event: str
    severity: str
    color: str
    description: str
    areas: List[str]
    starts_at: datetime
    ends_at: datetime
    action: str


class AlertsResponse(BaseModel):
    alerts: List[AlertItem]
    fetched_at: datetime
    cached: bool


class PushSubscription(BaseModel):
    token: str
    location: dict
    language: str