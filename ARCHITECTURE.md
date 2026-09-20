# WeatherGPT - System Architecture

## Overview
Conversational AI assistant for weather forecasts, alerts, and climate advisories — grounded in real IMD/OpenWeatherMap data, multilingual (Hindi/English), offline-first, with role-aware guidance and emergency SOS.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React Native / Expo)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Chat UI   │  │  Voice I/O  │  │   Map View  │  │  SOS Button │        │
│  │  (Text/Voice)│  │  (STT/TTS)  │  │ (Radar/Prep)│  │  (One-tap)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Offline-First Data Layer (SQLite/AsyncStorage)   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Forecast   │  │   Alerts    │  │  Advisory   │  │  User Prefs │ │   │
│  │  │   Cache     │  │   Cache     │  │   Cache     │  │  (Lang/Role)│ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API Client (Axios + Interceptors)              │   │
│  │  • Auto-retry with exponential backoff                              │   │
│  │  • Offline queue for failed requests                                │   │
│  │  • Cache-first strategy with "last updated" timestamps              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTPS (REST)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI / Python)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Chat/NLU   │  │  Weather    │  │   Alert     │  │  Advisory   │        │
│  │  Service    │  │  Service    │  │  Service    │  │  Service    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Grounding Pipeline (Core)                        │   │
│  │  1. Intent/Entity Extraction (spaCy / regex / keyword matching)    │   │
│  │  2. Data Fetching (real API calls based on intent)                 │   │
│  │  3. Answer Composition (template-based, no hallucination)          │   │
│  │  4. Translation (Hindi ↔ English via LibreTranslate / Google)      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│         ┌────────────────────┼────────────────────┐                       │
│         ▼                    ▼                    ▼                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │  OpenWeather│    │  IMD/       │    │  Translation│                   │
│  │  Map API    │    │  MoES API   │    │  API        │                   │
│  │  (Free tier)│    │  (Future)   │    │  (Free)     │                   │
│  └─────────────┘    └─────────────┘    └─────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Layer Details

### 1. Chat/NLU Service (`app/services/chat_service.py`)
- **Input**: User query (text), language code, user context (location, role)
- **Pipeline**:
  1. Language detection → translate to English for processing
  2. Intent classification: `forecast`, `alert`, `advisory`, `emergency`, `scheme`, `general`
  3. Entity extraction: location, timeframe, crop type, severity
  4. Route to appropriate service
  5. Compose grounded response from real data
  6. Translate back to user language
- **Output**: Structured response `{ answer, data_source, cached, timestamp, language }`

### 2. Weather Service (`app/services/weather_service.py`)
- **Responsibilities**:
  - Current weather + 5-day/3-hour forecast (OpenWeatherMap One Call API 3.0)
  - Geocoding (city name → lat/lon)
  - Cache responses in SQLite with TTL (30 min for current, 2 hours for forecast)
- **Endpoints**: `GET /weather/current`, `GET /weather/forecast`

### 3. Alert Service (`app/services/alert_service.py`)
- **Responsibilities**:
  - Fetch weather alerts (OpenWeatherMap alerts + IMD-style color coding)
  - Color-coded severity: 🔴 Critical (Red), 🟠 Warning (Orange), 🟡 Info (Yellow), 🟢 Normal (Green)
  - Push notification registration (Expo push tokens)
  - Background polling (every 15 min) for active alerts
- **Endpoints**: `GET /alerts/active`, `POST /alerts/subscribe`

### 4. Advisory Service (`app/services/advisory_service.py`)
- **Responsibilities**:
  - Role-aware guidance: Farmer, Fisherman, General
  - Crop-stage rules (sowing/irrigation/harvest) tied to forecast thresholds
  - Rule engine: JSON-configurable rules (no ML, fully transparent)
  - Government scheme pointers (PMFBY, RKVY, etc.) with official .gov.in links
- **Endpoints**: `GET /advisory/farmer`, `GET /advisory/fisherman`, `GET /advisory/schemes`

### 5. Translation Service (`app/services/translation_service.py`)
- **Responsibilities**:
  - Hindi ↔ English translation
  - LibreTranslate (self-hosted free) or Google Translate API (free tier)
  - Cache translations in SQLite
