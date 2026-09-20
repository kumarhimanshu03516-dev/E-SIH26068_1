# WeatherGPT - SIH 2026 (Problem Statement SIH26068)

Conversational AI assistant for weather forecasts, alerts, and climate advisories — grounded in real IMD/OpenWeatherMap data, multilingual (Hindi/English), offline-first, with role-aware guidance and emergency SOS.

**Ministry of Earth Sciences / IMD | Theme: Disaster Management**

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Expo CLI: `npm install -g expo-cli`
- OpenWeatherMap API key (free tier): https://openweathermap.org/api

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENWEATHER_API_KEY

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Run on all interfaces so phone/emulator can reach it
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API runs at `http://localhost:8000` (or your LAN IP) with docs at `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend
cp .env.example .env
# Edit .env and set EXPO_PUBLIC_API_URL:
#   - Android emulator: http://10.0.2.2:8000
#   - Physical phone on same LAN: http://192.168.x.x:8000 (your PC LAN IP)
#   - Web browser: http://localhost:8000
npm install
npx expo start
```
Scan QR with Expo Go app on Android/iOS, or press `a` for Android emulator, `w` for web.

---

## Architecture Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  React Native   │ ◄─────────────► │     FastAPI      │
│   (Expo App)    │   REST + WS     │   (Python)       │
└────────┬────────┘                 └────────┬─────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌──────────────────┐
│  SQLite (Local) │                 │  SQLite (Server) │
│  - Weather cache│                 │  - All caches    │
│  - User prefs   │                 │  - Chat history  │
│  - Chat history │                 └────────┬─────────┘
└─────────────────┘                          │
                                             ▼
                              ┌────────────────────────────┐
                              │     External APIs (Free)   │
                              │  • OpenWeatherMap (Weather)│
                              │  • LibreTranslate (i18n)   │
                              │  • Expo Push (Notifications)│
                              └────────────────────────────┘
```

### Service Layer (Backend)
| Service | Responsibility | Key Methods |
|---------|---------------|-------------|
| **WeatherService** | Current/forecast, geocoding, caching | `get_current()`, `get_forecast()`, `geocode()` |
| **AlertService** | Weather alerts with IMD-style colors | `get_active_alerts()`, `subscribe_push()` |
| **AdvisoryService** | Role-aware guidance (farmer/fisherman) | `get_farmer_advisory()`, `get_fisherman_advisory()`, `get_schemes()` |
| **TranslationService** | Hindi ↔ English with caching | `translate()` |
| **ChatService** | Grounding pipeline: intent→fetch→compose | `process_query()` |

---

## Grounding Pipeline (How Answers Stay Factual)

Every weather claim traces to real API data — **no LLM hallucination**.

```
User Query (Hindi/English)
        │
        ▼
┌───────────────────┐
│  Translate to EN  │  (if Hindi)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Intent/Entity    │  ──► forecast? → WeatherService
│  Extraction       │       alert?   → AlertService
│  (keyword/regex)  │       advisory?→ AdvisoryService
└─────────┬─────────┘       emergency? → SOS Handler
          ▼                 scheme?    → Scheme Service
┌───────────────────┐
│  Fetch Real Data  │  (API calls with SQLite caching)
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

## API Endpoints

### Chat (Grounded Conversational)
```bash
POST /api/chat
{
  "query": "आज बारिश होगी क्या?",
  "language": "hi",
  "location": {"lat": 28.61, "lon": 77.23},
  "role": "farmer"
}
```

**Response** (always grounded):
```json
{
  "answer": "आज दिल्ली में 60% बारिश की संभावना है...",
  "language": "hi",
  "data_source": "openweathermap",
  "cached": false,
  "timestamp": "2026-09-18T10:30:00Z",
  "intent": "forecast",
  "entities": {"location": "Delhi", "timeframe": "today"},
  "grounding": {
    "temperature": 32,
    "humidity": 78,
    "precipitation_probability": 60,
    "source": "OpenWeatherMap One Call API"
  }
}
```

### Weather Data
- `GET /api/weather/current?lat=28.61&lon=77.23`
- `GET /api/weather/forecast?lat=28.61&lon=77.23`
- `GET /api/weather/geocode?city=Delhi`

### Alerts (IMD-style color coding)
- `GET /api/alerts/active?lat=28.61&lon=77.23`
- `POST /api/alerts/subscribe` (push notifications)

### Advisory (Role-aware)
- `GET /api/advisory/farmer?lat=28.61&lon=77.23&crop_stage=sowing`
- `GET /api/advisory/fisherman?lat=28.61&lon=77.23`
- `GET /api/advisory/general?lat=28.61&lon=77.23`
- `GET /api/advisory/schemes`

### Translation
- `POST /api/translate` { "text": "...", "source": "en", "target": "hi" }

---

## Frontend Screens

| Screen | Route | Features |
|--------|-------|----------|
| **Home** | Home | Current weather, 24‑hour forecast, city search (geocode), quick action buttons |
| **Chat** | Chat | Text/voice input, multilingual, grounded responses, cached badges |
| **Alerts** | Alerts | Color-coded (🔴/🟠/🟡/🟢), pull-to-refresh, push notifications subscribe |
| **Advisory** | Advisory | Role selector (farmer/fisherman/general), crop stage picker |
| **Map** | Map | React-native-maps, alert markers, precipitation overlay ready |
| **SOS** | SOS | One-tap emergency, dials 112, SMS with location, helpline grid |
| **Schemes** | Schemes | Gov schemes (PMFBY, RWBCIS, KCC, PMKSY, NDRF, PMMSY) with .gov.in links |
| **Settings** | Settings | Language, role, emergency contact, cache management, offline status |

