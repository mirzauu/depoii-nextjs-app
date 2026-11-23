-- Migration: Add live sync fields to warehouse.parcels
BEGIN;

ALTER TABLE warehouse.parcels 
ADD COLUMN IF NOT EXISTS record_url TEXT,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS live_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_parcels_is_live ON warehouse.parcels (is_live);
CREATE INDEX IF NOT EXISTS idx_parcels_live_account_id ON warehouse.parcels (live_account_id);

COMMIT;
