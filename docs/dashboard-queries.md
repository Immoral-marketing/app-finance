# Dashboard Queries

SQL queries for building dashboards using materialized views and direct queries.

## 🎯 Quick Stats (Current Month)

### Revenue, Expenses, and Margin

```sql
SELECT 
  total_revenue,
  total_expenses,
  total_payroll,
  operating_costs,
  gross_margin,
  net_result,
  CASE 
    WHEN total_revenue > 0 THEN ROUND((gross_margin / total_revenue * 100), 2)
    ELSE 0 
  END AS margin_percentage
FROM mv_financial_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);
```

### Transaction Counts

```sql
SELECT 
  total_transactions,
  revenue_transactions,
  expense_transactions,
  payroll_transactions
FROM mv_financial_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);
```

## 📊 Department Performance

### Department Summary (Current Month)

```sql
SELECT 
  department_name,
  total_revenue,
  total_expenses,
  total_payroll,
  total_commissions,
  net_result,
  CASE 
    WHEN total_revenue > 0 THEN ROUND((net_result / total_revenue * 100), 2)
    ELSE 0 
  END AS margin_percentage,
  transaction_count
FROM mv_department_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY net_result DESC;
```

### Department Trends (Last 6 Months)

```sql
SELECT 
  department_name,
  year,
  month,
  total_revenue,
  net_result
FROM mv_department_summary
WHERE (year = EXTRACT(YEAR FROM CURRENT_DATE) AND month <= EXTRACT(MONTH FROM CURRENT_DATE))
   OR (year = EXTRACT(YEAR FROM CURRENT_DATE) - 1 AND month > EXTRACT(MONTH FROM CURRENT_DATE))
ORDER BY year DESC, month DESC, department_name
LIMIT 6 * (SELECT COUNT(DISTINCT department_id) FROM mv_department_summary);
```

### Department Revenue Share

```sql
WITH monthly_total AS (
  SELECT SUM(total_revenue) AS total
  FROM mv_department_summary
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND month = EXTRACT(MONTH FROM CURRENT_DATE)
)
SELECT 
  d.department_name,
  d.total_revenue,
  ROUND((d.total_revenue / mt.total * 100), 2) AS revenue_percentage
FROM mv_department_summary d
CROSS JOIN monthly_total mt
WHERE d.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND d.month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND mt.total > 0
ORDER BY d.total_revenue DESC;
```

## 🎨 Vertical Analysis

### Vertical Performance

```sql
SELECT 
  vertical_name,
  total_revenue,
  active_clients,
  active_contracts,
  ROUND(avg_fee_percentage, 2) AS avg_fee_percentage,
  transaction_count
FROM mv_vertical_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY total_revenue DESC;
```

### Top Verticals by Revenue

```sql
SELECT 
  vertical_name,
  SUM(total_revenue) AS total_revenue,
  COUNT(DISTINCT month) AS months_active
FROM mv_vertical_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY vertical_name
ORDER BY total_revenue DESC
LIMIT 10;
```

## 👥 Client Analysis

### Top Clients (Current Month)

```sql
SELECT 
  client_name,
  vertical_name,
  total_revenue,
  invoice_count,
  ROUND(avg_invoice_amount, 2) AS avg_invoice_amount,
  last_invoice_date
FROM mv_client_revenue
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY total_revenue DESC
LIMIT 20;
```

### Client Growth Analysis

```sql
WITH current_month AS (
  SELECT 
    client_id,
    client_name,
    total_revenue AS current_revenue
  FROM mv_client_revenue
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND month = EXTRACT(MONTH FROM CURRENT_DATE)
),
previous_month AS (
  SELECT 
    client_id,
    total_revenue AS previous_revenue
  FROM mv_client_revenue
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND month = EXTRACT(MONTH FROM CURRENT_DATE) - 1
)
SELECT 
  cm.client_name,
  cm.current_revenue,
  COALESCE(pm.previous_revenue, 0) AS previous_revenue,
  cm.current_revenue - COALESCE(pm.previous_revenue, 0) AS revenue_change,
  CASE 
    WHEN pm.previous_revenue > 0 THEN 
      ROUND(((cm.current_revenue - pm.previous_revenue) / pm.previous_revenue * 100), 2)
    ELSE NULL
  END AS growth_percentage
FROM current_month cm
LEFT JOIN previous_month pm ON cm.client_id = pm.client_id
WHERE cm.current_revenue > 0
ORDER BY revenue_change DESC;
```

## 💰 Employee Costs

### Employee Costs by Department

```sql
SELECT 
  department_name,
  COUNT(DISTINCT employee_id) AS employee_count,
  SUM(total_payroll) AS total_payroll,
  ROUND(AVG(total_payroll), 2) AS avg_payroll_per_employee
FROM mv_employee_costs
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY department_name
ORDER BY total_payroll DESC;
```

### Top Earning Employees

