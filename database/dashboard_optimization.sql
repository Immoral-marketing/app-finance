-- =============================================
-- DASHBOARD OPTIMIZATION FUNCTIONS
-- =============================================

-- Function to get Dashboard KPIs and Department Performance in one go
-- This avoids fetching thousands of rows to the backend
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_year INT)
RETURNS JSON AS $$
DECLARE
    v_total_billing NUMERIC;
    v_total_expenses NUMERIC;
    v_dept_performance JSON;
    v_pending_payments JSON;
    v_recent_activity JSON;
BEGIN
    -- 1. Total Billing (YTD)
    SELECT COALESCE(SUM(grand_total), 0)
    INTO v_total_billing
    FROM monthly_billing
    WHERE fiscal_year = p_year;

    -- 2. Total Expenses (YTD)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expenses
    FROM actual_expenses
    WHERE fiscal_year = p_year;

    -- 3. Department Performance (Income vs Expenses)
    -- We aggregate income from billing_details joined with monthly_billing
    -- We aggregate expenses from actual_expenses
    WITH dept_income AS (
        SELECT 
            d.code,
            d.name,
            COALESCE(SUM(bd.amount), 0) as income
        FROM billing_details bd
        JOIN monthly_billing mb ON bd.monthly_billing_id = mb.id
        JOIN departments d ON bd.department_id = d.id
        WHERE mb.fiscal_year = p_year
        GROUP BY d.code, d.name
    ),
    dept_expenses AS (
        SELECT 
            d.code,
            d.name,
            COALESCE(SUM(ae.amount), 0) as expense
        FROM actual_expenses ae
        JOIN departments d ON ae.department_id = d.id
        WHERE ae.fiscal_year = p_year
        GROUP BY d.code, d.name
    ),
    all_depts AS (
        SELECT code, name FROM dept_income
        UNION
        SELECT code, name FROM dept_expenses
    )
    SELECT json_agg(
        json_build_object(
            'code', ad.code,
            'name', ad.name,
            'income', COALESCE(di.income, 0),
            'expenses', COALESCE(de.expense, 0),
            'margin', COALESCE(di.income, 0) - COALESCE(de.expense, 0),
            'marginPct', CASE WHEN COALESCE(di.income, 0) > 0 
                THEN ((COALESCE(di.income, 0) - COALESCE(de.expense, 0)) / COALESCE(di.income, 0)) * 100 
                ELSE 0 
            END
        ) ORDER BY COALESCE(di.income, 0) DESC
    )
    INTO v_dept_performance
    FROM all_depts ad
    LEFT JOIN dept_income di ON ad.code = di.code
    LEFT JOIN dept_expenses de ON ad.code = de.code;

    -- 4. Pending Payments (Next 5)
    SELECT json_agg(t)
    INTO v_pending_payments
    FROM (
        SELECT id, payment_concept, payee_name, total_amount, due_date
        FROM payment_schedule
        WHERE status = 'pending'
        ORDER BY due_date ASC
        LIMIT 5
    ) t;

    -- 5. Recent Activity (Last 5 billing updates)
    SELECT json_agg(t)
    INTO v_recent_activity
    FROM (
        SELECT client_name, grand_total, updated_at
        FROM monthly_billing
        ORDER BY updated_at DESC
        LIMIT 5
    ) t;

    -- Return Consolidated JSON
    RETURN json_build_object(
        'kpis', json_build_object(
            'totalBilling', v_total_billing,
            'totalExpenses', v_total_expenses,
            'netMargin', v_total_billing - v_total_expenses,
            'marginPercentage', CASE WHEN v_total_billing > 0 
                THEN ((v_total_billing - v_total_expenses) / v_total_billing) * 100 
                ELSE 0 
            END
        ),
        'departmentPerformance', COALESCE(v_dept_performance, '[]'::json),
        'pendingPayments', COALESCE(v_pending_payments, '[]'::json),
        'recentActivity', COALESCE(v_recent_activity, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;