- **Endpoints**: `POST /translate`

---

## Data Layer

### SQLite Schema (Backend + Client-side via Expo SQLite)
```sql
-- Weather cache
CREATE TABLE weather_cache (
  key TEXT PRIMARY KEY,           -- "current:lat:lon" or "forecast:lat:lon"
  data TEXT NOT NULL,             -- JSON response
  fetched_at INTEGER NOT NULL,    -- Unix timestamp
  expires_at INTEGER NOT NULL
);

-- Alerts cache
CREATE TABLE alerts_cache (
  id TEXT PRIMARY KEY,            -- Alert ID from API
  data TEXT NOT NULL,
  severity TEXT NOT NULL,         -- critical/warning/info/normal
  area TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Advisory cache
CREATE TABLE advisory_cache (
  key TEXT PRIMARY KEY,           -- "farmer:lat:lon:crop_stage"
  data TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- User preferences
CREATE TABLE user_prefs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: language, role, location_lat, location_lon, emergency_contact, push_token
```

### Offline-First Strategy
1. **Cache-first reads**: Always serve from cache, then background refresh
2. **Stale-while-revalidate**: Show cached data with "Last updated X min ago" badge
3. **Offline queue**: Mutations (SOS, preferences) queued locally, synced when online
4. **Cache TTLs**: Current weather 30min, Forecast 2hr, Alerts 15min, Advisory 6hr

---

## Grounding Pipeline (How Answers Stay Factual)

```
User Query (Hindi/English)
        │
        ▼
┌───────────────────┐
│  Translate to EN  │  (if Hindi)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Intent/Entity    │  ──► forecast? → Weather Service
│  Extraction       │       alert?   → Alert Service
│  (spaCy/regex)    │       advisory?→ Advisory Service
└─────────┬─────────┘       emergency? → SOS Handler
          ▼                 scheme?    → Scheme Service
┌───────────────────┐
│  Fetch Real Data  │  (API calls with caching)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Compose Answer   │  Template-based, NO LLM generation
│  (Templates)      │  e.g. "Rain expected {probability}% at {time}."
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Translate Back   │  (to user language)
└─────────┬─────────┘
          ▼
   Structured Response
```

**Key Principle**: Every numeric claim (temperature, rain %, wind speed) comes directly from API response. Templates only add explanatory language.

---

## External APIs (Free Tier)

| Service | API | Free Tier Limits | Use Case |
|---------|-----|------------------|----------|
| OpenWeatherMap | One Call API 3.0 | 1,000 calls/day | Current, forecast, alerts, radar |
| OpenWeatherMap | Geocoding API | 1,000 calls/day | City → lat/lon |
| LibreTranslate | Self-hosted / Public | Unlimited (self-hosted) | Hindi ↔ English |
| Google Translate | Cloud Translation | 500K chars/month | Alternative translation |
| Expo Push | Push Notifications | Unlimited | Alert notifications |

---

## Deployment (Near $0 Cost)

| Component | Platform | Cost |
|-----------|----------|------|
| Backend API | Render / Railway / Fly.io (free tier) | $0 |
| Database | SQLite (file-based, no server) | $0 |
| Frontend | Expo Go (development) / EAS Build (free tier) | $0 |
| Translation | LibreTranslate (self-hosted on same server) | $0 |
| Push Notifications | Expo Push (free) | $0 |

---

## Mocked / Stubbed for Demo (Clearly Marked)

| Feature | Status | Notes |
|---------|--------|-------|
| IMD/MoES Official API | **MOCKED** | Using OpenWeatherMap alerts with IMD-style color mapping |
| Government Scheme Links | **STATIC JSON** | Real .gov.in URLs but static data |
| Crop Advisory Rules | **HARDCODED JSON** | Rule engine is real, rules are demo samples |
| Push Notifications | **EXPO DEV ONLY** | Works in Expo Go, production needs FCM/APNs config |
| Voice STT/TTS | **EXPO SPEECH** | Device-native, works offline for TTS |
| Offline Map Tiles | **NOT IMPLEMENTED** | MapView shows online tiles only |
| Emergency SOS Call/SMS | **SIMULATED** | Opens dialer/SMS composer with pre-filled number |
| User Auth | **NONE** | Anonymous usage, preferences local-only |