```sql
SELECT 
  full_name,
  department_name,
  current_salary,
  total_payroll AS monthly_total,
  payment_count,
  last_payment_date
FROM mv_employee_costs
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY total_payroll DESC
LIMIT 20;
```

## 📈 Financial Trends

### Monthly Comparison (Year-to-Date)

```sql
SELECT 
  year,
  month,
  total_revenue,
  operating_costs,
  gross_margin,
  net_result,
  CASE 
    WHEN total_revenue > 0 THEN ROUND((gross_margin / total_revenue * 100), 2)
    ELSE 0 
  END AS margin_percentage
FROM mv_financial_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY month;
```

### Quarterly Summary

```sql
SELECT 
  year,
  quarter,
  SUM(total_revenue) AS total_revenue,
  SUM(total_expenses) AS total_expenses,
  SUM(total_payroll) AS total_payroll,
  SUM(net_result) AS net_result,
  CASE 
    WHEN SUM(total_revenue) > 0 THEN 
      ROUND((SUM(gross_margin) / SUM(total_revenue) * 100), 2)
    ELSE 0 
  END AS avg_margin_percentage
FROM mv_financial_summary
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY year, quarter
ORDER BY quarter;
```

### Year-over-Year Comparison

```sql
WITH current_year AS (
  SELECT 
    month,
    total_revenue,
    net_result
  FROM mv_financial_summary
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
),
previous_year AS (
  SELECT 
    month,
    total_revenue AS prev_revenue,
    net_result AS prev_result
  FROM mv_financial_summary
  WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) - 1
)
SELECT 
  cy.month,
  cy.total_revenue AS current_revenue,
  py.prev_revenue,
  cy.total_revenue - COALESCE(py.prev_revenue, 0) AS revenue_change,
  cy.net_result AS current_result,
  py.prev_result,
  cy.net_result - COALESCE(py.prev_result, 0) AS result_change
FROM current_year cy
LEFT JOIN previous_year py ON cy.month = py.month
ORDER BY cy.month;
```

## 🔍 Detailed Analysis

### Revenue Breakdown by Type

```sql
SELECT 
  entry_type,
  COUNT(*) AS entry_count,
  SUM(amount) AS total_amount,
  ROUND(AVG(amount), 2) AS avg_amount
FROM ledger_entries
WHERE EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND entry_type IN ('revenue', 'commission')
GROUP BY entry_type
ORDER BY total_amount DESC;
```

### Expense Breakdown by Category

```sql
SELECT 
  ec.name AS category,
  COUNT(e.id) AS expense_count,
  SUM(e.amount) AS total_amount,
  ROUND(AVG(e.amount), 2) AS avg_amount
FROM expenses e
JOIN expense_categories ec ON e.category_id = ec.id
WHERE EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY ec.name
ORDER BY total_amount DESC;
```

### Adjustment Entries (Corrections)

```sql
SELECT 
  le.entry_date,
  le.entry_type,
  le.description,
  le.amount,
  d.name AS department,
  original.description AS original_entry_description,
  original.amount AS original_amount
FROM ledger_entries le
JOIN departments d ON le.department_id = d.id
LEFT JOIN ledger_entries original ON le.adjustment_of = original.id
WHERE le.is_adjustment = true
  AND EXTRACT(YEAR FROM le.entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY le.entry_date DESC;
```

## 🎯 KPI Dashboard

### Executive Summary

```sql
SELECT 
  -- Current month
  (SELECT total_revenue FROM mv_financial_summary 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
     AND month = EXTRACT(MONTH FROM CURRENT_DATE)) AS current_month_revenue,
  
  (SELECT net_result FROM mv_financial_summary 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
     AND month = EXTRACT(MONTH FROM CURRENT_DATE)) AS current_month_profit,
  
  -- Year to date
  (SELECT SUM(total_revenue) FROM mv_financial_summary 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)) AS ytd_revenue,
  
  (SELECT SUM(net_result) FROM mv_financial_summary 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)) AS ytd_profit,
  
  -- Client metrics
  (SELECT COUNT(DISTINCT client_id) FROM mv_client_revenue 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
     AND month = EXTRACT(MONTH FROM CURRENT_DATE)) AS active_clients,
  
  -- Employee metrics
  (SELECT COUNT(*) FROM employees WHERE is_active = true) AS total_employees,
  
  (SELECT SUM(total_payroll) FROM mv_employee_costs 
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
     AND month = EXTRACT(MONTH FROM CURRENT_DATE)) AS monthly_payroll;
```

## 💡 Usage Tips

1. **Performance**: Use materialized views for dashboards (faster)
2. **Real-time**: Query `ledger_entries` directly for real-time data
3. **Refresh**: Run `SELECT refresh_all_materialized_views();` after closing periods
4. **Filters**: Add date range filters for custom reporting periods
5. **Export**: Use `COPY` command or frontend export buttons for CSV/PDF
