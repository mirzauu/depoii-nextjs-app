import sqlite3
import psycopg2
import json
import os
import re
from datetime import datetime, UTC

def sync_new_view_to_pg():
    # 1. Connect to Postgres
    db_url = None
    with open('d:/Depoii_nextjs/.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                break
    
    pg_conn = psycopg2.connect(db_url, sslmode='require')
    pg_cur = pg_conn.cursor()

    # 2. Update canonical_contractors in Postgres
    cid = 'CTR-DAL-MOB-HOME-SOLUTIONS-INC-DBA'
    cname = 'New View Roofing'
    primary_license = 'Fort Worth RB020782 / GAF Certified Master Elite'
    city = 'Dallas'
    state = 'TX'
    total_permits = 383
    total_val = 528331.68
    primary_roof_system = 'GAF Timberline HDZ / 60-mil TPO'
    website = 'https://newviewroofing.com'
    hq_addr = '4722 Gaston Ave, Dallas, TX 75246-1012'
    phone = '(469) 232-7220'
    year_founded = 2013
    crew_capacity = '12 Crews / Rapid Hail Surge Capacity'
    leadership = json.dumps([
        {'name': 'Michael Gibson', 'title': 'Municipal Registrant & Managing Director', 'phone': '(469) 232-7772', 'email': 'info@newviewroofing.com'},
        {'name': 'Carlandre Bussey', 'title': 'Master Roofing License Holder (RB020782)', 'phone': '(469) 232-7220', 'email': 'info@newviewroofing.com'}
    ])
    certifications = json.dumps([
        'GAF Certified Master Elite Roofing Contractor',
        'City of Dallas Registered Roofing Contractor',
        'City of Fort Worth Licensed Roofing Contractor (RB020782)',
        'City of Frisco Registered Contractor',
        'City of Irving Registered Commercial Contractor'
    ])
    m_and_a = json.dumps({
        'ownership': 'Privately Owned / MOB Home Solutions Inc.',
        'acquisition': 'Organic Expansion across DFW Metroplex',
        'subcontracting': 'In-house crews & specialized commercial TPO team',
        'notes': 'High volume residential reroof specialist with focus on Lakewood, M-Streets, and Frisco storm corridors.'
    })
    bbb_url = 'https://www.bbb.org/us/tx/dallas/profile/roofing-contractors/new-view-roofing-0875-90538291'
    bbb_rating = 'A+'
    bbb_accredited = True
    linkedin_url = 'https://www.linkedin.com/company/new-view-roofing'
    logo_url = 'https://www.google.com/s2/favicons?domain=newviewroofing.com&sz=128'
    now_iso = datetime.now(UTC).isoformat()

    print("Updating canonical_contractors in Postgres...")
    pg_cur.execute("""
        UPDATE warehouse.canonical_contractors
        SET canonical_name = %s,
            primary_license = %s,
            headquarters_city = %s,
            headquarters_state = %s,
            total_permits = %s,
            total_valuation = %s,
            primary_roof_system = %s,
            website_url = %s,
            hq_address = %s,
            phone_number = %s,
            year_founded = %s,
            crew_capacity_estimate = %s,
            leadership = %s,
            manufacturer_certifications = %s,
            m_and_a_profile = %s,
            bbb_profile_url = %s,
            bbb_rating = %s,
            bbb_accredited = %s,
            linkedin_company_url = %s,
            logo_url = %s,
            updated_at = %s
        WHERE id = %s
    """, (
        cname, primary_license, city, state, total_permits, total_val,
        primary_roof_system, website, hq_addr, phone, year_founded, crew_capacity,
        leadership, certifications, m_and_a, bbb_url, bbb_rating, bbb_accredited,
        linkedin_url, logo_url, now_iso, cid
    ))
    pg_conn.commit()
    print("canonical_contractors updated successfully in Postgres!")

    # 3. Pull all 383 permits from depoii.sqlite and upsert into warehouse.normalized_permits
    print("Syncing permits from depoii.sqlite to Postgres warehouse.normalized_permits...")
    sl_conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
    sl_cur = sl_conn.cursor()
    sl_cur.execute("""
        SELECT permit_no, kind, address, city, contractor_name, issued, valuation, scope, lat, lng, portal
        FROM permits
        WHERE UPPER(contractor_name) LIKE '%NEW VIEW%'
    """)
    permits = sl_cur.fetchall()
    print(f"Found {len(permits)} permits in depoii.sqlite")

    inserted = 0
    updated = 0
    for p_no, kind, addr, p_city, c_name, issued, val, scope, lat, lng, portal in permits:
        p_id = f"PERMIT-{p_city.upper()}-{p_no}".replace(' ', '-').replace('/', '-')
        m = re.search(r'\b(75\d{3}|76\d{3})\b', addr)
        zip_code = m.group(1) if m else ''
        jurisdiction = f"{p_city}, TX"
        
        # Check if already exists in postgres
        pg_cur.execute("SELECT id FROM warehouse.normalized_permits WHERE id = %s OR raw_permit_number = %s", (p_id, p_no))
        exists = pg_cur.fetchone()
        
        if not exists:
            pg_cur.execute("""
                INSERT INTO warehouse.normalized_permits (
                    id, raw_permit_number, jurisdiction_id, contractor_id, source_system,
                    jurisdiction, state, city, issue_date, status, normalized_address,
                    zip_code, valuation, valuation_formatted, category, probable_roof_system,
                    raw_description, contractor_name, contractor_license, contractor_phone,
                    latitude, longitude, normalized_at, permit_scope, is_pure_reroof, data_source
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                )
            """, (
                p_id, p_no, f"JUR-{p_city.upper()}", cid, portal or 'Municipal Portal',
                jurisdiction, 'TX', p_city, issued, 'Issued', addr,
                zip_code, float(val or 0), f"${val:,.0f}" if val else "$0", kind, 'Shingle / TPO',
                scope, 'New View Roofing', 'RB020782', '(469) 232-7220',
                lat, lng, now_iso, scope, True, 'depoii-harvester'
            ))
            inserted += 1
        else:
            pg_cur.execute("""
                UPDATE warehouse.normalized_permits
                SET contractor_id = %s,
                    contractor_name = 'New View Roofing',
                    raw_description = %s,
                    probable_roof_system = 'Shingle / TPO'
                WHERE id = %s
            """, (cid, scope, exists[0]))
            updated += 1

    pg_conn.commit()
    print(f"Postgres permits synced: {inserted} inserted, {updated} updated.")

    # Also update local depoii_local.db for complete offline engine sync
    local_engine_db = 'd:/Depoii_nextjs/Roofx/depoii-data-engine/depoii_local.db'
    if os.path.exists(local_engine_db):
        le_conn = sqlite3.connect(local_engine_db)
        le_cur = le_conn.cursor()
        le_cur.execute("""
            UPDATE canonical_contractors
            SET canonical_name = 'New View Roofing',
                primary_license = ?,
                headquarters_city = ?,
                headquarters_state = ?,
                total_permits = ?,
                total_valuation = ?,
                primary_roof_system = ?,
                website_url = ?,
                hq_address = ?,
                phone_number = ?,
                year_founded = ?,
                crew_capacity_estimate = ?,
                leadership = ?,
                manufacturer_certifications = ?,
                m_and_a_profile = ?,
                bbb_profile_url = ?,
                bbb_rating = ?,
                bbb_accredited = 1,
                linkedin_company_url = ?,
                logo_url = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            primary_license, city, state, total_permits, total_val,
            primary_roof_system, website, hq_addr, phone, year_founded, crew_capacity,
            leadership, certifications, m_and_a, bbb_url, bbb_rating,
            linkedin_url, logo_url, now_iso, cid
        ))
        le_conn.commit()
        le_conn.close()
        print("Updated local engine database canonical_contractors!")

    pg_conn.close()
    sl_conn.close()
    print("ALL SYNC COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    sync_new_view_to_pg()
