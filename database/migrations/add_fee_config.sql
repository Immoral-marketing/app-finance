-- ================================================
-- FEE CONFIGURATION MIGRATION
-- ================================================
-- Adds fee_config support to clients and billing tables
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add fee_config to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fee_config JSONB DEFAULT '{
  "fee_type": "fixed",
  "fixed_pct": 10,
  "variable_ranges": [],
  "platform_cost_first": 700,
  "platform_cost_additional": 300,
  "calculation_type": "auto"
}'::jsonb;

-- 2. Add vertical_id to clients (if not exists)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES verticals(id) ON DELETE SET NULL;

-- 3. Add display_order to departments (for matrix ordering)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 4. Add platform_count and manual override flag to monthly_billing
ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS platform_count INTEGER DEFAULT 1;
ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false;

-- 5. Create index on vertical_id for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_vertical ON clients(vertical_id);

-- 6. Update existing clients to have default fee_config (if they have NULL)
UPDATE clients 
SET fee_config = '{
  "fee_type": "fixed",
  "fixed_pct": 10,
  "variable_ranges": [],
  "platform_cost_first": 700,
  "platform_cost_additional": 300,
  "calculation_type": "auto"
}'::jsonb
WHERE fee_config IS NULL;

COMMENT ON COLUMN clients.fee_config IS 'Client-specific fee configuration. Supports fixed or variable fee percentages, platform costs, and calculation type (auto/manual).';
COMMENT ON COLUMN monthly_billing.platform_count IS 'Number of platforms used for platform cost calculation';
COMMENT ON COLUMN monthly_billing.is_manual_override IS 'True if user manually overrode the auto-calculated Paid Media amount';
