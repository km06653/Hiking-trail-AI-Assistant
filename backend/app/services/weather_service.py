import httpx
from datetime import date

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather_description(code: int) -> str:
    descriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",
        80: "Rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with heavy hail",
    }

    return descriptions.get(code, "Unknown conditions")


def get_weather(
    latitude: float,
    longitude: float,
    trailhead_name: str,
    hike_date: date | None = None
) -> dict:

    forecast_date = hike_date or date.today()

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": (
            "temperature_2m_max,"
            "temperature_2m_min,"
            "precipitation_probability_max,"
            "wind_speed_10m_max,"
            "weather_code"
        ),
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "timezone": "auto", 
        "start_date": forecast_date.isoformat(),
        "end_date": forecast_date.isoformat(),
    }

    response = httpx.get(
    OPEN_METEO_URL,
    params=params,
    timeout=httpx.Timeout(
        30.0,
        connect=20.0
    )
)
    response.raise_for_status()
    data = response.json()

    daily = data.get("daily", {})

    if not daily.get("time"):
        raise ValueError("No weather forecast available for this date.")

    weather_code = daily["weather_code"][0]

    return {
        "trailhead_name": trailhead_name,
        "forecast_date": daily["time"][0],
        "temperature_max": daily["temperature_2m_max"][0],
        "temperature_min": daily["temperature_2m_min"][0],
        "precipitation_probability": daily["precipitation_probability_max"][0],
        "wind_speed_max": daily["wind_speed_10m_max"][0],
        "weather_code": weather_code,
        "weather_summary": get_weather_description(weather_code),
        "temperature_unit": "°F",
        "wind_speed_unit": "mph",
        "source": "Open-Meteo",
    }