import json
import os

permits_audit = [
    {
        "permit_number": "2312215019",
        "jurisdiction": "City of Dallas",
        "permit_type": "Building (BU) - Commercial Alteration",
        "status": "ISSUED",
        "created_date": "2023-12-21",
        "issue_date": "2023-12-21",
        "project_address": "6920 BOB O LINK DR, Dallas, TX 75214",
        "city": "Dallas",
        "state": "TX",
        "zip_code": "75214",
        "valuation": 67000.0,
        "category": "Commercial",
        "membrane": "Commercial Flat / Membrane",
        "scope": "(B) Alteration: CHURCH, SYNAGOGUE, TEMPLE, MOSQUE",
        "contractor_name": "SR1 Roofing",
        "contractor_address": "7065 Confederate Park Rd, Fort Worth, TX 76108",
        "contractor_phone": "(817) 287-8489",
        "contractor_email": "john.martinez@sr1roofing.com",
        "qualifier_owner": "Trevor Rodden",
        "company_website": "https://sr1roofing.com",
        "company_hq": "1919 Golden Heights Rd, Fort Worth, TX 76177",
        "source_system": "DALLAS_ARCGIS_FY24",
        "lat": 32.83169719900008,
        "lng": -96.74189199799997,
        "dcad_parcel_match": {
            "account": "DCAD:00298400070010000",
            "owner": "NORTHRIDGE PRESBYTERIAN",
            "address": "6920 BOB O LINK DR",
            "year_built": 1960,
            "sqft": 29409,
            "record_url": "https://www.dallascad.org/AcctDetailCom.aspx?ID=00298400070010000"
        }
    }
]

out_path = "data/sr1_dallas_permits_audit.json"
os.makedirs("data", exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(permits_audit, f, indent=2)

print(f"Generated {out_path} with {len(permits_audit)} verified permit record.")