---

## API Contract (Backend)

### POST /api/chat
```json
// Request
{
  "query": "आज बारिश होगी क्या?",     // User query
  "language": "hi",                  // "hi" or "en"
  "location": { "lat": 28.61, "lon": 77.23 },  // Optional, uses cached if absent
  "role": "farmer"                   // "farmer" | "fisherman" | "general"
}

// Response
{
  "answer": "आज दिल्ली में 60% बारिश की संभावना है...",
  "language": "hi",
  "data_source": "openweathermap",
  "cached": false,
  "timestamp": "2026-09-18T10:30:00Z",
  "intent": "forecast",
  "entities": { "location": "Delhi", "timeframe": "today" },
  "grounding": {
    "temperature": 32,
    "humidity": 78,
    "precipitation_probability": 60,
    "source": "OpenWeatherMap One Call API"
  }
}
```

### GET /api/weather/current?lat=28.61&lon=77.23
```json
{
  "temperature": 32,
  "feels_like": 36,
  "humidity": 78,
  "wind_speed": 12,
  "condition": "Partly cloudy",
  "icon": "02d",
  "fetched_at": "2026-09-18T10:30:00Z",
  "cached": false
}
```

### GET /api/alerts/active?lat=28.61&lon=77.23
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "event": "Heat Wave",
      "severity": "warning",          // critical | warning | info | normal
      "color": "orange",              // red | orange | yellow | green
      "description": "Temperatures above 45°C expected",
      "areas": ["Delhi", "NCR"],
      "starts_at": "2026-09-18T12:00:00Z",
      "ends_at": "2026-09-18T20:00:00Z",
      "action": "Stay indoors, hydrate"
    }
  ],
  "fetched_at": "2026-09-18T10:30:00Z",
  "cached": false
}
```

### GET /api/advisory/farmer?lat=28.61&lon=77.23&crop_stage=sowing
```json
{
  "role": "farmer",
  "crop_stage": "sowing",
  "advisory": "Soil moisture adequate for sowing. Light rain expected tomorrow - good for germination. Avoid heavy irrigation today.",
  "actions": [
    { "action": "Proceed with sowing", "priority": "high" },
    { "action": "Skip irrigation today", "priority": "medium" }
  ],
  "based_on": {
    "forecast_summary": "Light rain tomorrow, 60% probability",
    "soil_moisture": "adequate"
  },
  "fetched_at": "2026-09-18T10:30:00Z"
}
```

### POST /api/translate
```json
// Request
{ "text": "Heavy rain expected today", "source": "en", "target": "hi" }

// Response
{ "translated_text": "आज भारी बारिश की संभावना है", "cached": false }
```

---

## Frontend Screens (React Native / Expo)

| Screen | Path | Key Features |
|--------|------|--------------|
| Home/Chat | `/` | Chat bubbles, voice input, language toggle, cached badge |
| Alerts | `/alerts` | Color-coded list, pull-to-refresh, push notification settings |
| Advisory | `/advisory` | Role selector (farmer/fisherman/general), crop stage picker |
| Map | `/map` | MapView with precipitation overlay (react-native-maps) |
| SOS | `/sos` | One-tap emergency button, contact picker, location sharing |
| Settings | `/settings` | Language, role, location, emergency contacts, cache management |

---

## Security & Privacy

- No user accounts / no PII stored on server
- Location used only for weather queries, never logged
- Emergency contacts stored locally only
- All API keys in environment variables
- HTTPS enforced in production

---

## Future Extensibility

| Feature | Integration Point |
|---------|-------------------|
| More languages | Add to `translation_service.py`, update frontend language selector |
| IMD official API | Swap `weather_service.py` provider, same interface |
| Satellite imagery | Add map tile layer in MapView |
| Voice-first UI | Expand STT/TTS, add wake word detection |
| Community reports | Add crowdsourced weather reports endpoint |