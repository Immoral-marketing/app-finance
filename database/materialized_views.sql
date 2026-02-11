-- ================================================
-- IMMORAL FINANCE APP - MATERIALIZED VIEWS
-- ================================================
-- Pre-aggregated views for dashboard performance

-- ================================================
-- DEPARTMENT SUMMARY VIEW
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_department_summary AS
SELECT 
  d.id AS department_id,
  d.name AS department_name,
  d.code AS department_code,
  EXTRACT(YEAR FROM le.entry_date) AS year,
  EXTRACT(MONTH FROM le.entry_date) AS month,
  -- Revenue
  COALESCE(SUM(CASE WHEN le.entry_type = 'revenue' THEN le.amount ELSE 0 END), 0) AS total_revenue,
  -- Expenses
  COALESCE(SUM(CASE WHEN le.entry_type = 'expense' THEN ABS(le.amount) ELSE 0 END), 0) AS total_expenses,
  -- Payroll
  COALESCE(SUM(CASE WHEN le.entry_type = 'payroll' THEN ABS(le.amount) ELSE 0 END), 0) AS total_payroll,
  -- Commissions (net)
  COALESCE(SUM(CASE WHEN le.entry_type = 'commission' THEN le.amount ELSE 0 END), 0) AS total_commissions,
  -- Net result
  COALESCE(SUM(le.amount), 0) AS net_result,
  -- Transaction counts
  COUNT(DISTINCT le.transaction_id) AS transaction_count,
  -- Last updated
  NOW() AS refreshed_at
FROM departments d
LEFT JOIN ledger_entries le ON le.department_id = d.id
WHERE d.is_active = true
GROUP BY d.id, d.name, d.code, year, month
ORDER BY year DESC, month DESC, d.name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_department_summary_pk 
ON mv_department_summary(department_id, year, month);

CREATE INDEX IF NOT EXISTS idx_mv_department_summary_period 
ON mv_department_summary(year, month);

COMMENT ON MATERIALIZED VIEW mv_department_summary IS 'Pre-aggregated financial summary by department and period';

-- ================================================
-- VERTICAL SUMMARY VIEW
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vertical_summary AS
SELECT 
  v.id AS vertical_id,
  v.name AS vertical_name,
  v.code AS vertical_code,
  EXTRACT(YEAR FROM le.entry_date) AS year,
  EXTRACT(MONTH FROM le.entry_date) AS month,
  -- Revenue (only relevant for verticals)
  COALESCE(SUM(CASE WHEN le.entry_type = 'revenue' THEN le.amount ELSE 0 END), 0) AS total_revenue,
  -- Client count
  COUNT(DISTINCT c.id) AS active_clients,
  -- Contract count
  COUNT(DISTINCT ct.id) AS active_contracts,
  -- Average fee
  AVG(ct.fee_percentage) AS avg_fee_percentage,
  -- Transaction counts
  COUNT(DISTINCT le.transaction_id) AS transaction_count,
  -- Last updated
  NOW() AS refreshed_at
FROM verticals v
LEFT JOIN contracts ct ON ct.vertical_id = v.id AND ct.is_active = true
LEFT JOIN clients c ON c.id = ct.client_id AND c.is_active = true
LEFT JOIN ledger_entries le ON le.vertical_id = v.id
WHERE v.is_active = true
GROUP BY v.id, v.name, v.code, year, month
ORDER BY year DESC, month DESC, v.name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vertical_summary_pk 
ON mv_vertical_summary(vertical_id, year, month);

CREATE INDEX IF NOT EXISTS idx_mv_vertical_summary_period 
ON mv_vertical_summary(year, month);

COMMENT ON MATERIALIZED VIEW mv_vertical_summary IS 'Pre-aggregated financial summary by vertical and period';

