-- ================================================
-- MIGRATION: ADD CELL METADATA
-- ================================================
-- Adds support for storing cell-specific metadata (comments, etc.) for header columns
-- in the monthly_billing table.

ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN monthly_billing.cell_metadata IS 'Stores cell-specific metadata like comments for header fields (investment, fee_pct, etc). Keyed by field name.';
