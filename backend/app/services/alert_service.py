import httpx
import json
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.alerts_cache import AlertsCache
from app.schemas.alerts import AlertItem, AlertsResponse
from app.db.database import SessionLocal

settings = get_settings()

SEVERITY_MAP = {
    "extreme": ("critical", "red"),
    "severe": ("warning", "orange"),
    "moderate": ("info", "yellow"),
    "minor": ("info", "green"),
    "unknown": ("info", "green")
}

IMD_COLOR_MAP = {
    "critical": "red",
    "warning": "orange",
    "info": "yellow",
    "normal": "green"
}


class AlertService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.client = httpx.AsyncClient(timeout=10.0)
        self._close_db = db is None

    async def close(self):
        await self.client.aclose()
        if self._close_db:
            self.db.close()

    def _map_severity(self, owm_severity: str) -> tuple[str, str]:
        return SEVERITY_MAP.get(owm_severity.lower(), ("info", "green"))

    def _get_cached_alerts(self, lat: float, lon: float) -> List[AlertItem]:
        records = self.db.query(AlertsCache).filter(
            AlertsCache.expires_at > int(time.time())
        ).all()
        alerts = []
        for r in records:
            data = json.loads(r.data)
            alerts.append(AlertItem(**data))
        return alerts

    def _cache_alert(self, alert: AlertItem, ttl: int):
        now = int(time.time())
        record = AlertsCache(
            id=alert.id,
            data=alert.model_dump_json(),
            severity=alert.severity,
            area=",".join(alert.areas),
            fetched_at=now,
            expires_at=now + ttl
        )
        self.db.merge(record)
        self.db.commit()

    async def get_active_alerts(self, lat: float, lon: float) -> AlertsResponse:
        cached_alerts = self._get_cached_alerts(lat, lon)
        if cached_alerts:
            return AlertsResponse(alerts=cached_alerts, fetched_at=datetime.utcnow(), cached=True)

        # Demo mode: return mock alerts if no valid API key
        if settings.OPENWEATHER_API_KEY in ("demo_key", "your_openweathermap_api_key_here", ""):
            alerts = [
                AlertItem(
                    id="demo_heat",
                    event="Heat Wave",
                    severity="warning",
                    color="orange",
                    description="Temperatures above 42°C expected for next 2 days",
                    areas=["Delhi", "NCR"],
                    starts_at=datetime.utcnow(),
                    ends_at=datetime.utcnow().replace(hour=23, minute=59),
                    action="Stay indoors, hydrate frequently, avoid strenuous activity"
                )
            ]
            for alert in alerts:
                self._cache_alert(alert, settings.CACHE_TTL_ALERTS)
            return AlertsResponse(alerts=alerts, fetched_at=datetime.utcnow(), cached=False)

    def _get_action_for_event(self, event: str) -> str:
        event_lower = event.lower()
        if "cyclone" in event_lower or "hurricane" in event_lower or "typhoon" in event_lower:
            return "Evacuate if advised. Stay indoors. Avoid coastal areas."
        if "flood" in event_lower:
            return "Move to higher ground. Avoid walking/driving through flood water."
        if "heat" in event_lower:
            return "Stay indoors. Hydrate frequently. Avoid strenuous activity."
        if "storm" in event_lower or "thunderstorm" in event_lower:
            return "Stay indoors. Unplug appliances. Avoid trees and metal objects."
        if "rain" in event_lower or "heavy rain" in event_lower:
            return "Carry umbrella. Avoid low-lying areas. Check drainage."
        if "wind" in event_lower or "gale" in event_lower:
            return "Secure loose objects. Stay away from windows."
        return "Monitor weather updates. Follow local authorities."

    async def subscribe_push(self, token: str, lat: float, lon: float, language: str) -> bool:
        # In production, store token in database with location preferences
        # For demo, just return success
        return True