-- ================================================
-- CLIENT REVENUE VIEW
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_revenue AS
SELECT 
  c.id AS client_id,
  c.name AS client_name,
  v.id AS vertical_id,
  v.name AS vertical_name,
  EXTRACT(YEAR FROM le.entry_date) AS year,
  EXTRACT(MONTH FROM le.entry_date) AS month,
  -- Revenue
  COALESCE(SUM(CASE WHEN le.entry_type = 'revenue' THEN le.amount ELSE 0 END), 0) AS total_revenue,
  -- Invoice count
  COUNT(DISTINCT le.transaction_id) FILTER (WHERE le.entry_type = 'revenue') AS invoice_count,
  -- Average invoice amount
  AVG(le.amount) FILTER (WHERE le.entry_type = 'revenue') AS avg_invoice_amount,
  -- Active contracts
  COUNT(DISTINCT ct.id) AS active_contracts,
  -- Last invoice date
  MAX(le.entry_date) FILTER (WHERE le.entry_type = 'revenue') AS last_invoice_date,
  -- Last updated
  NOW() AS refreshed_at
FROM clients c
LEFT JOIN contracts ct ON ct.client_id = c.id AND ct.is_active = true
LEFT JOIN verticals v ON v.id = ct.vertical_id
LEFT JOIN ledger_entries le ON le.reference_type = 'invoice' 
  AND le.reference_id IN (
    SELECT id FROM contracts WHERE client_id = c.id
  )
WHERE c.is_active = true
GROUP BY c.id, c.name, v.id, v.name, year, month
ORDER BY year DESC, month DESC, total_revenue DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_client_revenue_pk 
ON mv_client_revenue(client_id, COALESCE(vertical_id, '00000000-0000-0000-0000-000000000000'::UUID), year, month);

CREATE INDEX IF NOT EXISTS idx_mv_client_revenue_period 
ON mv_client_revenue(year, month);

CREATE INDEX IF NOT EXISTS idx_mv_client_revenue_client 
ON mv_client_revenue(client_id);

COMMENT ON MATERIALIZED VIEW mv_client_revenue IS 'Pre-aggregated revenue summary by client and period';

-- ================================================
-- EMPLOYEE COSTS VIEW
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_costs AS
SELECT 
  e.id AS employee_id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name AS full_name,
  d.id AS department_id,
  d.name AS department_name,
  EXTRACT(YEAR FROM le.entry_date) AS year,
  EXTRACT(MONTH FROM le.entry_date) AS month,
  -- Payroll costs
  COALESCE(SUM(CASE WHEN le.entry_type = 'payroll' THEN ABS(le.amount) ELSE 0 END), 0) AS total_payroll,
  -- Payment count
  COUNT(DISTINCT le.transaction_id) FILTER (WHERE le.entry_type = 'payroll') AS payment_count,
  -- Average payment
  AVG(ABS(le.amount)) FILTER (WHERE le.entry_type = 'payroll') AS avg_payment,
  -- Current salary
  e.current_salary,
  -- Last payment date
  MAX(le.entry_date) FILTER (WHERE le.entry_type = 'payroll') AS last_payment_date,
  -- Last updated
  NOW() AS refreshed_at
FROM employees e
LEFT JOIN employee_department_splits eds ON eds.employee_id = e.id
LEFT JOIN departments d ON d.id = eds.department_id
LEFT JOIN ledger_entries le ON le.reference_type = 'payroll' 
  AND le.reference_id = e.id
  AND le.department_id = d.id
WHERE e.is_active = true
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.id, d.name, e.current_salary, year, month
ORDER BY year DESC, month DESC, e.last_name, e.first_name;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_employee_costs_pk 
ON mv_employee_costs(employee_id, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::UUID), year, month);

CREATE INDEX IF NOT EXISTS idx_mv_employee_costs_period 
ON mv_employee_costs(year, month);

CREATE INDEX IF NOT EXISTS idx_mv_employee_costs_employee 
ON mv_employee_costs(employee_id);

CREATE INDEX IF NOT EXISTS idx_mv_employee_costs_department 
ON mv_employee_costs(department_id);

COMMENT ON MATERIALIZED VIEW mv_employee_costs IS 'Pre-aggregated employee costs by department and period';

