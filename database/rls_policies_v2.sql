-- ================================================
-- IMMORAL ADMINISTRATIVE SYSTEM - RLS POLICIES
-- ================================================
-- Row Level Security para control de acceso basado en roles

-- ================================================
-- HELPER FUNCTIONS FOR RLS
-- ================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt()->>'user_metadata')::JSONB->>'role',
    'user'
  );
$$ LANGUAGE SQL STABLE;

-- Get current user's department
CREATE OR REPLACE FUNCTION auth_department_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    ((auth.jwt()->>'user_metadata')::JSONB->>'department_id')::UUID,
    NULL
  );
$$ LANGUAGE SQL STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('admin', 'cfo');
$$ LANGUAGE SQL STABLE;

-- Check if user is executive (can view all)
CREATE OR REPLACE FUNCTION is_executive()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('admin', 'cfo', 'ceo', 'coo');
$$ LANGUAGE SQL STABLE;

-- Check if user is department head
CREATE OR REPLACE FUNCTION is_department_head()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'department_head';
$$ LANGUAGE SQL STABLE;

-- Check if user is finance assistant
CREATE OR REPLACE FUNCTION is_finance_assistant()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'finance_assistant';
$$ LANGUAGE SQL STABLE;

-- ================================================
-- ENABLE RLS ON ALL TABLES
-- ================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ad_investment ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_tier_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_fee_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_cost_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_department_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_department_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CONFIGURATION TABLES (read by all, modify by admin)
-- ================================================

-- Companies
CREATE POLICY companies_select_policy ON companies FOR SELECT USING (true);
CREATE POLICY companies_modify_policy ON companies FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Departments
CREATE POLICY departments_select_policy ON departments FOR SELECT USING (true);
CREATE POLICY departments_modify_policy ON departments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Verticals
CREATE POLICY verticals_select_policy ON verticals FOR SELECT USING (true);
CREATE POLICY verticals_modify_policy ON verticals FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Services
CREATE POLICY services_select_policy ON services FOR SELECT USING (true);
CREATE POLICY services_modify_policy ON services FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Expense Categories
CREATE POLICY expense_categories_select_policy ON expense_categories FOR SELECT USING (true);
CREATE POLICY expense_categories_modify_policy ON expense_categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Ad Platforms
CREATE POLICY ad_platforms_select_policy ON ad_platforms FOR SELECT USING (true);
CREATE POLICY ad_platforms_modify_policy ON ad_platforms FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ================================================
-- P&L MODULE
-- ================================================

-- Budget Lines
CREATE POLICY budget_lines_select_policy ON budget_lines FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND department_id = auth_department_id()) OR
  is_finance_assistant()
);

CREATE POLICY budget_lines_insert_policy ON budget_lines FOR INSERT 
WITH CHECK (is_admin() OR is_finance_assistant());

CREATE POLICY budget_lines_update_policy ON budget_lines FOR UPDATE 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

CREATE POLICY budget_lines_delete_policy ON budget_lines FOR DELETE 
USING (is_admin());

-- Actual Revenue
CREATE POLICY actual_revenue_select_policy ON actual_revenue FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND department_id = auth_department_id()) OR
  is_finance_assistant()
);

CREATE POLICY actual_revenue_modify_policy ON actual_revenue FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- Actual Expenses
CREATE POLICY actual_expenses_select_policy ON actual_expenses FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND department_id = auth_department_id()) OR
  is_finance_assistant()
);

CREATE POLICY actual_expenses_modify_policy ON actual_expenses FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- ================================================
-- CLIENTS & BILLING
-- ================================================

-- Clients
CREATE POLICY clients_select_policy ON clients FOR SELECT USING (true);
CREATE POLICY clients_insert_policy ON clients FOR INSERT WITH CHECK (is_admin() OR is_finance_assistant());
CREATE POLICY clients_update_policy ON clients FOR UPDATE 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());
CREATE POLICY clients_delete_policy ON clients FOR DELETE USING (is_admin());

-- Client Services
CREATE POLICY client_services_select_policy ON client_services FOR SELECT USING (true);
CREATE POLICY client_services_modify_policy ON client_services FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- Client Ad Investment
CREATE POLICY ad_investment_select_policy ON client_ad_investment FOR SELECT 
USING (is_executive() OR is_finance_assistant());

