-- ============================================================
-- Migration 10: Add status lifecycle to pl_cell_notes
-- status: 'active' (default) | 'done' | 'deleted'
-- ============================================================

ALTER TABLE pl_cell_notes
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'done', 'deleted'));
