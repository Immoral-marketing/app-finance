-- ============================================================
-- Migration 09: Expand pl_cell_notes view_type constraint
-- Each tab is an independent note context:
--   PLMatrix:     'real' | 'budget' | 'comparison'
--   DepartmentPL: 'dept-real' | 'dept-budget' | 'dept-comparison'
-- ============================================================

ALTER TABLE pl_cell_notes
    DROP CONSTRAINT IF EXISTS pl_cell_notes_view_type_check;

ALTER TABLE pl_cell_notes
    ADD CONSTRAINT pl_cell_notes_view_type_check
    CHECK (view_type IN ('real', 'budget', 'comparison', 'dept-real', 'dept-budget', 'dept-comparison'));