CREATE POLICY ad_investment_modify_policy ON client_ad_investment FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- Fee Tiers
CREATE POLICY fee_tiers_select_policy ON client_fee_tiers FOR SELECT 
USING (is_executive() OR is_finance_assistant());

CREATE POLICY fee_tiers_modify_policy ON client_fee_tiers FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Monthly Billing
CREATE POLICY monthly_billing_select_policy ON monthly_billing FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND EXISTS (
    SELECT 1 FROM billing_details bd
    WHERE bd.monthly_billing_id = monthly_billing.id
      AND bd.department_id = auth_department_id()
  )) OR
  is_finance_assistant()
);

CREATE POLICY monthly_billing_modify_policy ON monthly_billing FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- Billing Details
CREATE POLICY billing_details_select_policy ON billing_details FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND department_id = auth_department_id()) OR
  is_finance_assistant()
);

CREATE POLICY billing_details_modify_policy ON billing_details FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- ================================================
-- COMMISSIONS
-- ================================================

-- Partners
CREATE POLICY partners_select_policy ON partners FOR SELECT USING (is_executive() OR is_finance_assistant());
CREATE POLICY partners_modify_policy ON partners FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Partner Commissions
CREATE POLICY partner_commissions_select_policy ON monthly_partner_commissions FOR SELECT 
USING (is_executive() OR is_finance_assistant());

CREATE POLICY partner_commissions_modify_policy ON monthly_partner_commissions FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- Platform Commissions
CREATE POLICY platform_commissions_select_policy ON monthly_platform_commissions FOR SELECT 
USING (is_executive() OR is_finance_assistant());

CREATE POLICY platform_commissions_modify_policy ON monthly_platform_commissions FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- ================================================
-- PAYMENTS
-- ================================================

CREATE POLICY payment_schedule_select_policy ON payment_schedule FOR SELECT 
USING (is_executive() OR is_finance_assistant());

CREATE POLICY payment_schedule_modify_policy ON payment_schedule FOR ALL 
USING (is_admin() OR is_finance_assistant())
WITH CHECK (is_admin() OR is_finance_assistant());

-- ================================================
-- HR / EMPLOYEES
-- ================================================

-- Employees
CREATE POLICY employees_select_policy ON employees FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND primary_department_id = auth_department_id()) OR
  is_finance_assistant()
);

CREATE POLICY employees_modify_policy ON employees FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Salary History (solo admin puede ver historial de salarios)
CREATE POLICY salary_history_select_policy ON salary_history FOR SELECT 
USING (is_admin());

CREATE POLICY salary_history_modify_policy ON salary_history FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Employee Department Splits
CREATE POLICY employee_splits_select_policy ON employee_department_splits FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND department_id = auth_department_id())
);

CREATE POLICY employee_splits_modify_policy ON employee_department_splits FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Monthly Payroll
CREATE POLICY payroll_select_policy ON monthly_payroll FOR SELECT 
USING (
  is_executive() OR 
  (is_department_head() AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = monthly_payroll.employee_id 
      AND e.primary_department_id = auth_department_id()
  ))
);

CREATE POLICY payroll_modify_policy ON monthly_payroll FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- ================================================
-- FINANCIAL PERIODS
-- ================================================

CREATE POLICY periods_select_policy ON financial_periods FOR SELECT USING (true);
CREATE POLICY periods_modify_policy ON financial_periods FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ================================================
-- AUDIT LOG
-- ================================================

CREATE POLICY audit_log_select_policy ON audit_log FOR SELECT USING (is_admin());
CREATE POLICY audit_log_insert_policy ON audit_log FOR INSERT WITH CHECK (true); -- Triggers can insert

-- ================================================
-- GRANTS
-- ================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON FUNCTION is_admin IS 'Returns true if current user is admin or CFO';
COMMENT ON FUNCTION is_executive IS 'Returns true if current user is executive (admin, CFO, CEO, COO)';
COMMENT ON FUNCTION is_department_head IS 'Returns true if current user is department head';
COMMENT ON TABLE salary_history IS 'Immutable history of all salary changes';
COMMENT ON TABLE financial_periods IS 'Period management - only admin can close/reopen';
