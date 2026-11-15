from datetime import date
import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.hiking import HikingRequest, HikingResponse, WeatherInfo
from app.schemas.chat import ChatRequest, ChatResponse

from app.services.gemini_service import (
    generate_hiking_guide,
    generate_weather_aware_packing_list,
)
from app.services.weather_service import get_weather, get_coordinates
from app.services.chat_service import generate_chat_response


logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Hiking Assistant",
    description="Gemini-powered hiking research assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Hiking Assistant API is running!"}


@app.get("/api/weather", response_model=WeatherInfo)
def get_trailhead_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    trailhead_name: str = Query(...),
    hike_date: date | None = None,
):
    try:
        weather = get_weather(
            latitude=latitude,
            longitude=longitude,
            trailhead_name=trailhead_name,
            hike_date=hike_date,
        )

        return WeatherInfo.model_validate(weather)

    except Exception as error:
        logger.warning("Weather lookup failed: %s", error)

        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve a forecast for the requested date.",
        ) from error


@app.post("/api/hike-guide", response_model=HikingResponse)
def create_hiking_guide(request: HikingRequest):
    weather_date = request.hike_date or date.today()
    date_string = weather_date.isoformat()

    if (request.latitude is None) != (request.longitude is None):
        raise HTTPException(
            status_code=422,
            detail="Provide both latitude and longitude, or neither.",
        )

    try:
        prompt = (
            f"{request.message}\n\n"
            f"Selected visit date: {date_string}. "
            "Do not invent weather or numerical weather-based packing claims. "
            "The backend will retrieve weather separately for this date."
        )

        result = generate_hiking_guide(prompt)

        # These values come from the backend, not Gemini.
        result["hike_date"] = date_string
        result["weather"] = None
        result["weather_status"] = "unavailable"
        result["weather_message"] = None
        result["packing_status"] = "general"

        try:
            # Prefer exact coordinates if the request provides them.
            if request.latitude is not None and request.longitude is not None:
                location = {
                    "latitude": request.latitude,
                    "longitude": request.longitude,
                    "name": (
                        request.trailhead_name
                        or result["destination"]
                    ),
                }
            else:
                location = get_coordinates(result["destination"])

            weather = get_weather(
                latitude=location["latitude"],
                longitude=location["longitude"],
                trailhead_name=location["name"],
                hike_date=weather_date,
            )

            # Never use weather from a different date.
            if weather.get("forecast_date") != date_string:
                raise ValueError(
                    "Forecast date does not match the selected visit date."
                )

            validated_weather = WeatherInfo.model_validate(weather)

            result["weather"] = validated_weather.model_dump()
            result["weather_status"] = "available"
            result["weather_message"] = f"Forecast for {date_string}."

        except Exception as error:
            logger.warning(
                "Weather lookup failed for %s: %s",
                date_string,
                error,
            )

            # Do not fall back to today's weather.
            result["weather"] = None
            result["weather_status"] = "unavailable"
            result["weather_message"] = (
                f"A forecast could not be retrieved for {date_string}. "
                "The date may be outside the forecast window, the location "
                "may not resolve, or the weather service may be unavailable. "
                "Packing advice is general rather than forecast-based."
            )

        # Generate packing advice using only matching weather.
        if result["weather"] is not None:
            try:
                result["packing_list"] = (
                    generate_weather_aware_packing_list(
                        hiking_guide=result,
                        weather=result["weather"],
                    )
                )

                result["packing_status"] = "weather_aware"

            except Exception as error:
                logger.warning(
                    "Weather-aware packing generation failed: %s",
                    error,
                )

                # Keep the original general list.
                result["packing_status"] = "general"

        return result

    except Exception as error:
        logger.exception("Hiking guide generation failed")

        raise HTTPException(
            status_code=502,
            detail="Unable to generate hiking guide.",
        ) from error


@app.post("/api/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest):
    try:
        response = generate_chat_response(
            user_message=request.message,
            hiking_context=request.hiking_context,
            conversation_history=[
                message.model_dump()
                for message in request.conversation_history
            ],
        )

        return {"response": response}

    except Exception as error:
        logger.exception("Chat response failed")

        raise HTTPException(
            status_code=502,
            detail="Unable to generate chat response.",
        ) from error