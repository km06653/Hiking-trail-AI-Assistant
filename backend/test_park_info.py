from app.services.park_info_service import get_park_information


result = get_park_information(
    destination="Yosemite National Park",
    user_question="Do I need a permit to climb Half Dome?"
)

print("\nDESTINATION:")
print(result["destination"])

print("\nRETRIEVED SOURCES:")

for source in result["information"]:
    print("\nTitle:", source["title"])
    print("URL:", source["url"])
    print("Content preview:", source["content"][:500])


for source in result["information"]:
    if "Half Dome Permits" in source["title"]:
        print("\nCHECKING PERMIT INFORMATION:")

        keywords = [
            "required",
            "lottery",
            "March",
            "daily lottery",
            "Recreation.gov"
        ]

        for keyword in keywords:
            print(
                f"{keyword}:",
                keyword.lower() in source["content"].lower()
            )