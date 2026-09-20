from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db, init_db
from app.services import WeatherService, AlertService, AdvisoryService, TranslationService, ChatService
from app.schemas.chat import ChatRequest, ChatResponse, TranslateRequest, TranslateResponse
from app.schemas.weather import CurrentWeather, ForecastResponse, GeocodeResult
from app.schemas.alerts import AlertsResponse, PushSubscription
from app.schemas.advisory import AdvisoryResponse, SchemesResponse

settings = get_settings()

chat_service: ChatService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chat_service
    chat_service = ChatService()
    await chat_service.initialize()
    init_db()
    yield
    await chat_service.close()


app = FastAPI(
    title="WeatherGPT API",
    description="Conversational weather assistant grounded in real data",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not chat_service:
        raise HTTPException(503, "Service not initialized")
    return await chat_service.process_query(
        query=request.query,
        language=request.language,
        location=request.location,
        role=request.role
    )


@app.post("/api/translate", response_model=TranslateResponse)
async def translate_endpoint(request: TranslateRequest):
    ts = TranslationService()
    try:
        translated, cached = await ts.translate(request.text, request.source, request.target)
        return TranslateResponse(translated_text=translated, cached=cached)
    finally:
        await ts.close()


@app.get("/api/weather/current", response_model=CurrentWeather)
async def weather_current(lat: float, lon: float, db: Session = Depends(get_db)):
    ws = WeatherService(db)
    try:
        return await ws.get_current(lat, lon)
    finally:
        await ws.close()


@app.get("/api/weather/forecast", response_model=ForecastResponse)
async def weather_forecast(lat: float, lon: float, db: Session = Depends(get_db)):
    ws = WeatherService(db)
    try:
        return await ws.get_forecast(lat, lon)
    finally:
        await ws.close()


@app.get("/api/weather/geocode", response_model=GeocodeResult)
async def weather_geocode(city: str, db: Session = Depends(get_db)):
    ws = WeatherService(db)
    try:
        result = await ws.geocode(city)
        if not result:
            raise HTTPException(404, "City not found")
        return result
    finally:
        await ws.close()


@app.get("/api/alerts/active", response_model=AlertsResponse)
async def alerts_active(lat: float, lon: float, db: Session = Depends(get_db)):
    als = AlertService(db)
    try:
        return await als.get_active_alerts(lat, lon)
    finally:
        await als.close()


@app.post("/api/alerts/subscribe")
async def alerts_subscribe(subscription: PushSubscription, db: Session = Depends(get_db)):
    als = AlertService(db)
    try:
        success = await als.subscribe_push(subscription.token, subscription.location["lat"], subscription.location["lon"], subscription.language)
        return {"success": success}
    finally:
        await als.close()


@app.get("/api/advisory/farmer", response_model=AdvisoryResponse)
async def advisory_farmer(lat: float, lon: float, crop_stage: str = "sowing", db: Session = Depends(get_db)):
    ws = WeatherService(db)
    ads = AdvisoryService(db, ws)
    try:
        return await ads.get_farmer_advisory(lat, lon, crop_stage)
    finally:
        await ads.close()


@app.get("/api/advisory/fisherman", response_model=AdvisoryResponse)
async def advisory_fisherman(lat: float, lon: float, db: Session = Depends(get_db)):
    ws = WeatherService(db)
    ads = AdvisoryService(db, ws)
    try:
        return await ads.get_fisherman_advisory(lat, lon)
    finally:
        await ads.close()


@app.get("/api/advisory/general", response_model=AdvisoryResponse)
async def advisory_general(lat: float, lon: float, db: Session = Depends(get_db)):
    ws = WeatherService(db)
    ads = AdvisoryService(db, ws)
    try:
        return await ads.get_general_advisory(lat, lon)
    finally:
        await ads.close()


@app.get("/api/advisory/schemes", response_model=SchemesResponse)
async def advisory_schemes(db: Session = Depends(get_db)):
    ads = AdvisoryService(db)
    try:
        return await ads.get_schemes()
    finally:
        await ads.close()


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "WeatherGPT", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)