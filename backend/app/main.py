
from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.hiking import HikingRequest, HikingResponse, WeatherInfo
from app.services.gemini_service import generate_hiking_guide
from app.services.weather_service import get_weather


app = FastAPI(
    title="AI Hiking Assistant",
    description="Gemini-powered hiking research assistant",
    version="1.0.0"
)


# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "Hiking Assistant API is running!"
    }


# Standalone weather endpoint
@app.get("/api/weather", response_model=WeatherInfo)
def get_trailhead_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    trailhead_name: str = Query(...),
    hike_date: date | None = None
):
    try:
        return get_weather(
            latitude=latitude,
            longitude=longitude,
            trailhead_name=trailhead_name,
            hike_date=hike_date
        )

    except Exception as error:
        print(f"Weather error: {error}")
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve weather forecast."
        )


# Main hiking guide endpoint
@app.post("/api/hike-guide", response_model=HikingResponse)
def create_hiking_guide(request: HikingRequest):

    try:
        # Generate the hiking guide using Gemini
        result = generate_hiking_guide(request.message)

        # Weather comes from Open-Meteo, not Gemini
        result["weather"] = None

        # Retrieve weather if coordinates are provided
        if request.latitude is not None or request.longitude is not None:

            # Both coordinates are required
            if request.latitude is None or request.longitude is None:
                raise HTTPException(
                    status_code=422,
                    detail="Both latitude and longitude are required."
                )

            # A trailhead name is required
            if not request.trailhead_name:
                raise HTTPException(
                    status_code=422,
                    detail="A trailhead name is required for weather."
                )

            try:
                result["weather"] = get_weather(
                    latitude=request.latitude,
                    longitude=request.longitude,
                    trailhead_name=request.trailhead_name,
                    hike_date=request.hike_date
                )

            except Exception as weather_error:
                print(f"Weather error: {weather_error}")

                # Keep the hiking guide available if weather fails
                result["weather"] = None

        return result

    except HTTPException:
        raise

    except Exception as error:
        print(f"Gemini error: {error}")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate hiking guide."
        )
