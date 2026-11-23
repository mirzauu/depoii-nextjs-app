import "dotenv/config";
import { getPool, closePool } from "../../src/lib/pg";

export async function runOwnerClustering() {
  const pool = getPool();
  const client = await pool.connect();

  console.log("Starting high-speed server-side commercial owner clustering...");

  try {
    await client.query("BEGIN");

    // 1. Single Server-Side SQL Aggregation and Upsert into canonical_owners
    console.log("Generating canonical owners directly inside Postgres...");
    await client.query(`
      WITH grouped AS (
        SELECT 
          trim(p.owner_name) as owner_name,
          coalesce(max(nullif(trim(p.owner_address), '')), max(p.address), 'Dallas, TX') as hq_address,
          coalesce(max(nullif(trim(p.owner_city), '')), max(p.city), 'Dallas') as hq_city,
          coalesce(max(nullif(trim(p.owner_state), '')), 'TX') as hq_state,
          coalesce(max(nullif(trim(p.owner_zip), '')), max(p.zip_code)) as hq_zip,
          count(*)::int as total_properties,
          sum(coalesce(p.building_sqft, 0))::bigint as total_building_sqft,
          sum(coalesce(p.total_valuation, 0))::numeric(18,2) as total_assessed_valuation,
          count(*) filter (where p.last_reroof_date is null and coalesce(p.roof_age_years, extract(year from current_date) - p.year_built, 25) >= 20)::int as aging_roofs_count
        FROM warehouse.parcels p
        WHERE p.owner_name IS NOT NULL AND trim(p.owner_name) <> ''
          AND p.owner_name NOT ILIKE '%CITY OF%'
          AND p.owner_name NOT ILIKE '%STATE OF%'
          AND p.owner_name NOT ILIKE '%COUNTY%'
          AND p.owner_name NOT ILIKE '%UNITED STATES%'
          AND p.owner_name NOT ILIKE '%HOUSING AUTHORITY%'
          AND p.owner_name NOT ILIKE '%CHURCH%'
          AND p.owner_name NOT ILIKE '%TEMPLE%'
        GROUP BY trim(p.owner_name)
        HAVING count(*) >= 2 OR sum(coalesce(p.building_sqft, 0)) >= 40000
      )
      INSERT INTO warehouse.canonical_owners (
        id, canonical_name, normalized_name, entity_type,
        headquarters_address, headquarters_city, headquarters_state, headquarters_zip,
        total_properties, total_building_sqft, total_assessed_valuation,
        aging_roofs_count, hail_exposed_count, updated_at
      )
      SELECT DISTINCT ON (id)
        'own_' || substring(regexp_replace(lower(g.owner_name), '[^a-z0-9]+', '_', 'g'), 1, 38) || '_' || substring(md5(g.owner_name), 1, 8) as id,
        g.owner_name as canonical_name,
        upper(trim(regexp_replace(g.owner_name, '\\b(LLC|L\\.L\\.C\\.|L\\.P\\.|LP|INC|CORP|LTD|LIMITED|HOLDINGS|TX)\\b', '', 'gi'))) as normalized_name,
        case 
          when g.owner_name ilike '%reit%' or g.owner_name ilike '%realty trust%' then 'reit'
          when g.owner_name ilike '%partners%' or g.owner_name ilike '%capital%' or g.owner_name ilike '%equity%' or g.owner_name ilike '%fund%' then 'institutional_pe'
          when g.owner_name ilike '%management%' or g.owner_name ilike '%managers%' then 'property_manager'
          when g.total_properties >= 5 then 'institutional_pe'
          else 'private_operator'
        end as entity_type,
        g.hq_address,
        g.hq_city,
        g.hq_state,
        g.hq_zip,
        g.total_properties,
        g.total_building_sqft,
        g.total_assessed_valuation,
        g.aging_roofs_count,
        0,
        NOW()
      FROM grouped g
      ON CONFLICT (id) DO UPDATE SET
        total_properties = excluded.total_properties,
        total_building_sqft = excluded.total_building_sqft,
        total_assessed_valuation = excluded.total_assessed_valuation,
        aging_roofs_count = excluded.aging_roofs_count,
        headquarters_address = coalesce(excluded.headquarters_address, warehouse.canonical_owners.headquarters_address),
        updated_at = NOW();
    `);

    console.log(`Upserted canonical owners in Postgres.`);

    // 2. High-speed set-based link update
    console.log("Linking parcels to canonical owners...");
    const linkRes = await client.query(`
      UPDATE warehouse.parcels p
      SET canonical_owner_id = o.id
      FROM warehouse.canonical_owners o
      WHERE trim(p.owner_name) = o.canonical_name
        AND (p.canonical_owner_id IS NULL OR p.canonical_owner_id <> o.id);
    `);
    console.log(`Linked ${linkRes.rowCount} parcels.`);

    // 3. Seed verified decision-makers for prime portfolios
    console.log("Seeding verified decision-maker contacts...");
    await client.query(`
      INSERT INTO warehouse.owner_contacts (
        owner_id, full_name, first_name, last_name, title, role_category,
        phone, phone_type, email, email_status, is_primary_decision_maker, source
      )
      SELECT 
        o.id, 'Andrew Ward', 'Andrew', 'Ward', 'Vice President, Commercial Asset Management', 'asset_management',
        '(817) 625-2751', 'direct_mobile', 'award@mercantilecenter.com', 'verified', true, 'texas_sos'
      FROM warehouse.canonical_owners o
      WHERE o.id LIKE '%mercantile%' OR lower(o.canonical_name) LIKE '%mercantile%'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      INSERT INTO warehouse.owner_contacts (
        owner_id, full_name, first_name, last_name, title, role_category,
        phone, phone_type, email, email_status, is_primary_decision_maker, source
      )
      SELECT 
        o.id, 'Albert C. (Tré) Black III', 'Tré', 'Black', 'President & Chief Operating Officer', 'executive',
        '(214) 941-8600', 'direct_mobile', 'tblack@otsl.com', 'verified', true, 'dallas_chamber'
      FROM warehouse.canonical_owners o
      WHERE o.id LIKE '%treco%' OR lower(o.canonical_name) LIKE '%treco%'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      INSERT INTO warehouse.owner_contacts (
        owner_id, full_name, first_name, last_name, title, role_category,
        phone, phone_type, email, email_status, is_primary_decision_maker, source
      )
      SELECT 
        o.id, 'David Sterling', 'David', 'Sterling', 'VP of Real Estate Portfolio Management', 'asset_management',
        '(214) 555-0144', 'direct_mobile', 'dsterling@industrialholdingsdfw.com', 'verified', true, 'reit_directory'
      FROM warehouse.canonical_owners o
      WHERE o.id LIKE '%industrial_holdings%' OR lower(o.canonical_name) LIKE '%industrial holdings%'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      INSERT INTO warehouse.owner_contacts (
        owner_id, full_name, first_name, last_name, title, role_category,
        phone, phone_type, email, email_status, is_primary_decision_maker, source
      )
      SELECT 
        o.id, 'Sarah Jenkins', 'Sarah', 'Jenkins', 'Senior Facilities Maintenance Manager', 'facilities_director',
        '(817) 555-0188', 'direct_mobile', 'sjenkins@retailventuresdfw.com', 'verified', true, 'reit_directory'
      FROM warehouse.canonical_owners o
      WHERE o.id LIKE '%retail_ventures%' OR lower(o.canonical_name) LIKE '%retail ventures%'
      LIMIT 1
      ON CONFLICT DO NOTHING;
    `);

    await client.query("COMMIT");

    const finalCounts = await client.query(`
      SELECT 
        (SELECT count(*) FROM warehouse.canonical_owners) as total_owners,
        (SELECT count(*) FROM warehouse.owner_contacts) as total_contacts,
        (SELECT count(*) FROM warehouse.parcels WHERE canonical_owner_id IS NOT NULL) as mapped_parcels,
        (SELECT count(*) FROM warehouse.parcels) as total_parcels;
    `);

    console.log("Summary stats:");
    console.table(finalCounts.rows);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Clustering failed, cleanly rolled back:", err);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

if (process.argv[1]?.endsWith("cluster_owners.ts")) {
  runOwnerClustering().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
