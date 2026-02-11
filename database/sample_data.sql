-- ================================================
-- SAMPLE DATA - Based on Real Excel Structures
-- ================================================
-- Datos de ejemplo basados en los Excel de Immoral

-- ================================================
-- SERVICES (Servicios por departamento)
-- ================================================

-- IMCONTENT Services
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Ad Spend', 'AD_SPEND', 'revenue', 1),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Setup inicial', 'SETUP', 'revenue', 2),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Branding', 'BRAND', 'revenue', 3),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Asesoria', 'ADVISORY', 'revenue', 4),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Consultoria con IA', 'CONSULT_IA', 'revenue', 5),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Audit Digital', 'AUDIT', 'revenue', 6),
((SELECT id FROM departments WHERE code = 'IMCONT'), 'Otros servicios', 'OTHER', 'revenue', 7)
ON CONFLICT DO NOTHING;

-- IMMEDIA Services
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
((SELECT id FROM departments WHERE code = 'IMMED'), 'Fee Paid', 'FEE_PAID', 'revenue', 1),
((SELECT id FROM departments WHERE code = 'IMMED'), 'Branding y gestión de campaña de Meta Media', 'BRAND_META', 'revenue', 2),
((SELECT id FROM departments WHERE code = 'IMMED'), 'Producción de creatividad', 'CREATIVE', 'revenue', 3),
((SELECT id FROM departments WHERE code = 'IMMED'), 'Diseño de embudos', 'FUNNEL', 'revenue', 4),
((SELECT id FROM departments WHERE code = 'IMMED'), 'Generación servicio de Fans con IA', 'GEN_FANS_IA', 'revenue', 5),
((SELECT id FROM departments WHERE code = 'IMMED'), 'Servicio gestión de Fans', 'FANS_MGMT', 'revenue', 6)
ON CONFLICT DO NOTHING;

-- IMMORALIA Services
INSERT INTO services (department_id, name, code, service_type, display_order) VALUES
((SELECT id FROM departments WHERE code = 'IMMOR'), 'Social Initial', 'SOCIAL_INIT', 'revenue', 1),
((SELECT id FROM departments WHERE code = 'IMMOR'), 'Advertising', 'ADVERTISING', 'revenue', 2),
((SELECT id FROM departments WHERE code = 'IMMOR'), 'Creación de contenido de perf', 'CONTENT_PERF', 'revenue', 3),
((SELECT id FROM departments WHERE code = 'IMMOR'), 'BTC', 'BTC', 'revenue', 4)
ON CONFLICT DO NOTHING;

-- ================================================
-- EXPENSE CATEGORIES
-- ================================================

INSERT INTO expense_categories (name, code, is_general, display_order) VALUES
-- Gastos de Personal
('Gastos de Personal', 'STAFF', false, 1),
('Alba', 'STAFF_ALBA', false, 2),
('Adrián', 'STAFF_ADRIAN', false, 3),
('Yeray', 'STAFF_YERAY', false, 4),
('Bruna', 'STAFF_BRUNA', false, 5),
('Carla', 'STAFF_CARLA', false, 6),

-- Comisiones
('Comisiones', 'COMMISSION', false, 10),

-- Marketing
('Marketing', 'MARKETING', false, 20),

-- Formación
('Formación', 'TRAINING', false, 30),

-- Software
('Software', 'SOFTWARE', false, 40),

-- Gastos Operativos
('Gastos Operativos', 'OPEX', true, 50), -- Este se proratea
('Alquiler', 'RENT', true, 51),
('Electricidad', 'ELECTRIC', true, 52),
('Otros servicios', 'OTHER_SERVICE', true, 53)
ON CONFLICT DO NOTHING;

-- ================================================
-- EXAMPLE CLIENTS
-- ================================================

-- Verticals
INSERT INTO verticals (name, code) VALUES
('Content Creation', 'CONTENT'),
('Consulting', 'CONSULT'),
('Media Management', 'MEDIA')
ON CONFLICT DO NOTHING;

-- Sample Clients (basados en la imagen de Matriz)
INSERT INTO clients (name, vertical_id) VALUES
('Imbibico', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Delhi Chores', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Hao Artist', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('CoinMoX', (SELECT id FROM verticals WHERE code = 'CONSULT')),
('BeautyCosmeBazaar', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Nautilus', (SELECT id FROM verticals WHERE code = 'CONSULT')),
('Option Capital', (SELECT id FROM verticals WHERE code = 'CONSULT')),
('OiSkin', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('TheDeepettes', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Pompeii', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('NuJams', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Natalia', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('Unites', (SELECT id FROM verticals WHERE code = 'CONTENT')),
('The Converter', (SELECT id FROM verticals WHERE code = 'MEDIA')),
('Nuevo Cliente', (SELECT id FROM verticals WHERE code = 'CONTENT'))
ON CONFLICT DO NOTHING;

-- ================================================
-- FEE TIER EXAMPLE (basado en imagen de escalado)
-- ================================================

-- Create default fee tier template
INSERT INTO fee_tier_templates (name, is_default) VALUES
('Standard Fee Scale', true)
ON CONFLICT DO NOTHING;

-- Example fee tiers for a client (como en la imagen)
-- Let's use "The Converter" as example
INSERT INTO client_fee_tiers (
  client_id, 
  template_id,
  min_investment, 
  max_investment, 
  fee_percentage, 
  fixed_cost
) VALUES
-- Tier 1: < 1,500€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  0, 1500, 59.00, 890
),
-- Tier 2: 1,500€ - 2,000€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  1500, 2000, 50.00, 1000
),
-- Tier 3: 2,000€ - 2,500€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  2000, 2500, 46.00, 1150
),
-- Tier 4: 2,500€ - 3,000€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  2500, 3000, 44.00, 1320
),
-- Tier 5: 3,000€ - 3,500€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  3000, 3500, 42.00, 1470
),
-- Tier 6: 3,500€ - 4,000€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  3500, 4000, 40.00, 1600
),
-- Add more tiers as needed...
-- Tier 10: > 10,000€
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  (SELECT id FROM fee_tier_templates WHERE name = 'Standard Fee Scale'),
  10000, NULL, 25.00, 2500
)
ON CONFLICT DO NOTHING;

