from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.hiking import HikingRequest, HikingResponse
from app.services.gemini_service import generate_hiking_guide

app = FastAPI(
    title="AI Hiking Assistant",
    description="Gemini-powered hiking research assistant",
    version="1.0.0"
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
    return {
        "message": "Hiking Assistant API is running!"
    }


@app.post("/api/hike-guide", response_model=HikingResponse)
def create_hiking_guide(request: HikingRequest):

    try:
        result = generate_hiking_guide(request.destination)

        return result

    except Exception as error:
        print(f"Gemini error: {error}")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate hiking guide."
        )
