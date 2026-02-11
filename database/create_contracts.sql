-- Create contracts table for vencimiento (contract expiration dates)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contract_name VARCHAR(255) NOT NULL,
  fee_percentage DECIMAL(5, 2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  minimum_fee DECIMAL(12, 2) DEFAULT 0,
  billing_frequency VARCHAR(20) DEFAULT 'monthly',
  vertical_id UUID REFERENCES verticals(id) ON DELETE SET NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_effective ON contracts(effective_from, effective_to);

-- Insert default contracts for existing clients (vencimiento = 15 del mes)
INSERT INTO contracts (client_id, contract_name, fee_percentage, effective_from, effective_to, is_active)
SELECT 
  id, 
  name || ' - Contrato Principal', 
  10, 
  '2026-01-01'::date,
  '2026-12-15'::date, -- Default vencimiento día 15
  true
FROM clients
WHERE is_active = true
ON CONFLICT DO NOTHING;
