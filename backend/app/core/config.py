import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "WeatherGPT"
    DEBUG: bool = True
    
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "demo_key")
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/3.0"
    
    TRANSLATION_API_URL: str = os.getenv("TRANSLATION_API_URL", "https://libretranslate.de/translate")
    TRANSLATION_API_KEY: str = os.getenv("TRANSLATION_API_KEY", "")
    
    DATABASE_URL: str = "sqlite:///./weathergpt.db"
    
    CACHE_TTL_CURRENT: int = 1800
    CACHE_TTL_FORECAST: int = 7200
    CACHE_TTL_ALERTS: int = 900
    CACHE_TTL_ADVISORY: int = 21600
    CACHE_TTL_TRANSLATION: int = 86400
    
    ALERT_POLL_INTERVAL: int = 900
    
    EXPO_PUSH_URL: str = "https://exp.host/--/api/v2/push/send"
    
    DEFAULT_LANGUAGE: str = "en"
    SUPPORTED_LANGUAGES: list[str] = ["en", "hi"]
    
    DEFAULT_LOCATION_LAT: float = 28.6139
    DEFAULT_LOCATION_LON: float = 77.2090
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()