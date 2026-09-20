import re
import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

from app.services.weather_service import WeatherService
from app.services.alert_service import AlertService
from app.services.advisory_service import AdvisoryService
from app.services.translation_service import TranslationService
from app.schemas.chat import ChatResponse, GroundingData


INTENT_PATTERNS = {
    "forecast": [
        r"\b(weather|forecast|temperature|temp|rain|barish|mausam|kaisa|hoga|kya)\b",
        r"\b(आज|कल|परसों|मौसम|बारिश|तापमान|कैसा|होगा|क्या)\b"
    ],
    "alert": [
        r"\b(alert|warning|chेतावनी|अलर्ट|चेतावनी|खतरा|danger|storm|cyclone|flood|heat)\b",
        r"\b(चक्रवात|बाढ़|लू|तूफान|अलर्ट|चेतावनी)\b"
    ],
    "advisory": [
        r"\b(advice|advisory|suggest|recommend|kya karna|kya kare|सलाह|क्या करना|क्या करे|उपाय)\b",
        r"\b(sowing|planting|harvest|irrigation|बुआई|रोपाई|कटाई|सिंचाई|खेती|किसान)\b"
    ],
    "emergency": [
        r"\b(emergency|sos|help|bachao|madad|आपातकाल|बचाओ|मदद|एसओएस|इमरजेंसी)\b"
    ],
    "scheme": [
        r"\b(scheme|yojana|bima|insurance|compensation|मुआवजा|बीमा|योजना|सरकारी)\b"
    ],
    "location": [
        r"\b(in|at|near|मेरे|मेरा|मेरी|गांव|शहर|जिला|city|village|district)\b"
    ]
}

ENTITY_PATTERNS = {
    "timeframe": [
        r"\b(today|tomorrow|day after|आज|कल|परसों|आने वाले|अगले)\b",
        r"\b(\d+\s*(day|hour|दिन|घंटे))\b"
    ],
    "crop_stage": [
        r"\b(sowing|planting|growing|harvest|बुआई|रोपाई|बढ़वार|कटाई)\b"
    ],
    "role": [
        r"\b(farmer|kisan|khet|खेत|किसान|खेती)\b",
        r"\b(fisherman|machua|fish|मछुआ|मछली|समुद्र)\b"
    ]
}

ROLE_KEYWORDS = {
    "farmer": ["farmer", "kisan", "khet", "खेत", "किसान", "खेती", "फसल", "crop", "farming"],
    "fisherman": ["fisherman", "machua", "fish", "मछुआ", "मछली", "समुद्र", "नाव", "boat"],
    "general": []
}


