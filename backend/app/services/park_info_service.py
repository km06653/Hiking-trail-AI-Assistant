
import httpx
from bs4 import BeautifulSoup


PARK_SOURCES = {
    "yosemite": {
        "name": "Yosemite National Park",
        "pages": [
            {
                "title": "Half Dome Day Hike",
                "url": "https://www.nps.gov/yose/planyourvisit/halfdome.htm",
                "keywords": ["half dome", "cables", "climb", "hike"],
            },
            {
                "title": "Half Dome Permits",
                "url": "https://www.nps.gov/yose/planyourvisit/hdpermits.htm",
                "keywords": [
                    "half dome", "permit", "lottery", "backpacker"
                ],
            },
            {
                "title": "Permits and Reservations",
                "url": "https://www.nps.gov/yose/planyourvisit/permitsandreservations.htm",
                "keywords": [
                    "reservation", "entrance", "camping",
                    "wilderness", "permit"
                ],
            },
            {
                "title": "Yosemite Frequently Asked Questions",
                "url": "https://www.nps.gov/yose/faqs.htm",
                "keywords": [
                    "parking", "fee", "payment", "entrance",
                    "reservation", "vehicle"
                ],
            },
        ],
    },
}


def extract_page_text(html: str) -> str:
    """Extract readable content from an NPS webpage."""

    soup = BeautifulSoup(html, "html.parser")

    for element in soup([
        "script", "style", "nav", "footer",
        "header", "noscript", "form"
    ]):
        element.decompose()

    unwanted_selectors = [
        ".global-header",
        ".global-footer",
        ".park-header",
        ".local-nav",
        ".breadcrumb",
        ".skip-link",
        ".social-media",
    ]

    for selector in unwanted_selectors:
        for element in soup.select(selector):
            element.decompose()

    main_content = (
        soup.find(id="main-content")
        or soup.find("main")
        or soup.find("article")
        or soup.body
        or soup
    )

    heading = main_content.find("h1")

    if heading:
        page_title = heading.get_text(" ", strip=True)
        page_text = main_content.get_text(" ", strip=True)

        heading_position = page_text.find(page_title)

        if heading_position >= 0:
            page_text = page_text[heading_position:]
    else:
        page_text = main_content.get_text(" ", strip=True)

    footer_markers = [
        "Stay Connected",
        "Experience Your America",
        "Looking for U.S. government information",
    ]

    for marker in footer_markers:
        position = page_text.find(marker)

        if position >= 0:
            page_text = page_text[:position]

    return " ".join(page_text.split())


def get_park_information(
    destination: str,
    user_question: str
) -> dict:
    """Retrieve relevant information from official NPS pages."""

    destination_lower = destination.lower()
    park = None

    for park_key, park_data in PARK_SOURCES.items():
        if park_key in destination_lower:
            park = park_data
            break

    if not park:
        return {
            "destination": destination,
            "information": [],
            "message": (
                "No official park information sources are "
                "configured for this destination yet."
            ),
        }

    question_lower = user_question.lower()
    relevant_pages = []

    for page in park["pages"]:
        if any(
            keyword in question_lower
            for keyword in page["keywords"]
        ):
            relevant_pages.append(page)

    if not relevant_pages:
        relevant_pages = [
            park["pages"][2],
            park["pages"][3],
        ]

    information = []

    headers = {
        "User-Agent": "TrailMateAI/1.0"
    }

    with httpx.Client(
        timeout=20.0,
        follow_redirects=True,
        headers=headers
    ) as client:

        for page in relevant_pages[:3]:
            try:
                response = client.get(page["url"])
                response.raise_for_status()

                page_text = extract_page_text(response.text)

                information.append({
                    "title": page["title"],
                    "url": page["url"],
                    "content": page_text[:12000],
                })

            except httpx.HTTPError as error:
                print(
                    f"Unable to retrieve {page['title']}: {error}"
                )

    return {
        "destination": park["name"],
        "information": information,
    }
