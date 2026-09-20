from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AdvisoryAction(BaseModel):
    action: str
    priority: str


class AdvisoryResponse(BaseModel):
    role: str
    crop_stage: Optional[str] = None
    advisory: str
    actions: List[AdvisoryAction]
    based_on: dict
    fetched_at: datetime


class SchemeItem(BaseModel):
    name: str
    description: str
    url: str
    eligibility: str


class SchemesResponse(BaseModel):
    schemes: List[SchemeItem]