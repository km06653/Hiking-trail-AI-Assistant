from pydantic import BaseModel


class HikingRequest(BaseModel):
    destination: str


class HikingResponse(BaseModel):
    answer: str
    citations: list[dict]
