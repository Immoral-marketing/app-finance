-- ================================================
-- COMPLETE TEST DATA FOR IMMORAL FINANCE APP
-- ================================================
-- Script para crear datos de prueba completos
-- Ejecutar DESPUÉS de schema_v2.sql y sample_data.sql

-- ================================================
-- 1. AD INVESTMENT DATA (Enero 2026)
-- ================================================

-- La Vecina Rubia - Inversión publicitaria
INSERT INTO client_ad_investment (
  client_id,
  platform_id,
  fiscal_year,
  fiscal_month,
  budgeted_amount,
  actual_amount
)
SELECT 
  (SELECT id FROM clients WHERE name = 'La Vecina Rubia' LIMIT 1),
  ap.id,
  2026,
  1,
  CASE 
    WHEN ap.code = 'GOOGLE' THEN 3000.00
    WHEN ap.code = 'META' THEN 2000.00
    ELSE 0
  END,
  CASE 
    WHEN ap.code = 'GOOGLE' THEN 3200.00
    WHEN ap.code = 'META' THEN 1800.00
    ELSE 0
  END
FROM ad_platforms ap
WHERE ap.code IN ('GOOGLE', 'META')
ON CONFLICT DO NOTHING;

-- The Converter - Inversión publicitaria
INSERT INTO client_ad_investment (
  client_id,
  platform_id,
  fiscal_year,
  fiscal_month,
  budgeted_amount,
  actual_amount
)
SELECT 
  (SELECT id FROM clients WHERE name = 'The Converter' LIMIT 1),
  ap.id,
  2026,
  1,
  CASE 
    WHEN ap.code = 'GOOGLE' THEN 8000.00
    WHEN ap.code = 'META' THEN 4000.00
    WHEN ap.code = 'TIKTOK' THEN 2000.00
    ELSE 0
  END,
  CASE 
    WHEN ap.code = 'GOOGLE' THEN 7800.00
    WHEN ap.code = 'META' THEN 4200.00
    WHEN ap.code = 'TIKTOK' THEN 2100.00
    ELSE 0
  END
FROM ad_platforms ap
WHERE ap.code IN ('GOOGLE', 'META', 'TIKTOK')
ON CONFLICT DO NOTHING;

-- ================================================
-- 2. BILLING MATRIX - Servicios adicionales
-- ================================================

-- Primero calculamos la facturación base (esto lo haría el servicio, pero podemos hacerlo manual)
-- La Vecina Rubia - Billing
DO $$
DECLARE
  v_lvr_id UUID;
  v_billing_id UUID;
  v_immedia_id UUID;
  v_immoralia_id UUID;
BEGIN
  SELECT id INTO v_lvr_id FROM clients WHERE name = 'La Vecina Rubia' LIMIT 1;
  SELECT id INTO v_immedia_id FROM departments WHERE code = 'IMMED';
  SELECT id INTO v_immoralia_id FROM departments WHERE code = 'IMMOR';
  
  -- Create billing entry
  INSERT INTO monthly_billing (
    client_id,
    fiscal_year,
    fiscal_month,
    total_ad_investment,
    platform_count,
    applied_fee_percentage,
    platform_costs,
    fee_paid,
    notes
  ) VALUES (
    v_lvr_id,
    2026,
    1,
    5000.00,  -- 3200 + 1800
    2,        -- Google + Meta
    10.00,    -- Fee percentage
    1000.00,  -- 700 + 300
    1500.00,  -- (5000 * 0.10) + 1000
    'Facturación enero 2026'
  )
  RETURNING id INTO v_billing_id;
  
  -- Fee Paid detail (Immedia)
  INSERT INTO billing_details (
    monthly_billing_id,
    department_id,
    service_id,
    service_name,
    amount,
    is_fee_paid
  ) VALUES (
    v_billing_id,
    v_immedia_id,
    NULL,
    'Fee Paid - Gestión publicitaria',
    1500.00,
    true
  );
  
  -- Servicio adicional Immoralia
  INSERT INTO billing_details (
    monthly_billing_id,
    department_id,
    service_id,
    service_name,
    amount,
    is_fee_paid
  ) VALUES (
    v_billing_id,
    v_immoralia_id,
    (SELECT id FROM services WHERE name = 'Social Media Management' LIMIT 1),
    'Gestión de redes sociales',
    1200.00,
    false
  );
  
  -- Update totals
  UPDATE monthly_billing
  SET 
    immedia_total = 1500.00,
    immoralia_total = 1200.00
  WHERE id = v_billing_id;
END $$;

-- ================================================
-- 3. ACTUAL EXPENSES (Enero 2026)
-- ================================================

