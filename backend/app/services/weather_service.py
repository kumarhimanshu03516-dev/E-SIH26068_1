import httpx
import json
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.weather_cache import WeatherCache
from app.schemas.weather import CurrentWeather, ForecastResponse, ForecastHourly, GeocodeResult
from app.db.database import SessionLocal

settings = get_settings()


class WeatherService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.client = httpx.AsyncClient(timeout=10.0)
        self._close_db = db is None

    async def close(self):
        await self.client.aclose()
        if self._close_db:
            self.db.close()

    def _cache_key(self, prefix: str, lat: float, lon: float) -> str:
        return f"{prefix}:{lat:.4f}:{lon:.4f}"

    def _get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        record = self.db.query(WeatherCache).filter(WeatherCache.key == key).first()
        if record and record.expires_at > int(time.time()):
            return json.loads(record.data)
        return None

    def _set_cache(self, key: str, data: Dict[str, Any], ttl: int):
        now = int(time.time())
        record = WeatherCache(
            key=key,
            data=json.dumps(data),
            fetched_at=now,
            expires_at=now + ttl
        )
        self.db.merge(record)
        self.db.commit()

    async def geocode(self, city: str) -> Optional[GeocodeResult]:
        url = f"http://api.openweathermap.org/geo/1.0/direct"
        params = {"q": city, "limit": 1, "appid": settings.OPENWEATHER_API_KEY}
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        if not data:
            return None
        item = data[0]
        return GeocodeResult(
            name=item["name"],
            lat=item["lat"],
            lon=item["lon"],
            country=item["country"],
            state=item.get("state")
        )

    async def get_current(self, lat: float, lon: float) -> CurrentWeather:
        key = self._cache_key("current", lat, lon)
        cached = self._get_cached(key)
        if cached:
            cached_copy = dict(cached)
            cached_copy.pop('cached', None)
            return CurrentWeather(**cached_copy, cached=True)

        # Demo mode: return mock data if no valid API key
        if settings.OPENWEATHER_API_KEY in ("demo_key", "your_openweathermap_api_key_here", ""):
            result = CurrentWeather(
                temperature=28.5,
                feels_like=31.0,
                humidity=72,
                wind_speed=3.5,
                condition="Partly Cloudy",
                icon="02d",
                fetched_at=datetime.utcnow(),
                cached=False
            )
            result_dict = result.model_dump()
            result_dict["fetched_at"] = result_dict["fetched_at"].isoformat()
            self._set_cache(key, result_dict, settings.CACHE_TTL_CURRENT)
            return result

        url = f"{settings.OPENWEATHER_BASE_URL}/onecall"
        params = {
            "lat": lat,
            "lon": lon,
            "exclude": "minutely,hourly,daily,alerts",
            "units": "metric",
            "appid": settings.OPENWEATHER_API_KEY
        }
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        current = data["current"]
        result = CurrentWeather(
            temperature=current["temp"],
            feels_like=current["feels_like"],
            humidity=current["humidity"],
            wind_speed=current["wind_speed"],
            condition=current["weather"][0]["description"].title(),
            icon=current["weather"][0]["icon"],
            fetched_at=datetime.utcnow(),
            cached=False
        )

        result_dict = result.model_dump()
        result_dict["fetched_at"] = result_dict["fetched_at"].isoformat()
        self._set_cache(key, result_dict, settings.CACHE_TTL_CURRENT)
        return result

    async def get_forecast(self, lat: float, lon: float) -> ForecastResponse:
        key = self._cache_key("forecast", lat, lon)
        cached = self._get_cached(key)
        if cached:
            hourly = [ForecastHourly(**h) for h in cached["hourly"]]
            return ForecastResponse(hourly=hourly, fetched_at=cached["fetched_at"], cached=True)

        # Demo mode: return mock data if no valid API key
        if settings.OPENWEATHER_API_KEY in ("demo_key", "your_openweathermap_api_key_here", ""):
            base_time = datetime.utcnow()
            hourly = []
            for i in range(48):
                dt = base_time + timedelta(hours=i)
                temp = 28 + (i % 5) - 2  # Vary temp 26-31
                pop = 10 + (i % 8) * 10  # Vary precipitation 10-80%
                hourly.append(ForecastHourly(
                    dt=dt,
                    temperature=temp,
                    feels_like=temp + 2,
                    humidity=70 + (i % 10),
                    wind_speed=3.0 + (i % 3),
                    precipitation_probability=pop,
                    condition="Partly Cloudy" if pop < 50 else "Light Rain",
                    icon="02d" if pop < 50 else "10d"
                ))

            result = ForecastResponse(hourly=hourly, fetched_at=datetime.utcnow(), cached=False)
            result_dict = result.model_dump()
            result_dict["fetched_at"] = result_dict["fetched_at"].isoformat()
            result_dict["hourly"] = [h.model_dump() for h in hourly]
            for h in result_dict["hourly"]:
                h["dt"] = h["dt"].isoformat()
            self._set_cache(key, result_dict, settings.CACHE_TTL_FORECAST)
            return result