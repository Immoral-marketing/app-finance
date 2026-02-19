-- Add cell_metadata column to all relevant tables for comments and user assignment

-- 1. Monthly Billing (Matrix Header Cells: Investment, Fees, etc.)
ALTER TABLE monthly_billing ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN monthly_billing.cell_metadata IS 'Stores metadata for header cells (investment, fee_pct) including comments and assignments';

-- 2. Billing Details (Matrix Service Cells)
ALTER TABLE billing_details ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN billing_details.cell_metadata IS 'Stores metadata for service cells including assigned users';

-- 3. Budget Lines (P&L Budget)
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN budget_lines.cell_metadata IS 'Stores metadata for P&L Budget cells';

-- 4. Actual Expenses (P&L Real)
ALTER TABLE actual_expenses ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN actual_expenses.cell_metadata IS 'Stores metadata for P&L Real Expense cells';
