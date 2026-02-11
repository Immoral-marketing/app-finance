-- ================================================
-- IMMORAL FINANCE APP - DATABASE FUNCTIONS
-- ================================================
-- Business logic functions for complex operations

-- ================================================
-- SPLIT VALIDATION
-- ================================================

-- Function to validate that splits sum to 100%
CREATE OR REPLACE FUNCTION validate_splits(splits JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  total DECIMAL(5, 2);
BEGIN
  SELECT SUM((value->>'percentage')::DECIMAL) INTO total
  FROM jsonb_array_elements(splits);
  
  RETURN total = 100.00;
END;
$$ LANGUAGE plpgsql;

-- Function to validate contract department splits
CREATE OR REPLACE FUNCTION validate_contract_splits()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage DECIMAL(5, 2);
BEGIN
  SELECT SUM(split_percentage) INTO total_percentage
  FROM contract_department_splits
  WHERE contract_id = NEW.contract_id;
  
  IF total_percentage > 100.00 THEN
    RAISE EXCEPTION 'Total split percentage cannot exceed 100%% (current: %%)', total_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_contract_splits_trigger
AFTER INSERT OR UPDATE ON contract_department_splits
FOR EACH ROW EXECUTE FUNCTION validate_contract_splits();

-- ================================================
-- LEDGER ENTRY CREATION
-- ================================================

-- Standardized function to create ledger entries
CREATE OR REPLACE FUNCTION create_ledger_entry(
  p_entry_type VARCHAR,
  p_transaction_id UUID,
  p_department_id UUID,
  p_vertical_id UUID,
  p_amount DECIMAL,
  p_entry_date DATE,
  p_description VARCHAR,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_is_adjustment BOOLEAN DEFAULT false,
  p_adjustment_of UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_entry_id UUID;
  period_closed BOOLEAN;
BEGIN
  -- Check if the period is closed
  SELECT is_closed INTO period_closed
  FROM financial_periods
  WHERE period_year = EXTRACT(YEAR FROM p_entry_date)
    AND period_month = EXTRACT(MONTH FROM p_entry_date);
  
  IF period_closed THEN
    RAISE EXCEPTION 'Cannot create entries for closed period: %-%%', 
      EXTRACT(YEAR FROM p_entry_date), 
      EXTRACT(MONTH FROM p_entry_date);
  END IF;
  
  -- Create the entry
  INSERT INTO ledger_entries (
    entry_type,
    transaction_id,
    department_id,
    vertical_id,
    amount,
    entry_date,
    description,
    reference_type,
    reference_id,
    metadata,
    is_adjustment,
    adjustment_of,
    created_by
  ) VALUES (
    p_entry_type,
    p_transaction_id,
    p_department_id,
    p_vertical_id,
    p_amount,
    p_entry_date,
    p_description,
    p_reference_type,
    p_reference_id,
    p_metadata,
    p_is_adjustment,
    p_adjustment_of,
    COALESCE(p_created_by, auth.uid())
  ) RETURNING id INTO new_entry_id;
  
  RETURN new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- REVENUE SPLIT CALCULATION
-- ================================================

-- Calculate department splits for a contract invoice
CREATE OR REPLACE FUNCTION calculate_department_splits(
  p_contract_id UUID,
  p_invoice_amount DECIMAL
)
RETURNS TABLE (
  department_id UUID,
  department_name VARCHAR,
  split_amount DECIMAL,
  split_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cds.department_id,
    d.name,
    ROUND((p_invoice_amount * cds.split_percentage / 100.0), 2) AS split_amount,
    cds.split_percentage
  FROM contract_department_splits cds
  JOIN departments d ON d.id = cds.department_id
  WHERE cds.contract_id = p_contract_id
  ORDER BY cds.split_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- EXPENSE ALLOCATION
-- ================================================

-- Allocate general expenses across departments
CREATE OR REPLACE FUNCTION allocate_general_expenses(
  p_total_amount DECIMAL,
  p_allocation_rule JSONB
)
RETURNS TABLE (
  department_id UUID,
  department_name VARCHAR,
  allocated_amount DECIMAL,
  allocation_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    ROUND((p_total_amount * (rule.value->>'percentage')::DECIMAL / 100.0), 2) AS allocated_amount,
    (rule.value->>'percentage')::DECIMAL AS allocation_percentage
  FROM jsonb_each(p_allocation_rule) AS rule
  JOIN departments d ON d.id = (rule.value->>'department_id')::UUID
  ORDER BY allocation_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- PAYROLL SPLIT CALCULATION
-- ================================================

-- Calculate employee cost splits across departments
CREATE OR REPLACE FUNCTION calculate_employee_splits(
  p_employee_id UUID,
  p_total_amount DECIMAL,
  p_effective_date DATE
)
RETURNS TABLE (
  department_id UUID,
  department_name VARCHAR,
  split_amount DECIMAL
) AS $$
DECLARE
  total_percentage DECIMAL := 0;
  total_fixed DECIMAL := 0;
  remaining_amount DECIMAL;
BEGIN
  -- First, calculate fixed amounts
  SELECT COALESCE(SUM(split_value), 0) INTO total_fixed
  FROM employee_department_splits eds
  WHERE eds.employee_id = p_employee_id
    AND eds.split_type = 'fixed_amount'
    AND eds.effective_from <= p_effective_date
    AND (eds.effective_to IS NULL OR eds.effective_to >= p_effective_date);
  
  remaining_amount := p_total_amount - total_fixed;
  
  -- Return fixed amounts
  RETURN QUERY
  SELECT 
    eds.department_id,
    d.name,
    eds.split_value
  FROM employee_department_splits eds
  JOIN departments d ON d.id = eds.department_id
  WHERE eds.employee_id = p_employee_id
    AND eds.split_type = 'fixed_amount'
    AND eds.effective_from <= p_effective_date
    AND (eds.effective_to IS NULL OR eds.effective_to >= p_effective_date);
  
  -- Return percentage-based amounts
  RETURN QUERY
  SELECT 
    eds.department_id,
    d.name,
    ROUND((remaining_amount * eds.split_value / 100.0), 2) AS split_amount
  FROM employee_department_splits eds
  JOIN departments d ON d.id = eds.department_id
  WHERE eds.employee_id = p_employee_id
    AND eds.split_type = 'percentage'
    AND eds.effective_from <= p_effective_date
    AND (eds.effective_to IS NULL OR eds.effective_to >= p_effective_date);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FINANCIAL PERIOD MANAGEMENT
-- ================================================

-- Close a financial period
CREATE OR REPLACE FUNCTION close_financial_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  period_id UUID;
  user_role TEXT;
BEGIN
  -- Check user has admin role
  SELECT (auth.jwt()->>'user_metadata')::JSONB->>'role' INTO user_role;
  
  IF user_role NOT IN ('CFO', 'admin') THEN
    RAISE EXCEPTION 'Only CFO/admin can close periods';
  END IF;
  
  -- Create period if it doesn't exist
  INSERT INTO financial_periods (period_year, period_month)
  VALUES (p_year, p_month)
  ON CONFLICT (period_year, period_month) DO UPDATE
  SET is_closed = true,
      closed_at = NOW(),
      closed_by = auth.uid()
  RETURNING id INTO period_id;
  
  -- Refresh materialized views
  PERFORM refresh_all_materialized_views();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reopen a financial period
CREATE OR REPLACE FUNCTION reopen_financial_period(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check user has admin role
  SELECT (auth.jwt()->>'user_metadata')::JSONB->>'role' INTO user_role;
  
  IF user_role NOT IN ('CFO', 'admin') THEN
    RAISE EXCEPTION 'Only CFO/admin can reopen periods';
  END IF;
  
  UPDATE financial_periods
  SET is_closed = false,
      reopened_at = NOW(),
      reopened_by = auth.uid()
  WHERE period_year = p_year
    AND period_month = p_month;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- MATERIALIZED VIEW REFRESH
-- ================================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vertical_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_costs;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SALARY UPDATE WITH HISTORY
-- ================================================

-- Update employee salary and maintain history
CREATE OR REPLACE FUNCTION update_employee_salary(
  p_employee_id UUID,
  p_new_salary DECIMAL,
  p_effective_from DATE,
  p_change_reason VARCHAR
)
RETURNS UUID AS $$
DECLARE
  history_id UUID;
  old_salary DECIMAL;
BEGIN
  -- Get current salary
  SELECT current_salary INTO old_salary
  FROM employees
  WHERE id = p_employee_id;
  
  -- Close previous salary history record
  UPDATE salary_history
  SET effective_to = p_effective_from - INTERVAL '1 day'
  WHERE employee_id = p_employee_id
    AND effective_to IS NULL;
  
  -- Create new salary history record
  INSERT INTO salary_history (
    employee_id,
    salary_amount,
    effective_from,
    change_reason,
    approved_by
  ) VALUES (
    p_employee_id,
    p_new_salary,
    p_effective_from,
    p_change_reason,
    auth.uid()
  ) RETURNING id INTO history_id;
  
  -- Update current salary in employees table
  UPDATE employees
  SET current_salary = p_new_salary,
      updated_at = NOW()
  WHERE id = p_employee_id;
  
  RETURN history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Get active contract for a client on a specific date
CREATE OR REPLACE FUNCTION get_active_contract(
  p_client_id UUID,
  p_date DATE
)
RETURNS TABLE (
  contract_id UUID,
  contract_name VARCHAR,
  fee_percentage DECIMAL,
  minimum_fee DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.contract_name,
    c.fee_percentage,
    c.minimum_fee
  FROM contracts c
  WHERE c.client_id = p_client_id
    AND c.is_active = true
    AND c.effective_from <= p_date
    AND (c.effective_to IS NULL OR c.effective_to >= p_date)
  ORDER BY c.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Calculate fee amount (considering minimum)
CREATE OR REPLACE FUNCTION calculate_fee(
  p_base_amount DECIMAL,
  p_fee_percentage DECIMAL,
  p_minimum_fee DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  calculated_fee DECIMAL;
BEGIN
  calculated_fee := ROUND(p_base_amount * p_fee_percentage / 100.0, 2);
  
  IF calculated_fee < p_minimum_fee THEN
    RETURN p_minimum_fee;
  END IF;
  
  RETURN calculated_fee;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get financial summary for a department and period
CREATE OR REPLACE FUNCTION get_department_summary(
  p_department_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_expenses DECIMAL,
  total_payroll DECIMAL,
  net_result DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN entry_type = 'revenue' THEN amount ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN ABS(amount) ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN entry_type = 'payroll' THEN ABS(amount) ELSE 0 END), 0) AS total_payroll,
    COALESCE(SUM(amount), 0) AS net_result
  FROM ledger_entries
  WHERE department_id = p_department_id
    AND EXTRACT(YEAR FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month;
END;
$$ LANGUAGE plpgsql;
