
from datetime import date

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
        # Step 1: Generate the initial hiking guide
        result = generate_hiking_guide(request.message)

        result["weather"] = None

        # Step 2: Retrieve weather information
        try:
            destination = result["destination"]

            location = get_coordinates(destination)

            # Use today's date if the user did not provide one
            weather_date = request.hike_date or date.today()

            try:
                # First attempt: requested hiking date
                result["weather"] = get_weather(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    trailhead_name=location["name"],
                    hike_date=weather_date
                )

            except Exception as forecast_error:
                print(
                    f"Requested weather forecast failed: {forecast_error}"
                )

                # Fall back to today's forecast if necessary
                today = date.today()

                if weather_date != today:
                    print(
                        "Attempting to retrieve today's weather instead."
                    )

                    result["weather"] = get_weather(
                        latitude=location["latitude"],
                        longitude=location["longitude"],
                        trailhead_name=location["name"],
                        hike_date=today
                    )

                else:
                    raise forecast_error

        except Exception as weather_error:
            print(f"Weather error: {weather_error}")
            result["weather"] = None

        # Step 3: Generate a weather-aware packing list
        if result["weather"] is not None:

            try:
                print(
                    "Generating weather-aware packing recommendations..."
                )

                updated_packing_list = generate_weather_aware_packing_list(
                    hiking_guide=result,
                    weather=result["weather"]
                )

                result["packing_list"] = updated_packing_list

                print(
                    "Weather-aware packing list generated successfully."
                )

            except Exception as packing_error:
                print(
                    f"Weather-aware packing generation failed: {packing_error}"
                )

                print(
                    "Keeping the original packing list as a fallback."
                )

        else:
            print(
                "Weather unavailable. Keeping the original packing list."
            )

        # Step 4: Return the completed hiking guide
        return result

    except Exception as error:
        print(f"Gemini error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Unable to generate hiking guide."
        )


# AI hiking chatbot endpoint
@app.post("/api/chat", response_model=ChatResponse)
def chat_with_assistant(request: ChatRequest):

    try:
        response = generate_chat_response(
            user_message=request.message,
            hiking_context=request.hiking_context,
            conversation_history=[
                message.model_dump()
                for message in request.conversation_history
            ]
        )

        return {
            "response": response
        }

    except Exception as error:
        print(f"Chat error: {error}")

        raise HTTPException(
            status_code=502,
            detail="Unable to generate chat response."
        )
