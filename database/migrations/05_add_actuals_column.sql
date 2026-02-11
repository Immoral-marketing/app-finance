
ALTER TABLE monthly_billing 
ADD COLUMN IF NOT EXISTS total_actual_investment NUMERIC DEFAULT 0;

COMMENT ON COLUMN monthly_billing.total_actual_investment IS 'Stores the Actual Investment (Synced from Media Tracker or Manual Override) for Fee Calculation';
