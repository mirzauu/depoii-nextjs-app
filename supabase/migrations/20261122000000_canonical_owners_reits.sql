-- Migration: Add Canonical Owners, REITs, and Decision-Maker Contacts
-- Safety: Non-destructive, additive only. Preserves all existing rows in warehouse.parcels.

BEGIN;

-- 1. Create Canonical Owners Table
CREATE TABLE IF NOT EXISTS warehouse.canonical_owners (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,
    entity_type TEXT DEFAULT 'private_operator',              -- 'reit', 'institutional_pe', 'property_manager', 'private_operator'
    headquarters_address TEXT,
    headquarters_city TEXT DEFAULT 'Dallas',
    headquarters_state TEXT DEFAULT 'TX',
    headquarters_zip TEXT,
    website_url TEXT,
    linkedin_url TEXT,
    logo_url TEXT,
    management_firm TEXT,                                     -- e.g. "Stream Realty Partners" (if managed by 3rd party)
    
    -- Pre-calculated portfolio aggregations (updated by background worker)
    total_properties INTEGER DEFAULT 0,
    total_building_sqft BIGINT DEFAULT 0,
    total_assessed_valuation NUMERIC(18,2) DEFAULT 0,
    aging_roofs_count INTEGER DEFAULT 0,                      -- Count of roofs >20 years without reroof permit
    hail_exposed_count INTEGER DEFAULT 0,                     -- Count of properties impacted by severe storm
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_owners_normalized_name ON warehouse.canonical_owners (normalized_name);
CREATE INDEX IF NOT EXISTS idx_canonical_owners_total_props ON warehouse.canonical_owners (total_properties DESC);
CREATE INDEX IF NOT EXISTS idx_canonical_owners_aging_roofs ON warehouse.canonical_owners (aging_roofs_count DESC);
CREATE INDEX IF NOT EXISTS idx_canonical_owners_entity_type ON warehouse.canonical_owners (entity_type);

-- 2. Create Owner Contacts Table (Decision Makers)
CREATE TABLE IF NOT EXISTS warehouse.owner_contacts (
    id TEXT PRIMARY KEY DEFAULT ('cnt_' || gen_random_uuid()),
    owner_id TEXT NOT NULL REFERENCES warehouse.canonical_owners(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    title TEXT,                                              -- "Vice President, Asset Management"
    role_category TEXT DEFAULT 'asset_management',           -- 'asset_management', 'facilities_director', 'property_manager', 'executive'
    email TEXT,
    email_status TEXT DEFAULT 'unverified',                  -- 'verified', 'catch_all', 'unverified'
    phone TEXT,
    phone_type TEXT,                                         -- 'direct_mobile', 'office', 'corporate_hq'
    linkedin_url TEXT,
    is_primary_decision_maker BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'texas_sos',                         -- 'texas_sos', 'apollo', 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON warehouse.owner_contacts (owner_id);

-- 3. Safely link warehouse.parcels without modifying or dropping any existing column
ALTER TABLE warehouse.parcels 
ADD COLUMN IF NOT EXISTS canonical_owner_id TEXT REFERENCES warehouse.canonical_owners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parcels_canonical_owner_id ON warehouse.parcels (canonical_owner_id);

-- 4. Set RLS Security Standards (Closed to public anon API, accessible only to backend server roles)
ALTER TABLE warehouse.canonical_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse.owner_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON warehouse.canonical_owners FROM anon;
    REVOKE ALL ON warehouse.owner_contacts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON warehouse.canonical_owners FROM authenticated;
    REVOKE ALL ON warehouse.owner_contacts FROM authenticated;
  END IF;
END $$;

COMMIT;