---

## Offline-First Behavior

1. **Cache-first reads**: Always serve from SQLite, then background refresh
2. **Stale-while-revalidate**: Show cached data with "Last updated X min ago" badge
3. **Offline queue**: Failed requests queued locally, synced when online
4. **Cache TTLs**:
   - Current weather: 30 min
   - Forecast: 2 hours
   - Alerts: 15 min
   - Advisory: 6 hours
   - Translations: 24 hours

---

## Multilingual Support

| Language | Code | STT | TTS | Translation |
|----------|------|-----|-----|-------------|
| English | `en` | ✅ | ✅ | ✅ |
| Hindi | `hi` | ✅ | ✅ | ✅ |

- **Voice Input**: `expo-speech-recognition` (device-native, works offline for TTS)
- **Voice Output**: `expo-speech` (device-native TTS)
- **Translation**: LibreTranslate (self-hosted free) with fallback dictionary
- **Extensible**: Add languages in `TranslationService` + frontend `LanguageSelector`

---

## Role-Aware Advisory

### Farmer (`role: "farmer"`)
Crop-stage specific guidance based on real forecast:
- **Sowing**: Soil moisture, rain probability → proceed/delay/irrigate
- **Growing**: Pest/disease risk, drainage, irrigation timing
- **Harvest**: Dry weather window, grain spoilage risk

### Fisherman (`role: "fisherman"`)
Sea safety based on wind/wave thresholds:
- **Safe** (≤15 km/h): Venture out with precautions
- **Caution** (15-25 km/h): Stay near shore, hourly updates
- **Unsafe** (>25 km/h): DO NOT venture out, return immediately

### General (`role: "general"`)
Health-focused: heat wave, cold wave, humidity warnings

---

## Emergency SOS

One-tap activation:
1. Vibrates device
2. Gets current GPS location
3. Opens dialer to **112** (National Emergency)
4. Opens SMS to emergency contact with location link
5. Shows helpline grid: 112, 1078 (Disaster), 102 (Ambulance), 100 (Police), 101 (Fire)

---

## Government Schemes (Static Data for Demo)

| Scheme | Description | Official Portal |
|--------|-------------|-----------------|
| PMFBY | Crop insurance for natural calamities | pmfby.gov.in |
| RWBCIS | Weather-based insurance, fast claims | agriccoop.nic.in |
| KCC | Short-term credit, interest subvention | pmkisan.gov.in |
| PMKSY | Micro-irrigation subsidies | pmksy.gov.in |
| NDRF/SDRF | Relief for notified disasters | ndma.gov.in |
| PMMSY | Fisheries subsidies, insurance | dof.gov.in/pmmsy |

---

## What's Mocked / Stubbed for Demo

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

## Folder Structure

```
WeatherGPT/
├── backend/
│   ├── app/
│   │   ├── core/config.py          # Settings, env vars
│   │   ├── db/database.py          # SQLAlchemy + SQLite
│   │   ├── models/                 # ORM models (caches, prefs)
│   │   ├── schemas/                # Pydantic request/response
│   │   ├── services/               # Business logic layer
│   │   │   ├── weather_service.py
│   │   │   ├── alert_service.py
│   │   │   ├── advisory_service.py
│   │   │   ├── translation_service.py
│   │   │   └── chat_service.py     # Grounding pipeline
│   │   └── main.py                 # FastAPI routes
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── screens/                # 7 main screens
│   │   ├── components/             # Reusable UI (WeatherCard, AlertCard, etc.)
│   │   ├── services/               # API, storage, voice, location, notifications
│   │   ├── hooks/                  # useWeather, useChat
│   │   ├── context/store.ts        # Zustand state (persisted)
│   │   ├── types/                  # TypeScript interfaces
│   │   └── App.tsx                 # Navigation + init
│   ├── package.json
│   ├── app.json
│   └── tsconfig.json
├── ARCHITECTURE.md                 # Detailed system design
└── README.md
```

---

## Deployment (Near $0 Cost)

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Backend API | Render / Railway / Fly.io | 750 hrs/mo |
| Database | SQLite (file) | Free |
| Frontend | Expo Go (dev) / EAS Build | Free |
| Translation | LibreTranslate (self-hosted) | Free |
| Push | Expo Push | Free |

---

## Testing the Demo

```bash
# Backend health
curl http://localhost:8000/api/health

# Chat (English)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Will it rain today in Delhi?", "language": "en", "location": {"lat": 28.61, "lon": 77.23}}'

# Chat (Hindi)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "आज दिल्ली में बारिश होगी?", "language": "hi", "location": {"lat": 28.61, "lon": 77.23}}'

# Alerts
curl "http://localhost:8000/api/alerts/active?lat=28.61&lon=77.23"

# Farmer Advisory
curl "http://localhost:8000/api/advisory/farmer?lat=28.61&lon=77.23&crop_stage=sowing"
```

---

## Extending for Production

1. **IMD Integration**: Replace `weather_service.py` provider when official API available
2. **Auth**: Add JWT auth, user accounts, sync preferences to cloud
3. **Map Tiles**: Add offline MBTiles for radar/precipitation overlay
4. **Analytics**: Add privacy-respecting usage analytics
5. **More Languages**: Extend `TranslationService` + add to `LanguageSelector`
6. **Voice Wake Word**: Add Porcupine/Rhino for hands-free "Hey WeatherGPT"
7. **Community Reports**: Crowdsourced weather observations endpoint

---

## License

MIT License — Built for Smart India Hackathon 2026 (SIH26068)