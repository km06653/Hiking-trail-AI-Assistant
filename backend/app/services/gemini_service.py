
from google import genai

from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.8-flash"


def generate_hiking_guide(user_request: str):

    prompt = f"""
    You are an expert hiking research assistant.

    The user has submitted this hiking request:

    {user_request}

    Help the user prepare for their hiking trip.

    Provide:
    1. Popular trails at the destination.
    2. Trail distances and difficulty when verified.
    3. Recommended things to bring.
    4. Activities that are allowed.
    5. Activities that are prohibited.
    6. Important safety considerations.
    7. Useful nearby locations.

    IMPORTANT:
    - Use Google Maps grounding for relevant places.
    - Never invent trail distances or park regulations.
    - Distinguish verified facts from general recommendations.
    - If information cannot be verified, say so.
    - Recommend checking official park alerts before departure.
    """

    interaction = client.interactions.create(
        model=MODEL,
        input=prompt,
        tools=[
            {
                "type": "google_maps"
            }
        ]
    )

    answer_parts = []
    citations = []

    for step in interaction.steps or []:

        if step.type == "model_output":

            for block in step.content or []:

                if block.type == "text":

                    answer_parts.append(block.text)

                    for annotation in block.annotations or []:

                        if annotation.type == "place_citation":
                            citations.append({
                                "name": annotation.name,
                                "url": annotation.url
                            })

    return {
        "answer": "\n".join(answer_parts),
        "citations": citations
    }

