import json
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.advisory_cache import AdvisoryCache
from app.schemas.advisory import AdvisoryResponse, AdvisoryAction, SchemeItem, SchemesResponse
from app.db.database import SessionLocal
from app.services.weather_service import WeatherService

settings = get_settings()

FARMER_RULES = {
    "sowing": {
        "good_conditions": ["light rain", "cloudy", "overcast"],
        "avoid_conditions": ["heavy rain", "storm", "heat wave", "drought"],
        "soil_moisture_threshold": 60,
        "advice_templates": {
            "proceed": "Soil conditions favorable for sowing. {forecast_detail}. Proceed with sowing operations.",
            "delay": "Conditions not ideal for sowing. {forecast_detail}. Consider delaying 1-2 days.",
            "irrigate": "Soil moisture low ({soil_moisture}%). Light irrigation recommended before sowing.",
            "skip_irrigation": "Adequate soil moisture ({soil_moisture}%) and rain expected. Skip irrigation today."
        }
    },
    "growing": {
        "good_conditions": ["light rain", "partly cloudy"],
        "avoid_conditions": ["heavy rain", "storm", "hail", "heat wave", "frost"],
        "advice_templates": {
            "monitor": "Crop growing stage. {forecast_detail}. Monitor for pests/diseases.",
            "protect": "Adverse weather expected: {forecast_detail}. Consider protective measures.",
            "irrigate": "Hot/dry conditions. Irrigate in early morning or evening.",
            "drain": "Heavy rain expected. Ensure field drainage is clear."
        }
    },
    "harvest": {
        "good_conditions": ["clear", "sunny", "partly cloudy"],
        "avoid_conditions": ["rain", "storm", "high humidity", "cloudy"],
        "advice_templates": {
            "proceed": "Good harvest weather. {forecast_detail}. Proceed with harvesting.",
            "delay": "Rain/humidity expected: {forecast_detail}. Delay harvest to avoid grain spoilage.",
            "urgent": "Harvest window closing. {forecast_detail}. Expedite harvesting if crop ready."
        }
    }
}

FISHERMAN_RULES = {
    "safe": {
        "wind_threshold": 15,
        "wave_threshold": 1.5,
        "advice": "Conditions favorable for fishing. Wind {wind} km/h, waves {wave}m. Safe to venture out."
    },
    "caution": {
        "wind_threshold": 25,
        "wave_threshold": 2.5,
        "advice": "Moderate conditions. Wind {wind} km/h, waves {wave}m. Exercise caution. Stay near shore."
    },
    "unsafe": {
        "advice": "ROUGH SEAS WARNING. Wind {wind} km/h, waves {wave}m. DO NOT venture out. Return to shore immediately."
    }
}

GOVERNMENT_SCHEMES = [
    SchemeItem(
        name="Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        description="Crop insurance scheme providing financial support to farmers in case of crop failure due to natural calamities, pests, and diseases.",
        url="https://pmfby.gov.in/",
        eligibility="All farmers growing notified crops in notified areas"
    ),
    SchemeItem(
        name="Restructured Weather Based Crop Insurance Scheme (RWBCIS)",
        description="Weather-based insurance using weather parameters as proxy for crop yield. Faster claim settlement.",
        url="https://agricoop.nic.in/",
        eligibility="Farmers in notified areas for notified crops"
    ),
    SchemeItem(
        name="Kisan Credit Card (KCC)",
        description="Short-term credit for cultivation expenses. Interest subvention for timely repayment.",
        url="https://pmkisan.gov.in/",
        eligibility="All farmers including sharecroppers and tenant farmers"
    ),
    SchemeItem(
        name="Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
        description="Focus on water use efficiency - 'Per Drop More Crop'. Micro-irrigation subsidies.",
        url="https://pmksy.gov.in/",
        eligibility="Farmers with land ownership/tenancy"
    ),
    SchemeItem(
        name="National Disaster Response Fund (NDRF) / State Disaster Response Fund (SDRF)",
        description="Relief assistance for crop loss due to notified natural calamities (cyclone, flood, drought, hailstorm).",
        url="https://ndma.gov.in/",
        eligibility="Affected farmers in notified disaster areas"
    ),
    SchemeItem(
        name="Fisheries Subsidies (PMMSY)",
        description="Pradhan Mantri Matsya Sampada Yojana - subsidies for boats, nets, cold storage, insurance for fishermen.",
        url="https://dof.gov.in/pmmsy",
        eligibility="Registered fishers, fish farmers, fisheries cooperatives"
    )
]