-- Gastos por departamento
INSERT INTO actual_expenses (
  fiscal_year,
  fiscal_month,
  department_id,
  expense_category_id,
  amount,
  description,
  vendor,
  payment_date
)
SELECT
  2026,
  1,
  d.id,
  ec.id,
  CASE 
    WHEN d.code = 'IMCONT' AND ec.code = 'SOFT' THEN 500.00
    WHEN d.code = 'IMMED' AND ec.code = 'SOFT' THEN 800.00
    WHEN d.code = 'IMMOR' AND ec.code = 'SOFT' THEN 300.00
    ELSE 0
  END,
  'Suscripción software ' || d.name,
  'Adobe Inc.',
  '2026-01-15'
FROM departments d
CROSS JOIN expense_categories ec
WHERE d.code IN ('IMCONT', 'IMMED', 'IMMOR')
  AND ec.code = 'SOFT'
  AND d.is_general = false
ON CONFLICT DO NOTHING;

-- Gastos generales (para prorratear)
INSERT INTO actual_expenses (
  fiscal_year,
  fiscal_month,
  department_id,
  expense_category_id,
  amount,
  description,
  vendor,
  payment_date
)
SELECT
  2026,
  1,
  (SELECT id FROM departments WHERE is_general = true LIMIT 1),
  ec.id,
  CASE 
    WHEN ec.code = 'RENT' THEN 2000.00
    WHEN ec.code = 'UTIL' THEN 500.00
    WHEN ec.code = 'ADMIN' THEN 800.00
    ELSE 0
  END,
  'Gasto general - ' || ec.name,
  'Varios',
  '2026-01-01'
FROM expense_categories ec
WHERE ec.code IN ('RENT', 'UTIL', 'ADMIN')
  AND ec.is_general = true
ON CONFLICT DO NOTHING;

-- ================================================
-- 4. PAYROLL DATA (Enero 2026)
-- ================================================

-- Nómina de Alba (100% Imcontent)
DO $$
DECLARE
  v_alba_id UUID;
  v_payroll_id UUID;
  v_imcontent_id UUID;
BEGIN
  SELECT id INTO v_alba_id FROM employees WHERE first_name = 'Alba' LIMIT 1;
  SELECT id INTO v_imcontent_id FROM departments WHERE code = 'IMCONT';
  
  INSERT INTO monthly_payroll (
    employee_id,
    fiscal_year,
    fiscal_month,
    gross_salary,
    social_security_company,
    total_company_cost,
    payment_date
  ) VALUES (
    v_alba_id,
    2026,
    1,
    2500.00,
    500.00,
    3000.00,
    '2026-01-31'
  )
  RETURNING id INTO v_payroll_id;
  
  -- Split 100% a Imcontent
  INSERT INTO payroll_department_splits (
    payroll_id,
    department_id,
    split_amount,
    split_percentage
  ) VALUES (
    v_payroll_id,
    v_imcontent_id,
    3000.00,
    100.00
  );
END $$;

-- Nómina de Adrián (70% Immedia, 30% Imcontent)
DO $$
DECLARE
  v_adrian_id UUID;
  v_payroll_id UUID;
  v_immedia_id UUID;
  v_imcontent_id UUID;
BEGIN
  SELECT id INTO v_adrian_id FROM employees WHERE first_name = 'Adrián' LIMIT 1;
  SELECT id INTO v_immedia_id FROM departments WHERE code = 'IMMED';
  SELECT id INTO v_imcontent_id FROM departments WHERE code = 'IMCONT';
  
  INSERT INTO monthly_payroll (
    employee_id,
    fiscal_year,
    fiscal_month,
    gross_salary,
    social_security_company,
    total_company_cost,
    payment_date
  ) VALUES (
    v_adrian_id,
    2026,
    1,
    2800.00,
    560.00,
    3360.00,
    '2026-01-31'
  )
  RETURNING id INTO v_payroll_id;
  
  -- Split 70% Immedia
  INSERT INTO payroll_department_splits (
    payroll_id,
    department_id,
    split_amount,
    split_percentage
  ) VALUES (
    v_payroll_id,
    v_immedia_id,
    2352.00,  -- 3360 * 0.70
    70.00
  );
  
  -- Split 30% Imcontent
  INSERT INTO payroll_department_splits (
    payroll_id,
    department_id,
    split_amount,
    split_percentage
  ) VALUES (
    v_payroll_id,
    v_imcontent_id,
    1008.00,  -- 3360 * 0.30
    30.00
  );
  
  -- Crear employee_department_splits para este mes
  INSERT INTO employee_department_splits (
    employee_id,
    fiscal_year,
    fiscal_month,
    department_id,
    split_type,
    split_value
  ) VALUES 
  (v_adrian_id, 2026, 1, v_immedia_id, 'percentage', 70.00),
  (v_adrian_id, 2026, 1, v_imcontent_id, 'percentage', 30.00);
