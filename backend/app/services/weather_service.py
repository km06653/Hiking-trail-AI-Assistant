
from datetime import date
import logging
import math
import os
import re

import httpx
import httpcore


logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

# Temporary fallback IP tested successfully with curl and httpx.
# Can be changed through the OPEN_METEO_FALLBACK_IP environment variable.
OPEN_METEO_FALLBACK_IP = os.getenv(
    "OPEN_METEO_FALLBACK_IP",
    "94.130.142.35",
)


class OpenMeteoFallbackBackend(httpcore.SyncBackend):
    """
    Connect to an alternative IP for Open-Meteo while preserving
    the original hostname for TLS/SNI and certificate verification.
    """

    def connect_tcp(
        self,
        host,
        port,
        timeout=None,
        local_address=None,
        socket_options=None,
    ):
        if host == "api.open-meteo.com":
            logger.warning(
                "Using Open-Meteo fallback IP: %s",
                OPEN_METEO_FALLBACK_IP,
            )
            host = OPEN_METEO_FALLBACK_IP

        return super().connect_tcp(
            host=host,
            port=port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )


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


def get_coordinates(location: str) -> dict:
    """
    Look up a US hiking destination.

    Try the full destination name, a simplified name,
    and the name before any comma.
    """

    simplified_location = re.sub(
        r"\b(state natural reserve|national park|state park|"
        r"state beach|regional park|nature reserve|"
        r"natural reserve|wilderness area)\b",
        "",
        location,
        flags=re.IGNORECASE,
    )

    simplified_location = " ".join(
        simplified_location.split()
    ).strip(" ,")

    search_names = [location]

    if (
        simplified_location
        and simplified_location.lower() != location.lower()
    ):
        search_names.append(simplified_location)

    for name in list(search_names):
        short_name = name.split(",", 1)[0].strip()

        if short_name and short_name not in search_names:
            search_names.append(short_name)

    for name in dict.fromkeys(search_names):
        params = {
            "name": name,
            "count": 10,
            "language": "en",
            "format": "json",
            "countryCode": "US",
        }

        response = httpx.get(
            GEOCODING_URL,
            params=params,
            timeout=httpx.Timeout(30.0, connect=20.0),
        )

        response.raise_for_status()

        results = response.json().get("results", [])

        # Honor California if it was explicitly provided.
        if "california" in location.lower():
            results = [
                result
                for result in results
                if result.get("admin1") == "California"
            ]

        if results:
            place = results[0]

            resolved_name = ", ".join(
                str(part)
                for part in [
                    place["name"],
                    place.get("admin1"),
                ]
                if part
            )

            return {
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "name": resolved_name,
            }

    raise ValueError(
        f"Could not find coordinates for {location}"
    )


def _request_weather(params: dict) -> httpx.Response:
    """
    Request the forecast using the normal endpoint first.

    If the connection fails, retry through the alternative IP.
    The original hostname remains in the URL, preserving TLS
    hostname verification and SNI.
    """

    timeout = httpx.Timeout(
        30.0,
        connect=15.0,
    )

    # First attempt: normal DNS resolution.
    try:
        logger.info("Requesting weather from Open-Meteo normally.")

        response = httpx.get(
            OPEN_METEO_URL,
            params=params,
            timeout=timeout,
        )

        response.raise_for_status()
        return response

    except (httpx.ConnectError, httpx.ConnectTimeout) as error:
        logger.warning(
            "Normal Open-Meteo connection failed: %s. "
            "Trying fallback IP.",
            error,
        )

    # Second attempt: alternative IP, with the original hostname
    # retained for TLS/SNI and certificate verification.
    transport = httpx.HTTPTransport(
        retries=0,
        verify=True,
    )

    # Install the custom TCP connection backend.
    transport._pool._network_backend = OpenMeteoFallbackBackend()

    try:
        with httpx.Client(
            transport=transport,
            timeout=timeout,
        ) as client:

            response = client.get(
                OPEN_METEO_URL,
                params=params,
            )

            response.raise_for_status()

            logger.info(
                "Weather successfully retrieved through fallback IP."
            )

            return response

    except Exception:
        logger.exception(
            "Open-Meteo fallback connection also failed."
        )
        raise


def get_weather(
    latitude: float,
    longitude: float,
    trailhead_name: str,
    hike_date: date | None = None,
) -> dict:
    forecast_date = hike_date or date.today()

    if isinstance(forecast_date, str):
        forecast_date = date.fromisoformat(forecast_date)

    requested_date = forecast_date.isoformat()

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
        "start_date": requested_date,
        "end_date": requested_date,
    }

    response = _request_weather(params)

    if response.status_code == 400:
        raise ValueError(
            "The weather provider rejected the selected-date request."
        )

    data = response.json()
    daily = data.get("daily", {})
    returned_dates = daily.get("time", [])

    if not returned_dates:
        raise ValueError(
            "No weather forecast is available for this date."
        )

    if requested_date not in returned_dates:
        raise ValueError(
            "Weather provider returned a different forecast date."
        )

    index = returned_dates.index(requested_date)

    required_fields = [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "weather_code",
    ]

    for field in required_fields:
        values = daily.get(field, [])

        if index >= len(values) or values[index] is None:
            raise ValueError(
                "The forecast is incomplete for the selected date."
            )

        value = values[index]

        if (
            not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise ValueError(
                "The forecast contains invalid values."
            )

    weather_code = int(daily["weather_code"][index])

    return {
        "trailhead_name": trailhead_name,
        "forecast_date": returned_dates[index],
        "temperature_max": daily["temperature_2m_max"][index],
        "temperature_min": daily["temperature_2m_min"][index],
        "precipitation_probability": (
            daily["precipitation_probability_max"][index]
        ),
        "wind_speed_max": daily["wind_speed_10m_max"][index],
        "weather_code": weather_code,
        "weather_summary": get_weather_description(weather_code),
        "temperature_unit": "°F",
        "wind_speed_unit": "mph",
        "source": "Open-Meteo",
    }
