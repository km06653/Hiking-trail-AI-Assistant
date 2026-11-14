
from google import genai

from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-3.5-flash-lite"


def generate_chat_response(
    user_message: str,
    hiking_context: dict,
    conversation_history: list = None
) -> str:

    conversation_history = conversation_history or []

    system_prompt = f"""
    You are TrailMate AI, a friendly and knowledgeable hiking assistant.

    You are helping a user plan and prepare for a hike.

    Use the following hiking guide as your primary source of context:

    {hiking_context}

    YOUR RESPONSIBILITIES:

    1. Answer questions about the destination and available trails.
    2. Recommend trails based on the user's experience and preferences.
    3. Explain trail difficulty, distance, elevation, and estimated duration.
    4. Help users prepare appropriate packing lists.
    5. Answer questions about weather and hiking safety.
    6. Explain park rules and restrictions using the provided information.
    7. Help users compare different hiking trails.

    IMPORTANT RULES:

    - Remember the hiking destination throughout the conversation.
    - Use the hiking guide as your primary context.
    - Never invent trail distances, elevation gains, or park regulations.
    - If information is missing, tell the user.
    - Do not claim information is verified unless the provided
      information supports that claim.
    - Distinguish recommendations from official park regulations.
    - Give practical and concise answers.
    - Prioritize hiking safety.
    - If the user asks something unrelated to hiking,
      politely guide them back to hiking-related questions.
    """

    messages = []

    # Include previous conversation messages.
    for message in conversation_history[-10:]:
        messages.append({
            "role": message["role"],
            "parts": [{"text": message["content"]}]
        })

    # Add the current user message.
    messages.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    response = client.models.generate_content(
        model=MODEL,
        contents=messages,
        config={
            "system_instruction": system_prompt,
            "max_output_tokens": 1500,
        }
    )

    if not response.text:
        raise ValueError("Gemini returned an empty chat response.")

    return response.text.strip()
