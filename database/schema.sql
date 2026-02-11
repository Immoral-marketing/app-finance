-- ================================================
-- IMMORAL FINANCE APP - DATABASE SCHEMA
-- ================================================
-- Complete PostgreSQL schema for Supabase
-- Includes: tables, indexes, constraints, and audit triggers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- CORE ENTITIES
-- ================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verticals table
CREATE TABLE IF NOT EXISTS verticals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contracts table (defines client agreements)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  contract_name VARCHAR(255) NOT NULL,
  fee_percentage DECIMAL(5, 2) NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  minimum_fee DECIMAL(12, 2) DEFAULT 0,
  billing_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, annual
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

-- Department splits configuration for contracts
CREATE TABLE IF NOT EXISTS contract_department_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  split_percentage DECIMAL(5, 2) NOT NULL CHECK (split_percentage >= 0 AND split_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, department_id)
);

CREATE INDEX idx_contract_splits ON contract_department_splits(contract_id);

-- Billing rules (global defaults)
CREATE TABLE IF NOT EXISTS billing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing overrides (client-specific exceptions)
CREATE TABLE IF NOT EXISTS billing_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  override_type VARCHAR(50) NOT NULL,
  override_value JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_overrides_client ON billing_overrides(client_id);

-- ================================================
-- EMPLOYEES & PAYROLL
-- ================================================

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  hire_date DATE NOT NULL,
  termination_date DATE,
  current_salary DECIMAL(12, 2) NOT NULL,
  position VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_code ON employees(employee_code);

-- Salary history (immutable historical record)
CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  salary_amount DECIMAL(12, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  change_reason VARCHAR(255),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_salary_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_salary_history_employee ON salary_history(employee_id);
CREATE INDEX idx_salary_history_dates ON salary_history(effective_from, effective_to);

-- Employee department splits
CREATE TABLE IF NOT EXISTS employee_department_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('percentage', 'fixed_amount')),
  split_value DECIMAL(12, 2) NOT NULL CHECK (split_value >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_split_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_employee_splits ON employee_department_splits(employee_id);

-- Payroll records
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL,
  bonuses DECIMAL(12, 2) DEFAULT 0,
  variable_pay DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  net_pay DECIMAL(12, 2) GENERATED ALWAYS AS (base_salary + bonuses + variable_pay - deductions) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_pay_period CHECK (pay_period_end >= pay_period_start)
);

CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX idx_payrolls_period ON payrolls(pay_period_start, pay_period_end);

-- ================================================
-- EXPENSES
-- ================================================

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_general BOOLEAN DEFAULT false, -- true if this is a general expense category that needs allocation
  allocation_rule JSONB, -- JSON with department allocation percentages
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_code VARCHAR(50) UNIQUE,
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL, -- null if general expense
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  payment_date DATE,
  vendor VARCHAR(255),
  invoice_number VARCHAR(100),
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_department ON expenses(department_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- ================================================
-- COMMISSIONS
-- ================================================

-- Commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('paid', 'received')),
  related_entity_type VARCHAR(50), -- 'referral', 'platform', 'partner', etc.
  related_entity_name VARCHAR(255),
  amount DECIMAL(12, 2) NOT NULL,
  commission_date DATE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  revenue_percentage DECIMAL(5, 2), -- percentage of revenue this represents
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_commissions_type ON commissions(commission_type);
CREATE INDEX idx_commissions_date ON commissions(commission_date);
CREATE INDEX idx_commissions_client ON commissions(client_id);

-- ================================================
-- LEDGER (Single Source of Truth)
-- ================================================

-- Ledger entries - immutable source of truth
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(50) NOT NULL, -- 'revenue', 'expense', 'payroll', 'commission', 'adjustment'
  transaction_id UUID NOT NULL, -- groups related entries together
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
  vertical_id UUID REFERENCES verticals(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL, -- positive for revenue/income, negative for expenses/costs
  entry_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  reference_type VARCHAR(50), -- 'invoice', 'expense', 'payroll', 'commission', etc.
  reference_id UUID, -- ID of the related record
  metadata JSONB, -- additional flexible data
  is_adjustment BOOLEAN DEFAULT false, -- true if this is a correction entry
  adjustment_of UUID REFERENCES ledger_entries(id), -- if adjustment, references original entry
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- NOTE: No updated_at - ledger entries are immutable
);

CREATE INDEX idx_ledger_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_department ON ledger_entries(department_id);
CREATE INDEX idx_ledger_vertical ON ledger_entries(vertical_id);
CREATE INDEX idx_ledger_date ON ledger_entries(entry_date);
CREATE INDEX idx_ledger_reference ON ledger_entries(reference_type, reference_id);

-- ================================================
-- FINANCIAL PERIODS
-- ================================================

-- Financial periods table
CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_quarter INTEGER GENERATED ALWAYS AS (CEIL(period_month::DECIMAL / 3)) STORED,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  reopened_at TIMESTAMP WITH TIME ZONE,
  reopened_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_year, period_month)
);

CREATE INDEX idx_periods_year_month ON financial_periods(period_year, period_month);
CREATE INDEX idx_periods_closed ON financial_periods(is_closed);

-- ================================================
-- AUDIT LOG
-- ================================================

-- System-wide audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(changed_at);

-- ================================================
-- UPDATED_AT TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verticals_updated_at BEFORE UPDATE ON verticals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payrolls_updated_at BEFORE UPDATE ON payrolls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_periods_updated_at BEFORE UPDATE ON financial_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_rules_updated_at BEFORE UPDATE ON billing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on all tables (policies defined in rls_policies.sql)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_department_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_department_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE ledger_entries IS 'Immutable single source of truth for all financial events. Use adjustment entries for corrections.';
COMMENT ON TABLE salary_history IS 'Immutable historical record of all salary changes.';
COMMENT ON TABLE financial_periods IS 'Period management and closure tracking. Locked periods prevent new entries.';
COMMENT ON TABLE audit_log IS 'System-wide audit trail for all data modifications.';
