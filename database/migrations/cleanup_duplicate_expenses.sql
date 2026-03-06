-- Clean up duplicate expense records in actual_expenses
-- This removes records that were duplicated due to an earlier bug
-- where saving with section_key created new records instead of updating legacy ones.
-- 
-- Strategy: For each (fiscal_year, fiscal_month, department_id, expense_category_id),
-- if there are records with BOTH a valid section_key description AND a legacy description,
-- delete the legacy one (the valid section_key one has the latest user-entered value).

WITH valid_section_keys AS (
  SELECT unnest(ARRAY['personal', 'comisiones', 'marketing', 'formacion', 'software', 'gastosOp', 'adspent']) AS sk
),
-- Find legacy records that have a sibling with a valid section_key
duplicated_legacy AS (
  SELECT ae.id
  FROM actual_expenses ae
  WHERE ae.description NOT IN (SELECT sk FROM valid_section_keys)
    AND EXISTS (
      SELECT 1 FROM actual_expenses ae2
      WHERE ae2.fiscal_year = ae.fiscal_year
        AND ae2.fiscal_month = ae.fiscal_month
        AND ae2.department_id = ae.department_id
        AND ae2.expense_category_id = ae.expense_category_id
        AND ae2.description IN (SELECT sk FROM valid_section_keys)
        AND ae2.id != ae.id
    )
)
DELETE FROM actual_expenses WHERE id IN (SELECT id FROM duplicated_legacy);
