-- ================================================
-- IMMORAL ADMINISTRATIVE SYSTEM - BUSINESS FUNCTIONS
-- ================================================
-- Funciones SQL para cálculos y validaciones
-- IMPORTANTE: Estas son HELPERS/SUGERENCIAS
-- Todo es editable manualmente por el usuario

-- ================================================
-- 1. FEE CALCULATION FUNCTIONS
-- ================================================

-- Calculate fee paid for a client based on investment and fee tiers
CREATE OR REPLACE FUNCTION calculate_fee_paid(
  p_client_id UUID,
  p_total_investment DECIMAL,
  p_platform_count INTEGER DEFAULT 1,
  p_fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_fiscal_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS TABLE(
  fee_percentage DECIMAL,
  platform_costs DECIMAL,
  calculated_fee DECIMAL,
  applicable_tier_id UUID
) AS $$
DECLARE
  v_tier RECORD;
  v_platform_cost DECIMAL := 0;
BEGIN
  -- 1. Find applicable fee tier for this client and investment amount
  SELECT * INTO v_tier
  FROM client_fee_tiers cft
  WHERE cft.client_id = p_client_id
    AND cft.is_active = true
    AND p_total_investment >= cft.min_investment
    AND (cft.max_investment IS NULL OR p_total_investment < cft.max_investment)
    AND (cft.effective_to IS NULL OR cft.effective_to >= CURRENT_DATE)
  ORDER BY cft.min_investment DESC
  LIMIT 1;

  -- If no tier found, return NULL (user must configure)
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::UUID;
    RETURN;
  END IF;

  -- 2. Calculate platform costs
  -- First platform: base_cost, additional platforms: additional_cost each
  IF p_platform_count > 0 THEN
    -- Get first platform cost (usually €700)
    SELECT COALESCE(base_cost, 0) INTO v_platform_cost
    FROM ad_platforms
    WHERE code = 'GOOGLE' -- Default first platform
    LIMIT 1;
    
    -- Add additional platform costs (usually €300 each)
    IF p_platform_count > 1 THEN
      v_platform_cost := v_platform_cost + (
        SELECT COALESCE(SUM(additional_cost), 0)
        FROM ad_platforms
        WHERE code != 'GOOGLE'
        LIMIT p_platform_count - 1
      );
    END IF;
  END IF;

  -- 3. Calculate total fee
  -- Formula: (investment * fee%) + platform_costs + fixed_cost
  RETURN QUERY SELECT 
    v_tier.fee_percentage,
    v_platform_cost,
    (p_total_investment * v_tier.fee_percentage / 100) + v_platform_cost + COALESCE(v_tier.fixed_cost, 0),
    v_tier.id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. EXPENSE PRORATION FUNCTIONS
-- ================================================

-- Prorate general expenses among departments
CREATE OR REPLACE FUNCTION prorate_general_expenses(
  p_fiscal_year INTEGER,
  p_fiscal_month INTEGER,
  p_dry_run BOOLEAN DEFAULT true -- true = solo calcula, false = inserta
)
RETURNS TABLE(
  department_name VARCHAR,
  department_code VARCHAR,
  proration_pct DECIMAL,
  total_general_expenses DECIMAL,
  prorated_amount DECIMAL
) AS $$
DECLARE
  v_total_general DECIMAL := 0;
  v_dept RECORD;
  v_expense RECORD;
BEGIN
  -- 1. Calculate total general expenses for this period
  SELECT COALESCE(SUM(ae.amount), 0) INTO v_total_general
  FROM actual_expenses ae
  JOIN expense_categories ec ON ae.expense_category_id = ec.id
  JOIN departments d ON ae.department_id = d.id
  WHERE ae.fiscal_year = p_fiscal_year
    AND ae.fiscal_month = p_fiscal_month
    AND (ec.is_general = true OR d.is_general = true)
    AND ae.is_prorated = false; -- No prorratear algo ya prorrateado

  -- 2. For each non-general department, calculate proration
  FOR v_dept IN 
    SELECT id, name, code, proration_percentage
    FROM departments
    WHERE is_general = false
      AND proration_percentage > 0
      AND is_active = true
  LOOP
    -- If not dry run, insert prorated expenses
    IF NOT p_dry_run THEN
      -- For each general expense category, create prorated entry
      FOR v_expense IN
        SELECT DISTINCT ec.id as category_id, ec.name as category_name
        FROM actual_expenses ae
        JOIN expense_categories ec ON ae.expense_category_id = ec.id
        JOIN departments d ON ae.department_id = d.id
        WHERE ae.fiscal_year = p_fiscal_year
          AND ae.fiscal_month = p_fiscal_month
          AND (ec.is_general = true OR d.is_general = true)
          AND ae.is_prorated = false
      LOOP
        INSERT INTO actual_expenses (
          fiscal_year,
          fiscal_month,
          department_id,
          expense_category_id,
          amount,
          description,
          is_prorated,
          reference_type
        ) VALUES (
          p_fiscal_year,
          p_fiscal_month,
          v_dept.id,
          v_expense.category_id,
          v_total_general * v_dept.proration_percentage / 100,
          'Prorrateo automático de gastos generales - ' || v_expense.category_name,
          true,
          'auto_proration'
        );
      END LOOP;
    END IF;

    -- Return calculation preview
    RETURN QUERY SELECT 
      v_dept.name,
      v_dept.code,
      v_dept.proration_percentage,
      v_total_general,
      v_total_general * v_dept.proration_percentage / 100;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3. PAYROLL SPLIT FUNCTIONS
-- ================================================

-- Calculate and create payroll department splits for an employee
CREATE OR REPLACE FUNCTION split_payroll_by_departments(
  p_payroll_id UUID,
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
  department_name VARCHAR,
  split_percentage DECIMAL,
  split_amount DECIMAL
) AS $$
DECLARE
  v_payroll RECORD;
  v_split RECORD;
  v_total_pct DECIMAL := 0;
  v_remaining_amount DECIMAL;
BEGIN
  -- Get payroll info
  SELECT * INTO v_payroll
  FROM monthly_payroll
  WHERE id = p_payroll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll not found: %', p_payroll_id;
  END IF;

  -- Get employee department splits for this period
  FOR v_split IN
    SELECT 
      eds.department_id,
      d.name as department_name,
      eds.split_type,
      eds.split_value
    FROM employee_department_splits eds
    JOIN departments d ON eds.department_id = d.id
    WHERE eds.employee_id = v_payroll.employee_id
      AND eds.fiscal_year = v_payroll.fiscal_year
      AND eds.fiscal_month = v_payroll.fiscal_month
    ORDER BY eds.created_at
  LOOP
    IF v_split.split_type = 'percentage' THEN
      v_total_pct := v_total_pct + v_split.split_value;
      
      -- Insert split if not dry run
      IF NOT p_dry_run THEN
        INSERT INTO payroll_department_splits (
          payroll_id,
          department_id,
          split_amount,
          split_percentage
        ) VALUES (
          p_payroll_id,
          v_split.department_id,
          v_payroll.total_company_cost * v_split.split_value / 100,
          v_split.split_value
        );
      END IF;

      RETURN QUERY SELECT 
        v_split.department_name,
        v_split.split_value,
        v_payroll.total_company_cost * v_split.split_value / 100;
    END IF;
  END LOOP;

  -- Validate that percentages sum to 100%
  IF v_total_pct != 100 AND v_total_pct > 0 THEN
    RAISE WARNING 'Department splits do not sum to 100 percent. Consider adjusting.';
  END IF;

  -- If no splits found, assign 100% to primary department
  IF v_total_pct = 0 THEN
    SELECT name INTO v_split.department_name
    FROM departments d
    JOIN employees e ON e.primary_department_id = d.id
    WHERE e.id = v_payroll.employee_id;

    IF NOT p_dry_run THEN
      INSERT INTO payroll_department_splits (
        payroll_id,
        department_id,
        split_amount,
        split_percentage
      )
      SELECT 
        p_payroll_id,
        e.primary_department_id,
        v_payroll.total_company_cost,
        100
      FROM employees e
      WHERE e.id = v_payroll.employee_id;
    END IF;

    RETURN QUERY SELECT 
      v_split.department_name,
      100::DECIMAL,
      v_payroll.total_company_cost;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. BILLING CALCULATION FUNCTIONS
-- ================================================

-- Calculate monthly billing for a client
CREATE OR REPLACE FUNCTION calculate_monthly_billing(
  p_client_id UUID,
  p_fiscal_year INTEGER,
  p_fiscal_month INTEGER,
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
  total_investment DECIMAL,
  platform_count INTEGER,
  suggested_fee_pct DECIMAL,
  suggested_platform_costs DECIMAL,
  calculated_fee_paid DECIMAL,
  immedia_total DECIMAL,
  imcontent_total DECIMAL,
  immoralia_total DECIMAL,
  grand_total DECIMAL
) AS $$
DECLARE
  v_total_investment DECIMAL := 0;
  v_platform_count INTEGER := 0;
  v_fee_calc RECORD;
  v_immedia DECIMAL := 0;
  v_imcontent DECIMAL := 0;
  v_immoralia DECIMAL := 0;
  v_billing_id UUID;
BEGIN
  -- 1. Calculate total ad investment for this client/period
  SELECT 
    COALESCE(SUM(actual_amount), 0),
    COUNT(DISTINCT platform_id)
  INTO v_total_investment, v_platform_count
  FROM client_ad_investment
  WHERE client_id = p_client_id
    AND fiscal_year = p_fiscal_year
    AND fiscal_month = p_fiscal_month;

  -- 2. Calculate suggested fee paid
  SELECT * INTO v_fee_calc
  FROM calculate_fee_paid(
    p_client_id,
    v_total_investment,
    v_platform_count,
    p_fiscal_year,
    p_fiscal_month
  );

  v_immedia := COALESCE(v_fee_calc.calculated_fee, 0);

  -- 3. Sum other services by department
  SELECT COALESCE(SUM(bd.amount), 0) INTO v_imcontent
  FROM billing_details bd
  JOIN monthly_billing mb ON bd.monthly_billing_id = mb.id
  JOIN departments d ON bd.department_id = d.id
  WHERE mb.client_id = p_client_id
    AND mb.fiscal_year = p_fiscal_year
    AND mb.fiscal_month = p_fiscal_month
    AND d.code = 'IMCONT';

  SELECT COALESCE(SUM(bd.amount), 0) INTO v_immoralia
  FROM billing_details bd
  JOIN monthly_billing mb ON bd.monthly_billing_id = mb.id
  JOIN departments d ON bd.department_id = d.id
  WHERE mb.client_id = p_client_id
    AND mb.fiscal_year = p_fiscal_year
    AND mb.fiscal_month = p_fiscal_month
    AND d.code = 'IMMOR';

  -- 4. If not dry run, create/update monthly_billing record
  IF NOT p_dry_run THEN
    INSERT INTO monthly_billing (
      client_id,
      fiscal_year,
      fiscal_month,
      total_ad_investment,
      platform_count,
      applied_fee_percentage,
      platform_costs,
      fee_paid,
      immedia_total,
      imcontent_total,
      immoralia_total
    ) VALUES (
      p_client_id,
      p_fiscal_year,
      p_fiscal_month,
      v_total_investment,
      v_platform_count,
      v_fee_calc.fee_percentage,
      v_fee_calc.platform_costs,
      v_fee_calc.calculated_fee,
      v_immedia,
      v_imcontent,
      v_immoralia
    )
    ON CONFLICT (client_id, fiscal_year, fiscal_month)
    DO UPDATE SET
      total_ad_investment = EXCLUDED.total_ad_investment,
      platform_count = EXCLUDED.platform_count,
      applied_fee_percentage = EXCLUDED.applied_fee_percentage,
      platform_costs = EXCLUDED.platform_costs,
      fee_paid = EXCLUDED.fee_paid,
      updated_at = NOW();
  END IF;

  -- Return calculation
  RETURN QUERY SELECT 
    v_total_investment,
    v_platform_count,
    v_fee_calc.fee_percentage,
    v_fee_calc.platform_costs,
    v_fee_calc.calculated_fee,
    v_immedia,
    v_imcontent,
    v_immoralia,
    v_immedia + v_imcontent + v_immoralia;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. PERIOD MANAGEMENT FUNCTIONS
-- ================================================

-- Close a financial period
CREATE OR REPLACE FUNCTION close_financial_period(
  p_fiscal_year INTEGER,
  p_fiscal_month INTEGER,
  p_closed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_period_id UUID;
BEGIN
  -- Insert or update period
  INSERT INTO financial_periods (
    fiscal_year,
    fiscal_month,
    is_closed,
    closed_at,
    closed_by
  ) VALUES (
    p_fiscal_year,
    p_fiscal_month,
    true,
    NOW(),
    p_closed_by
  )
  ON CONFLICT (fiscal_year, fiscal_month)
  DO UPDATE SET
    is_closed = true,
    closed_at = NOW(),
    closed_by = p_closed_by,
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Reopen a financial period (admin only)
CREATE OR REPLACE FUNCTION reopen_financial_period(
  p_fiscal_year INTEGER,
  p_fiscal_month INTEGER,
  p_reopened_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE financial_periods
  SET 
    is_closed = false,
    reopened_at = NOW(),
    reopened_by = p_reopened_by,
    updated_at = NOW()
  WHERE fiscal_year = p_fiscal_year
    AND fiscal_month = p_fiscal_month;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Check if period is closed
CREATE OR REPLACE FUNCTION is_period_closed(
  p_fiscal_year INTEGER,
  p_fiscal_month INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_closed BOOLEAN;
BEGIN
  SELECT is_closed INTO v_is_closed
  FROM financial_periods
  WHERE fiscal_year = p_fiscal_year
    AND fiscal_month = p_fiscal_month;

  RETURN COALESCE(v_is_closed, false);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. SALARY UPDATE FUNCTION (with history)
-- ================================================

CREATE OR REPLACE FUNCTION update_employee_salary(
  p_employee_id UUID,
  p_new_salary DECIMAL,
  p_effective_from DATE,
  p_change_reason VARCHAR DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_salary DECIMAL;
BEGIN
  -- Get current salary
  SELECT current_salary INTO v_old_salary
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;

  -- Close previous salary history entry
  UPDATE salary_history
  SET effective_to = p_effective_from - INTERVAL '1 day'
  WHERE employee_id = p_employee_id
    AND effective_to IS NULL;

  -- Insert new salary history
  INSERT INTO salary_history (
    employee_id,
    old_salary,
    new_salary,
    effective_from,
    change_reason,
    approved_by
  ) VALUES (
    p_employee_id,
    v_old_salary,
    p_new_salary,
    p_effective_from,
    p_change_reason,
    p_approved_by
  );

  -- Update employee current salary
  UPDATE employees
  SET current_salary = p_new_salary
  WHERE id = p_employee_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON FUNCTION calculate_fee_paid IS 'Calcula fee paid sugerido basado en inversión y tier del cliente. EDITABLE manualmente.';
COMMENT ON FUNCTION prorate_general_expenses IS 'Sugiere prorrateo de gastos generales. Use dry_run=true para preview.';
COMMENT ON FUNCTION calculate_monthly_billing IS 'Calcula facturación mensual sugerida. Todo es editable después.';
COMMENT ON FUNCTION close_financial_period IS 'Cierra un período financiero (solo admin).';
COMMENT ON FUNCTION update_employee_salary IS 'Actualiza salario con historial inmutable.';
