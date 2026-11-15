from datetime import date
import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.schemas.hiking import (
    HikingRequest,
    HikingResponse,
    WeatherInfo,
)
from app.schemas.chat import ChatRequest, ChatResponse

from app.services.gemini_service import (
    generate_hiking_guide,
    generate_weather_aware_packing_list,
)
from app.services.weather_service import (
    get_weather,
    get_coordinates,
)
from app.services.chat_service import generate_chat_response


logger = logging.getLogger(__name__)


class VisitWeatherRequest(BaseModel):
    hike_date: date
    hiking_context: HikingResponse


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
            detail="Unable to retrieve weather for the requested date.",
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

        # Initialize backend-controlled response fields.
        result["hike_date"] = date_string
        result["weather"] = None
        result["weather_status"] = "unavailable"
        result["weather_message"] = None
        result["packing_status"] = "general"

        # Initialize destination coordinates for the frontend map.
        result["destination_latitude"] = None
        result["destination_longitude"] = None

        try:
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

            # Save coordinates before requesting weather.
            # The map can still work if the weather request fails.
            result["destination_latitude"] = location["latitude"]
            result["destination_longitude"] = location["longitude"]

            weather = get_weather(
                latitude=location["latitude"],
                longitude=location["longitude"],
                trailhead_name=location["name"],
                hike_date=weather_date,
            )

            if weather.get("forecast_date") != date_string:
                raise ValueError(
                    "Forecast date does not match the selected visit date."
                )

            result["weather"] = (
                WeatherInfo.model_validate(weather).model_dump()
            )

            result["weather_status"] = "available"
            result["weather_message"] = f"Forecast for {date_string}."

        except Exception as error:
            logger.warning(
                "Weather or location lookup failed for %s: %s",
                date_string,
                error,
            )

            result["weather"] = None
            result["weather_status"] = "unavailable"
            result["weather_message"] = (
                f"A forecast could not be retrieved for {date_string}. "
                "The date may be outside the forecast window, the location "
                "may not resolve, or the weather service may be unavailable. "
                "Packing advice is general rather than forecast-based."
            )

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

                # The forecast can still be used if Gemini is busy.
                result["packing_list"] = packing_for_weather(
                    result["weather"]
                )
                result["packing_status"] = "weather_aware"

        return result

    except Exception as error:
        logger.exception("Hiking guide generation failed")

        if getattr(error, "code", None) == 503:
            raise HTTPException(
                status_code=503,
                detail=(
                    "The AI service is temporarily busy. "
                    "Please try again shortly."
                ),
            ) from error

        raise HTTPException(
            status_code=502,
            detail="Unable to generate the hiking guide. Please try again.",
        ) from error


def packing_for_weather(weather: dict) -> list[dict]:
    """
    Build a basic forecast-aware checklist without an AI request.

    These are general preparation suggestions, not a complete
    equipment assessment for every trail.
    """

    items = [
        {
            "item": "Water",
            "reason": "Bring enough for your planned outing.",
            "essential": True,
        },
        {
            "item": "Walking shoes",
            "reason": "Choose grip suited to the selected trails.",
            "essential": True,
        },
        {
            "item": "Layers",
            "reason": "Prepare for temperature changes during your outing.",
            "essential": True,
        },
        {
            "item": "Offline map",
            "reason": "Download your route before leaving reliable service.",
            "essential": True,
        },
        {
            "item": "Snacks",
            "reason": "Bring food appropriate for the length of your visit.",
            "essential": False,
        },
        {
            "item": "Sun protection",
            "reason": "Bring a hat and sunscreen for exposed sections.",
            "essential": False,
        },
    ]

    code = weather["weather_code"]

    if (
        weather["precipitation_probability"] >= 30
        or 51 <= code <= 99
    ):
        items.append(
            {
                "item": "Waterproof outer layer",
                "reason": (
                    "Suggested for the selected day's "
                    "precipitation forecast."
                ),
                "essential": True,
            }
        )

    if weather["wind_speed_max"] >= 12:
        items.append(
            {
                "item": "Wind protection",
                "reason": (
                    "Suggested for the selected day's wind forecast. "
                    "A suitable rain shell may serve both purposes."
                ),
                "essential": False,
            }
        )

    if weather["temperature_min"] < 45:
        items.append(
            {
                "item": "Warm layer",
                "reason": (
                    "Suggested because the selected day's "
                    "forecast low is below 45°F."
                ),
                "essential": True,
            }
        )

    return items


@app.post("/api/visit-weather", response_model=HikingResponse)
def update_visit_weather(request: VisitWeatherRequest):
    """
    Update an existing guide's date and weather.

    This endpoint never calls Gemini.
    """

    result = request.hiking_context.model_dump()
    requested_date = request.hike_date.isoformat()

    try:
        location = get_coordinates(result["destination"])

        weather = get_weather(
            latitude=location["latitude"],
            longitude=location["longitude"],
            trailhead_name=location["name"],
            hike_date=request.hike_date,
        )

        if weather.get("forecast_date") != requested_date:
            raise ValueError(
                "The returned forecast does not match the visit date."
            )

        weather = WeatherInfo.model_validate(weather).model_dump()

    except Exception as error:
        logger.warning(
            "Visit weather update failed for %s: %s",
            requested_date,
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not retrieve weather for the selected date. "
                "Your previous guide has been kept. "
                "The forecast may be unavailable or the weather "
                "connection may have failed."
            ),
        ) from error

    # Commit the new date and forecast together.
    result["hike_date"] = requested_date
    result["weather"] = weather
    result["weather_status"] = "available"
    result["weather_message"] = f"Forecast for {requested_date}."
    result["packing_list"] = packing_for_weather(weather)
    result["packing_status"] = "weather_aware"

    return result


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
            detail="Unable to generate a chat response.",
        ) from error