END $$;

-- ================================================
-- 5. COMMISSIONS - Partners
-- ================================================

-- Partner comisión sobre The Converter
DO $$
DECLARE
  v_partner_id UUID;
  v_converter_id UUID;
  v_billing RECORD;
BEGIN
  -- Get partner
  SELECT id INTO v_partner_id FROM partners WHERE name = 'Juan Referidor' LIMIT 1;
  SELECT id INTO v_converter_id FROM clients WHERE name = 'The Converter' LIMIT 1;
  
  -- Get billing total for The Converter
  SELECT * INTO v_billing
  FROM monthly_billing
  WHERE client_id = v_converter_id
    AND fiscal_year = 2026
    AND fiscal_month = 1
  LIMIT 1;
  
  IF FOUND THEN
    -- Asignar partner al cliente si no existe
    INSERT INTO partner_clients (partner_id, client_id, commission_percentage)
    VALUES (v_partner_id, v_converter_id, 10.00)
    ON CONFLICT DO NOTHING;
    
    -- Calcular comisión
    INSERT INTO monthly_partner_commissions (
      partner_id,
      client_id,
      fiscal_year,
      fiscal_month,
      client_revenue,
      commission_percentage,
      commission_amount,
      payment_status
    ) VALUES (
      v_partner_id,
      v_converter_id,
      2026,
      1,
      COALESCE(v_billing.immedia_total, 0) + COALESCE(v_billing.imcontent_total, 0) + COALESCE(v_billing.immoralia_total, 0),
      10.00,
      (COALESCE(v_billing.immedia_total, 0) + COALESCE(v_billing.imcontent_total, 0) + COALESCE(v_billing.immoralia_total, 0)) * 0.10,
      'pending'
    );
  END IF;
END $$;

-- ================================================
-- 6. COMMISSION PLATFORMS - Earned
-- ================================================

-- Comisión ganada de WillMay
INSERT INTO monthly_platform_commissions (
  platform_id,
  fiscal_year,
  fiscal_month,
  total_client_spending,
  commission_percentage,
  commission_earned,
  payment_status
)
SELECT
  (SELECT id FROM commission_platforms WHERE name = 'WillMay' LIMIT 1),
  2026,
  1,
  15000.00,  -- Total gastado por clientes en WillMay
  5.00,
  750.00,    -- 15000 * 0.05
  'pending'
ON CONFLICT DO NOTHING;

-- ================================================
-- 7. PAYMENT SCHEDULE (Enero 2026)
-- ================================================

-- Pagos de la primera semana
INSERT INTO payment_schedule (
  fiscal_year,
  fiscal_month,
  week_number,
  payee_type,
  payee_name,
  bank_details,
  issuing_bank,
  invoice_received_date,
  billed_to_company,
  amount,
  has_commission,
  payment_status,
  scheduled_payment_date
)
VALUES 
(
  2026, 1, 1,
  'supplier',
  'Adobe Inc.',
  'ES12 3456 7890 1234 5678',
  'BBVA',
  '2026-01-05',
  'DMK',
  1600.00,
  false,
  'pending',
  '2026-01-10'
),
(
  2026, 1, 1,
  'employee',
  'Alba García',
  'ES98 7654 3210 9876 5432',
  'Santander',
  NULL,
  'DMK',
  2500.00,
  false,
  'pending',
  '2026-01-31'
);

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Ver inversión publicitaria
-- SELECT 
--   c.name as client,
--   ap.name as platform,
--   cai.actual_amount
-- FROM client_ad_investment cai
-- JOIN clients c ON cai.client_id = c.id
-- JOIN ad_platforms ap ON cai.platform_id = ap.id
-- WHERE cai.fiscal_year = 2026 AND cai.fiscal_month = 1;

-- Ver facturación
-- SELECT 
--   c.name as client,
--   mb.total_ad_investment,
--   mb.fee_paid,
--   mb.immedia_total + mb.imcontent_total + mb.immoralia_total as total
-- FROM monthly_billing mb
-- JOIN clients c ON mb.client_id = c.id
-- WHERE mb.fiscal_year = 2026 AND mb.fiscal_month = 1;

-- Ver gastos
-- SELECT 
--   d.name as department,
--   ec.name as category,
--   ae.amount,
--   ae.description
-- FROM actual_expenses ae
-- JOIN departments d ON ae.department_id = d.id
-- JOIN expense_categories ec ON ae.expense_category_id = ec.id
-- WHERE ae.fiscal_year = 2026 AND ae.fiscal_month = 1
-- ORDER BY d.name, ec.name;

COMMENT ON SCHEMA public IS 'Test data created for January 2026';