-- ================================================
-- AD INVESTMENT EXAMPLE
-- ================================================

-- Example: The Converter investment for a month (basado en imagen)
INSERT INTO client_ad_investment (
  client_id,
  fiscal_year,
  fiscal_month,
  platform_id,
  actual_amount,
  is_complete
) VALUES
(
  (SELECT id FROM clients WHERE name = 'The Converter'),
  2026,
  1, -- January
  (SELECT id FROM ad_platforms WHERE code = 'META'),
  2411.00,
  true
)
ON CONFLICT DO NOTHING;

-- ================================================
-- COMMISSION PLATFORMS
-- ================================================

INSERT INTO commission_platforms (name, description) VALUES
('WillMay', 'Plataforma de gestión que paga comisiones por referidos'),
('Other Platform', 'Otra plataforma ejemplo')
ON CONFLICT DO NOTHING;

-- ================================================
-- PARTNERS EXAMPLE
-- ================================================

INSERT INTO partners (name, email, default_commission_rate) VALUES
('Amigo Referido A', 'amigoa@example.com', 10.00),
('Partner B', 'partnerb@example.com', 8.00)
ON CONFLICT DO NOTHING;

-- ================================================
-- BUDGET EXAMPLE (P&L - Presupuesto 2026)
-- ================================================

-- Example budget line: Imcontent - Ad Spend
INSERT INTO budget_lines (
  fiscal_year,
  department_id,
  line_type,
  service_id,
  jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
) VALUES
(
  2026,
  (SELECT id FROM departments WHERE code = 'IMCONT'),
  'revenue',
  (SELECT id FROM services WHERE code = 'AD_SPEND'),
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100
),
(
  2026,
  (SELECT id FROM departments WHERE code = 'IMCONT'),
  'revenue',
  (SELECT id FROM services WHERE code = 'SETUP'),
  100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100
)
ON CONFLICT DO NOTHING;

-- Example expense budget: Personal - Alba
INSERT INTO budget_lines (
  fiscal_year,
  department_id,
  line_type,
  expense_category_id,
  jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
) VALUES
(
  2026,
  (SELECT id FROM departments WHERE code = 'IMCONT'),
  'expense',
  (SELECT id FROM expense_categories WHERE code = 'STAFF_ALBA'),
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
)
ON CONFLICT DO NOTHING;

-- Example general expense: Alquiler (to be prorated)
INSERT INTO budget_lines (
  fiscal_year,
  department_id,
  line_type,
  expense_category_id,
  jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
) VALUES
(
  2026,
  (SELECT id FROM departments WHERE code = 'IMMORAL'),
  'expense',
  (SELECT id FROM expense_categories WHERE code = 'RENT'),
  2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000
)
ON CONFLICT DO NOTHING;

-- ================================================
-- EMPLOYEES EXAMPLE (basado en Excel)
-- ================================================

-- Sample Employees (Alba, Adrián, Yeray, Bruna, Carla)
INSERT INTO employees (
  employee_code,
  first_name,
  last_name,
  email,
  hire_date,
  current_salary,
  position,
  primary_department_id
) VALUES
(
  'EMP001',
  'Alba',
  'García',
  'alba@immoral.com',
  '2023-01-15',
  2500.00,
  'Content Manager',
  (SELECT id FROM departments WHERE code = 'IMCONT')
),
(
  'EMP002',
  'Adrián',
  'López',
  'adrian@immoral.com',
  '2023-03-01',
  2800.00,
  'Media Specialist',
  (SELECT id FROM departments WHERE code = 'IMMED')
),
(
  'EMP003',
  'Yeray',
  'Martínez',
  'yeray@immoral.com',
  '2023-06-10',
  2300.00,
  'Social Media Manager',
  (SELECT id FROM departments WHERE code = 'IMMOR')
),
(
  'EMP004',
  'Bruna',
  'Rodríguez',
  'bruna@immoral.com',
  '2023-08-20',
  2600.00,
  'Creative Director',
  (SELECT id FROM departments WHERE code = 'IMCONT')
),
(
  'EMP005',
  'Carla',
  'Fernández',
  'carla@immoral.com',
  '2024-01-10',
  2200.00,
  'Marketing Analyst',
  (SELECT id FROM departments WHERE code = 'IMMED')
)
ON CONFLICT DO NOTHING;

-- Initial salary history for each employee
INSERT INTO salary_history (
  employee_id,
  old_salary,
  new_salary,
  effective_from,
  change_reason
)
SELECT
  id,
  NULL,
  current_salary,
  hire_date,
  'Initial salary'
FROM employees
ON CONFLICT DO NOTHING;

COMMENT ON SCHEMA public IS 'Immoral Administrative System - Complete Excel Replication';