-- ================================================
-- COMPREHENSIVE FINANCIAL SUMMARY VIEW
-- ================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_financial_summary AS
SELECT 
  EXTRACT(YEAR FROM le.entry_date) AS year,
  EXTRACT(MONTH FROM le.entry_date) AS month,
  CEIL(EXTRACT(MONTH FROM le.entry_date)::DECIMAL / 3) AS quarter,
  -- Revenue
  COALESCE(SUM(CASE WHEN le.entry_type = 'revenue' THEN le.amount ELSE 0 END), 0) AS total_revenue,
  -- Expenses
  COALESCE(SUM(CASE WHEN le.entry_type = 'expense' THEN ABS(le.amount) ELSE 0 END), 0) AS total_expenses,
  -- Payroll
  COALESCE(SUM(CASE WHEN le.entry_type = 'payroll' THEN ABS(le.amount) ELSE 0 END), 0) AS total_payroll,
  -- Commissions paid
  COALESCE(SUM(CASE WHEN le.entry_type = 'commission' AND le.amount < 0 THEN ABS(le.amount) ELSE 0 END), 0) AS commissions_paid,
  -- Commissions received
  COALESCE(SUM(CASE WHEN le.entry_type = 'commission' AND le.amount > 0 THEN le.amount ELSE 0 END), 0) AS commissions_received,
  -- Operating costs (expenses + payroll)
  COALESCE(SUM(CASE WHEN le.entry_type IN ('expense', 'payroll') THEN ABS(le.amount) ELSE 0 END), 0) AS operating_costs,
  -- Gross margin (revenue - operating costs)
  COALESCE(SUM(CASE WHEN le.entry_type = 'revenue' THEN le.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN le.entry_type IN ('expense', 'payroll') THEN ABS(le.amount) ELSE 0 END), 0) AS gross_margin,
  -- Net result (all entries)
  COALESCE(SUM(le.amount), 0) AS net_result,
  -- Transaction counts
  COUNT(DISTINCT le.transaction_id) AS total_transactions,
  COUNT(DISTINCT CASE WHEN le.entry_type = 'revenue' THEN le.transaction_id END) AS revenue_transactions,
  COUNT(DISTINCT CASE WHEN le.entry_type = 'expense' THEN le.transaction_id END) AS expense_transactions,
  COUNT(DISTINCT CASE WHEN le.entry_type = 'payroll' THEN le.transaction_id END) AS payroll_transactions,
  -- Period status
  fp.is_closed AS period_closed,
  fp.closed_at,
  -- Last updated
  NOW() AS refreshed_at
FROM ledger_entries le
LEFT JOIN financial_periods fp ON fp.period_year = EXTRACT(YEAR FROM le.entry_date)
  AND fp.period_month = EXTRACT(MONTH FROM le.entry_date)
GROUP BY year, month, quarter, fp.is_closed, fp.closed_at
ORDER BY year DESC, month DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financial_summary_pk 
ON mv_financial_summary(year, month);

CREATE INDEX IF NOT EXISTS idx_mv_financial_summary_quarter 
ON mv_financial_summary(year, quarter);

COMMENT ON MATERIALIZED VIEW mv_financial_summary IS 'Company-wide financial summary by period';

-- ================================================
-- REFRESH TRIGGERS
-- ================================================

-- Function to refresh materialized views after ledger changes
CREATE OR REPLACE FUNCTION refresh_materialized_views_on_ledger_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule refresh (in production, use a background job queue)
  -- For now, we'll manually refresh or use periodic jobs
  -- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_summary;
  -- Note: Actual refresh should be done via periodic jobs or manual triggers
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to schedule refresh (disabled by default, enable in production with proper job queue)
-- CREATE TRIGGER trigger_refresh_views_on_ledger_insert
-- AFTER INSERT ON ledger_entries
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION refresh_materialized_views_on_ledger_change();

-- ================================================
-- MANUAL REFRESH FUNCTION
-- ================================================

-- This function should be called periodically or after period close
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE(view_name TEXT, refresh_time INTERVAL) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  -- Department Summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_summary;
  end_time := clock_timestamp();
  view_name := 'mv_department_summary';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Vertical Summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vertical_summary;
  end_time := clock_timestamp();
  view_name := 'mv_vertical_summary';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Client Revenue
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_revenue;
  end_time := clock_timestamp();
  view_name := 'mv_client_revenue';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Employee Costs
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_employee_costs;
  end_time := clock_timestamp();
  view_name := 'mv_employee_costs';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  -- Financial Summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_financial_summary;
  end_time := clock_timestamp();
  view_name := 'mv_financial_summary';
  refresh_time := end_time - start_time;
  RETURN NEXT;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- INITIAL REFRESH
-- ================================================

-- Refresh all views on initial setup
SELECT refresh_all_materialized_views();
