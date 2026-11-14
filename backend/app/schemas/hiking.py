
from datetime import date

from pydantic import BaseModel, Field


# ==========================================
# HIKING REQUEST
# ==========================================

class HikingRequest(BaseModel):
    message: str = Field(
        description="Natural-language hiking request from the user"
    )

    hike_date: date | None = None
    trailhead_name: str | None = None

    latitude: float | None = Field(
        default=None, ge=-90, le=90
    )

    longitude: float | None = Field(
        default=None, ge=-180, le=180
    )


# ==========================================
# TRAIL INFORMATION
# ==========================================

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


# ==========================================
# PACKING LIST
# ==========================================

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


# ==========================================
# PARK RULES
# ==========================================

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


# ==========================================
# SAFETY INFORMATION
# ==========================================

class SafetyTip(BaseModel):
    title: str
    description: str


# ==========================================
# NEARBY LOCATIONS
# ==========================================

class NearbyLocation(BaseModel):
    name: str
    category: str
    description: str


# ==========================================
# CITATIONS
# ==========================================

class HikingCitation(BaseModel):
    title: str
    url: str
    source_type: str


# ==========================================
# WEATHER INFORMATION
# ==========================================

class WeatherInfo(BaseModel):
    trailhead_name: str
    forecast_date: str

    temperature_max: float
    temperature_min: float

    precipitation_probability: float
    wind_speed_max: float

    weather_code: int
    weather_summary: str

    temperature_unit: str = "°C"
    wind_speed_unit: str = "km/h"

    source: str = "Open-Meteo"


# ==========================================
# COMPLETE HIKING RESPONSE
# ==========================================

class HikingResponse(BaseModel):
    destination: str
    overview: str

    trails: list[Trail]
    packing_list: list[PackingItem]
    park_rules: list[ParkRule]
    safety_tips: list[SafetyTip]
    nearby_locations: list[NearbyLocation]

    weather: WeatherInfo | None = None

    general_recommendations: list[str]
    citations: list[HikingCitation]
