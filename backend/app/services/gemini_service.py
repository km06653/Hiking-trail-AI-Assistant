
import time
import json

from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY
from app.schemas.hiking import HikingResponse, PackingItem


client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.5-flash-lite"


def generate_hiking_guide(user_request: str):

    prompt = f"""
    You are an AI hiking preparation assistant.

    The user wants hiking information about:

    {user_request}

    Generate a complete hiking guide with:

    1. Destination overview.
    2. Popular hiking trails.
    3. Trail distances, difficulty, elevation gain, and estimated duration.
    4. Recommended packing items.
    5. Park rules and restrictions.
    6. Important hiking safety tips.
    7. Useful nearby locations.
    8. General hiking recommendations.
    9. Citations, if reliable sources are available.

    IMPORTANT INSTRUCTIONS:

    - Never invent trail distances or elevation gains.
    - Use "Unknown" when information cannot be established.
    - Mark unverified trail information as "Unverified".
    - Distinguish general recommendations from official park rules.
    - Do not invent citations or URLs.
    - Use an empty citations list if no reliable sources are available.
    - Do not generate weather information.
    - Weather will be retrieved separately by the backend.
    - Do not generate Google Maps URLs.
    - Keep descriptions concise and useful.
    """

    start_time = time.perf_counter()

    print(f"Sending request to Gemini ({MODEL})...")

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=HikingResponse,
            max_output_tokens=3000,
        ),
    )

    elapsed = time.perf_counter() - start_time

    print(f"Gemini response received in {elapsed:.2f} seconds")

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    # Validate Gemini's JSON against our Pydantic schema
    hiking_guide = HikingResponse.model_validate_json(response.text)

    result = hiking_guide.model_dump()

    # Weather is retrieved separately through Open-Meteo
    result["weather"] = None

    return result


def generate_weather_aware_packing_list(
    hiking_guide: dict,
    weather: dict
):
    destination = hiking_guide.get(
        "destination",
        "Unknown destination"
    )

    trails = hiking_guide.get("trails", [])

    trail_information = [
        {
            "name": trail.get("name"),
            "difficulty": trail.get("difficulty"),
            "distance": trail.get("distance"),
            "elevation_gain": trail.get("elevation_gain"),
            "estimated_duration": trail.get("estimated_duration"),
        }
        for trail in trails
    ]

    prompt = f"""
    You are TrailMate AI, an expert hiking preparation assistant.

    Create a weather-aware packing list for this hiking trip.

    DESTINATION:
    {destination}

    TRAIL INFORMATION:
    {trail_information}

    WEATHER FORECAST:
    {weather}

    EXISTING PACKING LIST:
    {hiking_guide.get("packing_list", [])}

    INSTRUCTIONS:

    1. Adapt the packing list to the actual weather forecast.
    2. Consider temperature, precipitation probability, wind speed,
       and weather conditions.
    3. Consider trail difficulty, distance, elevation gain, and duration.
    4. Include appropriate clothing, hydration, safety equipment,
       and other useful hiking supplies.
    5. Explain briefly why each item is recommended.
    6. Mark essential items with essential=true.
    7. Avoid unnecessary or duplicate items.
    8. Keep recommendations practical and concise.
    9. Never invent weather conditions that are not in the forecast.
    10. Preserve important safety items even if the weather is favorable.

    Return only a structured list of packing items.
    """

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[PackingItem],
            max_output_tokens=2000,
        ),
    )

    if not response.text:
        raise ValueError("Gemini returned an empty packing list.")

    packing_items = json.loads(response.text)

    return [
        PackingItem.model_validate(item).model_dump()
        for item in packing_items
    ]
