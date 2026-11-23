import sqlite3

conn = sqlite3.connect('d:/Depoii_nextjs/data/depoii.sqlite')
cur = conn.cursor()

# Query all commercial permit kinds and count matched vs unmatched
cur.execute("""
    SELECT 
        kind,
        COUNT(*) as total,
        SUM(CASE WHEN parcel_ids != '[]' AND parcel_ids IS NOT NULL THEN 1 ELSE 0 END) as matched,
        SUM(CASE WHEN parcel_ids = '[]' OR parcel_ids IS NULL THEN 1 ELSE 0 END) as unmatched,
        SUM(valuation) as total_val,
        SUM(CASE WHEN parcel_ids = '[]' OR parcel_ids IS NULL THEN valuation ELSE 0 END) as unmatched_val
    FROM permits
    WHERE UPPER(kind) LIKE '%COMMERCIAL%'
       OR UPPER(kind) LIKE '%REPAIR%'
       OR UPPER(kind) LIKE '%WATERPROOFING%'
    GROUP BY kind
    ORDER BY total DESC
""")
rows = cur.fetchall()

print("Commercial Permits Breakdown (Matched vs Unmatched):")
print("-" * 80)
total_comm = 0
total_matched = 0
total_unmatched = 0
total_val_unmatched = 0

for r in rows:
    kind, tot, match, unmatch, t_val, u_val = r
    total_comm += tot
    total_matched += match
    total_unmatched += unmatch
    total_val_unmatched += u_val or 0
    match_pct = (match / tot * 100) if tot > 0 else 0
    print(f"Kind: {kind}")
    print(f"  Total: {tot:,} | Matched: {match:,} ({match_pct:.1f}%) | Unmatched: {unmatch:,}")
    print(f"  Unmatched Valuation: ${u_val:,.0f}" if u_val else "  Unmatched Valuation: $0")

print("-" * 80)
print(f"TOTAL COMMERCIAL PERMITS: {total_comm:,}")
print(f"  -> MATCHED TO BUILDINGS: {total_matched:,} ({total_matched / total_comm * 100:.1f}%)")
print(f"  -> UNMATCHED: {total_unmatched:,} ({total_unmatched / total_comm * 100:.1f}%)")
print(f"  -> TOTAL UNMATCHED COMMERCIAL VALUATION: ${total_val_unmatched:,.0f}")

# Sample unmatched commercial permits
cur.execute("""
    SELECT permit_no, city, address, kind, valuation, scope
    FROM permits
    WHERE (UPPER(kind) LIKE '%COMMERCIAL%' OR UPPER(kind) LIKE '%REPAIR%' OR UPPER(kind) LIKE '%WATERPROOFING%')
      AND (parcel_ids = '[]' OR parcel_ids IS NULL)
    ORDER BY valuation DESC
    LIMIT 5
""")
print("\nTop 5 Unmatched Commercial Permits by Valuation:")
for p in cur.fetchall():
    print(f"  Permit: {p[0]} | {p[1]} | {p[2]} | Val: ${p[4]:,.0f} | Scope: {p[5][:70]}")

conn.close()

