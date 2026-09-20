from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CurrentWeather(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    condition: str
    icon: str
    fetched_at: datetime
    cached: bool


class ForecastHourly(BaseModel):
    dt: datetime
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    precipitation_probability: int
    condition: str
    icon: str


class ForecastResponse(BaseModel):
    hourly: List[ForecastHourly]
    fetched_at: datetime
    cached: bool


class GeocodeResult(BaseModel):
    name: str
    lat: float
    lon: float
    country: str
    state: Optional[str] = None