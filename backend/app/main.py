
from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.hiking import HikingRequest, HikingResponse, WeatherInfo
from app.schemas.chat import ChatRequest, ChatResponse

from app.services.gemini_service import generate_hiking_guide
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
        result = generate_hiking_guide(request.message)
        result["weather"] = None

        try:
            # Extract the destination from Gemini's response.
            destination = result["destination"]

            # Find the destination coordinates.
            location = get_coordinates(destination)

            # If no date was provided, use today's date.
            weather_date = request.hike_date or date.today()

            try:
                # First attempt: retrieve weather for the requested date.
                result["weather"] = get_weather(
                    latitude=location["latitude"],
                    longitude=location["longitude"],
                    trailhead_name=location["name"],
                    hike_date=weather_date
                )

            except Exception as forecast_error:
                print(f"Requested weather forecast failed: {forecast_error}")

                # Second attempt: fall back to today's weather
                # if the requested date was different from today.
                today = date.today()

                if weather_date != today:
                    print("Attempting to retrieve today's weather instead.")

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
