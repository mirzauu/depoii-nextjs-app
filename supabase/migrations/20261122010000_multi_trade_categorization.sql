-- ============================================================================
-- Migration: 20261122010000_multi_trade_categorization.sql
-- Description: Multi-Trade Commercial Building Intelligence Architecture
-- Zero Data Loss: Retains 100% of existing permits (252,184) and parcels (103,501)
-- ============================================================================

-- 1. Create Reference Dimension Table for Canonical Trades
CREATE TABLE IF NOT EXISTS warehouse.trade_categories (
  id VARCHAR(32) PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  typical_lifespan_years INT,
  priority_rank INT DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Canonical Trade Categories
INSERT INTO warehouse.trade_categories (id, display_name, description, typical_lifespan_years, priority_rank) VALUES
  ('roofing', 'Commercial Roofing & Waterproofing', 'Roof replacement, coatings, single-ply, mod-bit, metal, and storm restoration', 20, 1),
  ('hvac', 'Commercial HVAC & Mechanical Systems', 'Packaged RTUs, chillers, cooling towers, boilers, and mechanical ductwork', 15, 2),
  ('electrical_solar', 'Commercial Electrical & Solar PV', 'Switchgear, transformers, rooftop solar arrays, EV chargers, generators', 25, 3),
  ('plumbing', 'Commercial Plumbing & Piping', 'Boilers, commercial water heaters, backflow preventers, gas piping, sewer lines', 25, 4),
  ('fire_safety', 'Fire Protection & Life Safety', 'Commercial fire sprinklers, fire risers, alarm control panels, suppression', 15, 5),
  ('elevators', 'Elevators & Vertical Transport', 'Passenger elevators, freight elevators, escalators, and modernization', 20, 6),
  ('paving_civil', 'Commercial Paving & Parking Lots', 'Asphalt paving, concrete parking surfaces, sealcoating, and drainage', 8, 7),
  ('general_construction', 'General Commercial Construction', 'Commercial core & shell, tenant improvements, additions, structural remodeling', 30, 8)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  typical_lifespan_years = EXCLUDED.typical_lifespan_years,
  priority_rank = EXCLUDED.priority_rank;

-- 2. Add Multi-Trade Columns to warehouse.normalized_permits
ALTER TABLE warehouse.normalized_permits
  ADD COLUMN IF NOT EXISTS trade_category VARCHAR(32) REFERENCES warehouse.trade_categories(id),
  ADD COLUMN IF NOT EXISTS trade_subdiscipline VARCHAR(64),
  ADD COLUMN IF NOT EXISTS trade_metadata JSONB DEFAULT '{}'::jsonb;

-- High-performance composite indexes for trade filtering
CREATE INDEX IF NOT EXISTS idx_permits_trade_category_date 
  ON warehouse.normalized_permits(trade_category, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_permits_trade_parcel 
  ON warehouse.normalized_permits(trade_category, parcel_id);

-- 3. Add Multi-Trade Lifecycle Tracking to warehouse.parcels
ALTER TABLE warehouse.parcels
  ADD COLUMN IF NOT EXISTS hvac_age_years INT,
  ADD COLUMN IF NOT EXISTS last_hvac_date DATE,
  ADD COLUMN IF NOT EXISTS last_hvac_permit_no TEXT,
  ADD COLUMN IF NOT EXISTS solar_installed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS solar_permit_date DATE,
  ADD COLUMN IF NOT EXISTS last_paving_date DATE,
  ADD COLUMN IF NOT EXISTS paving_age_years INT;

CREATE INDEX IF NOT EXISTS idx_parcels_hvac_age ON warehouse.parcels(hvac_age_years) WHERE hvac_age_years IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_solar ON warehouse.parcels(solar_installed) WHERE solar_installed = TRUE;

-- 4. Add Primary Trade to warehouse.canonical_contractors
ALTER TABLE warehouse.canonical_contractors
  ADD COLUMN IF NOT EXISTS primary_trade VARCHAR(32) REFERENCES warehouse.trade_categories(id),
  ADD COLUMN IF NOT EXISTS secondary_trades VARCHAR(32)[];

CREATE INDEX IF NOT EXISTS idx_canonical_contractors_trade ON warehouse.canonical_contractors(primary_trade);

-- 5. Create Virtual Trade Views (Zero Storage Overhead, Fast Isolation)
CREATE OR REPLACE VIEW warehouse.v_roof_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'roofing';

CREATE OR REPLACE VIEW warehouse.v_hvac_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'hvac';

CREATE OR REPLACE VIEW warehouse.v_electrical_solar_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'electrical_solar';

CREATE OR REPLACE VIEW warehouse.v_plumbing_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'plumbing';

CREATE OR REPLACE VIEW warehouse.v_fire_safety_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'fire_safety';

CREATE OR REPLACE VIEW warehouse.v_paving_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'paving_civil';

CREATE OR REPLACE VIEW warehouse.v_elevator_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'elevators';

CREATE OR REPLACE VIEW warehouse.v_general_permits AS
  SELECT * FROM warehouse.normalized_permits WHERE trade_category = 'general_construction';