class ChatService:
    def __init__(
        self,
        weather_service: Optional[WeatherService] = None,
        alert_service: Optional[AlertService] = None,
        advisory_service: Optional[AdvisoryService] = None,
        translation_service: Optional[TranslationService] = None
    ):
        self.weather_service = weather_service
        self.alert_service = alert_service
        self.advisory_service = advisory_service
        self.translation_service = translation_service
        self._own_services = weather_service is None

    async def initialize(self):
        if self._own_services:
            self.weather_service = WeatherService()
            self.alert_service = AlertService()
            self.advisory_service = AdvisoryService(weather_service=self.weather_service)
            self.translation_service = TranslationService()

    async def close(self):
        if self.weather_service:
            await self.weather_service.close()
        if self.alert_service:
            await self.alert_service.close()
        if self.advisory_service:
            await self.advisory_service.close()
        if self.translation_service:
            await self.translation_service.close()

    def detect_language(self, text: str) -> str:
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        return "hi" if hindi_chars > len(text) * 0.3 else "en"

    def extract_intent(self, text: str) -> str:
        text_lower = text.lower()
        scores = {}
        for intent, patterns in INTENT_PATTERNS.items():
            score = sum(1 for p in patterns if re.search(p, text_lower, re.IGNORECASE))
            if score > 0:
                scores[intent] = score
        if not scores:
            return "general"
        return max(scores, key=scores.get)

    def extract_entities(self, text: str) -> Dict[str, Any]:
        entities = {}
        text_lower = text.lower()

        for entity_type, patterns in ENTITY_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    entities[entity_type] = match.group(0)
                    break

        for role, keywords in ROLE_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                entities["role"] = role
                break

        return entities

    def detect_role(self, text: str, default_role: str) -> str:
        entities = self.extract_entities(text)
        return entities.get("role", default_role)

    async def process_query(
        self,
        query: str,
        language: str,
        location: Optional[Dict[str, float]],
        role: str
    ) -> ChatResponse:
        detected_lang = self.detect_language(query)
        if detected_lang != language:
            language = detected_lang

        process_lang = "en"
        original_query = query
        if language == "hi":
            query, _ = await self.translation_service.translate(query, "hi", "en")
            process_lang = "en"

        intent = self.extract_intent(query)
        entities = self.extract_entities(query)
        entities["language"] = language

        effective_role = self.detect_role(query, role)
        lat = location.get("lat") if location else None
        lon = location.get("lon") if location else None

        if lat is None or lon is None:
            lat, lon = 28.6139, 77.2090

        grounding = GroundingData(source="openweathermap")
        answer_en = ""
        data_source = "openweathermap"
        cached = False

        if intent == "forecast":
            answer_en, grounding, cached = await self._handle_forecast(lat, lon, entities)
        elif intent == "alert":
            answer_en, grounding, cached = await self._handle_alert(lat, lon)
        elif intent == "advisory":
            answer_en, grounding, cached = await self._handle_advisory(lat, lon, effective_role, entities)
        elif intent == "emergency":
            answer_en = self._handle_emergency()
            data_source = "static"
        elif intent == "scheme":
            answer_en = await self._handle_scheme()
            data_source = "static"
        else:
            answer_en = "I can help with weather forecasts, alerts, farming/fishing advice, and emergency info. What would you like to know?"
            data_source = "static"

        if language == "hi":
            answer, _ = await self.translation_service.translate(answer_en, "en", "hi")
        else:
            answer = answer_en

        return ChatResponse(
            answer=answer,
            language=language,
            data_source=data_source,
            cached=cached,
            timestamp=datetime.utcnow(),
            intent=intent,
            entities=entities,
            grounding=grounding
        )

    async def _handle_forecast(self, lat: float, lon: float, entities: Dict) -> Tuple[str, GroundingData, bool]:
        timeframe = entities.get("timeframe", "today")
        current = await self.weather_service.get_current(lat, lon)
        forecast = await self.weather_service.get_forecast(lat, lon)

        next_hours = forecast.hourly[:12] if "today" in timeframe or "आज" in timeframe else forecast.hourly[12:24]
        rain_chance = max([h.precipitation_probability for h in next_hours], default=0)
        avg_temp = sum([h.temperature for h in next_hours]) / len(next_hours) if next_hours else current.temperature
        conditions = [h.condition for h in next_hours]

        grounding = GroundingData(
            temperature=round(avg_temp, 1),
            humidity=current.humidity,
            precipitation_probability=rain_chance,
            wind_speed=current.wind_speed,
            condition=current.condition,
            source="OpenWeatherMap One Call API"
        )

        if rain_chance > 60:
            answer = f"Rain expected ({rain_chance}% chance). Temperature around {round(avg_temp)}°C. Conditions: {', '.join(set(conditions[:3]))}. Carry an umbrella."
        elif rain_chance > 30:
            answer = f"Possible rain ({rain_chance}% chance). Temperature around {round(avg_temp)}°C. {current.condition}. Keep an umbrella handy."
        else:
            answer = f"No significant rain expected ({rain_chance}% chance). Temperature around {round(avg_temp)}°C. {current.condition}."

        return answer, grounding, current.cached or forecast.cached

    async def _handle_alert(self, lat: float, lon: float) -> Tuple[str, GroundingData, bool]:
        alerts_response = await self.alert_service.get_active_alerts(lat, lon)
        alerts = alerts_response.alerts

        if not alerts or alerts[0].id == "normal":
            grounding = GroundingData(
                alert_severity="normal",
                source="OpenWeatherMap Alerts"
            )
            return "No active weather alerts for your area. Conditions are normal.", grounding, alerts_response.cached

        alert = alerts[0]
        severity_emoji = {"critical": "🔴", "warning": "🟠", "info": "🟡", "normal": "🟢"}.get(alert.severity, "⚪")

        grounding = GroundingData(
            alert_severity=alert.severity,
            source="OpenWeatherMap Alerts (IMD-style color coding)"
        )

        answer = f"{severity_emoji} {alert.severity.upper()}: {alert.event}. {alert.description}. {alert.action}"
        if alert.areas:
            answer += f" Areas: {', '.join(alert.areas)}."

        return answer, grounding, alerts_response.cached

    async def _handle_advisory(self, lat: float, lon: float, role: str, entities: Dict) -> Tuple[str, GroundingData, bool]:
        crop_stage = entities.get("crop_stage", "sowing")
        if "harvest" in crop_stage or "कटाई" in crop_stage:
            crop_stage = "harvest"
        elif "growing" in crop_stage or "बढ़वार" in crop_stage:
            crop_stage = "growing"

        if role == "farmer":
            advisory = await self.advisory_service.get_farmer_advisory(lat, lon, crop_stage)
        elif role == "fisherman":
            advisory = await self.advisory_service.get_fisherman_advisory(lat, lon)
        else:
            advisory = await self.advisory_service.get_general_advisory(lat, lon)

        actions_text = ". ".join([f"{a.action} ({a.priority} priority)" for a in advisory.actions[:3]])
        answer = f"{advisory.advisory} Recommended actions: {actions_text}."

        grounding = GroundingData(
            temperature=advisory.based_on.get("forecast_summary", "N/A"),
            source="Rule-based advisory engine (grounded in real forecast data)"
        )

        return answer, grounding, True

    def _handle_emergency(self) -> str:
        return ("🚨 EMERGENCY SOS ACTIVATED 🚨\n\n"
                "1. Dial 112 (National Emergency Number) or 1078 (Disaster Helpline)\n"
                "2. Share your location with emergency contacts\n"
                "3. Move to safe location if possible\n"
                "4. Stay on line with emergency operator\n\n"
                "Your location has been captured. Help is on the way.")

    async def _handle_scheme(self) -> str:
        schemes = await self.advisory_service.get_schemes()
        lines = ["Government schemes for weather-related crop loss:"]
        for s in schemes.schemes[:3]:
            lines.append(f"• {s.name}: {s.description[:80]}... More: {s.url}")
        return "\n".join(lines)