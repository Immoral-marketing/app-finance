-- ================================================
-- IMMORAL FINANCE APP - ROW LEVEL SECURITY POLICIES
-- ================================================
-- RLS policies for role-based access control
-- Roles: CFO (admin), CEO, COO, department_head, admin_assistant

-- NOTE: User roles should be stored in auth.users metadata
-- Example: { "role": "CFO", "department_id": "uuid" }

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt()->>'user_metadata')::JSONB->>'role',
    'anonymous'
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

-- Check if user is admin (CFO)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('CFO', 'admin');
$$ LANGUAGE SQL STABLE;

-- Check if user is executive (CEO, COO)
CREATE OR REPLACE FUNCTION is_executive()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('CEO', 'COO', 'CFO', 'admin');
$$ LANGUAGE SQL STABLE;

-- Check if user is department head
CREATE OR REPLACE FUNCTION is_department_head()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'department_head';
$$ LANGUAGE SQL STABLE;

-- ================================================
-- DEPARTMENTS
-- ================================================

-- CFO/Executives can view all departments
CREATE POLICY departments_select_policy ON departments
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

-- Only CFO can modify departments
CREATE POLICY departments_insert_policy ON departments
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY departments_update_policy ON departments
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY departments_delete_policy ON departments
  FOR DELETE
  USING (is_admin());

-- ================================================
-- VERTICALS
-- ================================================

-- Same as departments
CREATE POLICY verticals_select_policy ON verticals
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

CREATE POLICY verticals_insert_policy ON verticals
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY verticals_update_policy ON verticals
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY verticals_delete_policy ON verticals
  FOR DELETE
  USING (is_admin());

-- ================================================
-- CLIENTS
-- ================================================

-- Everyone can view clients
CREATE POLICY clients_select_policy ON clients
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

-- CFO and admin_assistant can add/edit clients
CREATE POLICY clients_insert_policy ON clients
  FOR INSERT
  WITH CHECK (is_admin() OR auth_role() = 'admin_assistant');

CREATE POLICY clients_update_policy ON clients
  FOR UPDATE
  USING (is_admin() OR auth_role() = 'admin_assistant')
  WITH CHECK (is_admin() OR auth_role() = 'admin_assistant');

-- Only CFO can delete clients
CREATE POLICY clients_delete_policy ON clients
  FOR DELETE
  USING (is_admin());

-- ================================================
-- CONTRACTS
-- ================================================

-- Everyone can view contracts
CREATE POLICY contracts_select_policy ON contracts
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

-- CFO can manage contracts
CREATE POLICY contracts_insert_policy ON contracts
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY contracts_update_policy ON contracts
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY contracts_delete_policy ON contracts
  FOR DELETE
  USING (is_admin());

-- ================================================
-- CONTRACT DEPARTMENT SPLITS
-- ================================================

CREATE POLICY contract_splits_select_policy ON contract_department_splits
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

CREATE POLICY contract_splits_modify_policy ON contract_department_splits
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- BILLING RULES & OVERRIDES
-- ================================================

CREATE POLICY billing_rules_select_policy ON billing_rules
  FOR SELECT
  USING (is_executive() OR auth_role() = 'admin_assistant');

CREATE POLICY billing_rules_modify_policy ON billing_rules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY billing_overrides_select_policy ON billing_overrides
  FOR SELECT
  USING (is_executive() OR auth_role() = 'admin_assistant');

CREATE POLICY billing_overrides_modify_policy ON billing_overrides
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- EMPLOYEES
-- ================================================

-- Executives can view all employees
-- Department heads can view employees in their department
CREATE POLICY employees_select_policy ON employees
  FOR SELECT
  USING (
    is_executive() OR 
    auth_role() = 'admin_assistant' OR
    (is_department_head() AND EXISTS (
      SELECT 1 FROM employee_department_splits eds
      WHERE eds.employee_id = employees.id
        AND eds.department_id = auth_department_id()
    ))
  );

-- Only CFO can modify employees
CREATE POLICY employees_insert_policy ON employees
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY employees_update_policy ON employees
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY employees_delete_policy ON employees
  FOR DELETE
  USING (is_admin());

-- ================================================
-- SALARY HISTORY
-- ================================================

-- Same as employees
CREATE POLICY salary_history_select_policy ON salary_history
  FOR SELECT
  USING (
    is_executive() OR 
    (is_department_head() AND EXISTS (
      SELECT 1 FROM employee_department_splits eds
      WHERE eds.employee_id = salary_history.employee_id
        AND eds.department_id = auth_department_id()
    ))
  );

-- Only CFO can view/modify (through functions)
CREATE POLICY salary_history_modify_policy ON salary_history
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- EMPLOYEE DEPARTMENT SPLITS
-- ================================================

CREATE POLICY employee_splits_select_policy ON employee_department_splits
  FOR SELECT
  USING (
    is_executive() OR 
    (is_department_head() AND department_id = auth_department_id())
  );