class AdvisoryService:
    def __init__(self, db: Optional[Session] = None, weather_service: Optional[WeatherService] = None):
        self.db = db or SessionLocal()
        self.weather_service = weather_service
        self._close_db = db is None
        self._close_weather = weather_service is None

    async def close(self):
        if self._close_weather and self.weather_service:
            await self.weather_service.close()
        if self._close_db:
            self.db.close()

    def _cache_key(self, role: str, lat: float, lon: float, crop_stage: Optional[str] = None) -> str:
        stage = crop_stage or "general"
        return f"{role}:{lat:.4f}:{lon:.4f}:{stage}"

    def _get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        record = self.db.query(AdvisoryCache).filter(AdvisoryCache.key == key).first()
        if record and record.expires_at > int(time.time()):
            return json.loads(record.data)
        return None

    def _set_cache(self, key: str, data: Dict[str, Any], ttl: int):
        now = int(time.time())
        record = AdvisoryCache(
            key=key,
            data=json.dumps(data),
            fetched_at=now,
            expires_at=now + ttl
        )
        self.db.merge(record)
        self.db.commit()

    async def get_farmer_advisory(self, lat: float, lon: float, crop_stage: str = "sowing") -> AdvisoryResponse:
        key = self._cache_key("farmer", lat, lon, crop_stage)
        cached = self._get_cached(key)
        if cached:
            return AdvisoryResponse(**cached)

        weather = await self._get_weather_for_advisory(lat, lon)
        advisory_text, actions = self._generate_farmer_advice(crop_stage, weather)

        result = AdvisoryResponse(
            role="farmer",
            crop_stage=crop_stage,
            advisory=advisory_text,
            actions=actions,
            based_on={
                "forecast_summary": self._summarize_forecast(weather),
                "soil_moisture": "adequate" if weather.get("humidity", 0) > 60 else "low"
            },
            fetched_at=datetime.utcnow()
        )

        result_dict = result.model_dump()
        result_dict["fetched_at"] = result_dict["fetched_at"].isoformat()
        self._set_cache(key, result_dict, settings.CACHE_TTL_ADVISORY)
        return result

    async def get_fisherman_advisory(self, lat: float, lon: float) -> AdvisoryResponse:
        key = self._cache_key("fisherman", lat, lon)
        cached = self._get_cached(key)
        if cached:
            return AdvisoryResponse(**cached)

        weather = await self._get_weather_for_advisory(lat, lon)
        advisory_text, actions = self._generate_fisherman_advice(weather)

        result = AdvisoryResponse(
            role="fisherman",
            advisory=advisory_text,
            actions=actions,
            based_on={
                "wind_speed": weather.get("wind_speed", 0),
                "condition": weather.get("condition", ""),
                "forecast_summary": self._summarize_forecast(weather)
            },
            fetched_at=datetime.utcnow()
        )

        result_dict = result.model_dump()
        result_dict["fetched_at"] = result_dict["fetched_at"].isoformat()
        self._set_cache(key, result_dict, settings.CACHE_TTL_ADVISORY)
        return result

    async def get_general_advisory(self, lat: float, lon: float) -> AdvisoryResponse:
        weather = await self._get_weather_for_advisory(lat, lon)
        advisory_text = self._generate_general_advice(weather)

        return AdvisoryResponse(
            role="general",
            advisory=advisory_text,
            actions=[
                AdvisoryAction(action="Stay updated on weather changes", priority="medium"),
                AdvisoryAction(action="Carry water and sun protection", priority="low")
            ],
            based_on={"forecast_summary": self._summarize_forecast(weather)},
            fetched_at=datetime.utcnow()
        )

    async def get_schemes(self) -> SchemesResponse:
        return SchemesResponse(schemes=GOVERNMENT_SCHEMES)

    async def _get_weather_for_advisory(self, lat: float, lon: float) -> Dict[str, Any]:
        if self.weather_service:
            current = await self.weather_service.get_current(lat, lon)
            forecast = await self.weather_service.get_forecast(lat, lon)
            next_few_hours = forecast.hourly[:6] if forecast.hourly else []
            return {
                "temperature": current.temperature,
                "humidity": current.humidity,
                "wind_speed": current.wind_speed,
                "condition": current.condition,
                "hourly_forecast": [
                    {
                        "dt": h.dt.isoformat(),
                        "temp": h.temperature,
                        "pop": h.precipitation_probability,
                        "condition": h.condition,
                        "wind": h.wind_speed
                    } for h in next_few_hours
                ]
            }
        return {}

    def _generate_farmer_advice(self, crop_stage: str, weather: Dict[str, Any]) -> tuple[str, List[AdvisoryAction]]:
        rules = FARMER_RULES.get(crop_stage, FARMER_RULES["sowing"])
        forecast_summary = self._summarize_forecast(weather)
        humidity = weather.get("humidity", 50)
        condition = weather.get("condition", "").lower()
        next_pop = max([h.get("pop", 0) for h in weather.get("hourly_forecast", [])], default=0)

        if crop_stage == "sowing":
            if any(c in condition for c in rules["avoid_conditions"]) or next_pop > 70:
                return rules["advice_templates"]["delay"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Delay sowing by 1-2 days", priority="high"),
                    AdvisoryAction(action="Prepare fields for when weather clears", priority="medium")
                ]
            elif humidity < rules["soil_moisture_threshold"] and next_pop < 30:
                return rules["advice_templates"]["irrigate"].format(soil_moisture=humidity, forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Light irrigation before sowing", priority="high"),
                    AdvisoryAction(action="Check soil moisture at 5cm depth", priority="medium")
                ]
            else:
                return rules["advice_templates"]["proceed"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Proceed with sowing", priority="high"),
                    AdvisoryAction(action="Use treated seeds", priority="medium")
                ]

        elif crop_stage == "growing":
            if any(c in condition for c in rules["avoid_conditions"]):
                return rules["advice_templates"]["protect"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Apply protective sprays if needed", priority="high"),
                    AdvisoryAction(action="Ensure field drainage", priority="high")
                ]
            elif next_pop > 60:
                return rules["advice_templates"]["drain"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Clear drainage channels", priority="high"),
                    AdvisoryAction(action="Avoid fertilizer application", priority="medium")
                ]
            elif weather.get("temperature", 30) > 35 and next_pop < 20:
                return rules["advice_templates"]["irrigate"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Irrigate early morning/evening", priority="high"),
                    AdvisoryAction(action="Mulch to conserve moisture", priority="medium")
                ]
            else:
                return rules["advice_templates"]["monitor"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Scout for pests/diseases", priority="medium"),
                    AdvisoryAction(action="Follow nutrient schedule", priority="low")
                ]

        elif crop_stage == "harvest":
            if any(c in condition for c in rules["avoid_conditions"]) or next_pop > 40:
                return rules["advice_templates"]["delay"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Delay harvest until dry weather", priority="high"),
                    AdvisoryAction(action="Cover harvested produce", priority="high")
                ]
            else:
                return rules["advice_templates"]["proceed"].format(forecast_detail=forecast_summary), [
                    AdvisoryAction(action="Proceed with harvesting", priority="high"),
                    AdvisoryAction(action="Dry produce properly before storage", priority="high")
                ]

        return "Monitor weather conditions for farming decisions.", [
            AdvisoryAction(action="Check daily forecast", priority="medium")
        ]

    def _generate_fisherman_advice(self, weather: Dict[str, Any]) -> tuple[str, List[AdvisoryAction]]:
        wind = weather.get("wind_speed", 0) * 3.6  # m/s to km/h
        condition = weather.get("condition", "").lower()

        if wind <= 15 and "storm" not in condition and "rough" not in condition:
            advice = FISHERMAN_RULES["safe"]["advice"].format(wind=round(wind), wave=round(wind/10, 1))
            return advice, [
                AdvisoryAction(action="Safe to fish near coast", priority="high"),
                AdvisoryAction(action="Wear life jacket", priority="high"),
                AdvisoryAction(action="Inform someone of your plan", priority="medium")
            ]
        elif wind <= 25:
            advice = FISHERMAN_RULES["caution"]["advice"].format(wind=round(wind), wave=round(wind/10, 1))
            return advice, [
                AdvisoryAction(action="Stay close to shore", priority="high"),
                AdvisoryAction(action="Wear life jacket", priority="high"),
                AdvisoryAction(action="Check updates every hour", priority="high")
            ]
        else:
            advice = FISHERMAN_RULES["unsafe"]["advice"].format(wind=round(wind), wave=round(wind/10, 1))
            return advice, [
                AdvisoryAction(action="DO NOT go to sea", priority="critical"),
                AdvisoryAction(action="Return to shore immediately if at sea", priority="critical"),
                AdvisoryAction(action="Secure boat and gear", priority="high")
            ]

    def _generate_general_advice(self, weather: Dict[str, Any]) -> str:
        temp = weather.get("temperature", 25)
        condition = weather.get("condition", "")
        humidity = weather.get("humidity", 50)
        forecast = self._summarize_forecast(weather)

        advice_parts = [f"Current: {condition}, {temp}°C, {humidity}% humidity. {forecast}"]

        if temp > 40:
            advice_parts.append("HEAT WAVE: Stay indoors 11AM-4PM. Drink water frequently. Wear light clothing.")
        elif temp < 10:
            advice_parts.append("COLD WAVE: Wear warm layers. Protect elderly and children. Check on neighbors.")
        if humidity > 80 and temp > 30:
            advice_parts.append("High humidity: Risk of heat exhaustion. Limit outdoor activity.")

        return " ".join(advice_parts)

    def _summarize_forecast(self, weather: Dict[str, Any]) -> str:
        hourly = weather.get("hourly_forecast", [])
        if not hourly:
            return "Forecast data unavailable."

        next_6h = hourly[:6]
        rain_hours = sum(1 for h in next_6h if h.get("pop", 0) > 50)
        max_temp = max([h.get("temp", 0) for h in next_6h], default=0)
        max_wind = max([h.get("wind", 0) for h in next_6h], default=0) * 3.6
        conditions = [h.get("condition", "") for h in next_6h]

        parts = []
        if rain_hours > 0:
            parts.append(f"Rain likely in {rain_hours} of next 6 hours")
        if max_temp > 35:
            parts.append(f"Max temp ~{round(max_temp)}°C")
        if max_wind > 20:
            parts.append(f"Winds up to {round(max_wind)} km/h")
        if "storm" in " ".join(conditions).lower():
            parts.append("Thunderstorms possible")

        return ". ".join(parts) + "." if parts else "Generally stable conditions."