import httpx
import json
import time
import hashlib
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.models.user_prefs import UserPrefs

settings = get_settings()


class TranslationService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self.client = httpx.AsyncClient(timeout=10.0)
        self._close_db = db is None

    async def close(self):
        await self.client.aclose()
        if self._close_db:
            self.db.close()

    def _cache_key(self, text: str, source: str, target: str) -> str:
        content = f"{source}:{target}:{text}"
        return hashlib.md5(content.encode()).hexdigest()

    def _get_cached(self, key: str) -> Optional[str]:
        record = self.db.query(UserPrefs).filter(UserPrefs.key == f"trans:{key}").first()
        if record:
            try:
                data = json.loads(record.value)
                if data.get("expires_at", 0) > int(time.time()):
                    return data.get("translated_text")
            except:
                pass
        return None

    def _set_cache(self, key: str, translated_text: str, ttl: int):
        now = int(time.time())
        data = json.dumps({
            "translated_text": translated_text,
            "expires_at": now + ttl
        })
        record = UserPrefs(key=f"trans:{key}", value=data)
        self.db.merge(record)
        self.db.commit()

    async def translate(self, text: str, source: str, target: str) -> tuple[str, bool]:
        if source == target:
            return text, True

        cache_key = self._cache_key(text, source, target)
        cached = self._get_cached(cache_key)
        if cached:
            return cached, True

        try:
            if settings.TRANSLATION_API_KEY:
                headers = {"Authorization": f"Bearer {settings.TRANSLATION_API_KEY}"}
            else:
                headers = {}

            payload = {
                "q": text,
                "source": source,
                "target": target,
                "format": "text"
            }

            response = await self.client.post(
                settings.TRANSLATION_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            translated = data.get("translatedText") or data.get("translated_text") or text
            self._set_cache(cache_key, translated, settings.CACHE_TTL_TRANSLATION)
            return translated, False

        except Exception:
            fallback = self._fallback_translate(text, source, target)
            return fallback, False

    def _fallback_translate(self, text: str, source: str, target: str) -> str:
        fallback_dict = {
            ("en", "hi"): {
                "Rain expected today": "आज बारिश की संभावना है",
                "Heavy rain expected": "भारी बारिश की संभावना है",
                "No rain expected": "बारिश की संभावना नहीं है",
                "Temperature": "तापमान",
                "Humidity": "आर्द्रता",
                "Wind speed": "हवा की गति",
                "Heat wave warning": "लू की चेतावनी",
                "Cyclone alert": "चक्रवात अलर्ट",
                "Flood warning": "बाढ़ की चेतावनी",
                "Stay indoors": "घर के अंदर रहें",
                "Stay hydrated": "पानी पीते रहें",
                "Evacuate immediately": "तुरंत खाली करें",
                "Safe to go out": "बाहर जाना सुरक्षित",
                "Carry umbrella": "छाता लेकर जाएं",
                "Avoid travel": "यात्रा से बचें",
                "Good weather for farming": "खेती के लिए अच्छा मौसम",
                "Delay sowing": "बुआई टालें",
                "Proceed with harvest": "कटाई जारी रखें",
                "Weather alert": "मौसम अलर्ट",
                "Last updated": "अंतिम अपडेट",
                "minutes ago": "मिनट पहले",
                "hours ago": "घंटे पहले",
                "Location": "स्थान",
                "Forecast": "पूर्वानुमान",
                "Advisory": "सलाह",
                "Emergency": "आपातकाल",
                "SOS": "एसओएस",
                "Call emergency": "आपातकालीन कॉल करें",
                "Share location": "स्थान साझा करें"
            },
            ("hi", "en"): {
                "आज बारिश की संभावना है": "Rain expected today",
                "भारी बारिश की संभावना है": "Heavy rain expected",
                "बारिश की संभावना नहीं है": "No rain expected",
                "तापमान": "Temperature",
                "आर्द्रता": "Humidity",
                "हवा की गति": "Wind speed",
                "लू की चेतावनी": "Heat wave warning",
                "चक्रवात अलर्ट": "Cyclone alert",
                "बाढ़ की चेतावनी": "Flood warning",
                "घर के अंदर रहें": "Stay indoors",
                "पानी पीते रहें": "Stay hydrated",
                "तुरंत खाली करें": "Evacuate immediately",
                "बाहर जाना सुरक्षित": "Safe to go out",
                "छाता लेकर जाएं": "Carry umbrella",
                "यात्रा से बचें": "Avoid travel",
                "खेती के लिए अच्छा मौसम": "Good weather for farming",
                "बुआई टालें": "Delay sowing",
                "कटाई जारी रखें": "Proceed with harvest",
                "मौसम अलर्ट": "Weather alert",
                "अंतिम अपडेट": "Last updated",
                "मिनट पहले": "minutes ago",
                "घंटे पहले": "hours ago",
                "स्थान": "Location",
                "पूर्वानुमान": "Forecast",
                "सलाह": "Advisory",
                "आपातकाल": "Emergency",
                "एसओएस": "SOS",
                "आपातकालीन कॉल करें": "Call emergency",
                "स्थान साझा करें": "Share location"
            }
        }

        key_dict = fallback_dict.get((source, target), {})
        for eng, hin in key_dict.items():
            if source == "en" and eng.lower() in text.lower():
                return text.replace(eng, hin)
            if source == "hi" and hin in text:
                return text.replace(hin, eng)

        return text