CREATE POLICY employee_splits_modify_policy ON employee_department_splits
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- PAYROLLS
-- ================================================

-- Executives can view all payrolls
-- Department heads can view payrolls for their team
CREATE POLICY payrolls_select_policy ON payrolls
  FOR SELECT
  USING (
    is_executive() OR 
    (is_department_head() AND EXISTS (
      SELECT 1 FROM employee_department_splits eds
      WHERE eds.employee_id = payrolls.employee_id
        AND eds.department_id = auth_department_id()
    ))
  );

-- Only CFO can create payrolls
CREATE POLICY payrolls_insert_policy ON payrolls
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY payrolls_update_policy ON payrolls
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY payrolls_delete_policy ON payrolls
  FOR DELETE
  USING (is_admin());

-- ================================================
-- EXPENSE CATEGORIES
-- ================================================

CREATE POLICY expense_categories_select_policy ON expense_categories
  FOR SELECT
  USING (
    is_executive() OR 
    is_department_head() OR 
    auth_role() = 'admin_assistant'
  );

CREATE POLICY expense_categories_modify_policy ON expense_categories
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- EXPENSES
-- ================================================

-- Executives can view all expenses
-- Department heads can view expenses for their department
CREATE POLICY expenses_select_policy ON expenses
  FOR SELECT
  USING (
    is_executive() OR 
    auth_role() = 'admin_assistant' OR
    (is_department_head() AND department_id = auth_department_id())
  );

-- CFO and admin_assistant can add expenses
CREATE POLICY expenses_insert_policy ON expenses
  FOR INSERT
  WITH CHECK (is_admin() OR auth_role() = 'admin_assistant');

CREATE POLICY expenses_update_policy ON expenses
  FOR UPDATE
  USING (is_admin() OR auth_role() = 'admin_assistant')
  WITH CHECK (is_admin() OR auth_role() = 'admin_assistant');

-- Only CFO can delete expenses
CREATE POLICY expenses_delete_policy ON expenses
  FOR DELETE
  USING (is_admin());

-- ================================================
-- COMMISSIONS
-- ================================================

CREATE POLICY commissions_select_policy ON commissions
  FOR SELECT
  USING (is_executive() OR auth_role() = 'admin_assistant');

CREATE POLICY commissions_insert_policy ON commissions
  FOR INSERT
  WITH CHECK (is_admin() OR auth_role() = 'admin_assistant');

CREATE POLICY commissions_update_policy ON commissions
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY commissions_delete_policy ON commissions
  FOR DELETE
  USING (is_admin());

-- ================================================
-- LEDGER ENTRIES (Read-only for most users)
-- ================================================

-- Executives can view all ledger entries
-- Department heads can view entries for their department
CREATE POLICY ledger_select_policy ON ledger_entries
  FOR SELECT
  USING (
    is_executive() OR 
    (is_department_head() AND department_id = auth_department_id())
  );

-- Only CFO can insert (typically via functions)
CREATE POLICY ledger_insert_policy ON ledger_entries
  FOR INSERT
  WITH CHECK (is_admin());

-- Ledger entries are immutable - no updates or deletes
-- If you need to allow adjustments, use the functions that create adjustment entries

-- ================================================
-- FINANCIAL PERIODS
-- ================================================

CREATE POLICY periods_select_policy ON financial_periods
  FOR SELECT
  USING (is_executive() OR is_department_head() OR auth_role() = 'admin_assistant');

-- Only CFO can manage periods
CREATE POLICY periods_modify_policy ON financial_periods
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================================
-- AUDIT LOG (Admin only)
-- ================================================

CREATE POLICY audit_log_select_policy ON audit_log
  FOR SELECT
  USING (is_admin());

CREATE POLICY audit_log_insert_policy ON audit_log
  FOR INSERT
  WITH CHECK (true); -- Triggers can insert

-- No updates or deletes on audit log

-- ================================================
-- SERVICE ROLE BYPASS
-- ================================================

-- Note: Microservices using the service_role key will bypass RLS
-- This is necessary for the services to create ledger entries
-- The services themselves must implement proper authorization

-- To use service role in Supabase client:
-- const supabase = createClient(url, SERVICE_ROLE_KEY)
-- This bypasses ALL RLS policies

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant authenticated users access to tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ================================================
-- POLICY COMMENTS
-- ================================================

COMMENT ON POLICY departments_select_policy ON departments IS 'Executives, department heads, and assistants can view departments';
COMMENT ON POLICY ledger_select_policy ON ledger_entries IS 'Executives see all entries, department heads see only their department';
COMMENT ON POLICY ledger_insert_policy ON ledger_entries IS 'Only CFO can insert ledger entries (typically via microservices)';
COMMENT ON POLICY periods_modify_policy ON financial_periods IS 'Only CFO can close/reopen periods';
