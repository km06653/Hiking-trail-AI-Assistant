
from datetime import date

from pydantic import BaseModel, Field


class HikingRequest(BaseModel):
    message: str = Field(
        description="Natural-language hiking request from the user"
    )

    hike_date: date | None = None
    trailhead_name: str | None = None

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class Trail(BaseModel):
    name: str = Field(
        description="Name of the hiking trail"
    )

    description: str = Field(
        description="Short description of the trail"
    )

    distance: str = Field(
        description="Round-trip distance, or Unknown"
    )

    difficulty: str = Field(
        description="Easy, Moderate, or Hard"
    )

    elevation_gain: str = Field(
        description="Elevation gain, or Unknown"
    )

    estimated_duration: str = Field(
        description="Estimated hiking time"
    )

    highlights: list[str] = Field(
        description="Scenic features and attractions"
    )

    verification_status: str = Field(
        description="Verified or Unverified"
    )


class PackingItem(BaseModel):
    item: str = Field(
        description="Item to bring"
    )

    reason: str = Field(
        description="Why the hiker should bring it"
    )

    essential: bool = Field(
        description="Whether this is essential"
    )


class ParkRule(BaseModel):
    rule: str = Field(
        description="Park rule or restriction"
    )

    category: str = Field(
        description="Category of the rule"
    )

    importance: str = Field(
        description="Important or Informational"
    )

    verification_status: str = Field(
        description="Verified or Unverified"
    )


class SafetyTip(BaseModel):
    title: str
    description: str


class NearbyLocation(BaseModel):
    name: str
    category: str
    description: str


class HikingCitation(BaseModel):
    title: str
    url: str
    source_type: str


class WeatherInfo(BaseModel):
    trailhead_name: str
    forecast_date: str

    temperature_max: float
    temperature_min: float

    precipitation_probability: float
    wind_speed_max: float

    weather_code: int
    weather_summary: str

    temperature_unit: str = "°F"
    wind_speed_unit: str = "mph"
    source: str = "Open-Meteo"


class HikingResponse(BaseModel):
    destination: str

    # Coordinates used by the frontend destination map.
    destination_latitude: float | None = None
    destination_longitude: float | None = None

    overview: str

    hero_image: str = Field(
        description=(
            "A real, working public URL to a beautiful, "
            "high-quality image of this specific destination "
            "(e.g., from Wikimedia Commons)."
        )
    )

    trails: list[Trail]
    packing_list: list[PackingItem]
    park_rules: list[ParkRule]
    safety_tips: list[SafetyTip]
    nearby_locations: list[NearbyLocation]

    # Assigned by the backend after guide generation.
    hike_date: str | None = None
    weather_status: str = "unavailable"
    weather_message: str | None = None
    packing_status: str = "general"

    weather: WeatherInfo | None = None

    general_recommendations: list[str]
    citations: list[HikingCitation]
